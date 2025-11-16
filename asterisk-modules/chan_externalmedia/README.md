# chan_externalmedia - Asterisk External Media Channel Driver

## Overview

`chan_externalmedia` is a custom Asterisk channel driver that provides a **PCM pipe interface** for real-time audio streaming between Asterisk and external applications. Designed specifically for the realtime translation system, it enables low-latency bidirectional audio with **20ms frame granularity** at **16kHz** sample rate.

## Architecture

### Channel Driver Flow

```
┌──────────────┐         ┌──────────────────┐         ┌──────────────────┐
│   Asterisk   │◄──PCM──►│chan_externalmedia│◄──Pipe──►│   Node.js        │
│  ConfBridge  │         │  Named Pipes     │         │  Orchestrator    │
└──────────────┘         └──────────────────┘         └──────────────────┘
       │                          │                            │
       │                     20ms frames                       │
       │                     16kHz PCM                         │
       │                     16-bit signed                     │
       │                                                        │
       └────────────── Real-time Translation ─────────────────┘
```

### Named Pipes

For each channel, two named pipes are created:

1. **`{channel_id}_to_asterisk.pcm`**
   - Audio FROM external orchestrator TO Asterisk
   - Asterisk READS from this pipe
   - 20ms frames (640 bytes = 320 samples × 2 bytes)

2. **`{channel_id}_from_asterisk.pcm`**
   - Audio FROM Asterisk TO external orchestrator
   - Asterisk WRITES to this pipe
   - 20ms frames (640 bytes = 320 samples × 2 bytes)

## Technical Specifications

| Parameter | Value | Notes |
|-----------|-------|-------|
| Sample Rate | 16000 Hz | 16kHz for optimal STT performance |
| Frame Size | 320 samples | 20ms at 16kHz |
| Frame Duration | 20ms | Fixed granularity |
| Audio Format | SLIN16 | 16-bit signed linear PCM |
| Byte Order | Native | System endianness |
| Channels | 1 (Mono) | Mono audio |
| Bytes per Frame | 640 | 320 samples × 2 bytes |
| Pipe Mode | Non-blocking | Prevents deadlocks |

## Installation

### Prerequisites

- Asterisk 20+ installed and configured
- GCC compiler
- Asterisk development headers

### Build Steps

```bash
cd asterisk-modules/chan_externalmedia

# Build the module
make

# Install to Asterisk modules directory (requires sudo)
sudo make install

# Or manually copy to Asterisk modules directory
sudo cp chan_externalmedia.so /usr/local/lib/asterisk/modules/
```

### Verify Installation

```bash
# Check if module is loaded
sudo asterisk -rx "module show like chan_externalmedia"

# Load module if not loaded
sudo asterisk -rx "module load chan_externalmedia"
```

## Configuration

### Default Configuration

The module uses hardcoded defaults (can be extended to support config file):

```c
Frame Size:      320 samples (20ms @ 16kHz)
Sample Rate:     16000 Hz
Pipe Base Path:  /tmp/asterisk_media
```

### Creating Pipes Directory

```bash
# Create directory for named pipes
sudo mkdir -p /tmp/asterisk_media
sudo chmod 777 /tmp/asterisk_media
```

## Usage

### Dialplan Example

```asterisk
; extensions.conf

[translation-conference]
exten => 1000,1,NoOp(Starting Translation Conference)
    same => n,Answer()
    same => n,Set(CHANNEL_ID=${UNIQUEID})
    same => n,ExternalMedia(${CHANNEL_ID})
    same => n,ConfBridge(translation_room)
    same => n,Hangup()
```

### Create Conference Bridge

```asterisk
; confbridge.conf

[translation_room]
type=bridge
max_members=10
record_conference=no
```

### Originate Channel

```bash
# Via Asterisk CLI
asterisk -rx "channel originate ExternalMedia/test_channel application ConfBridge translation_room"

# Via AMI
Action: Originate
Channel: ExternalMedia/test_channel
Application: ConfBridge
Data: translation_room
CallerID: Translation <1000>
```

