All 113 knobs, each in its own small table, with:
	•	Numeric knobs → Valid Range / Recommended Range / AI Adjustment Range
	•	Boolean/enum/list knobs → Valid Values / Recommended Values / AI-Allowed Values


⸻

AGC (Automatic Gain Control)

agc.enabled

Field	Value
Description	Enable or disable automatic gain control on the input.
Unit / Type	boolean
Valid Values	{false, true}
Recommended Values	{true}
AI-Allowed Values	{false, true}

agc.target_level_dbfs

Field	Value
Description	Target RMS level relative to full scale for AGC.
Unit / Type	dBFS (negative)
Valid Range	-60 to 0
Recommended Range	-24 to -14
AI Adjustment Range	-30 to -10

agc.compression_ratio

Field	Value
Description	Gain compression ratio used by AGC.
Unit / Type	dimensionless (ratio)
Valid Range	1.0 to 10.0
Recommended Range	2.0 to 6.0
AI Adjustment Range	1.5 to 8.0

agc.attack_time_ms

Field	Value
Description	Attack time of AGC envelope follower.
Unit / Type	milliseconds
Valid Range	1 to 100
Recommended Range	5 to 20
AI Adjustment Range	1 to 50

agc.release_time_ms

Field	Value
Description	Release time of AGC envelope follower.
Unit / Type	milliseconds
Valid Range	20 to 1000
Recommended Range	80 to 400
AI Adjustment Range	50 to 800

agc.max_gain_db

Field	Value
Description	Maximum gain AGC is allowed to apply.
Unit / Type	dB
Valid Range	0 to 60
Recommended Range	10 to 40
AI Adjustment Range	6 to 50


⸻

AEC (Acoustic Echo Cancellation)

aec.enabled

Field	Value
Description	Enable or disable acoustic echo cancellation.
Unit / Type	boolean
Valid Values	{false, true}
Recommended Values	{true}
AI-Allowed Values	{false, true}

aec.suppression_level_db

Field	Value
Description	Target echo suppression depth.
Unit / Type	dB (negative)
Valid Range	-60 to 0
Recommended Range	-45 to -20
AI Adjustment Range	-50 to -10

aec.tail_length_ms

Field	Value
Description	Maximum echo tail length handled by the AEC.
Unit / Type	milliseconds
Valid Range	32 to 1024
Recommended Range	64 to 256
AI Adjustment Range	64 to 512

aec.nlp_mode

Field	Value
Description	Non-linear processing aggressiveness for echo residual.
Unit / Type	enum (string)
Valid Values	{“off”, “mild”, “moderate”, “aggressive”}
Recommended Values	{“moderate”}
AI-Allowed Values	{“mild”, “moderate”, “aggressive”}


⸻

Noise Reduction (NR)

nr.enabled

Field	Value
Description	Enable or disable noise reduction stage.
Unit / Type	boolean
Valid Values	{false, true}
Recommended Values	{true}
AI-Allowed Values	{false, true}

nr.suppression_level_db

Field	Value
Description	Noise attenuation applied by NR.
Unit / Type	dB (negative)
Valid Range	-30 to 0
Recommended Range	-18 to -6
AI Adjustment Range	-24 to -3

nr.spectral_floor_db

Field	Value
Description	Minimum spectral floor to avoid musical noise.
Unit / Type	dB (negative)
Valid Range	-90 to -40
Recommended Range	-80 to -60
AI Adjustment Range	-85 to -55


⸻

Compressor

compressor.enabled

Field	Value
Description	Enable or disable dynamic range compressor.
Unit / Type	boolean
Valid Values	{false, true}
Recommended Values	{false, true} (depends on use case)
AI-Allowed Values	{false, true}

compressor.threshold_dbfs

Field	Value
Description	Level at which compression starts.
Unit / Type	dBFS (negative)
Valid Range	-40 to 0
Recommended Range	-24 to -6
AI Adjustment Range	-30 to -3

compressor.ratio

Field	Value
Description	Compression ratio once above threshold.
Unit / Type	dimensionless (ratio)
Valid Range	1.0 to 20.0
Recommended Range	2.0 to 6.0
AI Adjustment Range	1.5 to 10.0


