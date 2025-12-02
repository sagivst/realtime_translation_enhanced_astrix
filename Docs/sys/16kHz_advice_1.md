

📌 DOCUMENT 1 — Deployment Instructions (Precise, Technical, Step-by-Step)

Objective:

Switch Asterisk ExternalMedia from PT=10 (L16/16kHz BE) → PT=96 (dynamic PCM16/48kHz LE)
to fix audio distortion, buzzing, and slow playback.

⸻

1. Update Gateway RTP Output (MOST IMPORTANT)

Before

payloadType: 10, // L16 per RFC 3551 (16kHz big-endian)
sampleRate: 16000
chunkSize: 640 // 20ms @16kHz

After

payloadType: 96,      // dynamic — no forced RFC interpretation
sampleRate: 48000,    // Deepgram / ElevenLabs native
chunkSize: 1920       // 20ms @48kHz = 960 samples * 2 bytes
timestampStep: 960    // 20ms @48kHz
format: "PCM16-LE"

✔ Prevents Asterisk from decoding as L16@16kHz big-endian
✔ Tells Asterisk to treat audio as generic PCM
✔ Unlocks wideband and ultra-wideband audio (48kHz)

⸻

2. Update ExternalMedia Creation (ARI)

This ensures Asterisk does not apply transcoding or endian conversion.

POST /ari/channels/externalMedia
{
  "app": "ai_bridge",
  "external_host": "127.0.0.1:5000",
  "format": "slin48",
  "encapsulation": "none",
  "direction": "both"
}

✔ Asterisk now expects raw PCM @48kHz LE
✔ No transcoding
✔ No resampling

⸻

3. Update Asterisk Configuration

/etc/asterisk/rtp.conf

[general]
strictrtp=no
probation=2
rtptimeout=60
rtpholdtimeout=300
rtpkeepalive=20

/etc/asterisk/asterisk.conf

[options]
internal_timing=yes

/etc/asterisk/pjsip.conf

Make sure endpoints allow wideband:

allow=slin48,slin16,g722
disallow=all

✔ This prevents Asterisk from downsampling → distortion gone

⸻

4. Validate After Deployment

Asterisk CLI

rtp set debug on

Expect:

PT=96  len=1920  ts+=960 every packet

Audio Capture Test

mixmonitor test.wav

✔ WAV should contain clean undistorted PCM audio
✔ If distorted, issue is BEFORE ExternalMedia
✔ If WAV is perfect → issue is AFTER (SIP leg)

⸻

5. Rollback Plan (Safe)

If something breaks:
	1.	Set payloadType back to 10
	2.	Set format back to slin16
	3.	Restart Asterisk
	4.	Test again

⸻

📌 DOCUMENT 2 — Professional VoIP Engineering Document (for VoIP Engineers)

Asterisk ExternalMedia – Dynamic Payload Integration for AI Audio Pipelines

Engineers: Please Review & Approve Deployment

⸻

1. Executive Summary

Our Gateway currently sends RTP using Payload Type 10 (L16 @16kHz big-endian).

However:
	•	The AI engine processes audio at 48 kHz little-endian PCM
	•	Asterisk forcibly interprets PT=10 as 16kHz big-endian
	•	Result:
	•	3× slow playback
	•	Buzzing / metallic distortion
	•	Incorrect sample alignment

To resolve this, we are switching to a dynamic payload type (PT=96) with explicit slin48 format.

This is the industry standard approach for wideband PCM in Asterisk + RTP AI systems.

⸻

2. Why PT=96? (Technical Justification)

Per RFC 3551:
	•	PT=10 → always L16 big-endian, 16kHz
	•	This is unsuitable for 48kHz wideband
	•	Asterisk applies forced transcoding rules for PT=10
	•	Dynamic PT values (96–127) allow arbitrary:
	•	Sample rate
	•	Endianness
	•	Channels
	•	Encoding

Therefore:

→ PT=96 is the correct payload type for PCM16 48kHz LE

→ This bypasses all RFC interpretation and codec assumptions

⸻

3. Updated RTP Parameters

AI Engine Output → Gateway

PCM16 little-endian
48,000 samples/sec
960 samples every 20ms (1920 bytes)

RTP Packet Requirements

Parameter	Value
Payload Type	96
Timestamp step	960
Packet interval	20 ms
Clock rate	48000


⸻

4. ExternalMedia Configuration

Asterisk ARI:

{
 "format": "slin48",
 "encapsulation": "none",
 "direction": "both"
}

This ensures:
	•	No transcoding
	•	No byte swapping
	•	No resampling
	•	Endpoints receive pure PCM48

⸻

5. SIP Side Considerations

To avoid transcoding on the SIP leg:
	•	Enable G.722 or slin16
	•	Disable ulaw/alaw unless required
	•	Ensure SIP phones support wideband playback

⸻

6. Testing & Verification Checklist

Ingress (Gateway → Asterisk)

rtp set debug on

Look for:

PT=96  ts+=960  len=1920

Internal Recording

mixmonitor gateway-return.wav

Should be:
	•	No buzz
	•	No slow playback
	•	Clear PCM48

Egress (Asterisk → Phone)

Use Wireshark:

rtp.payload > 100 bytes? (wideband)
rtp.timestamp increments equal?
rtp.marker bits correct?


⸻

7. Confirmation Needed from VoIP Team (3 Questions)
	1.	Does using PT=96 dynamic payload align with your internal policies?
	2.	Any concerns about endpoints not supporting G.722/slin16 fallback?
	3.	Do you require additional logging or transcoding monitoring before rollout?

⸻

8. Deployment Timeline

Stage	Description	Owner	ETA
D1	Update Gateway payload type	AI team	2 hrs
D2	Update ARI ExternalMedia config	VoIP team	1 hr
D3	Restart Asterisk	VoIP team	10 min
D4	End-to-end test	QA	30 min
D5	Approval & rollout	VoIP team	—

Total time: ≤ 4 hours
