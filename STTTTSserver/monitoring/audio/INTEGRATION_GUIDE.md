# Audio System Integration Guide

This guide provides step-by-step instructions for integrating the audio streaming system with your existing Station-3 monitoring infrastructure.

## Quick Start (5 Minutes)

### Step 1: Install Dependencies
```bash
cd /Users/sagivstavinsky/realtime-translation-enhanced_astrix/3333_4444__Operational/STTTTSserver/audio
npm install
```

### Step 2: Start the Audio Server
```bash
npm start
```

You should see:
```
Starting Integrated Audio Server...
✅ Integrated Audio Server started successfully
📡 HTTP/WebSocket: http://localhost:3030
🎵 RTP Streams: 3333, 4444
🌐 Audio Player: http://localhost:3030/audio-player-visualization.html
```

### Step 3: Open the Audio Player
Open your browser to:
```
http://localhost:3030/audio-player-visualization.html
```

### Step 4: Test with Sample RTP Stream
In a new terminal, send test audio (requires ffmpeg):
```bash
ffmpeg -re -f lavfi -i "sine=frequency=440:duration=60" \
  -ar 48000 -ac 1 -acodec pcm_s16le -f rtp rtp://localhost:3333
```

Click "Play" on Station 3333 in the web interface to hear the audio!

## Integration Methods

### Method 1: Standalone Server (Recommended for Testing)

Run the audio server independently on a different port:

```bash
# Terminal 1: Existing monitoring server (port 3021)
cd /Users/sagivstavinsky/realtime-translation-enhanced_astrix
node github-monitoring-server-11stations.js

# Terminal 2: Audio streaming server (port 3030)
cd /Users/sagivstavinsky/realtime-translation-enhanced_astrix/3333_4444__Operational/STTTTSserver/audio
npm start
```

**Advantages:**
- No changes to existing code
- Easy to debug
- Can restart independently
- Isolated failures

**Disadvantages:**
- Requires two processes
- Uses two ports

### Method 2: Embedded in Existing Server

Integrate directly into `github-monitoring-server-11stations.js`:

#### Step 1: Install dependencies in main project
```bash
cd /Users/sagivstavinsky/realtime-translation-enhanced_astrix
npm install express socket.io --save
```

#### Step 2: Add to your server file
```javascript
// At the top of github-monitoring-server-11stations.js
const IntegratedAudioServer = require('./3333_4444__Operational/STTTTSserver/audio/integrated-audio-server');

// After your existing server setup
const audioServer = new IntegratedAudioServer({
    httpPort: 3031, // Use different port
    rtpPorts: [3333, 4444],
    corsOrigin: '*'
});

// Start audio server
audioServer.start().then(() => {
    console.log('Audio system integrated successfully');
}).catch(err => {
    console.error('Failed to start audio system:', err);
});
```

#### Step 3: Update the monitoring dashboard
Add an iframe to your dashboard HTML to embed the audio player:

```html
<!-- Add to your dashboard HTML -->
<div class="audio-section" style="margin-top: 30px;">
    <h2>🎵 Live Audio Monitoring</h2>
    <iframe
        src="http://localhost:3031/audio-player-visualization.html"
        width="100%"
        height="900px"
        frameborder="0"
        style="border-radius: 10px; box-shadow: 0 4px 6px rgba(0,0,0,0.1);">
    </iframe>
</div>
```

### Method 3: Shared Socket.IO Instance

Share the same Socket.IO instance between monitoring and audio:

```javascript
// In your server file
const express = require('express');
const http = require('http');
const socketIo = require('socket.io');
const AudioStreamingServer = require('./3333_4444__Operational/STTTTSserver/audio/audio-streaming-server');

const app = express();
const server = http.createServer(app);
const io = socketIo(server, {
    cors: {
        origin: "*",
        methods: ["GET", "POST"]
    }
});

// Your existing monitoring setup
io.on('connection', (socket) => {
    console.log('Client connected');

    // Existing monitoring code
    socket.emit('stations', stations);

    // ... rest of your code
});

// Add audio streaming to the same Socket.IO instance
const audioServer = new AudioStreamingServer({
    httpPort: 3021, // Same port!
    rtpPorts: [3333, 4444],
    corsOrigin: '*'
});

// Share the Express app and Socket.IO
audioServer.app = app;
audioServer.io = io;
audioServer.server = server;

// Start only the RTP converters
audioServer.config.rtpPorts.forEach(port => {
    audioServer.startStream(port);
});

// Start the shared server
const PORT = process.env.PORT || 3021;
server.listen(PORT, () => {
    console.log(`Unified server running on port ${PORT}`);
});
```