⸻

Limiter

limiter.enabled

Field	Value
Description	Enable or disable output limiter.
Unit / Type	boolean
Valid Values	{false, true}
Recommended Values	{true}
AI-Allowed Values	{false, true}

limiter.threshold_dbfs

Field	Value
Description	Peak level ceiling for output limiter.
Unit / Type	dBFS (negative to 0)
Valid Range	-12 to 0
Recommended Range	-6 to -1
AI Adjustment Range	-9 to 0


⸻

Equalizer (EQ)

eq.enabled

Field	Value
Description	Enable or disable EQ filter.
Unit / Type	boolean
Valid Values	{false, true}
Recommended Values	{false, true} (environment-dependent)
AI-Allowed Values	{false, true}

eq.preset

Field	Value
Description	Named EQ preset for voice/audio shaping.
Unit / Type	enum (string)
Valid Values	{“flat”, “voice”, “bright”, “dark”, “custom”}
Recommended Values	{“voice”}
AI-Allowed Values	{“flat”, “voice”, “bright”, “dark”}


⸻

Buffering & Jitter

buffer.size_ms

Field	Value
Description	Base buffer size for playout/processing.
Unit / Type	milliseconds
Valid Range	20 to 2000
Recommended Range	80 to 400
AI Adjustment Range	40 to 800

buffer.jitter_size_ms

Field	Value
Description	Target size of jitter buffer.
Unit / Type	milliseconds
Valid Range	0 to 500
Recommended Range	20 to 120
AI Adjustment Range	10 to 200

buffer.playout_delay_ms

Field	Value
Description	Additional playout delay to smooth jitter.
Unit / Type	milliseconds
Valid Range	0 to 500
Recommended Range	20 to 120
AI Adjustment Range	10 to 200

buffer.adaptive_mode

Field	Value
Description	Enable adaptive buffer resizing.
Unit / Type	boolean
Valid Values	{false, true}
Recommended Values	{true}
AI-Allowed Values	{false, true}

buffer.min_size_ms

Field	Value
Description	Lower bound for adaptive buffer size.
Unit / Type	milliseconds
Valid Range	10 to 200
Recommended Range	20 to 80
AI Adjustment Range	10 to 150

buffer.max_size_ms

Field	Value
Description	Upper bound for adaptive buffer size.
Unit / Type	milliseconds
Valid Range	100 to 5000
Recommended Range	500 to 2000
AI Adjustment Range	300 to 3000

buffer.target_level_pct

Field	Value
Description	Target buffer fill level as percentage.
Unit / Type	percent (0–100)
Valid Range	10 to 90
Recommended Range	40 to 70
AI Adjustment Range	30 to 80

buffer.underrun_threshold_ms

Field	Value
Description	Threshold to consider buffer underrun.
Unit / Type	milliseconds
Valid Range	0 to 200
Recommended Range	5 to 50
AI Adjustment Range	2 to 100

buffer.overrun_threshold_ms

Field	Value
Description	Threshold to consider buffer overrun.
Unit / Type	milliseconds
Valid Range	50 to 5000
Recommended Range	200 to 1500
AI Adjustment Range	100 to 3000

buffer.growth_rate

Field	Value
Description	Multiplicative growth factor when expanding buffer.
Unit / Type	dimensionless (factor)
Valid Range	1.0 to 5.0
Recommended Range	1.2 to 2.0
AI Adjustment Range	1.0 to 3.0

buffer.shrink_rate

Field	Value
Description	Multiplicative factor when shrinking buffer.
Unit / Type	dimensionless (factor)
Valid Range	0.5 to 1.0
Recommended Range	0.80 to 0.98
AI Adjustment Range	0.70 to 1.00

buffer.packet_loss_concealment

Field	Value
Description	Enable packet loss concealment algorithms.
Unit / Type	boolean
Valid Values	{false, true}
Recommended Values	{true}
AI-Allowed Values	{false, true}

buffer.fec_enabled