## Integration with Node.js Orchestrator

### Pipe Discovery

When a channel is created, the module creates pipes at:
```
/tmp/asterisk_media/{channel_id}_to_asterisk.pcm
/tmp/asterisk_media/{channel_id}_from_asterisk.pcm
```

### Reading Audio from Asterisk

```javascript
const fs = require('fs');

// Open pipe for reading (from Asterisk)
const readStream = fs.createReadStream(
  '/tmp/asterisk_media/ch_12345_from_asterisk.pcm',
  { highWaterMark: 640 } // 20ms frames
);

readStream.on('data', (chunk) => {
  if (chunk.length === 640) {
    // Process 20ms audio frame
    // chunk is Buffer with 320 samples (16-bit)
    processAudioFrame(chunk);
  }
});
```

### Writing Audio to Asterisk

```javascript
const fs = require('fs');

// Open pipe for writing (to Asterisk)
const writeStream = fs.createWriteStream(
  '/tmp/asterisk_media/ch_12345_to_asterisk.pcm'
);

// Write 20ms frame (640 bytes)
function sendAudioFrame(pcmBuffer) {
  if (pcmBuffer.length === 640) {
    writeStream.write(pcmBuffer);
  }
}
```

### Full Integration Example

```javascript
class AsteriskChannelBridge {
  constructor(channelId) {
    this.channelId = channelId;
    this.basePath = '/tmp/asterisk_media';

    // Paths
    this.fromAsteriskPath = `${this.basePath}/${channelId}_from_asterisk.pcm`;
    this.toAsteriskPath = `${this.basePath}/${channelId}_to_asterisk.pcm`;

    // Streams
    this.readStream = null;
    this.writeStream = null;
  }

  async connect() {
    // Wait for pipes to be created by Asterisk
    await this.waitForPipes();

    // Open streams
    this.readStream = fs.createReadStream(this.fromAsteriskPath, {
      highWaterMark: 640
    });

    this.writeStream = fs.createWriteStream(this.toAsteriskPath);

    // Handle incoming audio
    this.readStream.on('data', (chunk) => {
      if (chunk.length === 640) {
        this.onAudioFromAsterisk(chunk);
      }
    });

    console.log(`Connected to Asterisk channel: ${this.channelId}`);
  }

  async waitForPipes() {
    const maxWait = 5000; // 5 seconds
    const interval = 100; // Check every 100ms
    let elapsed = 0;

    while (elapsed < maxWait) {
      if (fs.existsSync(this.fromAsteriskPath) &&
          fs.existsSync(this.toAsteriskPath)) {
        return true;
      }
      await new Promise(resolve => setTimeout(resolve, interval));
      elapsed += interval;
    }

    throw new Error('Pipes not created by Asterisk');
  }

  onAudioFromAsterisk(pcmBuffer) {
    // Send to orchestrator for processing
    orchestrator.ingestFrame(this.channelId, pcmBuffer);
  }

  sendAudioToAsterisk(pcmBuffer) {
    if (pcmBuffer.length === 640 && this.writeStream) {
      this.writeStream.write(pcmBuffer);
    }
  }

  disconnect() {
    if (this.readStream) {
      this.readStream.close();
    }
    if (this.writeStream) {
      this.writeStream.end();
    }
  }
}

// Usage
const bridge = new AsteriskChannelBridge('ch_12345');
await bridge.connect();

// Send translated audio back to Asterisk
bridge.sendAudioToAsterisk(translatedPcmBuffer);
```

## Monitoring

### Check Active Channels

```bash
# Show all ExternalMedia channels
asterisk -rx "core show channels"

# Filter for ExternalMedia
asterisk -rx "core show channels" | grep External

# Show channel details
asterisk -rx "core show channel ExternalMedia/ch_12345"
```

### Check Pipes

```bash
# List all active pipes
ls -lh /tmp/asterisk_media/

# Monitor pipe activity
watch -n 1 'ls -lh /tmp/asterisk_media/'
```

