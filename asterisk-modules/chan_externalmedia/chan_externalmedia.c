/*
 * Asterisk -- An open source telephony toolkit.
 *
 * Copyright (C) 2025, Translation System
 *
 * chan_externalmedia.c - External Media Channel Driver
 *
 * Provides PCM pipe interface for real-time translation
 * - 20ms frame granularity
 * - 16kHz PCM audio
 * - Bidirectional audio streaming
 * - Integration with external Node.js orchestrator
 *
 */

/*** MODULEINFO
	<defaultenabled>no</defaultenabled>
	<support_level>extended</support_level>
 ***/

#include "asterisk.h"

#include <sys/socket.h>
#include <sys/un.h>
#include <fcntl.h>
#include <unistd.h>
#include <errno.h>

#include "asterisk/module.h"
#include "asterisk/channel.h"
#include "asterisk/pbx.h"
#include "asterisk/sched.h"
#include "asterisk/io.h"
#include "asterisk/acl.h"
#include "asterisk/callerid.h"
#include "asterisk/file.h"
#include "asterisk/cli.h"
#include "asterisk/app.h"
#include "asterisk/musiconhold.h"
#include "asterisk/manager.h"
#include "asterisk/stringfields.h"
#include "asterisk/format_cache.h"
#include "asterisk/format.h"
#include "asterisk/format_cap.h"
#include "asterisk/frame.h"

/*! \brief Channel tech descriptor */
static struct ast_channel_tech externalmedia_tech;

/*! \brief Private structure for external media channel */
struct externalmedia_pvt {
	struct ast_channel *owner;           /*!< Channel we belong to */
	int pipe_fd_read;                    /*!< Pipe for reading audio from external */
	int pipe_fd_write;                   /*!< Pipe for writing audio to external */
	char pipe_path_read[256];            /*!< Path to read pipe */
	char pipe_path_write[256];           /*!< Path to write pipe */
	unsigned int frame_size;             /*!< Frame size in samples (320 for 20ms @ 16kHz) */
	unsigned int sample_rate;            /*!< Sample rate (16000 Hz) */
	struct ast_format *format;           /*!< Audio format (SLIN16) */
	unsigned char audio_buffer[640];     /*!< Buffer for 20ms frame (320 samples * 2 bytes) */
	int buffer_pos;                      /*!< Current position in buffer */
};

/*! \brief Default configuration */
#define DEFAULT_FRAME_SIZE 320           /* 320 samples = 20ms @ 16kHz */
#define DEFAULT_SAMPLE_RATE 16000        /* 16kHz */
#define FRAME_DURATION_MS 20             /* 20ms frames */

/*! \brief Module configuration */
static struct {
	unsigned int frame_size;
	unsigned int sample_rate;
	char pipe_base_path[256];
} global_config = {
	.frame_size = DEFAULT_FRAME_SIZE,
	.sample_rate = DEFAULT_SAMPLE_RATE,
	.pipe_base_path = "/tmp/asterisk_media"
};

/*
 * Forward declarations
 */
static struct ast_channel *externalmedia_request(const char *type, struct ast_format_cap *cap,
	const struct ast_assigned_ids *assignedids, const struct ast_channel *requestor,
	const char *data, int *cause);
static int externalmedia_call(struct ast_channel *ast, const char *dest, int timeout);
static int externalmedia_hangup(struct ast_channel *ast);
static struct ast_frame *externalmedia_read(struct ast_channel *ast);
static int externalmedia_write(struct ast_channel *ast, struct ast_frame *frame);
static int externalmedia_indicate(struct ast_channel *ast, int condition, const void *data, size_t datalen);
static int externalmedia_fixup(struct ast_channel *oldchan, struct ast_channel *newchan);

/*! \brief Channel technology definition */
static struct ast_channel_tech externalmedia_tech = {
	.type = "ExternalMedia",
	.description = "External Media Channel Driver (PCM Pipes)",
	.requester = externalmedia_request,
	.call = externalmedia_call,
	.hangup = externalmedia_hangup,
	.read = externalmedia_read,
	.write = externalmedia_write,
	.indicate = externalmedia_indicate,
	.fixup = externalmedia_fixup,
	.properties = AST_CHAN_TP_WANTSJITTER,
};

/*!
 * \brief Create named pipes for audio communication
 * \param pvt Private structure
 * \param channel_id Unique channel identifier
 * \return 0 on success, -1 on failure
 */
