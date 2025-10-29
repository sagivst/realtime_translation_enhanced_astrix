# SIP.js Integration Guide

## Overview

The translation system now supports **two audio transport options**:

1. **WebRTC (Browser Microphone)** - Direct browser microphone access (original implementation)
2. **SIP/Asterisk (Telephony)** - Connect via SIP protocol to Asterisk PBX

This gives you the flexibility to:
- Use browser microphone for web-based conferences (WebRTC)
- Connect via telephone/SIP for higher audio quality and PSTN integration (SIP)
- Test both transports side-by-side with the same UI

## Key Benefits

### Why SIP.js Integration?

- **Zero UI Disruption**: All existing UI elements remain unchanged
- **Transparent Integration**: Translation pipeline, visualization, and logs work identically with both transports
- **Production-Grade Telephony**: Connect to Asterisk PBX for enterprise telephony features
- **PSTN Integration**: Make/receive calls from traditional phone networks
- **Better Audio Quality**: Professional-grade audio codecs (G.711, Opus, etc.)
- **Easy Migration**: Gradual migration from WebRTC to SIP without rebuilding UI

## Architecture

```
User Interface (UNCHANGED)
  ↓
Audio Transport Selection
  ↓
  ├─→ WebRTC Transport
  │   └─→ navigator.mediaDevices.getUserMedia()
  │
  └─→ SIP Transport
      └─→ SIP.js → Asterisk PBX
  ↓
Same MediaRecorder Pipeline
  ↓
Socket.io → Translation Service
  ↓
STT → MT → TTS (UNCHANGED)
```

## UI Changes (Minimal)

### What Changed

**Join Screen** - Added one dropdown:
```
┌─────────────────────────────────────────┐
│ Audio Connection                         │
│ ┌─────────────────────────────────────┐ │
│ │ 🌐 WebRTC (Browser Microphone)  ▼ │ │
│ └─────────────────────────────────────┘ │
│ WebRTC: Direct browser | SIP: Asterisk │
└─────────────────────────────────────────┘

When "SIP/Asterisk" is selected:

┌─────────────────────────────────────────┐
│ SIP Configuration                        │
│ ┌─────────────────────────────────────┐ │
│ │ SIP Server                           │ │
│ │ wss://your-server:8089/ws            │ │
│ └─────────────────────────────────────┘ │
│ ┌─────────────────────────────────────┐ │
│ │ SIP Username: caller1                │ │
│ └─────────────────────────────────────┘ │
│ ┌─────────────────────────────────────┐ │
│ │ SIP Password: ••••••••               │ │
│ └─────────────────────────────────────┘ │
└─────────────────────────────────────────┘
```

### What Stayed the Same

- ✅ Conference interface
- ✅ Audio visualizer
- ✅ Transcription display
- ✅ Translation feed
- ✅ Pipeline logs
- ✅ Latency stats
- ✅ Participant list

## Using WebRTC Transport (Default)

1. Open the conference app
2. Enter your name and select language
3. Leave "Audio Connection" as **"WebRTC (Browser Microphone)"**
4. Click "Join Conference"
5. Grant microphone permission when prompted

This is the original implementation - no changes!

## Using SIP Transport (New)

### Prerequisites

1. **Asterisk PBX** running with WebSocket support
2. **SIP credentials** (username/password)
3. **SIP endpoint** configured in Asterisk

### Configuration Steps

#### 1. Configure Asterisk for WebSockets

Edit `/etc/asterisk/http.conf`:
```ini
[general]
enabled=yes
bindaddr=0.0.0.0
bindport=8088

; Enable WebSocket support
tlsenable=yes
tlsbindaddr=0.0.0.0:8089
tlscertfile=/etc/asterisk/keys/asterisk.pem
tlsprivatekey=/etc/asterisk/keys/asterisk.key
```