Field	Value
Description	Enable forward error correction for packets.
Unit / Type	boolean
Valid Values	{false, true}
Recommended Values	{false, true} (depends on bandwidth)
AI-Allowed Values	{false, true}

buffer.interleaving_depth

Field	Value
Description	Packet interleaving depth for loss robustness.
Unit / Type	integer (packets)
Valid Range	0 to 10
Recommended Range	0 to 4
AI Adjustment Range	0 to 6

buffer.reorder_tolerance_ms

Field	Value
Description	Time window to accept out-of-order packets.
Unit / Type	milliseconds
Valid Range	0 to 200
Recommended Range	20 to 80
AI Adjustment Range	10 to 150


⸻

Network / RTP

network.codec

Field	Value
Description	Primary audio codec for RTP stream.
Unit / Type	enum (string)
Valid Values	{“opus”, “pcmu”, “pcma”, “g722”, “g729”}
Recommended Values	{“opus”}
AI-Allowed Values	{“opus”, “pcmu”, “pcma”}

network.bitrate_kbps

Field	Value
Description	Target codec bitrate.
Unit / Type	kbps
Valid Range	6 to 256
Recommended Range	32 to 96
AI Adjustment Range	24 to 128

network.packet_size_ms

Field	Value
Description	RTP packetization interval.
Unit / Type	milliseconds
Valid Range	10 to 60
Recommended Range	20 to 40
AI Adjustment Range	10 to 60

network.dtx_enabled

Field	Value
Description	Enable discontinuous transmission in silence.
Unit / Type	boolean
Valid Values	{false, true}
Recommended Values	{true} for mobile/limited bandwidth, {false} for strict latency
AI-Allowed Values	{false, true}

network.vad_mode

Field	Value
Description	Voice activity detection aggressiveness.
Unit / Type	enum (string)
Valid Values	{“off”, “low”, “normal”, “aggressive”}
Recommended Values	{“normal”}
AI-Allowed Values	{“low”, “normal”, “aggressive”}

network.redundancy_level

Field	Value
Description	Redundant frame count per packet.
Unit / Type	integer (frames)
Valid Range	0 to 3
Recommended Range	0 to 1
AI Adjustment Range	0 to 2

network.retransmission_enabled

Field	Value
Description	Enable RTP retransmission (where supported).
Unit / Type	boolean
Valid Values	{false, true}
Recommended Values	{true} on stable networks, {false} on very lossy links
AI-Allowed Values	{false, true}

network.congestion_control

Field	Value
Description	Congestion control strategy.
Unit / Type	enum (string)
Valid Values	{“off”, “fixed”, “adaptive”}
Recommended Values	{“adaptive”}
AI-Allowed Values	{“fixed”, “adaptive”}

network.qos_dscp

Field	Value
Description	DSCP value for QoS marking.
Unit / Type	integer (0–63)
Valid Range	0 to 63
Recommended Range	34 to 46 (AF41–EF)
AI Adjustment Range	26 to 46

network.rtp_timeout_ms

Field	Value
Description	Timeout with no RTP before call is considered dead.
Unit / Type	milliseconds
Valid Range	1000 to 60000
Recommended Range	4000 to 20000
AI Adjustment Range	2000 to 30000

network.keepalive_interval_ms

Field	Value
Description	Interval between keepalive messages.
Unit / Type	milliseconds
Valid Range	100 to 60000
Recommended Range	500 to 5000
AI Adjustment Range	200 to 10000

network.mtu_size

Field	Value
Description	Network MTU used for RTP/UDP packets.
Unit / Type	bytes
Valid Range	576 to 1500
Recommended Range	1200 to 1500
AI Adjustment Range	1000 to 1500


⸻

Asterisk Core Settings

asterisk.echo_cancel

Field	Value
Description	Echo cancellation tail in taps/frames.
Unit / Type	integer (samples/frames)
Valid Range	0 to 1024
Recommended Range	32 to 256
AI Adjustment Range	0 to 512

asterisk.silence_threshold

Field	Value
Description	Level below which audio is treated as silence.
Unit / Type	arbitrary level units
Valid Range	0 to 1000
Recommended Range	150 to 400
AI Adjustment Range	100 to 600

