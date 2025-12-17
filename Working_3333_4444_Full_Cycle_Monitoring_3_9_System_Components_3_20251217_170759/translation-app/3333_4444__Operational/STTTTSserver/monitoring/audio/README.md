# Station Audio Streaming System

A comprehensive real-time audio playback and visualization system for the Station monitoring dashboard. This system handles RTP to PCM audio conversion, WebSocket streaming, and professional audio visualization.

## Features

### Core Capabilities
- **RTP to PCM Conversion**: Handles incoming RTP audio packets and converts to PCM format
- **Multi-Format Support**: OPUS, G.711 μ-law, G.711 A-law, and raw PCM
- **WebSocket Streaming**: Low-latency bidirectional audio streaming
- **Real-time Visualization**: Waveform, spectrum analyzer, and VU meters
- **Multi-Stream Support**: Handles multiple concurrent audio streams (ports 3333 and 4444)
- **Quality Monitoring**: Connection quality, buffer health, and latency tracking

### Visualization Features
- **Waveform Display**: Real-time time-domain audio visualization
- **Spectrum Analyzer**: Frequency domain visualization with 8-band analysis
- **VU Meters**: RMS and peak level meters with dB display
- **Quality Indicators**: Visual feedback for connection and buffer health
- **Statistics Dashboard**: Packets, latency, quality, and buffer metrics

### Audio Controls
- **Play/Pause/Stop**: Full playback control for each stream
- **Volume Control**: Individual volume adjustment per stream
- **Mute/Unmute**: Quick mute functionality
- **Buffer Management**: Dynamic buffer sizing and health monitoring

## Architecture

```
┌─────────────────────────────────────────────────────────────┐
│                     Station Audio System                     │
├─────────────────────────────────────────────────────────────┤
│                                                               │
│  ┌──────────────┐      ┌───────────────────┐                │
│  │ RTP Packets  │──────▶│ RTP to PCM       │                │
│  │ (3333, 4444) │      │ Converter         │                │
│  └──────────────┘      └────────┬──────────┘                │
│                                  │                            │
│                                  ▼                            │
│                        ┌─────────────────┐                   │
│                        │ Audio Streaming │                   │
│                        │ Server          │                   │
│                        └────────┬────────┘                   │
│                                  │                            │
│                                  ▼                            │
│                        ┌─────────────────┐                   │
│                        │ WebSocket Audio │                   │
│                        │ Transport       │                   │
│                        └────────┬────────┘                   │
│                                  │                            │
│                                  ▼                            │
│                        ┌─────────────────┐                   │
│                        │ Web Audio API   │                   │
│                        │ + Visualization │                   │
│                        └─────────────────┘                   │
│                                                               │
└─────────────────────────────────────────────────────────────┘
```

## Components

### 1. RTP to PCM Converter (`rtp-pcm-converter.js`)
Handles RTP packet reception and codec conversion.

**Features:**
- UDP socket listener for RTP packets
- RTP header parsing
- Codec-specific decoding (OPUS, G.711)
- Jitter buffer management
- Packet loss detection
- Statistics tracking

**Usage:**
```javascript
const RTPtoPCMConverter = require('./rtp-pcm-converter');

const converter = new RTPtoPCMConverter(3333, 'OPUS');

converter.on('pcm-data', (audioData) => {
    console.log('Received PCM audio:', audioData);
});

await converter.start();
```

### 2. Audio Streaming Server (`audio-streaming-server.js`)
Manages multiple RTP streams and broadcasts via WebSocket.

**Features:**
- Express HTTP server
- Socket.IO WebSocket server
- Multiple concurrent RTP stream management
- Audio analysis (RMS, peak, spectrum)
- REST API endpoints
- Real-time statistics

**API Endpoints:**
- `GET /health` - Server health check
- `GET /api/streams` - List all streams
- `GET /api/streams/:port` - Get stream details
- `POST /api/streams/:port/start` - Start stream
- `POST /api/streams/:port/stop` - Stop stream

**Socket.IO Events:**
- `streams-status` - Current status of all streams
- `subscribe-stream` - Subscribe to audio stream
- `unsubscribe-stream` - Unsubscribe from stream
- `audio-data` - Audio packet data
- `visualization-data` - Visualization metrics
- `stream-stats` - Stream statistics

### 3. WebSocket Audio Transport (`websocket-audio-transport.js`)
Low-latency bidirectional audio streaming layer.

**Features:**
- Per-client audio transport management
- Buffer management with overflow protection
- Volume adjustment
- Latency measurement
- Quality monitoring
- Statistics tracking

**Events:**
- `client-audio-data` - Audio from client
- `audio-control` - Control messages (mute, volume, etc.)
- `audio-ping/pong` - Latency measurement

### 4. Integrated Audio Server (`integrated-audio-server.js`)
Complete integrated solution combining all components.