Edit `/etc/asterisk/pjsip.conf`:
```ini
[transport-ws]
type=transport
protocol=ws
bind=0.0.0.0:8089

[caller1]
type=endpoint
context=translation-context
disallow=all
allow=ulaw
allow=alaw
allow=opus
auth=caller1_auth
aors=caller1_aor
dtmf_mode=rfc4733

[caller1_auth]
type=auth
auth_type=userpass
username=caller1
password=secret123

[caller1_aor]
type=aor
max_contacts=5
remove_existing=yes
```

Restart Asterisk:
```bash
sudo asterisk -rx "core reload"
```

#### 2. Use SIP Transport in Web UI

1. Open the conference app
2. Enter your name and select language
3. Change "Audio Connection" to **"📞 SIP/Asterisk (Telephony)"**
4. **SIP Configuration section appears** - Fill in:
   - **SIP Server**: `wss://your-asterisk-server:8089/ws`
   - **SIP Username**: `caller1`
   - **SIP Password**: `secret123`
5. Click "Join Conference"
6. SIP.js will:
   - Connect to Asterisk WebSocket
   - Register with SIP credentials
   - Make outbound call to translation service
   - Establish audio stream

## Code Structure

### Files Created/Modified

**New Files:**
- `public/js/audio-transport.js` (254 lines) - Transport abstraction layer

**Modified Files:**
- `public/index.html` - Added transport selector and SIP config section
- `public/js/conference-silence-detection.js` - Integrated AudioTransport class

### AudioTransport Class

```javascript
class AudioTransport {
    constructor(type = 'webrtc') // 'webrtc' or 'sip'

    async connect(config)        // Connect to audio source
    async disconnect()            // Disconnect
    isConnected()                 // Check connection status
    getType()                     // Get transport type
    getStream()                   // Get MediaStream
}
```

### Usage Example

```javascript
// Initialize transport
const transport = new AudioTransport('sip');

// Connect with SIP configuration
const config = {
    sipServer: 'wss://localhost:8089/ws',
    sipUsername: 'caller1',
    sipPassword: 'secret123',
    sipDomain: 'localhost',
    sipDestination: 'sip:translation@localhost'
};

const stream = await transport.connect(config);

// Use stream with MediaRecorder (same as WebRTC!)
const mediaRecorder = new MediaRecorder(stream);
```

## Testing

### Test WebRTC Transport

1. Open browser console
2. Look for:
```
[AudioTransport] Initialized with type: webrtc
[AudioTransport/WebRTC] Connecting to microphone...
[AudioTransport/WebRTC] ✓ Connected to microphone
[Audio] ✓ Audio stream obtained via webrtc
```

### Test SIP Transport

1. Ensure Asterisk is running
2. Open browser console
3. Select SIP transport
4. Look for:
```
[AudioTransport] Initialized with type: sip
[AudioTransport/SIP] Connecting to SIP server...
[AudioTransport/SIP] Creating SimpleUser with server: wss://...
[AudioTransport/SIP] Connected, registering...
[AudioTransport/SIP] ✓ Registered with SIP server
[AudioTransport/SIP] Calling sip:translation@localhost...
[AudioTransport/SIP] ✓ SIP audio stream ready
[Audio] ✓ Audio stream obtained via sip
```

## Troubleshooting

### Issue: "SIP.js library not available"

**Solution**: Check that SIP.js is loaded:
```html
<script src="https://unpkg.com/sip.js@0.21.2/dist/sip.js"></script>
```

Browser console should show:
```javascript
typeof SimpleUser !== 'undefined' // Should be true
```

### Issue: "WebSocket connection failed"

**Possible causes:**
1. Asterisk not running
2. WebSocket not enabled in Asterisk
3. Wrong server URL (must start with `wss://` or `ws://`)
4. Firewall blocking port 8089

**Solution**:
```bash
# Check Asterisk is running
sudo asterisk -rx "core show version"

# Check WebSocket transport
sudo asterisk -rx "pjsip show transports"

# Should show:
#  Transport:  <TransportId>........  ws        0  0.0.0.0           8089
```

### Issue: "Registration failed (401 Unauthorized)"

**Possible causes:**
1. Wrong username/password
2. SIP auth not configured