asterisk.talk_detect

Field	Value
Description	Level above which talk is detected.
Unit / Type	arbitrary level units
Valid Range	0 to 5000
Recommended Range	1500 to 3500
AI Adjustment Range	800 to 4000

asterisk.rx_gain

Field	Value
Description	Receive gain applied by Asterisk.
Unit / Type	dB
Valid Range	-20 to 20
Recommended Range	-3 to 3
AI Adjustment Range	-6 to 6

asterisk.tx_gain

Field	Value
Description	Transmit gain applied by Asterisk.
Unit / Type	dB
Valid Range	-20 to 20
Recommended Range	-3 to 3
AI Adjustment Range	-6 to 6

asterisk.jitter_buffer

Field	Value
Description	Jitter buffer implementation mode.
Unit / Type	enum (string)
Valid Values	{“off”, “fixed”, “adaptive”}
Recommended Values	{“adaptive”}
AI-Allowed Values	{“fixed”, “adaptive”}

asterisk.dtmf_mode

Field	Value
Description	How DTMF is transported.
Unit / Type	enum (string)
Valid Values	{“rfc2833”, “inband”, “sip-info”}
Recommended Values	{“rfc2833”}
AI-Allowed Values	{“rfc2833”, “sip-info”}

asterisk.nat_mode

Field	Value
Description	NAT traversal configuration for endpoints.
Unit / Type	enum (string)
Valid Values	{“auto”, “force_rport”, “comedia”, “off”}
Recommended Values	{“auto”}
AI-Allowed Values	{“auto”, “force_rport”, “comedia”}

asterisk.call_limit

Field	Value
Description	Maximum concurrent calls on this endpoint/context.
Unit / Type	integer (count)
Valid Range	1 to 1000
Recommended Range	5 to 100
AI Adjustment Range	1 to 200

asterisk.registration_timeout

Field	Value
Description	SIP registration expiration.
Unit / Type	seconds
Valid Range	60 to 86400
Recommended Range	600 to 7200
AI Adjustment Range	120 to 14400


⸻

Gateway (WebSocket & Media)

gateway.ws_reconnect_interval_ms

Field	Value
Description	Interval between WebSocket reconnect attempts.
Unit / Type	milliseconds
Valid Range	100 to 60000
Recommended Range	500 to 5000
AI Adjustment Range	200 to 10000

gateway.ws_max_reconnects

Field	Value
Description	Maximum number of reconnect attempts.
Unit / Type	integer (count)
Valid Range	0 to 100
Recommended Range	3 to 20
AI Adjustment Range	0 to 50

gateway.audio_chunk_size

Field	Value
Description	Audio frame size per WebSocket message.
Unit / Type	bytes (PCM or codec frame)
Valid Range	160 to 6400
Recommended Range	320 to 2048
AI Adjustment Range	160 to 4096

gateway.sample_rate

Field	Value
Description	Sample rate used by gateway audio stream.
Unit / Type	Hz
Valid Range	8000 to 48000
Recommended Range	16000 to 24000
AI Adjustment Range	8000 to 48000

gateway.channels

Field	Value
Description	Number of audio channels.
Unit / Type	integer (channels)
Valid Range	1 to 8
Recommended Range	1 to 2
AI Adjustment Range	1 to 2

gateway.encoding

Field	Value
Description	Audio encoding format on gateway link.
Unit / Type	enum (string)
Valid Values	{“pcm”, “opus”, “mulaw”, “alaw”}
Recommended Values	{“pcm”} for internal, {“opus”} for WAN
AI-Allowed Values	{“pcm”, “opus”}

gateway.stream_timeout_ms

Field	Value
Description	Inactivity timeout for media stream.
Unit / Type	milliseconds
Valid Range	1000 to 600000
Recommended Range	30000 to 180000
AI Adjustment Range	10000 to 300000

gateway.debug_mode

Field	Value
Description	Enable verbose debug logging in gateway.
Unit / Type	boolean
Valid Values	{false, true}
Recommended Values	{false} (production)
AI-Allowed Values	{false, true}


