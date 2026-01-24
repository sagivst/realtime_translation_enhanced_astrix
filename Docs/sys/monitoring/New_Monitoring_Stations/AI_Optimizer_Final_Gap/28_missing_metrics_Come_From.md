
Where Do the “Missing Metrics” Come From?

Short answer:
They do NOT come from OpenAI, STT, or magic.
They come from deterministic signal analysis, computed locally from the PCM stream (and sometimes from existing metrics).

Below is the exact source of each group, what is required, and what is estimated.

⸻

1️⃣ LUFS Metrics

(momentary / short-term / integrated)

Source

📍 Derived locally from PCM RMS energy over time

LUFS is not a separate signal — it is a weighted loudness calculation.

How it’s computed
	•	Based on RMS energy
	•	With time windows:
	•	Momentary ≈ 400 ms window
	•	Short-term ≈ 3 seconds
	•	Integrated ≈ entire session
	•	Optional K-weighting filter (can be approximated)

Input required
	•	PCM samples (you already have)
	•	RMS per frame
	•	Rolling windows

Category
	•	Derived metric
	•	No external dependency
	•	No FFT required

✅ This should already be implemented if you have RMS + rolling windows.

⸻

2️⃣ Speech Metrics

(speech_probability, segments_per_min, avg_speech_duration_ms)

Source

📍 Local Voice Activity Detection (VAD)

Not STT.
Not OpenAI.
A simple energy + ZCR based VAD is enough.

How it’s computed
	•	Per frame:
	•	Energy > threshold
	•	Zero Crossing Rate within speech band
	•	Convert to:
	•	Boolean speech / non-speech
	•	Probability (0–1)
	•	Segment speech runs

Derived values
	•	speech_probability → rolling ratio of speech frames
	•	segments_per_min → count speech onsets
	•	avg_speech_duration_ms → mean length of speech segments

Input required
	•	PCM samples
	•	RMS
	•	ZCR (cheap to compute)

Category
	•	Measured + Derived
	•	No STT required
	•	No FFT required

⸻

3️⃣ Noise Analysis

(snr_db, noise_floor_dbfs, background_noise_level)

Source

📍 Computed locally from PCM

How it’s computed
	•	Noise floor:
	•	Track lowest RMS during non-speech frames
	•	Signal level:
	•	RMS during speech frames
	•	SNR:

snr_db = rms_speech_dbfs - noise_floor_dbfs



Background noise
	•	Long-term average of non-speech energy
	•	Optional slow EMA

Input required
	•	RMS
	•	VAD state

Category
	•	Derived
	•	No FFT required
	•	No ML required

⸻

4️⃣ Quality Scores

(thd_percent, quality_score, mos_estimate)

This is where confusion usually happens.

4.1 THD Percent (Total Harmonic Distortion)

📍 Estimated locally
	•	Requires FFT OR
	•	Simple approximation:
	•	Compare harmonic energy vs fundamental
	•	Or detect waveform saturation + asymmetry

⚠ This is an estimate, not lab-grade THD.

4.2 Quality Score (0–100)

📍 Composite metric

Computed as weighted function of:
	•	RMS vs target
	•	Clipping ratio
	•	SNR
	•	Noise floor
	•	Dropouts

Example:

quality_score =
  0.30 * loudness_score +
  0.30 * snr_score +
  0.20 * clipping_score +
  0.20 * continuity_score

4.3 MOS Estimate

📍 Heuristic approximation

MOS is never truly measured without listeners.

What you do:
	•	Map:
	•	SNR
	•	Clipping
	•	Dropouts
	•	Loudness deviation
	•	Into a 1.0–5.0 range

Category
	•	Derived / Estimated
	•	Explained
	•	Auditable
	•	Not “truth”, but useful

⸻

5️⃣ Composite Metrics

(overall_quality, speech_clarity_index, etc.)

Source

📍 Pure aggregation layer

They are:
	•	Weighted sums
	•	Normalized indices
	•	Risk scores

They never touch audio directly.

Examples
	•	speech_clarity_index
	•	Based on SNR
	•	Speech activity
	•	Band energy balance
	•	overall_quality
	•	Combines audio + transport metrics

Category
	•	Derived only
	•	Zero cost
	•	Zero risk

⸻

6️⃣ Time-Domain Spectral Metrics

(peak_frequency_hz, spectral_centroid_hz, etc.)

Source

📍 FFT on PCM frames

These are the only metrics that require FFT.

Required implementation
	•	FFT per frame or per window
	•	Magnitude spectrum
	•	Simple calculations:
	•	Dominant frequency
	•	Centroid
	•	Band energy

Important clarification

These are frequency-domain, not time-domain —
but they are computed from time-domain PCM.

Category
	•	Measured via FFT
	•	Optional
	•	Not required for Phase 1

⸻

7️⃣ What They Are NOT Coming From ❌

❌ Not from OpenAI
❌ Not from STT engines
❌ Not from TTS engines
❌ Not from the network
❌ Not from headers

They are local signal intelligence, by design.

⸻

8️⃣ Final Mental Model (Very Important)

Metric Type	Comes From
Raw amplitude	PCM samples
Loudness (LUFS)	RMS + windows
Speech metrics	Local VAD
Noise / SNR	RMS + VAD
Quality scores	Aggregation
MOS	Heuristic mapping
Spectral metrics	FFT
Composite indices	Math only


⸻

9️⃣ Why This Design Is Correct
	•	Deterministic
	•	Explainable
	•	Cheap
	•	Works offline
	•	Works without AI
	•	AI only decides, never measures

This is exactly what you want for a production-grade optimizer.