static int create_audio_pipes(struct externalmedia_pvt *pvt, const char *channel_id)
{
	char pipe_dir[256];

	/* Create pipe directory if it doesn't exist */
	snprintf(pipe_dir, sizeof(pipe_dir), "%s", global_config.pipe_base_path);
	mkdir(pipe_dir, 0755);

	/* Create read pipe path (Asterisk reads from external orchestrator) */
	snprintf(pvt->pipe_path_read, sizeof(pvt->pipe_path_read),
		"%s/%s_to_asterisk.pcm", pipe_dir, channel_id);

	/* Create write pipe path (Asterisk writes to external orchestrator) */
	snprintf(pvt->pipe_path_write, sizeof(pvt->pipe_path_write),
		"%s/%s_from_asterisk.pcm", pipe_dir, channel_id);

	/* Create named pipes (FIFOs) */
	unlink(pvt->pipe_path_read);  /* Remove if exists */
	unlink(pvt->pipe_path_write);

	if (mkfifo(pvt->pipe_path_read, 0666) < 0) {
		ast_log(LOG_ERROR, "Failed to create read pipe %s: %s\n",
			pvt->pipe_path_read, strerror(errno));
		return -1;
	}

	if (mkfifo(pvt->pipe_path_write, 0666) < 0) {
		ast_log(LOG_ERROR, "Failed to create write pipe %s: %s\n",
			pvt->pipe_path_write, strerror(errno));
		unlink(pvt->pipe_path_read);
		return -1;
	}

	ast_log(LOG_NOTICE, "Created pipes for channel %s:\n", channel_id);
	ast_log(LOG_NOTICE, "  Read:  %s\n", pvt->pipe_path_read);
	ast_log(LOG_NOTICE, "  Write: %s\n", pvt->pipe_path_write);

	return 0;
}

/*!
 * \brief Open audio pipes for communication
 * \param pvt Private structure
 * \return 0 on success, -1 on failure
 */
static int open_audio_pipes(struct externalmedia_pvt *pvt)
{
	/* Open read pipe (non-blocking to avoid deadlock) */
	pvt->pipe_fd_read = open(pvt->pipe_path_read, O_RDONLY | O_NONBLOCK);
	if (pvt->pipe_fd_read < 0) {
		ast_log(LOG_ERROR, "Failed to open read pipe %s: %s\n",
			pvt->pipe_path_read, strerror(errno));
		return -1;
	}

	/* Open write pipe (non-blocking) */
	pvt->pipe_fd_write = open(pvt->pipe_path_write, O_WRONLY | O_NONBLOCK);
	if (pvt->pipe_fd_write < 0) {
		ast_log(LOG_ERROR, "Failed to open write pipe %s: %s\n",
			pvt->pipe_path_write, strerror(errno));
		close(pvt->pipe_fd_read);
		return -1;
	}

	ast_log(LOG_NOTICE, "Opened pipes: read_fd=%d, write_fd=%d\n",
		pvt->pipe_fd_read, pvt->pipe_fd_write);

	return 0;
}

/*!
 * \brief Close audio pipes
 * \param pvt Private structure
 */
static void close_audio_pipes(struct externalmedia_pvt *pvt)
{
	if (pvt->pipe_fd_read >= 0) {
		close(pvt->pipe_fd_read);
		pvt->pipe_fd_read = -1;
	}

	if (pvt->pipe_fd_write >= 0) {
		close(pvt->pipe_fd_write);
		pvt->pipe_fd_write = -1;
	}

	/* Remove pipe files */
	if (pvt->pipe_path_read[0]) {
		unlink(pvt->pipe_path_read);
	}
	if (pvt->pipe_path_write[0]) {
		unlink(pvt->pipe_path_write);
	}
}

/*!
 * \brief Allocate and initialize private structure
 * \return Allocated structure or NULL on failure
 */
static struct externalmedia_pvt *externalmedia_alloc(const char *data)
{
	struct externalmedia_pvt *pvt;

	pvt = ast_calloc(1, sizeof(*pvt));
	if (!pvt) {
		return NULL;
	}

	pvt->pipe_fd_read = -1;
	pvt->pipe_fd_write = -1;
	pvt->frame_size = global_config.frame_size;
	pvt->sample_rate = global_config.sample_rate;
	pvt->buffer_pos = 0;
	pvt->format = ast_format_slin16;  /* 16-bit signed linear @ 16kHz */