⸻

Deepgram (STT)

deepgram.model

Field	Value
Description	Deepgram model identifier.
Unit / Type	enum (string)
Valid Values	{“nova-2”, “nova-2-meeting”, “nova-2-phone”, “enhance-general”}
Recommended Values	{“nova-2”}
AI-Allowed Values	any from Valid Values

deepgram.language

Field	Value
Description	Language code for transcription.
Unit / Type	string (BCP-47)
Valid Values	e.g. “en”, “en-US”, “es”, “ja”, etc.
Recommended Values	deployment-specific (e.g. {“en-US”})
AI-Allowed Values	same as Valid Values (but typically limited per call)

deepgram.punctuate

Field	Value
Description	Add punctuation to transcription.
Unit / Type	boolean
Valid Values	{false, true}
Recommended Values	{true}
AI-Allowed Values	{false, true}

deepgram.profanity_filter

Field	Value
Description	Mask or filter profanities.
Unit / Type	boolean
Valid Values	{false, true}
Recommended Values	{true} for B2C, {false} for raw analytics
AI-Allowed Values	{false, true}

deepgram.redact

Field	Value
Description	Redact sensitive entities.
Unit / Type	boolean
Valid Values	{false, true}
Recommended Values	{true} where compliance requires
AI-Allowed Values	{false, true}

deepgram.diarize

Field	Value
Description	Enable multi-speaker diarization.
Unit / Type	boolean
Valid Values	{false, true}
Recommended Values	{false, true} (per scenario)
AI-Allowed Values	{false, true}

deepgram.smart_format

Field	Value
Description	Apply smart formatting (dates, numbers, etc.).
Unit / Type	boolean
Valid Values	{false, true}
Recommended Values	{true}
AI-Allowed Values	{false, true}

deepgram.interim_results

Field	Value
Description	Enable streaming interim ASR results.
Unit / Type	boolean
Valid Values	{false, true}
Recommended Values	{true} for real-time UX
AI-Allowed Values	{false, true}

deepgram.endpointing

Field	Value
Description	Endpointing timeout after speech to close segment.
Unit / Type	milliseconds
Valid Range	0 to 2000
Recommended Range	200 to 800
AI Adjustment Range	100 to 1500

deepgram.vad_turnoff

Field	Value
Description	VAD-based timeout to turn off stream on long silence.
Unit / Type	milliseconds
Valid Range	0 to 2000
Recommended Range	300 to 900
AI Adjustment Range	100 to 1500

deepgram.keywords

Field	Value
Description	List of boosted keywords/phrases.
Unit / Type	list of strings
Valid Values	any list of phrases; length 0–64
Recommended Values	domain-specific key phrases only
AI-Allowed Values	may add/remove within 0–32 items per call

deepgram.search

Field	Value
Description	Terms to search for in transcript.
Unit / Type	list of strings
Valid Values	any list; length 0–64
Recommended Values	focused set of key intents
AI-Allowed Values	may adjust within 0–32 items per call


⸻

Translation

translation.source_lang

Field	Value
Description	Source language code.
Unit / Type	string (BCP-47 or ISO)
Valid Values	any supported language code
Recommended Values	per deployment (e.g. “en”)
AI-Allowed Values	same as Valid Values (usually fixed per call)

translation.target_lang

Field	Value
Description	Target language code.
Unit / Type	string
Valid Values	any supported language code
Recommended Values	per deployment (e.g. “es”)
AI-Allowed Values	may choose among a configured subset for the call

translation.formality

Field	Value
Description	Formality level of translation.
Unit / Type	enum (string)
Valid Values	{“default”, “more”, “less”}
Recommended Values	{“default”}
AI-Allowed Values	{“default”, “more”, “less”}

translation.preserve_formatting

Field	Value
Description	Preserve original formatting and casing.
Unit / Type	boolean
Valid Values	{false, true}
Recommended Values	{true} for structured text; {false} for raw speech
AI-Allowed Values	{false, true}

translation.glossary_id