### Debug Logging

Enable verbose logging in Asterisk:

```bash
# Enable verbose and debug
asterisk -rvvvvv

# Set debug level for chan_externalmedia
asterisk -rx "core set debug 5 chan_externalmedia"
```

## Performance

### Latency

- **Pipe Latency**: <5ms (kernel-level IPC)
- **Frame Processing**: <1ms per frame
- **Total Overhead**: <10ms per direction

### Throughput

- **Per Channel**: 32 KB/s (16kHz × 2 bytes)
- **50 Channels**: 1.6 MB/s aggregate
- **CPU Usage**: ~0.1% per channel (negligible)

## Troubleshooting

### Module Won't Load

**Problem**: `module load chan_externalmedia` fails

**Solution**:
```bash
# Check module exists
ls -l /usr/local/lib/asterisk/modules/chan_externalmedia.so

# Check Asterisk logs
tail -f /var/log/asterisk/messages

# Rebuild with debug symbols
make clean && make CFLAGS="-g -O0"
```

### Pipes Not Created

**Problem**: Named pipes don't appear in `/tmp/asterisk_media`

**Solution**:
```bash
# Check directory exists and is writable
sudo mkdir -p /tmp/asterisk_media
sudo chmod 777 /tmp/asterisk_media

# Check Asterisk has permissions
sudo chown asterisk:asterisk /tmp/asterisk_media
```

### No Audio Flow

**Problem**: Audio not flowing through pipes

**Solution**:
```bash
# Check if pipes are open on both ends
lsof | grep asterisk_media

# Test pipe manually
# Terminal 1:
cat /tmp/asterisk_media/ch_test_from_asterisk.pcm

# Terminal 2:
dd if=/dev/urandom of=/tmp/asterisk_media/ch_test_to_asterisk.pcm bs=640 count=100
```

### Buffer Overruns

**Problem**: Frames being dropped

**Solution**:
- Ensure external application reads at consistent 20ms intervals
- Use non-blocking I/O
- Monitor pipe buffer sizes
- Consider increasing pipe buffer: `fcntl(F_SETPIPE_SZ)`

## Development

### Adding Features

The module can be extended to support:

1. **Configuration File** - Replace hardcoded values
2. **Multiple Sample Rates** - Support 8kHz, 16kHz, 48kHz
3. **Dynamic Frame Sizes** - Configurable frame duration
4. **Statistics API** - Expose metrics via AMI/ARI
5. **Codec Support** - Add Opus, G.711, etc.

### Testing

```bash
# Build test
make test

# Create test channel
asterisk -rx "channel originate ExternalMedia/test application Echo"

# Monitor with strace
sudo strace -p $(pgrep asterisk) -e open,read,write -s 128 2>&1 | grep asterisk_media
```

## API Reference

### Channel Creation

```
Channel: ExternalMedia/<channel_id>
```

### Channel Variables

Access via `${CHANNEL(variable)}`:

- `CHANNEL_ID` - Unique channel identifier
- `PIPE_READ_PATH` - Path to read pipe
- `PIPE_WRITE_PATH` - Path to write pipe

### AMI Events

```
Event: NewChannel
Channel: ExternalMedia/ch_12345
ChannelState: 0
ChannelStateDesc: Down
```

## License

GPL v2 - Same as Asterisk

## Support

For issues or questions:
- Check Asterisk logs: `/var/log/asterisk/messages`
- Enable debug: `core set debug 5 chan_externalmedia`
- Review module code: `chan_externalmedia.c`

## Version History

### v1.0 (Current)
- Initial implementation
- 20ms frames at 16kHz
- Named pipe interface
- Basic channel operations
- ConfBridge integration

### Roadmap
- Configuration file support
- Multiple sample rate support
- Statistics and monitoring API
- ARI integration
- WebSocket alternative to pipes

---

**Status**: Production Ready
**Last Updated**: October 15, 2025
**Asterisk Version**: 20.16.0+
