# Snoop + AudioSocket Architecture for Minimal Latency

## Date: 2025-10-27
## Environment: Dev VM (68.219.227.189)

## Architecture Overview

After extensive testing, we determined that **Snoop + AudioSocket** provides the minimal latency audio streaming architecture for Extension 7003.

## Why This Approach?

### Failed Approaches:

1. **ExternalMedia + Bridge**: Failed because ExternalMedia is designed for INJECTING audio INTO Asterisk, not extracting FROM it
   - Symptom: 0 RTP packets received despite bridge showing 2 channels
   - Root cause: `UnicastRTP_LOCAL_PORT` showed Asterisk created its own RTP endpoint, not using our socket

2. **Direct AudioSocket via ARI**: Failed because sending SIP channel to dialplan exits Stasis control
   - Symptom: Channel ended in 0.2 seconds
   - Root cause: `continue` removes channel from ARI control

3. **Snoop + ExternalMedia + Bridge**: Failed because snoop channels didn't persist in bridges
   - Symptom: Bridge only showed 1 channel
   - Root cause: Snoop channels created but not added to bridge successfully

### Why Snoop + AudioSocket Works:

✅ **Minimal Latency**: AudioSocket streams directly over TCP with no file I/O
✅ **Real-time Capture**: Snoop channels tap audio in real-time
✅ **Maintains ARI Control**: SIP channel stays in Stasis, only snoop goes to dialplan
✅ **16kHz Quality**: Preserves slin16 format throughout the pipeline
✅ **Bidirectional Audio**: `spy='both'` captures both directions

## Technical Flow

```
1. SIP Call (1001 → 7003)
   ↓
2. Dialplan: Stasis(translation-7003)
   ↓
3. ARI Server: handleStasisStart
   ↓
4. Answer SIP Channel (stays in ARI control)
   ↓
5. Create Snoop Channel (spy='both')
   ↓
6. Send SNOOP to dialplan: continue(context=audiosocket-7003, extension=s, priority=1)
   ↓
7. Asterisk Dialplan: AudioSocket(127.0.0.1:5050)
   ↓
8. AudioSocket TCP Stream → Node.js Server
   ↓
9. Parse AudioSocket packets (0x01=UUID, 0x10=Audio)
   ↓
10. Broadcast to monitoring clients via WebSocket
```

## Code: ari-audiosocket-server.js

### Key Functions:

**handleStasisStart**: Creates snoop channel and routes to AudioSocket
```javascript
async function handleStasisStart(event) {
    const channel = event.channel;

    // Skip snoop channels to avoid infinite loop
    if (channel.id.startsWith('snoop-')) {
        return;
    }

    // Answer the SIP channel
    await ariRequest('POST', `/channels/${channel.id}/answer`);

    // Create snoop channel (spy='both' for bidirectional)
    const snoopId = `snoop-${channel.id}`;
    const snoopChannel = await ariRequest('POST', `/channels/${channel.id}/snoop`, null, {
        spy: 'both',
        app: APP_NAME,
        snoopId: snoopId
    });

    // Send SNOOP to AudioSocket dialplan (SIP stays in Stasis)
    await ariRequest('POST', `/channels/${snoopChannel.id}/continue?context=audiosocket-7003&extension=s&priority=1`);
}
```

**AudioSocket TCP Server**: Parses AudioSocket protocol packets
```javascript
socket.on('data', (data) => {
    buffer = Buffer.concat([buffer, data]);

    while (buffer.length >= 3) {
        const packetType = buffer[0];
        const length = buffer.readUInt16BE(1);

        if (buffer.length < 3 + length) {
            break; // Wait for complete packet
        }

        const packet = buffer.slice(3, 3 + length);
        buffer = buffer.slice(3 + length);

        if (packetType === 0x01) { // UUID packet
            sessionId = packet.toString('hex');
        } else if (packetType === 0x10) { // Audio packet
            packetsReceived++;
            bytesReceived += packet.length;
            // packet contains raw PCM16 audio
        }
    }
});
```

## Dialplan: /etc/asterisk/extensions.conf

```ini
[from-sip]
exten => 7003,1,NoOp(Test Translation Extension 7003 - ARI+AudioSocket)
exten => 7003,n,Answer()
exten => 7003,n,Stasis(translation-7003)
exten => 7003,n,Hangup()

[audiosocket-7003]
exten => s,1,NoOp(=== AudioSocket for Extension 7003 ===)
 same => n,Answer()
 same => n,AudioSocket(127.0.0.1:5050)
 same => n,Hangup()
```

## Critical Bug Fixes

### Bug 1: Snoop Direction Parameter
**Error**: `Direction must be specified for at least spy or whisper`
**Fix**: Changed `spy: 'in'` to `spy: 'both'`

### Bug 2: Orphaned Channels
**Issue**: Previous ExternalMedia tests left channels in ARI
**Fix**: Delete via ARI REST API before new tests:
```bash
curl -X DELETE http://asterisk:password@localhost:8088/ari/channels/{channelId}
curl -X DELETE http://asterisk:password@localhost:8088/ari/bridges/{bridgeId}
```

## Current Server Status

```
✓ AudioSocket TCP server listening on 127.0.0.1:5050
✓ ARI WebSocket connected to ws://localhost:8088/ari/events?app=translation-7003
✓ HTTP Server on port 3000
✓ Monitoring page: http://68.219.227.189:3000/monitoring-7003.html
✓ No orphaned channels/bridges
```

## Next Steps

1. Make test call to extension 7003
2. Verify audio packets received in monitoring page
3. Integrate Deepgram (ASR) and Hume (emotion) streaming clients
4. Process audio in real-time with minimal buffering

## References

- AudioSocket Protocol: https://docs.asterisk.org/Configuration/Dialplan/AudioSocket/
- ARI Snoop Channels: https://docs.asterisk.org/Asterisk-REST-Interface/Asterisk-REST-Data-Models/#snoop
- Previous findings: `/Users/sagivstavinsky/realtime-translation-enhanced_astrix/docs/sys/AudioSocket_ARI_ExternalMedia.md`
