
✅ Audio Quality Factors - What yields the best results (quality + speed)

	•	Sample rate: Use at least 16 kHz (16,000 Hz) if possible. Many telephony systems default to 8 kHz, but 16 kHz gives better fidelity for ASR.
	•	Codec/format: PCM (linear16) or ulaw/alaw with minimal compression/artefacts. Avoid heavy lossy codecs or high jitter/loss networks.
	•	Channel count: Mono (1 channel) is simpler and cheaper for real-time transcription.
	•	Latency & packet loss: Keep network latency low and packet loss very small. Real-time transcription suffers when audio is dropped or delayed.
	•	Clean signal: Less background noise, proper microphone gain, avoid clipping or heavy reverb. A clearer signal helps model accuracy (lower WER).
	•	Streaming chunk size: Smaller frames (e.g., ~20 ms or 30 ms) help with responsiveness. Buffering too much audio before sending adds latency.

Trade-offs for real-time
	•	To minimise latency, send audio as soon as you capture it (e.g., every 20ms frame) rather than batching large segments.
	•	Accuracy may slightly degrade if you rush too much — sometimes waiting a tiny bit (e.g., for silence or breakpoint) improves containing context.
	•	Choose the right model: For telephony/voice calls you may choose a model optimised for “phonecall” or narrowband, if available, which improves accuracy for that domain.

Summarised best-practice
	•	Use 16 kHz (or as high as your system allows).
	•	Use linear PCM or ulaw; avoid heavy compression.
	•	Stream continuously with low buffer delay (ideally < 200ms end-to-end for transcription).
	•	Choose real-time streaming API rather than batch file transcription.
	•	Monitor WER (Word Error Rate) and latency metrics: Deepgram reports sub-300ms latency in many cases for live streaming.  ￼

⸻

🔧 Which Deepgram API to use & how to connect

Deepgram provides a Live Streaming API (via WebSocket) that is the correct choice for real-time voice streams.  ￼

API Endpoint / Method
	•	Type: WebSocket streaming endpoint
	•	Purpose: Send continuous audio frames; receive incremental transcripts and metadata.
	•	SDKs Available: JavaScript, Python, Go, C# etc.  ￼

Sample Code (JavaScript)

const { createClient, LiveTranscriptionEvents } = require("@deepgram/sdk");
const deepgram = createClient(process.env.DEEPGRAM_API_KEY);

const connection = deepgram.listen.live({
  model: "nova-3",       // recommended model
  language: "en-US",     // source language
  smart_format: true,
});

connection.on(LiveTranscriptionEvents.Open, () => {
  console.log("Connection open");
});

connection.on(LiveTranscriptionEvents.Transcript, (data) => {
  console.log(data.channel.alternatives[0].transcript);
});

connection.on(LiveTranscriptionEvents.Error, (err) => {
  console.error(err);
});

// Send audio bytes (PCM) to `connection.send(...)`

Important Parameters
	•	model: Which model to use (e.g., nova-3).  ￼
	•	language: Source language (for telephone calls choose correct ISO code).
	•	smart_format: Helpful for formatting numbers/dates etc.
	•	Streaming format: Must match your audio input format (e.g., linear16, ulaw, sample rate 8000 or 16000). Their docs show how to validate audio format.  ￼

Best Way to Connect from Asterisk
	•	Use an ARI externalMedia channel to send audio frames out to a small service that forwards them via WebSocket to Deepgram.
	•	Ensure you capture “clean” mic input (mono, correct sample rate).
	•	Use small chunks (20-30ms) and send as soon as possible.
	•	Receive interim transcripts via events and feed them into your translation pipeline.

⸻

🧮 Summary
	•	Use Deepgram Live Streaming WebSocket API for best speed.
	•	Ensure audio is high quality: 16kHz mono, minimal codec artefact.
	•	Stream frames continuously with minimal buffering.
	•	Choose the best model (e.g., nova-3) for your domain.
	•	Monitor latency (aim < 300ms for transcription) and WER (aim < 10% for machine use) as metrics.  ￼