## Integration with Station-3 Monitoring

### Adding Audio Controls to Station-3 Dashboard

Modify `station3-monitor.html` to include audio controls for each extension:

```html
<!-- In each extension card -->
<div class="extension-card" id="ext3333">
    <h2>Extension 3333</h2>

    <!-- Add audio controls -->
    <div class="audio-controls" style="margin-bottom: 15px;">
        <button onclick="playAudio(3333)" class="audio-btn">🔊 Listen Live</button>
        <input type="range" id="volume-3333" min="0" max="100" value="100"
               onchange="setVolume(3333, this.value)" style="width: 100px;">
    </div>

    <!-- Existing metrics -->
    <div class="metric-grid" id="metrics3333">
        <!-- ... -->
    </div>
</div>

<script>
function playAudio(port) {
    // Open audio player in new window
    window.open(`http://localhost:3030/audio-player-visualization.html?port=${port}`,
                'audioPlayer',
                'width=800,height=600');
}

function setVolume(port, value) {
    // Send volume control to audio server
    fetch(`http://localhost:3030/api/streams/${port}/volume`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ volume: value / 100 })
    });
}
</script>
```

### Adding Audio Visualization to Existing Dashboard

Create a combined dashboard that shows both monitoring and audio:

```html
<!DOCTYPE html>
<html>
<head>
    <title>Station-3 Monitoring + Audio</title>
    <style>
        .dashboard-grid {
            display: grid;
            grid-template-columns: 1fr 1fr;
            gap: 20px;
            padding: 20px;
        }
        .panel {
            background: rgba(255,255,255,0.1);
            border-radius: 15px;
            padding: 20px;
        }
        iframe {
            width: 100%;
            height: 600px;
            border: none;
            border-radius: 10px;
        }
    </style>
</head>
<body>
    <h1>Station-3 Complete Monitoring</h1>

    <div class="dashboard-grid">
        <div class="panel">
            <h2>📊 Metrics Dashboard</h2>
            <iframe src="http://localhost:3021/station3-monitor.html"></iframe>
        </div>

        <div class="panel">
            <h2>🎵 Audio Visualization</h2>
            <iframe src="http://localhost:3030/audio-player-visualization.html"></iframe>
        </div>
    </div>
</body>
</html>
```

## Connecting Real RTP Sources

### From Asterisk/FreePBX
Configure your Asterisk server to send RTP to the monitoring server:

```ini
; In /etc/asterisk/rtp.conf
[general]
rtpstart=3333
rtpend=4444
; Ensure your Azure VM IP is reachable
```

### From Your Translation System
If you're already processing audio in your system:

```javascript
// In your audio processing code
const dgram = require('dgram');
const socket = dgram.createSocket('udp4');

// Send PCM audio as RTP
function sendRTPPacket(pcmData, timestamp, sequenceNumber) {
    const rtpHeader = Buffer.alloc(12);

    // RTP version 2, no padding, no extension, no CSRC
    rtpHeader[0] = 0x80;

    // Payload type (e.g., 0 for PCMU, 96 for OPUS)
    rtpHeader[1] = 96;

    // Sequence number
    rtpHeader.writeUInt16BE(sequenceNumber, 2);

    // Timestamp
    rtpHeader.writeUInt32BE(timestamp, 4);

    // SSRC
    rtpHeader.writeUInt32BE(0x12345678, 8);

    const packet = Buffer.concat([rtpHeader, pcmData]);
    socket.send(packet, 3333, 'localhost');
}
```

### Testing with GStreamer
```bash
# Generate test tone
gst-launch-1.0 audiotestsrc wave=sine freq=440 ! \
  audioconvert ! audioresample ! audio/x-raw,rate=48000,channels=1 ! \
  opusenc ! rtpopuspay ! udpsink host=localhost port=3333

# Stream from microphone
gst-launch-1.0 autoaudiosrc ! \
  audioconvert ! audioresample ! audio/x-raw,rate=48000,channels=1 ! \
  opusenc ! rtpopuspay ! udpsink host=localhost port=4444
```

## Production Deployment

### 1. Environment Configuration
Create `.env` file:
```bash
# Production settings
NODE_ENV=production
AUDIO_HTTP_PORT=3030
RTP_PORTS=3333,4444
CORS_ORIGIN=https://yourdomain.com
ENABLE_MONITORING=true
MONITORING_INTERVAL=2000
VERBOSE_LOGGING=false
```

### 2. Process Manager (PM2)
```bash
# Install PM2
npm install -g pm2

