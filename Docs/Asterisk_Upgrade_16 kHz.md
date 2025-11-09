
# Asterisk Wideband Upgrade Plan (16 kHz / SLIN16 / Opus)

**Author:** Sagiv Stavinsky  
**Audience:** VoIP / NOC / DevOps teams  
**Version:** 1.0  
**Date:** October 2025  

---

## 1. Objective

Upgrade the production Asterisk instance to **support 16 kHz wideband audio** (SLIN16 / Opus / G.722) to enable full-bandwidth integration with AI voice engines (Deepgram, Hume AI, ElevenLabs) and improve overall call quality, without disrupting existing 8 kHz narrowband endpoints.

---

## 2. Scope

- Applies to all Asterisk servers currently using 8 kHz (`slin` / G.711).  
- Upgrade affects:
  - `pjsip.conf` or `sip.conf`
  - `rtp.conf`
  - `modules.conf`
  - (optionally) `extensions.conf` for `ExternalMedia`
- No changes required on the AI servers or SIP clients that already support Opus/G.722.  
- No service downtime expected beyond a single restart.

---

## 3. Key Benefits

| Benefit | Description |
|----------|-------------|
| 🎧 High-definition audio | Voice fidelity improves from 300–3400 Hz → 50–7000 Hz |
| 🧠 AI model compatibility | Matches the native 16 kHz sampling of Deepgram / Hume / ElevenLabs |
| ⚙️ Backward compatible | Asterisk automatically negotiates 8 kHz for legacy clients |
| 🏎️ Lower latency | Avoids resampling and transcoding when using wideband pipelines |

---

## 4. Risks & Mitigations

| Risk | Description | Mitigation |
|------|--------------|-------------|
| Increased bandwidth | 16 kHz PCM uses ~256 kbps per call | Use Opus codec or QoS shaping |
| Unsupported SIP phones | Older phones may only support G.711 | Keep `allow=ulaw,alaw` for fallback |
| CPU load from transcoding | Asterisk bridges wide/narrow calls | Monitor CPU usage post-deployment |
| ExternalMedia mismatch | External app may still expect 8 kHz | Update WebSocket format to `slin16` |

---

## 5. Prerequisites

- Root / sudo access to the Asterisk host  
- Confirm modules installed:

codec_opus.so
codec_g722.so
format_pcm.so
format_sln.so

- Backup configuration files:
```bash
sudo cp /etc/asterisk/pjsip.conf /etc/asterisk/pjsip.conf.bak
sudo cp /etc/asterisk/rtp.conf /etc/asterisk/rtp.conf.bak
sudo cp /etc/asterisk/modules.conf /etc/asterisk/modules.conf.bak


⸻

6. Configuration Changes

6.1 modules.conf

Ensure the following are loaded:

load = codec_opus.so
load = codec_g722.so
load = format_pcm.so
load = format_sln.so


⸻

6.2 pjsip.conf

Add wideband codecs and preserve legacy ones:

[transport-udp]
type = transport
protocol = udp
bind = 0.0.0.0

[endpoint-default]
type = endpoint
context = default
disallow = all
allow = opus,slin16,g722,ulaw,alaw
max_audio_streams = 1

If using legacy sip.conf, apply the same logic:

[general]
disallow=all
allow=opus,slin16,g722,ulaw,alaw


⸻

6.3 rtp.conf

[general]
rtpstart=10000
rtpend=20000
allow=opus
allow=g722
allow=slin16


⸻

6.4 extensions.conf (only if using ExternalMedia)

exten => 5000,1,Answer()
 same => n,ExternalMedia(
     type=audio,
     direction=read,
     format=slin16,
     socket=ws://localhost:5050/audio_in
 )
 same => n,Hangup()


⸻

7. Deployment Procedure

Step 1: Validate current codec list

From CLI:

core show codecs

Ensure SLIN16, G722, and Opus are listed as “Enabled”.

Step 2: Apply configuration changes

Edit the above files and save.

Step 3: Restart Asterisk safely

sudo systemctl restart asterisk

Or:

core restart now

Step 4: Verify active channels

core show channel <channel_name>

Expected:

Format: (slin16)

Step 5: RTP debug test

rtp set debug on

Look for:

Format: SLIN16 16000 Hz


⸻

8. Post-Upgrade Validation

Test	Expected Result
SIP registration	All clients re-register successfully
Internal call (A→B)	Audio clean, no distortion
External PSTN call	Works via fallback (8 kHz transcoding)
AI / ExternalMedia stream	Receives proper 16 kHz PCM
Latency test	< 900 ms speech-to-speech end-to-end


⸻

9. Rollback Procedure

If any audio or compatibility issue occurs:

sudo cp /etc/asterisk/pjsip.conf.bak /etc/asterisk/pjsip.conf
sudo cp /etc/asterisk/rtp.conf.bak /etc/asterisk/rtp.conf
sudo systemctl restart asterisk

System will revert to the original 8 kHz configuration immediately.

⸻

10. Monitoring & Metrics
	•	Command: core show channels
	•	Log file: /var/log/asterisk/full
	•	Key indicators:
	•	codec_transcode_count
	•	cpu_load_avg
	•	packet_loss_percent
	•	Optional: Enable Prometheus exporter for audio latency tracking.

⸻

11. Client Considerations

Client Type	Expected Behavior	Action
Modern Softphones (Zoiper, Linphone, Bria)	Native 16 kHz (Opus/G.722)	No action needed
IP Phones (Yealink, Polycom)	Usually support G.722	Enable “Wideband Codec” in settings
Legacy SIP phones (G.711 only)	Fallback to 8 kHz	No configuration change
WebRTC clients	Use Opus 48 kHz	Fully compatible


⸻

12. Acceptance Criteria
	•	100 % of existing clients still connect and exchange audio.
	•	At least one wideband (16 kHz) call verified end-to-end.
	•	No regressions in call setup, latency, or recording quality.
	•	AI pipeline confirmed receiving raw 16 kHz PCM frames.

⸻

13. Summary Checklist

Item	Status
modules.conf updated	☐
pjsip.conf / sip.conf updated	☐
rtp.conf updated	☐
Restart performed	☐
Channel format verified (SLIN16)	☐
Test call completed	☐
AI pipeline verified	☐


⸻

14. Notes
	•	The upgrade is non-destructive — it only adds wideband support and preserves all legacy settings.
	•	Asterisk automatically negotiates the best codec per call.
	•	You can enable or disable 16 kHz at any time by editing allow= lines and reloading.

⸻

✅ Final Note

Once this upgrade is complete, all audio paths between Asterisk, AI engines, and modern SIP endpoints will operate at native 16 kHz without resampling.
This is a prerequisite for optimal integration with Deepgram STT, Hume AI Emotion Detection, and ElevenLabs TTS streaming.

End of Document