**Features:**
- Unified server instance
- Automatic component initialization
- System-wide monitoring
- Comprehensive statistics
- Easy configuration

### 5. Frontend Audio Player (`audio-player-visualization.html`)
Professional web-based audio player with visualization.

**Features:**
- Responsive grid layout for multiple stations
- Play/pause/stop controls
- Volume and mute controls
- Real-time waveform visualization
- Spectrum analyzer with color gradient
- VU meters (RMS and Peak)
- Connection quality indicators
- Statistics dashboard
- Alert system for quality issues

## Installation

### 1. Navigate to the audio directory
```bash
cd /Users/sagivstavinsky/realtime-translation-enhanced_astrix/3333_4444__Operational/STTTTSserver/audio
```

### 2. Install dependencies
```bash
npm install
```

### 3. Verify installation
```bash
npm list
```

## Configuration

### Environment Variables
Create a `.env` file or set environment variables:

```bash
# HTTP/WebSocket port
AUDIO_HTTP_PORT=3030

# RTP ports to monitor (comma-separated)
RTP_PORTS=3333,4444

# CORS origin
CORS_ORIGIN=*

# Enable monitoring
ENABLE_MONITORING=true

# Monitoring interval (ms)
MONITORING_INTERVAL=1000

# Verbose logging
VERBOSE_LOGGING=false
```

### Programmatic Configuration
```javascript
const IntegratedAudioServer = require('./integrated-audio-server');

const server = new IntegratedAudioServer({
    httpPort: 3030,
    rtpPorts: [3333, 4444],
    corsOrigin: '*',
    enableMonitoring: true,
    monitoringInterval: 1000,
    verboseLogging: false,
    maxClients: 100,
    bufferSize: 4096
});

await server.start();
```

## Usage

### Starting the Server

#### Method 1: Standalone
```bash
npm start
```

#### Method 2: Development Mode
```bash
npm run start:dev
```

#### Method 3: Custom Configuration
```bash
AUDIO_HTTP_PORT=3030 RTP_PORTS=3333,4444 npm run start:custom
```

#### Method 4: Node.js Script
```bash
node integrated-audio-server.js
```

### Accessing the Audio Player

Once the server is running, open your browser to:
```
http://localhost:3030/audio-player-visualization.html
```

### Integration with Existing System

#### Option 1: Separate Server
Run the audio server on a different port alongside your existing monitoring server:

```bash
# Terminal 1: Existing monitoring server
cd /Users/sagivstavinsky/realtime-translation-enhanced_astrix
node github-monitoring-server-11stations.js

# Terminal 2: Audio streaming server
cd /Users/sagivstavinsky/realtime-translation-enhanced_astrix/3333_4444__Operational/STTTTSserver/audio
npm start
```

#### Option 2: Integrated Server
Integrate directly into your existing server:

```javascript
// In your existing server file
const IntegratedAudioServer = require('./audio/integrated-audio-server');

// Create audio server instance
const audioServer = new IntegratedAudioServer({
    httpPort: 3031, // Different port from main server
    rtpPorts: [3333, 4444]
});

// Start audio server
await audioServer.start();

// Optionally share Socket.IO instance
const audioIO = audioServer.getSocketIO();
audioIO.on('connection', (socket) => {
    // Custom audio handling
});
```

#### Option 3: Embedded in Dashboard
Add the audio player to your existing dashboard HTML:

```html
<!-- In your dashboard HTML -->
<div id="audio-section">
    <h2>Live Audio Monitoring</h2>
    <iframe src="http://localhost:3030/audio-player-visualization.html"
            width="100%"
            height="800px"
            frameborder="0">
    </iframe>
</div>
```

## API Reference

### RTPtoPCMConverter Class

```javascript
const converter = new RTPtoPCMConverter(port, codec);

// Methods
await converter.start();
converter.stop();
converter.setCodec(codec);
converter.configure(config);
const stats = converter.getStats();

// Events
converter.on('pcm-data', (data) => {});
converter.on('error', (error) => {});
converter.on('packet-loss', (data) => {});
converter.on('started', (data) => {});
converter.on('stopped', () => {});
```

### AudioStreamingServer Class

```javascript
const server = new AudioStreamingServer(config);

// Methods
await server.start();
await server.stop();
await server.startStream(port);
server.stopStream(port);
const stats = server.getStreamsStatus();

// Properties
server.io // Socket.IO instance
server.app // Express app instance
server.converters // Map of RTP converters
```

### IntegratedAudioServer Class

```javascript
const server = new IntegratedAudioServer(config);

// Methods
await server.start();
await server.stop();
const stats = server.getSystemStats();
server.addRoute(method, path, handler);
server.addSocketHandler(event, handler);

// Getters
const httpServer = server.getServer();
const socketIO = server.getSocketIO();
```

