

# Appendix A – Playback Verification of 20 ms Audio Frames

## 🎯 Goal
To verify that the audio stream reaching each consumer (e.g., Deepgram, Hume EVI) is correct, engineers can **listen to the exact PCM frames** being sent in real time or from recorded files.  
This section explains how to achieve smooth playback of 20 ms audio frames.

---

## 1️⃣ Basic Concept

A regular audio player **can play 20 ms frames** in sequence *only if*:
1. Frames are fed **continuously at a fixed 20 ms cadence (50 fps)**.
2. There are **no gaps or re-initialization delays** between frames.
3. The player uses a **persistent playback buffer** (ring or streaming buffer).

If you simply open and close 20 ms files one by one (e.g., `frame_0001.wav`, `frame_0002.wav`),  
you will hear small “clicks” or “pops” because of the gaps between file loads.

---

## 2️⃣ Why normal players fail

Standard media players (VLC, QuickTime, Windows Media, etc.)  
- Initialize a new playback context for each file.  
- Refill internal buffers for each open/close operation.  
- Introduce several milliseconds of delay between frames.

👉 Therefore, playback of separate 20 ms files is **not seamless**.

---

## 3️⃣ Correct methods

### 🔹 A. Concatenate all frames before playback
If you just need to *listen* to a full sample:
```bash
sox frame_*.wav output.wav
# or for raw PCM
cat frame_*.pcm > output.pcm
ffmpeg -f s16le -ar 16000 -ac 1 -i output.pcm output.wav

Now output.wav plays smoothly in any player—no gaps.

🔹 B. Stream frames directly to the audio device

For real-time QA taps, stream each frame directly into an open audio device handle:

import sounddevice as sd
import time

samplerate = 16000
frame_dur = 0.02  # 20 ms
bytes_per_frame = 640  # 16-bit mono @ 16 kHz

with sd.OutputStream(samplerate=samplerate, channels=1, dtype='int16') as stream:
    while True:
        pcm = next_frame_from_tap()   # returns 640-byte PCM frame
        stream.write(pcm)
        time.sleep(frame_dur)         # maintain cadence

This keeps the output clock aligned with Asterisk’s 20 ms tick.
As long as you feed frames in sequence, you’ll hear natural, gap-free speech.

⸻

4️⃣ Recommended QA practice (for your Tap module)

Method	Description	Result
Sequential WAV/PCM file playback	Each 20 ms file opened separately	❌ Gaps, audible clicks
Pre-concatenated file (WAV/PCM)	All frames combined once	✅ Smooth
Continuous stream via same audio handle	Real-time feed, 20 ms cadence	✅ Perfect
Ring-buffer playback (Tap module)	4–6 s circular buffer, non-blocking	✅ Ideal for live QA


⸻

5️⃣ Integration with Tap module

Each AudioTap already buffers frames in a local ring (see section 6 of main doc).
To listen live:

# inside AudioTap.pump()
seq, pcm = self.q.pop() or (None, None)
if pcm:
    self.sink.write(pcm)  # send to DAC (sounddevice, ALSA, CoreAudio)

This allows engineers to:
	•	Hear the same audio sent to each API (Deepgram, Hume).
	•	Compare audible stream with ASR/emotion outputs.
	•	Verify that frame cadence and amplitude are correct.

⸻

✅ Summary

Scenario	Audible result	Recommendation
20 ms files played separately	❌ clicks & silence gaps	Avoid
Concatenated before playback	✅ smooth	For offline QA
Streamed in real time (single handle)	✅ seamless	For live QA
Tap ring buffer output	✅ seamless	Best for continuous monitoring


⸻

By maintaining the 20 ms pacing and a persistent playback stream,
you can listen to the ingest exactly as the APIs receive it—
a key tool for verifying latency, continuity, and synchronization before advancing to downstream translation or rendering stages.

