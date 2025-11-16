Implementation Note designed to fix the Asterisk distortion issue and establish a stable, low-latency PCM16 audio loop between Gateway ↔ Asterisk ↔ SIP endpoints.
Everything is in English, formatted for hand-off to your engineering team.

⸻

🧩 Implementation Note

Fixing PCM16 Distortion in Asterisk ExternalMedia Integration

Version: 1.1 | Applies to: Asterisk 18 – 20 (ExternalMedia)
Target latency: < 120 ms end-to-end

⸻

🎯 Goal

Eliminate “buzzer” or “metallic” artifacts when injecting translated PCM audio back into Asterisk via ExternalMedia.
Root cause: endianness and codec-format mismatch between Asterisk’s internal slin16 and RFC-3551’s L16 (big-endian).

⸻

1️⃣ Asterisk Configuration

/etc/asterisk/rtp.conf

[general]
rtpstart=10000
rtpend=20000
stunaddr=stun.l.google.com:19302
strictrtp=no
probation=2
rtptimeout=60
rtpholdtimeout=300
rtpkeepalive=20

/etc/asterisk/asterisk.conf

[options]
internal_timing=yes

/etc/asterisk/codecs.conf

[slin16]
type=codec
sample_rate=16000
description=Signed Linear 16-bit Little-Endian PCM

/etc/asterisk/pjsip.conf

[transport-udp]
type=transport
protocol=udp
bind=0.0.0.0

[endpoint-wideband]
type=endpoint
context=default
allow=slin16,g722
disallow=all


⸻

2️⃣ ExternalMedia Channel Creation (ARI)

Use little-endian PCM and bypass L16 re-encoding completely.

POST /ari/channels/externalMedia
{
  "app": "ai_bridge",
  "external_host": "127.0.0.1:5000",
  "format": "slin16",
  "encapsulation": "none",
  "direction": "both"
}

✅ This tells Asterisk:
	•	Expect raw 16-bit little-endian samples
	•	Don’t reinterpret payload type 10 (L16) as big-endian
	•	Don’t transcode

⸻

3️⃣ RTP Payload Definition

Use PT = 96 (dynamic) to avoid RFC-3551’s big-endian rule.

a=rtpmap:96 L16/16000/1

Gateway should emit:

packet.payloadType = 96;
packet.timestamp += 320; // 20 ms @ 16 kHz
packet.payload = pcmLittleEndian;

Packet interval: 20 ms exactly

⸻

4️⃣ Gateway Byte-Handling

Remove all byte-swapping; feed and receive PCM as little-endian only.

// correct: already little-endian PCM16
const chunk = pcmBuffer.slice(i, i + 640); // 320 samples
sendRtp(chunk, 96, timestamp);


⸻

5️⃣ Timing & Synchronization

Parameter	Value	Description
Chunk size	640 bytes	320 samples × 2 bytes
Timestamp step	320	Represents 20 ms
Packet interval	20 ms	Must match chunk duration
Sample rate	16 kHz	Consistent system-wide

Optional: add a 2 ms delay buffer to ensure Asterisk’s jitter buffer stays ahead.

⸻

6️⃣ Verification Checklist

Check	Command	Expected
RTP flow	rtp set debug on	PT=96  len=640  ts +320
Channel formats	core show channel <id>	slin16 / slin16
Audio capture	mixmonitor test.wav	Clean playback
Jitter	rtcp debug	< 15 ms
MOS	HOMER / RTCP-XR	≥ 4.0


⸻

7️⃣ Optional Upgrade

If distortion persists even after these fixes:
Upgrade to Asterisk 21 or later — includes commit bde6d11 (“Fix L16 subclass format mis-set in ExternalMedia”).
That patch resolves mis-decoded 16-bit PCM on return streams.

⸻

8️⃣ Expected Result
	•	No byte-swap distortion or phase “buzzing”
	•	RTP timing perfectly aligned (20 ms chunks)
	•	Audio quality MOS ≥ 4.3 end-to-end
	•	Compatible with Deepgram TTS / ElevenLabs PCM feeds
	•	Seamless bidirectional real-time translation loop