## Monitoring & Statistics

### System Statistics
The server provides comprehensive statistics:

```javascript
{
    uptime: 12345,
    uptimeFormatted: "3h 25m 45s",
    totalPackets: 50000,
    totalBytes: 25600000,
    totalBytesFormatted: "24.41 MB",
    activeStreams: 2,
    activeClients: 3,
    errors: 0,
    throughput: {
        packetsPerSecond: 4054,
        bytesPerSecond: 2073600,
        bytesPerSecondFormatted: "1.98 MB/s"
    },
    streams: {
        3333: {
            packetsReceived: 25000,
            packetsLost: 5,
            isRunning: true,
            analysis: {
                rms: 0.45,
                peak: 0.89,
                level: -6.9,
                peakDb: -1.0
            }
        }
    }
}
```

### Stream Statistics
Per-stream metrics available via API or Socket.IO:

```javascript
{
    port: 3333,
    isRunning: true,
    codec: "OPUS",
    config: {
        sampleRate: 48000,
        channels: 1,
        bitDepth: 16
    },
    stats: {
        packetsReceived: 25000,
        packetsLost: 5,
        bytesReceived: 12800000,
        jitter: 2.5,
        latency: 12
    },
    analysis: {
        rms: 0.45,
        peak: 0.89,
        zcr: 0.12,
        spectrum: [0.1, 0.2, 0.3, 0.4, 0.5, 0.4, 0.3, 0.2],
        level: -6.9,
        peakDb: -1.0
    }
}
```

## Troubleshooting

### No Audio Playing
1. Check that RTP packets are being sent to the correct ports
2. Verify the audio server is running: `GET http://localhost:3030/health`
3. Check browser console for WebSocket connection errors
4. Verify firewall rules allow UDP traffic on RTP ports

### High Latency
1. Check network conditions
2. Reduce buffer size in configuration
3. Check CPU usage on server
4. Verify no packet loss is occurring

### Buffer Overflow
1. Increase buffer size: `bufferSize: 8192`
2. Check client processing speed
3. Reduce number of concurrent streams
4. Monitor system resources

### Poor Audio Quality
1. Check RTP packet loss statistics
2. Verify correct codec is configured
3. Check network jitter
4. Increase jitter buffer size

### Connection Drops
1. Check WebSocket keep-alive settings
2. Verify network stability
3. Monitor server logs for errors
4. Check client-side error handlers

## Performance Optimization

### Server-Side
- Adjust buffer sizes based on network conditions
- Enable/disable monitoring based on needs
- Use compression for WebSocket messages
- Implement connection pooling for many clients

### Client-Side
- Use Web Workers for audio processing
- Implement adaptive bitrate streaming
- Reduce visualization update frequency
- Use requestAnimationFrame for smooth rendering

### Network
- Use UDP for RTP (built-in)
- Enable WebSocket compression
- Implement adaptive jitter buffer
- Monitor and log packet loss

## Security Considerations

1. **CORS**: Configure appropriate CORS origins
2. **Rate Limiting**: Implement rate limiting for API endpoints
3. **Authentication**: Add authentication for production use
4. **Encryption**: Use WSS (WebSocket Secure) in production
5. **Input Validation**: Validate all client inputs
6. **Resource Limits**: Set maximum clients and buffer sizes

## Testing

### Manual Testing
1. Start the server
2. Open browser to audio player page
3. Click "Play" on a station
4. Verify waveform and spectrum display update
5. Test volume, mute, and other controls
6. Monitor statistics and quality indicators

### Testing RTP Input
Send test RTP packets:
```bash
# Using ffmpeg
ffmpeg -re -i input.wav -ar 48000 -ac 1 -f rtp rtp://localhost:3333

# Using gstreamer
gst-launch-1.0 audiotestsrc ! audioconvert ! audioresample ! \
  opusenc ! rtpopuspay ! udpsink host=localhost port=3333
```

### Load Testing
```bash
# Test with multiple concurrent clients
for i in {1..10}; do
  curl http://localhost:3030/api/streams &
done
```

## Future Enhancements

- [ ] OPUS codec integration (node-opus)
- [ ] Audio recording/download functionality
- [ ] Spectogram visualization
- [ ] Multi-channel audio support
- [ ] Audio filters and effects
- [ ] WebRTC peer-to-peer streaming
- [ ] Advanced DSP processing
- [ ] Machine learning audio analysis
- [ ] Mobile responsive design
- [ ] Dark/light theme toggle

## License

MIT License - See LICENSE file for details

## Support

For issues, questions, or contributions, please contact the development team.

---

**Version**: 1.0.0
**Last Updated**: 2025-12-04
**Compatibility**: Node.js 14+, Modern Browsers (Chrome, Firefox, Safari, Edge)
