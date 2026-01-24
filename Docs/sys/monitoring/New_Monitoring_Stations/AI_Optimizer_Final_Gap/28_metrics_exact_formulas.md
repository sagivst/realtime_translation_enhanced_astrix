Perfect — below is a clear, engineering-grade mapping of the 28 metrics to exact formulas, grouped by category, with inputs, windows, and notes.
Everything here is locally computable from your 16 kHz / 20 ms PCM frames.

I’ll be explicit about what is exact, what is estimated, and what is windowed.

⸻

Mapping the 28 Metrics to Exact Formulas

Base assumptions (fixed):
	•	Sample rate: 16 kHz
	•	Frame size: 20 ms = 320 samples
	•	PCM_S16LE
	•	Samples normalized to [-1.0, +1.0]

Let:

x[n] = PCM sample normalized to [-1, +1]
N = 320 samples per frame


⸻

A. Loudness / LUFS Metrics (3)

1️⃣ LUFS – Momentary

Window: 400 ms ≈ 20 frames
Formula:

RMS_400ms = sqrt( (1/M) * Σ x[n]^2 )
LUFS_momentary ≈ 20 * log10(RMS_400ms) + 0.691

Notes:
	•	+0.691 is the standard LUFS offset
	•	K-weighting optional (can be added later)

⸻

2️⃣ LUFS – Short-Term

Window: 3 seconds ≈ 150 frames
Formula:

RMS_3s = sqrt( (1/M) * Σ x[n]^2 )
LUFS_short_term ≈ 20 * log10(RMS_3s) + 0.691


⸻

3️⃣ LUFS – Integrated

Window: entire session (or gated > −70 LUFS)
Formula:

RMS_integrated = sqrt( (1/M) * Σ x[n]^2 )
LUFS_integrated ≈ 20 * log10(RMS_integrated) + 0.691


⸻

B. Speech Metrics (3)

4️⃣ Speech Probability

Per frame:

speech_flag =
  (RMS_dbfs > speech_energy_threshold)
  AND (ZCR within speech range)

speech_probability = voiced_frames / total_frames (rolling window)


⸻

5️⃣ Segments per Minute

segments_per_min =
  count(speech_flag transitions 0→1) per 60s


⸻

6️⃣ Average Speech Duration (ms)

avg_speech_duration_ms =
  mean(duration of continuous speech segments)


⸻

C. Noise Analysis (3)

7️⃣ Noise Floor (dBFS)

Computed only during non-speech frames:

noise_floor_dbfs =
  min( RMS_dbfs over non-speech frames )

or slow EMA of minimum.

⸻

8️⃣ Background Noise Level

background_noise_dbfs =
  mean( RMS_dbfs over non-speech frames )


⸻

9️⃣ SNR (dB)

snr_db =
  mean(RMS_speech_dbfs) − noise_floor_dbfs


⸻

D. Quality Scores (4)

🔟 THD Percent (Estimated)

FFT-based estimate:

THD =
  sqrt( Σ harmonics_power ) / fundamental_power

thd_percent = THD * 100

If FFT not available:
	•	Approximate via saturation + asymmetry detection

⸻

1️⃣1️⃣ Quality Score (0–100)

quality_score =
  w1 * loudness_score +
  w2 * snr_score +
  w3 * clipping_score +
  w4 * continuity_score

Each sub-score normalized to [0,100].

⸻

1️⃣2️⃣ MOS Estimate (1.0–5.0)

Heuristic mapping:

mos =
  clamp(
    5
    − a * clipping_ratio
    − b * dropout_rate
    − c * |LUFS − target|,
    1, 5
  )


⸻

1️⃣3️⃣ Quality Degradation Index

quality_degradation =
  baseline_quality − current_quality


⸻

E. Composite Metrics (4)

1️⃣4️⃣ Overall Quality

overall_quality =
  mean(
    quality_score,
    speech_clarity_index,
    continuity_score
  )


⸻

1️⃣5️⃣ Speech Clarity Index

speech_clarity =
  normalize(
    snr_db
    + mid_band_energy_ratio
    − noise_level
  )


⸻

1️⃣6️⃣ Clipping Risk Index

clipping_risk =
  normalize(
    clipping_ratio
    + consecutive_clipped_frames
  )


⸻

1️⃣7️⃣ Noise Risk Index

noise_risk =
  normalize(
    background_noise_dbfs
    − expected_noise_floor
  )


⸻

F. Spectral Metrics (FFT-Based) (5)

1️⃣8️⃣ Peak Frequency (Hz)

peak_frequency =
  frequency bin with max FFT magnitude


⸻

1️⃣9️⃣ Spectral Centroid (Hz)

centroid =
  Σ(f_k * |X_k|) / Σ|X_k|


⸻

2️⃣0️⃣ Spectral Bandwidth

bandwidth =
  sqrt( Σ( (f_k − centroid)^2 * |X_k| ) / Σ|X_k| )


⸻

2️⃣1️⃣ Harmonic Energy Ratio

harmonic_energy_ratio =
  harmonic_energy / total_energy


⸻

2️⃣2️⃣ Spectral Flatness

flatness =
  geometric_mean(|X_k|) / arithmetic_mean(|X_k|)


⸻

G. Temporal / Continuity Metrics (3)

2️⃣3️⃣ Dropout Rate

dropout_rate =
  dropout_frames / total_frames


⸻

2️⃣4️⃣ Audio Freeze Duration

audio_freeze_ms =
  time where PCM buffers identical or missing


⸻

2️⃣5️⃣ Inter-Frame Jitter (ms)

jitter =
  stddev(actual_frame_time − expected_frame_time)


⸻

H. Signal Integrity Metrics (3)

2️⃣6️⃣ DC Offset

dc_offset =
  mean(x[n])


⸻

2️⃣7️⃣ Zero Crossing Rate

ZCR =
  count(sign(x[n]) ≠ sign(x[n−1])) / N


⸻

2️⃣8️⃣ Peak-to-RMS Ratio (Crest Factor)

crest_factor =
  peak_amplitude / RMS


⸻

Final Summary Table

Category	Count
LUFS	3
Speech	3
Noise	3
Quality	4
Composite	4
Spectral	5
Temporal	3
Integrity	3
TOTAL	28


⸻

Key Takeaway (Very Important)
	•	✅ All 28 metrics are locally computable
	•	✅ None require OpenAI, STT, or TTS
	•	✅ Only 5 require FFT
	•	✅ All are explainable and auditable