	return pvt;
}

/*!
 * \brief Free private structure
 */
static void externalmedia_destroy(struct externalmedia_pvt *pvt)
{
	if (!pvt) {
		return;
	}

	close_audio_pipes(pvt);
	ast_free(pvt);
}

/*!
 * \brief Request a new external media channel
 */
static struct ast_channel *externalmedia_request(const char *type, struct ast_format_cap *cap,
	const struct ast_assigned_ids *assignedids, const struct ast_channel *requestor,
	const char *data, int *cause)
{
	struct externalmedia_pvt *pvt;
	struct ast_channel *chan;
	struct ast_format_cap *native;
	char channel_id[64];

	ast_log(LOG_NOTICE, "ExternalMedia channel requested: data=%s\n", data ? data : "(none)");

	/* Allocate private structure */
	pvt = externalmedia_alloc(data);
	if (!pvt) {
		*cause = AST_CAUSE_CONGESTION;
		return NULL;
	}

	/* Create format capabilities */
	native = ast_format_cap_alloc(AST_FORMAT_CAP_FLAG_DEFAULT);
	if (!native) {
		externalmedia_destroy(pvt);
		*cause = AST_CAUSE_CONGESTION;
		return NULL;
	}
	ast_format_cap_append(native, ast_format_slin16, 0);

	/* Generate unique channel ID */
	snprintf(channel_id, sizeof(channel_id), "ch_%ld_%d",
		(long)time(NULL), ast_random());

	/* Create audio pipes */
	if (create_audio_pipes(pvt, channel_id) < 0) {
		ao2_ref(native, -1);
		externalmedia_destroy(pvt);
		*cause = AST_CAUSE_CONGESTION;
		return NULL;
	}

	/* Allocate Asterisk channel */
	chan = ast_channel_alloc(1, AST_STATE_DOWN, NULL, NULL, NULL, NULL, NULL, assignedids, requestor, 0,
		"ExternalMedia/%s", channel_id);
	if (!chan) {
		ao2_ref(native, -1);
		externalmedia_destroy(pvt);
		*cause = AST_CAUSE_CONGESTION;
		return NULL;
	}

	/* Set up channel */
	ast_channel_tech_set(chan, &externalmedia_tech);
	ast_channel_set_rawreadformat(chan, pvt->format);
	ast_channel_set_rawwriteformat(chan, pvt->format);
	ast_channel_set_readformat(chan, pvt->format);
	ast_channel_set_writeformat(chan, pvt->format);
	ast_channel_nativeformats_set(chan, native);
	ast_channel_tech_pvt_set(chan, pvt);
	pvt->owner = chan;

	ao2_ref(native, -1);

	ast_log(LOG_NOTICE, "ExternalMedia channel created: %s\n", ast_channel_name(chan));

	return chan;
}

/*!
 * \brief Call a destination
 */
static int externalmedia_call(struct ast_channel *ast, const char *dest, int timeout)
{
	struct externalmedia_pvt *pvt = ast_channel_tech_pvt(ast);

	ast_log(LOG_NOTICE, "ExternalMedia call: dest=%s\n", dest);

	/* Open the pipes */
	if (open_audio_pipes(pvt) < 0) {
		return -1;
	}

	/* Set channel state to UP */
	ast_setstate(ast, AST_STATE_UP);

	/* Queue control frame to signal answer */
	ast_queue_control(ast, AST_CONTROL_ANSWER);

	return 0;
}

/*!
 * \brief Hangup the channel
 */
static int externalmedia_hangup(struct ast_channel *ast)
{
	struct externalmedia_pvt *pvt = ast_channel_tech_pvt(ast);

	ast_log(LOG_NOTICE, "ExternalMedia hangup: %s\n", ast_channel_name(ast));

	if (pvt) {
		externalmedia_destroy(pvt);
		ast_channel_tech_pvt_set(ast, NULL);
	}

	return 0;
}

/*!
 * \brief Read audio frame from external orchestrator
 */
static struct ast_frame *externalmedia_read(struct ast_channel *ast)
{
	struct externalmedia_pvt *pvt = ast_channel_tech_pvt(ast);
	static struct ast_frame frame;
	ssize_t bytes_read;
	size_t bytes_needed = pvt->frame_size * 2;  /* 16-bit samples */

