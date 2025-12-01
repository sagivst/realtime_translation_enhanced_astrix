
Understanding and Resolving “Not Acceptable Here” (SIP 488/606) Errors in Asterisk
Version: 1.0

Audience: Telephony Engineers, DevOps, Backend Developers

Scope: SIP call negotiation, media capability matching, codec configuration, ExternalMedia integration.

⸻

1. Overview

Asterisk may reject inbound or outbound SIP calls with the error:

488 Not Acceptable Here

or

606 Not Acceptable

This error indicates that Asterisk cannot accept the media capabilities (codecs, sample rates, encryption, formats) offered by the remote endpoint.

In environment that uses ExternalMedia and real-time audio processing pipelines (e.g., GStreamer, AI translation servers), this error typically results from:
	•	Codec incompatibility
	•	Sample-rate mismatch
	•	Incorrect RTP capabilities
	•	Unsupported ptime
	•	Missing narrowband codecs
	•	Conflicts between Asterisk’s expected media and the ExternalMedia stream

This document provides root-cause explanations and required steps to fix and prevent these failures.

⸻

2. Root Causes and Technical Explanations

2.1 Codec Mismatch (Most Common Cause)

If the SIP INVITE offers codecs that Asterisk cannot use, Asterisk rejects the call.

Example problem:
Remote endpoint offers:

opus/48000, g722/16000, VP8, AMR

Asterisk is configured for:

ulaw, alaw

→ Asterisk rejects: “Not Acceptable Here”

Resolution (pjsip.conf / sip.conf):

allow=ulaw,alaw,g722,opus,slin,slin16


⸻

2.2 Missing 8 kHz Narrowband Codecs

Telephony systems (PSTN, SIP trunks, softphones) typically rely on 8 kHz narrowband codecs:
	•	G.711 (ulaw/alaw)
	•	G.729
	•	GSM

If Asterisk cannot negotiate any 8 kHz codec, calls will be rejected.

This is especially important when using:
	•	ExternalMedia
	•	AI/translation engines
	•	GStreamer upsampling/downsampling

⸻

2.3 Sample Rate / ptime mismatch

Asterisk expects 20ms frames and often only supports:

ptime=20

If the INVITE contains:

ptime=10
ptime=30

or incorrect RTP sampling rates:

a=rtpmap:101 L16/16000   (Asterisk expects 8000)

→ Asterisk will reject the call.

⸻

2.4 RTP vs SRTP Mismatch

If one side uses encrypted RTP (SRTP) and the other does not:
	•	Asterisk → RTP
	•	Remote endpoint → SRTP

Call fails with 488.

Fix:

media_encryption=no

or

media_encryption=sdes

Consistency is required on both sides.

⸻

2.5 ExternalMedia “caps” Misconfiguration

When using ExternalMedia, incorrect media caps (SDP attributes) will cause immediate rejection.

Examples:

❌ Incorrect (16 kHz offered to Asterisk)

a=rtpmap:101 L16/16000

✔ Correct (Asterisk expects 8 kHz)

a=rtpmap:101 L16/8000

ExternalMedia must negotiate the same sample rate as the Asterisk channel, even if you internally upsample to 16 kHz for AI processing.

⸻

3. Troubleshooting Procedure

3.1 Enable SIP logging

Chan_SIP:

sip set debug on

PJSIP:

pjsip set logger on

Inspect:
	•	Offered codecs (INVITE)
	•	Accepted codecs (200 OK)
	•	Rejected media lines
	•	ptime values
	•	RTP payload types

Common log output when failing:

No compatible codecs, offer: opus/48000 g722/16000 - Asterisk supports: ulaw,alaw

or:

Media offer rejected due to unacceptable RTP sample rate


⸻

4. Best-Practice Configuration (Recommended)

Add this to your pjsip.conf or sip.conf:

allow=ulaw
allow=alaw
allow=g722
allow=opus
allow=slin
allow=slin16

And explicitly set:

ptime=20

Ensure that:
	•	ExternalMedia stream is mono
	•	ExternalMedia stream is 8 kHz
	•	Any internal 16 kHz processing happens only inside GStreamer / AI server
	•	Return stream is downsampled back to 8 kHz before reinjection

⸻

5. Media Flow Architecture (Reference)

SIP INVITE → Asterisk → 8 kHz PCM
                          ↓
                  ExternalMedia
                          ↓
                   GStreamer (upsample → 16 kHz → AI → 16 kHz)
                          ↓
         Downsample → 8 kHz → ExternalMedia → Asterisk

Important:
Asterisk never delivers native 16 kHz audio.
All 16 kHz processing occurs outside Asterisk.

⸻

6. Summary

✔ “Not Acceptable Here” = Media/codec/capability mismatch

✔ Caused by misaligned codec lists, sample rates, ptime, or SRTP settings

✔ Always ensure 8 kHz codecs are enabled for telephony

✔ ExternalMedia must negotiate 8 kHz, even if AI uses 16 kHz

✔ Validate INVITE SDP using SIP debugging

⸻

7. Next Steps / Optional Enhancements

I can provide:
	•	A complete ExternalMedia configuration
	•	A correct SDP “caps” template for 8 kHz/16 kHz pipelines
	•	A GStreamer two-way pipeline for 8 → 16 → 8
	•	A full 6–8 page architecture document (PDF)
	•	A diagnostic report if you send your SIP INVITE logs