Field	Value
Description	Optional glossary identifier.
Unit / Type	string or null
Valid Values	{null or a known glossary ID}
Recommended Values	specific glossary per client, or null
AI-Allowed Values	may switch between {null and a pre-approved set of IDs}

translation.max_length

Field	Value
Description	Maximum characters per translation request.
Unit / Type	integer (characters)
Valid Range	1 to 30000
Recommended Range	100 to 8000
AI Adjustment Range	50 to 12000

translation.timeout_ms

Field	Value
Description	Timeout for translation API call.
Unit / Type	milliseconds
Valid Range	100 to 30000
Recommended Range	500 to 8000
AI Adjustment Range	300 to 15000

translation.cache_enabled

Field	Value
Description	Enable translation result caching.
Unit / Type	boolean
Valid Values	{false, true}
Recommended Values	{true}
AI-Allowed Values	{false, true}


⸻

TTS (Text-to-Speech)

tts.voice_id

Field	Value
Description	TTS voice identifier.
Unit / Type	string (enum per provider)
Valid Values	any valid provider voice ID
Recommended Values	a small curated set (e.g. {“rachel”})
AI-Allowed Values	within a pre-approved voice list per tenant

tts.stability

Field	Value
Description	Stability vs. variability of TTS output.
Unit / Type	float (0.0–1.0)
Valid Range	0.0 to 1.0
Recommended Range	0.3 to 0.8
AI Adjustment Range	0.1 to 0.9

tts.similarity_boost

Field	Value
Description	How strongly to match reference voice timbre.
Unit / Type	float (0.0–1.0)
Valid Range	0.0 to 1.0
Recommended Range	0.5 to 0.9
AI Adjustment Range	0.2 to 1.0

tts.style

Field	Value
Description	Global speaking style parameter.
Unit / Type	float or integer (style index)
Valid Range	-2.0 to 2.0
Recommended Range	-1.0 to 1.0
AI Adjustment Range	-2.0 to 2.0

tts.use_speaker_boost

Field	Value
Description	Enable speaker boost / presence enhancement.
Unit / Type	boolean
Valid Values	{false, true}
Recommended Values	{true}
AI-Allowed Values	{false, true}

tts.model

Field	Value
Description	TTS model identifier.
Unit / Type	enum (string)
Valid Values	{“eleven_monolingual_v1”, “eleven_multilingual_v2”, “fast-v1”}
Recommended Values	{“eleven_monolingual_v1”} or deployment-specific
AI-Allowed Values	any from Valid Values (optionally restricted per tenant)

tts.optimize_streaming_latency

Field	Value
Description	Latency optimization level for streaming TTS.
Unit / Type	integer (preset index)
Valid Range	0 to 4
Recommended Range	1 to 3
AI Adjustment Range	0 to 4

tts.output_format

Field	Value
Description	Audio output format for TTS.
Unit / Type	enum (string)
Valid Values	{“pcm_16000”, “pcm_22050”, “mp3_44100”, “ogg_vorbis”}
Recommended Values	{“pcm_16000”} for telephony
AI-Allowed Values	{“pcm_16000”, “pcm_22050”}

tts.chunk_length_schedule

Field	Value
Description	Schedule of TTS chunk lengths for streaming.
Unit / Type	list of integers (milliseconds)
Valid Range	each element 40 to 1000
Recommended Range	each 80 to 300
AI Adjustment Range	each 60 to 600

tts.voice_cache

Field	Value
Description	Enable caching of voice state/models.
Unit / Type	boolean
Valid Values	{false, true}
Recommended Values	{true}
AI-Allowed Values	{false, true}


⸻

Hume / Emotion Layer

hume.system_prompt

Field	Value
Description	System prompt for Hume EVI behavior.
Unit / Type	string (text)
Valid Values	any UTF-8 text up to provider limit
Recommended Values	curated templates only
AI-Allowed Values	may adjust within a set of pre-approved templates

hume.temperature

Field	Value
Description	Sampling temperature for language generation.
Unit / Type	float
Valid Range	0.0 to 1.5
Recommended Range	0.3 to 0.9
AI Adjustment Range	0.1 to 1.2