# Start with PM2
pm2 start integrated-audio-server.js --name audio-streaming

# Enable startup on boot
pm2 startup
pm2 save

# Monitor
pm2 logs audio-streaming
pm2 monit
```

### 3. Nginx Reverse Proxy
```nginx
# /etc/nginx/sites-available/audio-streaming
server {
    listen 80;
    server_name audio.yourdomain.com;

    location / {
        proxy_pass http://localhost:3030;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_cache_bypass $http_upgrade;
    }

    # WebSocket support
    location /socket.io/ {
        proxy_pass http://localhost:3030/socket.io/;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection "upgrade";
        proxy_set_header Host $host;
        proxy_buffering off;
    }
}
```

### 4. Firewall Configuration
```bash
# Allow HTTP/WebSocket
sudo ufw allow 3030/tcp

# Allow RTP ports
sudo ufw allow 3333/udp
sudo ufw allow 4444/udp

# Check status
sudo ufw status
```

### 5. SystemD Service
Create `/etc/systemd/system/audio-streaming.service`:
```ini
[Unit]
Description=Station Audio Streaming Service
After=network.target

[Service]
Type=simple
User=youruser
WorkingDirectory=/path/to/audio
ExecStart=/usr/bin/node integrated-audio-server.js
Restart=always
RestartSec=10
StandardOutput=syslog
StandardError=syslog
SyslogIdentifier=audio-streaming
Environment=NODE_ENV=production

[Install]
WantedBy=multi-user.target
```

Enable and start:
```bash
sudo systemctl enable audio-streaming
sudo systemctl start audio-streaming
sudo systemctl status audio-streaming
```

## Troubleshooting Integration

### Issue: Cannot connect to audio server
**Solution:**
1. Check server is running: `curl http://localhost:3030/health`
2. Verify port is not blocked: `sudo netstat -tlnp | grep 3030`
3. Check CORS settings if accessing from different origin

### Issue: No RTP packets received
**Solution:**
1. Verify RTP source is sending: `sudo tcpdump -i any udp port 3333`
2. Check firewall rules: `sudo ufw status`
3. Verify port binding: `sudo netstat -ulnp | grep 3333`

### Issue: Audio is choppy or distorted
**Solution:**
1. Check packet loss in stats
2. Increase jitter buffer size
3. Verify network latency is acceptable
4. Check server CPU usage

### Issue: High latency
**Solution:**
1. Reduce buffer size
2. Check network conditions
3. Verify server performance
4. Consider moving audio server closer to RTP source

## Monitoring & Maintenance

### Health Checks
```bash
# Check server health
curl http://localhost:3030/health

# Check stream status
curl http://localhost:3030/api/streams

# Check specific stream
curl http://localhost:3030/api/streams/3333
```

### Log Monitoring
```bash
# PM2 logs
pm2 logs audio-streaming --lines 100

# SystemD logs
journalctl -u audio-streaming -f

# Custom log file
tail -f /path/to/audio/logs/audio-streaming.log
```

### Performance Monitoring
```javascript
// Add to your monitoring dashboard
setInterval(async () => {
    const response = await fetch('http://localhost:3030/api/streams');
    const data = await response.json();

    data.streams.forEach(stream => {
        console.log(`Stream ${stream.port}:`, {
            packets: stream.stats.packetsReceived,
            lost: stream.stats.packetsLost,
            clients: stream.clients
        });
    });
}, 5000);
```

## Best Practices

1. **Always run audio server on the same machine as RTP source** to minimize latency
2. **Use separate ports** for monitoring and audio to isolate services
3. **Implement rate limiting** to prevent abuse
4. **Monitor packet loss** and alert when threshold exceeded
5. **Use WebSocket compression** for bandwidth optimization
6. **Implement authentication** in production environments
7. **Log all errors** for debugging
8. **Regular backups** of configuration
9. **Test failover scenarios** before production
10. **Document all customizations** for team reference

## Next Steps

1. ✅ Install and test the audio system
2. ✅ Verify RTP packets are being received
3. ✅ Test audio playback in browser
4. ✅ Integrate with existing monitoring dashboard
5. ✅ Configure production environment
6. ✅ Set up monitoring and alerts
7. ✅ Document custom configurations
8. ✅ Train team on system operation

## Support Resources

- **Documentation**: `/audio/README.md`
- **API Reference**: See README.md API section
- **Example Code**: See `/audio/examples/` (if created)
- **Issue Tracker**: Your project's issue tracker

---

**Integration Complete!** You now have a fully functional audio streaming and visualization system integrated with your Station monitoring infrastructure.
