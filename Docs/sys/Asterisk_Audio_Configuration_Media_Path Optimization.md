

⸻

🎧 Asterisk Audio Configuration & Media Path Optimization Guide

⸻

1. Purpose

This document describes how to configure Asterisk to handle high-quality, low-latency audio between:
	•	SIP phones (the user endpoints)
	•	Asterisk PBX (which manages call routing and bridging)
	•	Internal media interfaces such as ExternalMedia, Gateways, and AI translation modules

The goal is to maintain 16 kHz wideband audio quality throughout the system, while ensuring maximum compatibility with standard SIP devices and minimal processing delay for AI/translation workflows.

⸻

2. Architecture Overview

flowchart LR
    SIP["SIP Phone (G.722 16 kHz)"]
    AST["Asterisk Core (slin16 PCM 16 kHz)"]
    GW["ExternalMedia / Gateway (RTP PCM16)"]
    AI["AI Translation / Processing Server"]

    SIP <--> |RTP G.722 (16 kHz)| AST
    AST <--> |RTP slin16 (16 kHz PCM)| GW
    GW <--> |WebSocket PCM16| AI


⸻

3. Audio Design Principle

Asterisk must act as the single conversion and mixing point, converting compressed VoIP codecs into raw PCM (16 kHz) for all internal processing.

Layer	Function	Optimal Audio Format
SIP Phone ↔ Asterisk	External user audio	G.722 (16 kHz, wideband)
Inside Asterisk	Mixing / bridging / recording	slin16 (Signed Linear PCM 16-bit, 16 kHz)
Asterisk ↔ Gateway / AI Server	Media processing / translation	slin16 RTP (PCM16, 20 ms frames)


⸻

4. Step-by-Step Configuration

4.1 Enable Wideband Codec Support

Asterisk supports slin16 (uncompressed 16 kHz PCM) by default, but you must explicitly allow wideband codecs for your SIP endpoints.

PJSIP example – /etc/asterisk/pjsip.conf

[7000]
type=endpoint
context=from-internal
disallow=all
allow=g722,alaw,ulaw
media_encryption=no
direct_media=no

chan_sip example – /etc/asterisk/sip.conf

[7000]
type=friend
context=from-internal
disallow=all
allow=g722,alaw,ulaw

✅ G.722 should appear first in the list so that it is negotiated automatically when available.

⸻

4.2 Force Internal Audio Format to 16 kHz PCM

Tell Asterisk to internally handle all audio as slin16.
Add this line in the dialplan (/etc/asterisk/extensions.conf):

same => n,Set(CHANNEL(format)=slin16)

This forces the channel to convert to 16 kHz PCM internally, ensuring perfect audio for downstream processing (bridges, recordings, ExternalMedia).

⸻

4.3 Allow slin16 in RTP Configuration

Check or update /etc/asterisk/rtp.conf:

[general]
; Allow uncompressed wideband PCM
allow = slin16

This ensures RTP sessions (for ExternalMedia or internal streaming) can use 16 kHz PCM directly.

⸻

4.4 Verify Asterisk Codec Support

Run in Asterisk CLI:

core show codecs

Confirm that the following appear:

g722  : G722 (16 kHz)
slin16: Signed linear PCM (16 kHz)

If both are available, Asterisk can transcode seamlessly between them.

⸻

4.5 Bridge and ExternalMedia Configuration

When creating ExternalMedia channels via ARI (or in your integration logic), always set:

"format": "slin16",
"direction": "both"

This guarantees that all audio exchanged with Gateways or AI servers uses uncompressed 16 kHz PCM.

Example:

POST /ari/channels/externalMedia
{
  "app": "ai_bridge",
  "external_host": "127.0.0.1:5000",
  "format": "slin16",
  "direction": "both",
  "encapsulation": "none"
}


⸻

5. How the Media Flow Works
	1.	SIP phone encodes voice in G.722 (16 kHz wideband).
	2.	Asterisk receives it, decodes, and stores it internally as slin16.
	3.	Asterisk sends this PCM stream to the Gateway via ExternalMedia (RTP).
	4.	Gateway forwards it to the AI translation pipeline (e.g., via WebSocket).
	5.	AI server returns translated audio (PCM16), which goes back to Asterisk and then out to SIP phones as G.722.

Each direction uses one ExternalMedia channel; Asterisk’s bridge engine automatically applies mix-minus so that each user hears everyone except themselves.

⸻

6. Performance and Latency

Path	Conversion	Latency	Quality
G.722 → slin16	Single decode	< 2 ms	Lossless
slin16 ↔ Gateway	None (raw PCM)	< 1 ms	Perfect
slin16 → G.722	Single encode	< 2 ms	Lossless

➡️ Total end-to-end added delay: < 5 ms
(Well below the 150 ms threshold for natural conversation.)

⸻

7. Testing and Verification

Check	Command / Method
Active codecs	core show channels verbose
Codec negotiation	pjsip show endpoint 7000
RTP inspection	rtp set debug on
Audio quality	Record with MixMonitor() or external Gateway sniffer

Expected RTP payload type for G.722: 9
Expected for slin16: 10 (dynamic) depending on configuration.

⸻

8. Recommended Best Practices

✅ Always prioritize G.722 for SIP endpoints.
✅ Use slin16 internally for bridges, recordings, and ExternalMedia.
✅ Avoid transcoding between narrowband (8 kHz) and wideband (16 kHz) whenever possible.
✅ Keep Asterisk and Gateway on the same LAN to minimize RTP jitter.
✅ Record and monitor latency periodically — should remain under 120 ms total.

⸻

9. Example Media Chain (Summary)

Segment	Codec	Sample Rate	Notes
SIP Phone → Asterisk	G.722	16 kHz	HD voice input
Inside Asterisk	slin16	16 kHz	Internal PCM mixing
Asterisk → Gateway	slin16	16 kHz	RTP uncompressed
Gateway → AI Server	PCM16	16 kHz	WebSocket stream
AI Server → Gateway → Asterisk	PCM16 → slin16 → G.722	16 kHz	Translated output


⸻

10. Summary

✅ SIP Phones: use G.722 (HD Voice, 16 kHz)
✅ Asterisk Internal: use slin16 for processing and mixing
✅ ExternalMedia / Gateway: send and receive RTP PCM16
✅ AI Services: receive 16 kHz PCM directly — no resampling required

This configuration ensures:
	•	Crystal-clear HD audio
	•	Consistent 16 kHz fidelity for AI translation
	•	Ultra-low latency (< 120 ms total)
	•	Zero manual codec switching between layers

⸻