hume.max_tokens

Field	Value
Description	Maximum tokens generated per response.
Unit / Type	integer (tokens)
Valid Range	1 to 4000
Recommended Range	100 to 1500
AI Adjustment Range	50 to 3000

hume.emotion_model

Field	Value
Description	Emotion model version to use.
Unit / Type	enum (string)
Valid Values	{“v1”, “v2”, “latest”}
Recommended Values	{“v2”}
AI-Allowed Values	{“v1”, “v2”}

hume.voice_config

Field	Value
Description	Voice configuration profile.
Unit / Type	enum (string)
Valid Values	{“neutral”, “empathic”, “energetic”, “custom”}
Recommended Values	{“empathic”}
AI-Allowed Values	{“neutral”, “empathic”, “energetic”}

hume.interrupt_sensitivity

Field	Value
Description	Sensitivity to user interruptions / barge-in.
Unit / Type	float (0.0–1.0)
Valid Range	0.0 to 1.0
Recommended Range	0.3 to 0.7
AI Adjustment Range	0.1 to 0.9

hume.turn_taking_mode

Field	Value
Description	Strategy for conversation turn-taking.
Unit / Type	enum (string)
Valid Values	{“balanced”, “user-led”, “agent-led”}
Recommended Values	{“balanced”}
AI-Allowed Values	{“balanced”, “user-led”, “agent-led”}

hume.prosody_model

Field	Value
Description	Enable prosody-driven modulation.
Unit / Type	boolean
Valid Values	{false, true}
Recommended Values	{true}
AI-Allowed Values	{false, true}


⸻

System / Runtime

system.thread_priority

Field	Value
Description	Thread priority for audio worker.
Unit / Type	enum (string)
Valid Values	{“low”, “normal”, “high”, “realtime”}
Recommended Values	{“high”} for audio threads
AI-Allowed Values	{“normal”, “high”}

system.cpu_affinity

Field	Value
Description	CPU cores pinned to this process.
Unit / Type	list of integers or null
Valid Values	{null or list of valid CPU indexes}
Recommended Values	small pinned set for audio, or null
AI-Allowed Values	may choose from a pre-approved affinity mask set

system.memory_limit_mb

Field	Value
Description	Memory limit for this process.
Unit / Type	MB
Valid Range	128 to 32768
Recommended Range	512 to 4096
AI Adjustment Range	256 to 8192

system.gc_interval_ms

Field	Value
Description	Interval between GC/cleanup cycles.
Unit / Type	milliseconds
Valid Range	1000 to 600000
Recommended Range	10000 to 120000
AI Adjustment Range	5000 to 300000

system.log_level

Field	Value
Description	Logging verbosity.
Unit / Type	enum (string)
Valid Values	{“trace”, “debug”, “info”, “warn”, “error”}
Recommended Values	{“info”} (production)
AI-Allowed Values	{“info”, “warn”, “error”} (avoid “debug”/“trace” autonomously)

system.metrics_interval_ms

Field	Value
Description	Interval for emitting metrics snapshots.
Unit / Type	milliseconds
Valid Range	100 to 60000
Recommended Range	500 to 5000
AI Adjustment Range	200 to 10000

system.health_check_interval_ms

Field	Value
Description	Interval for internal health checks.
Unit / Type	milliseconds
Valid Range	100 to 600000
Recommended Range	1000 to 10000
AI Adjustment Range	500 to 60000

system.restart_on_error

Field	Value
Description	Automatically restart process on fatal error.
Unit / Type	boolean
Valid Values	{false, true}
Recommended Values	{true}
AI-Allowed Values	{false, true}

system.max_restart_attempts

Field	Value
Description	Max automatic restart attempts before giving up.
Unit / Type	integer (count)
Valid Range	0 to 50
Recommended Range	1 to 10
AI Adjustment Range	0 to 20

system.watchdog_timeout_ms

Field	Value
Description	Watchdog timeout before process is considered hung.
Unit / Type	milliseconds
Valid Range	1000 to 600000
Recommended Range	10000 to 120000
AI Adjustment Range	5000 to 300000

