

🎚 How to Control Volume Safely in Asterisk + ExternalMedia (ARI)

Scope: Per-channel gain control in ARI-driven setups where media is offloaded via ExternalMedia to a Gateway/AI, with zero conflicts and no added latency.

⸻

1) Key Principle (What works / What doesn’t)

Channel type	Can VOLUME(TX/RX) be applied via ARI?	Effective?	Why
SIP/PJSIP channel (e.g., SIP/7000, PJSIP/7001)	✅	✅	Signal goes through Asterisk’s per-channel DSP; gain is applied before/after RTP encode.
Local/Bridge leg	✅	✅	Same DSP path as normal channels.
ExternalMedia (e.g., Channel/XYZ (externalMedia))	⚠️	❌	It’s a raw RTP socket pass-through; no internal gain pipeline to scale.
Stasis (ARI App) channels	✅	✅*	Works if the channel is SIP/Local. It’s not effective on ExternalMedia legs.

Rule of thumb: Apply gain on SIP/Local channels that feed the ExternalMedia, not on the ExternalMedia channels themselves.
For audio returning from AI via ExternalMedia, apply gain in your Gateway/AI code (scale PCM before sending RTP back).

⸻

2) Recommended Control Points
	1.	Normalize mic input (before ExternalMedia):
Set VOLUME(TX) on the caller’s SIP channel to prevent clipping and keep consistent loudness to AI.
	2.	Adjust playback to the user (after ExternalMedia):
Set VOLUME(RX) on the callee’s SIP channel (or on each participant’s leg) for comfortable listening of translated audio.
	3.	Never try to adjust volume on ExternalMedia/* channels—no harm, but no effect.
	4.	Optionally scale PCM at the Gateway (Node.js) for translated audio before sending RTP back.

⸻

3) End-to-End Call Flow

flowchart LR
  A["SIP/7000 (English)"]
  B["SIP/7001 (French)"]
  BR["Asterisk Bridge (mix-minus)"]
  EM_IN["ExternalMedia IN → Gateway (RTP PCM16)"]
  EM_OUT["ExternalMedia OUT ← Gateway (RTP PCM16)"]
  GW["Gateway / AI (PCM16)"]

  A -- "VOLUME(TX/RX) via ARI ✅" --> BR
  B -- "VOLUME(TX/RX) via ARI ✅" --> BR

  BR --> EM_IN
  EM_IN --> GW
  GW --> EM_OUT
  EM_OUT --> BR

  BR --> A
  BR --> B

	•	Where to apply gain: on A and B (the SIP channels).
	•	Where to avoid: EM_IN / EM_OUT (ExternalMedia legs).

⸻

4) ARI Examples (safe & effective)

4.1 Reduce caller mic level (prevent clipping)

POST /ari/channels/{channelId}/variable
Content-Type: application/json
{
  "variable": "VOLUME(TX)",
  "value": "-3"
}

4.2 Boost playback to participant (translated audio a bit low)

POST /ari/channels/{channelId}/variable
Content-Type: application/json
{
  "variable": "VOLUME(RX)",
  "value": "+2"
}

Tip: Apply small steps (±1..±3 dB). Large jumps can be jarring in live calls.

⸻

5) Typical Policies (copy/paste)
	•	Baseline on Stasis start (per channel):
	•	VOLUME(TX) = -2 (normalize outgoing mic to AI)
	•	VOLUME(RX) = 0 (leave playback neutral; tune per user)
	•	If user is quiet: VOLUME(TX) = +2 (cap at +4 max to avoid noise pumping)
	•	If translated audio is too hot: VOLUME(RX) = -2
	•	If translated audio is too soft: VOLUME(RX) = +2

⸻

6) Node.js ARI Pattern (where to place it)
	•	Set baseline as soon as the channel enters Stasis:
	•	Adjust dynamically when your Gateway/AI sends loudness feedback.

// Pseudocode (Node.js