**Solution**: Check Asterisk config:
```bash
sudo asterisk -rx "pjsip show auth caller1_auth"
```

### Issue: "Audio stream not working"

**Possible causes:**
1. Microphone permission not granted
2. Browser blocking getUserMedia (needs HTTPS)

**Solution**: Check browser console for errors

### Issue: "Both transports produce same behavior"

**This is correct!** Both transports provide the same MediaStream interface, so all downstream code (visualization, transcription, translation) works identically.

## Comparison: WebRTC vs SIP

| Feature | WebRTC | SIP |
|---------|--------|-----|
| Setup Complexity | ✅ Simple | 🟡 Requires Asterisk |
| Audio Quality | 🟡 Good | ✅ Excellent |
| Latency | ✅ Low | ✅ Low |
| PSTN Integration | ❌ No | ✅ Yes |
| Browser Support | ✅ All modern | ✅ All modern |
| Mobile Support | ✅ Yes | ✅ Yes |
| Production Ready | ✅ Yes | ✅ Yes |
| Cost | ✅ Free | 🟡 Requires PBX |

## Advanced Configuration

### Custom SIP Destination

By default, SIP calls go to `sip:translation@localhost`. To change:

```javascript
// In conference-silence-detection.js
transportConfig.sipDestination = 'sip:conference@yourdomain.com';
```

### Multiple SIP Servers

You can configure multiple servers and select at runtime:

```html
<select id="sipServer">
    <option value="wss://server1:8089/ws">Production Server</option>
    <option value="wss://server2:8089/ws">Backup Server</option>
    <option value="wss://localhost:8089/ws">Local Dev</option>
</select>
```

### SIP Audio Codecs

Configure preferred codecs in Asterisk:

```ini
[caller1]
type=endpoint
disallow=all
allow=opus        ; Best quality (recommended)
allow=ulaw        ; Fallback
allow=alaw        ; Fallback
```

## Production Deployment

### Recommended Setup

```
┌──────────────┐
│  Web Browser │
│              │
│  SIP.js      │
└──────┬───────┘
       │ WSS (TLS)
       ↓
┌──────────────┐
│  Asterisk    │
│  + WebSocket │
│  + PJSIP     │
└──────┬───────┘
       │ SIP
       ↓
┌──────────────┐
│ Translation  │
│ Service      │
└──────────────┘
```

### Security Considerations

1. **Always use WSS (WebSocket Secure)** - Not WS
2. **Strong SIP passwords** - Minimum 16 characters
3. **Firewall rules** - Limit access to SIP ports
4. **TLS certificates** - Use valid certificates (not self-signed)
5. **Rate limiting** - Prevent SIP registration attacks

### Performance Tuning

**Asterisk**:
```ini
[global]
maxfiles=10000
maxload=5
```

**SIP.js**:
```javascript
transportConfig.userAgentOptions = {
    sessionDescriptionHandlerFactoryOptions: {
        constraints: {
            audio: {
                echoCancellation: true,
                noiseSuppression: true,
                autoGainControl: true,
                sampleRate: 16000 // Match translation service
            }
        }
    }
};
```

## Roadmap

### Future Enhancements

- [ ] Add SIP server presets (dropdown)
- [ ] SIP connection status indicator in UI
- [ ] Call quality metrics (jitter, packet loss)
- [ ] Automatic failover (SIP → WebRTC on failure)
- [ ] Recording SIP calls
- [ ] Multiple simultaneous SIP connections
- [ ] SIP transfer/hold functionality

## Support

For issues with:
- **SIP.js library**: https://github.com/onsip/SIP.js
- **Asterisk configuration**: https://docs.asterisk.org
- **This integration**: Open an issue in this repository

## References

- SIP.js Documentation: https://sipjs.com/
- Asterisk PJSIP: https://wiki.asterisk.org/wiki/display/AST/Configuring+res_pjsip
- WebRTC vs SIP: https://webrtc.org/getting-started/overview

---

**Last Updated**: 2025-10-15
**Integration Version**: 1.0
**SIP.js Version**: 0.21.2