	/* Initialize frame */
	memset(&frame, 0, sizeof(frame));
	frame.frametype = AST_FRAME_VOICE;
	frame.subclass.format = pvt->format;
	frame.samples = pvt->frame_size;
	frame.datalen = bytes_needed;
	frame.data.ptr = pvt->audio_buffer;
	frame.src = "ExternalMedia";

	/* Read from pipe */
	bytes_read = read(pvt->pipe_fd_read, pvt->audio_buffer, bytes_needed);

	if (bytes_read < 0) {
		if (errno == EAGAIN || errno == EWOULDBLOCK) {
			/* No data available, return NULL frame */
			return &ast_null_frame;
		}
		ast_log(LOG_WARNING, "Read error from pipe: %s\n", strerror(errno));
		return NULL;
	}

	if (bytes_read == 0) {
		/* EOF */
		return NULL;
	}

	if (bytes_read != bytes_needed) {
		ast_log(LOG_WARNING, "Partial read: got %zd bytes, expected %zu\n",
			bytes_read, bytes_needed);
		return &ast_null_frame;
	}

	return &frame;
}

/*!
 * \brief Write audio frame to external orchestrator
 */
static int externalmedia_write(struct ast_channel *ast, struct ast_frame *frame)
{
	struct externalmedia_pvt *pvt = ast_channel_tech_pvt(ast);
	ssize_t bytes_written;

	/* Only handle voice frames */
	if (frame->frametype != AST_FRAME_VOICE) {
		return 0;
	}

	/* Write to pipe */
	bytes_written = write(pvt->pipe_fd_write, frame->data.ptr, frame->datalen);

	if (bytes_written < 0) {
		if (errno == EAGAIN || errno == EWOULDBLOCK) {
			/* Pipe full, drop frame (better than blocking) */
			ast_log(LOG_DEBUG, "Pipe full, dropping frame\n");
			return 0;
		}
		ast_log(LOG_WARNING, "Write error to pipe: %s\n", strerror(errno));
		return -1;
	}

	if (bytes_written != frame->datalen) {
		ast_log(LOG_WARNING, "Partial write: wrote %zd bytes, expected %d\n",
			bytes_written, frame->datalen);
	}

	return 0;
}

/*!
 * \brief Indicate a condition
 */
static int externalmedia_indicate(struct ast_channel *ast, int condition, const void *data, size_t datalen)
{
	ast_log(LOG_DEBUG, "ExternalMedia indicate: condition=%d\n", condition);
	return -1;  /* Not supported */
}

/*!
 * \brief Fixup channel after masquerade
 */
static int externalmedia_fixup(struct ast_channel *oldchan, struct ast_channel *newchan)
{
	struct externalmedia_pvt *pvt = ast_channel_tech_pvt(newchan);

	if (pvt) {
		pvt->owner = newchan;
	}

	return 0;
}

/*!
 * \brief Load the module
 */
static int load_module(void)
{
	ast_log(LOG_NOTICE, "Loading ExternalMedia channel driver\n");
	ast_log(LOG_NOTICE, "  Frame size: %u samples (%d ms @ %u Hz)\n",
		global_config.frame_size, FRAME_DURATION_MS, global_config.sample_rate);
	ast_log(LOG_NOTICE, "  Pipe base path: %s\n", global_config.pipe_base_path);

	/* Register channel technology */
	if (ast_channel_register(&externalmedia_tech)) {
		ast_log(LOG_ERROR, "Failed to register ExternalMedia channel tech\n");
		return AST_MODULE_LOAD_DECLINE;
	}

	return AST_MODULE_LOAD_SUCCESS;
}

/*!
 * \brief Unload the module
 */
static int unload_module(void)
{
	ast_log(LOG_NOTICE, "Unloading ExternalMedia channel driver\n");

	/* Unregister channel technology */
	ast_channel_unregister(&externalmedia_tech);

	return 0;
}

AST_MODULE_INFO(ASTERISK_GPL_KEY, AST_MODFLAG_LOAD_ORDER, "External Media Channel Driver",
	.support_level = AST_MODULE_SUPPORT_EXTENDED,
	.load = load_module,
	.unload = unload_module,
	.load_pri = AST_MODPRI_CHANNEL_DRIVER,
);
