Monitoring Stations (7 Defined)

  📍 STATION 1: Asterisk → Gateway

  - Purpose: Monitors audio flow from Asterisk PBX to Gateway
  - Parameters (12): Buffer input/jitter, network latency, packet metrics, audio quality (SNR/MOS), CPU
  performance
  - Extensions: Both 3333 and 4444

  📍 STATION 2: Gateway → STTTTSserver

  - Purpose: Monitors Gateway to Speech Processing Server connection
  - Parameters (10): Output buffers, processing latency, audio quality, bandwidth, success rate
  - Extensions: Both 3333 and 4444

  📍 STATION 3: STTTTSserver → Deepgram (Currently Active)

  - Purpose: Voice monitoring and preparation for speech-to-text
  - Parameters (14): Processing buffers, SNR, speech levels, DSP metrics, CPU/memory usage
  - Extensions:
    - 3333: English voice monitor (Caller)
    - 4444: French voice monitor (Callee)

  📍 STATION 4: Deepgram Response (Currently Active)

  - Purpose: Speech-to-text processing results
  - Parameters (8): Processing latency, queue depth, success rate, processing speed
  - Extensions:
    - 3333: English STT (Caller)
    - 4444: French STT (Callee)

  📍 STATION 9: STTTTSserver → Gateway

  - Purpose: Monitors text-to-speech output back to Gateway
  - Parameters (15): Output buffers, MOS, DSP (AGC/compressor/limiter), processing metrics
  - Extensions: Both 3333 and 4444

  📍 STATION 10: Gateway → Asterisk

  - Purpose: Final audio delivery back to Asterisk PBX
  - Parameters (10): Output buffers, packets sent/dropped, THD, bandwidth
  - Extensions: Both 3333 and 4444

  📍 STATION 11: STTTTSserver → Hume Branch

  - Purpose: Emotional AI processing branch
  - Parameters (10): Processing buffers, SNR, speech levels, queue depth
  - Extensions: Both 3333 and 4444

  Planned Future Stations (5 Not Yet Implemented)

  🔮 STATION 5: Translation Engine

  - Would handle language translation between calls
  - Not yet implemented in current system

  🔮 STATION 6: ElevenLabs TTS

  - Text-to-speech synthesis
  - Integration exists but station not defined

  🔮 STATION 7: Audio Enhancement

  - Post-processing and quality improvement
  - Placeholder for future enhancement

  🔮 STATION 8: Recording/Archive

  - Call recording and archival system
  - Not yet implemented

  🔮 STATION 12: Hume Response

  - Emotional AI response processing
  - Companion to Station 11

  System Architecture

  Asterisk PBX
      ↓ (Station 1)
  Gateway (3333/4444)
      ↓ (Station 2)
  STTTTSserver
      ├→ (Station 3) → Deepgram STT → (Station 4)
      ├→ (Station 11) → Hume AI → (Station 12 - planned)
      └→ (Station 9) → Gateway → (Station 10) → Asterisk

  Currently, your monitoring dashboard at http://20.170.155.53:8080/dashboard.html shows the 4 active station
  instances (Station 3 and 4 with both extensions), providing real-time metrics for voice processing and
  speech-to-text operations.