

🎚 Per-Channel Volume Control in Asterisk ARI (Stasis Environment)

⸻

1. Background

When a channel is handed over to a Stasis application,
Asterisk’s dialplan logic no longer applies — no extensions.conf variables,
no Set(VOLUME(...)), and no dialplan-based format conversions.

From that point forward, all control happens via ARI REST or WebSocket API calls.

Therefore, volume management in Stasis must be implemented programmatically in your ARI service.

⸻

2. Core Concept

Each channel object in ARI can have its transmit and receive gain adjusted using channel variables.

These are the same controls as in dialplan, but applied via API.

Direction	Variable	Description
Outbound audio	VOLUME(TX)	Controls the level sent from Asterisk to the endpoint
Inbound audio	VOLUME(RX)	Controls the level received from the endpoint


⸻

3. ARI REST API Example

3.1 Set TX Gain (reduce transmit volume by 3 dB)

POST /ari/channels/{channelId}/variable
Content-Type: application/json

{
  "variable": "VOLUME(TX)",
  "value": "-3"
}

3.2 Set RX Gain (boost receive volume by 2 dB)

POST /ari/channels/{channelId}/variable
Content-Type: application/json

{
  "variable": "VOLUME(RX)",
  "value": "+2"
}

You can call these immediately after the channel enters your Stasis app,
or dynamically at any time during the call.

⸻

4. Node.js Implementation Pattern

Inside your Stasis application (e.g., ai_bridge.js):

const ari = require('ari-client');

ari.connect('http://localhost:8088', 'admin', 'admin', (err, client) => {
  if (err) throw err;

  client.on('StasisStart', async (event, channel) => {
    console.log(`Channel entered Stasis: ${channel.id}`);

    // Example: baseline normalization
    await client.channels.setChannelVar({ channelId: channel.id, variable: 'VOLUME(TX)', value: '-2' });
    await client.channels.setChannelVar({ channelId: channel.id, variable: 'VOLUME(RX)', value: '-2' });

    // Now continue with your ExternalMedia bridge / logic
  });
});

This ensures every channel entering Stasis gets an initial gain adjustment before bridging or media forwarding.

⸻

5. Dynamic AI-Driven Adjustment

If your AI engine measures loudness or emotional intensity,
it can send WebSocket or REST feedback to the ARI service,
which then updates the volume in real time:

// Example callback from AI analysis
function onLoudnessUpdate(channelId, targetGain) {
  client.channels.setChannelVar({
    channelId,
    variable: 'VOLUME(TX)',
    value: targetGain.toString()
  });
}

This provides continuous gain control per participant,
with immediate effect and zero audio interruption.

⸻

6. Integration Sequence (Flow)

sequenceDiagram
    participant SIP as SIP Phone (G.722)
    participant AST as Asterisk (ARI + ExternalMedia)
    participant APP as Node.js ARI App
    participant AI as Translation Server

    SIP->>AST: RTP Audio (G.722)
    AST->>APP: Channel enters Stasis
    APP->>AST: Set VOLUME(TX/RX) via ARI
    AST->>AI: Forward PCM (slin16) through ExternalMedia
    AI-->>AST: Translated PCM (16 kHz)
    AST-->>SIP: Adjusted RTP stream (G.722)


⸻

7. Verification

CLI command:

core show channel <channelId>

You’ll see:

RXgain : -2
TXgain : -3

Logs from ARI client confirm each REST call.

To observe packet behavior:

rtp set debug on


⸻

8. Best Practices

Use Case	Recommended Setting
Normalize mic input	TX = –2 dB
Prevent clipping before AI gateway	TX = –3 dB
Slight boost of translated playback	RX = +1 dB
Adaptive adjustment based on emotion/loudness	Use ARI feedback loop

Tip: Avoid changes > ±5 dB in one step; apply smoothly.

⸻

9. Summary

✅ In Stasis mode, volume control must be done via ARI, not the dialplan.
✅ Use VOLUME(TX) and VOLUME(RX) variables through the API for each channel.
✅ Can be initialized when the channel enters Stasis and updated dynamically later.
✅ Works seamlessly with your AI feedback loop for automatic gain normalization.
✅ Zero audio disruption — gain changes apply instantly to live RTP streams.

