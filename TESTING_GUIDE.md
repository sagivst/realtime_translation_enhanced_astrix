# Phase 5: Testing & Optimization Guide

**Status**: Testing Infrastructure Ready
**Date**: 2025-10-16
**Azure App**: https://realtime-translation-1760218638.azurewebsites.net
**Azure VM**: 4.185.84.26 (Asterisk server)

---

## Overview

This guide provides comprehensive testing procedures for the real-time translation system across all phases (1-4). The goal is to validate:

- **Audio Pipeline**: 20ms frame processing without drops
- **Translation Quality**: Accurate ASR → MT → TTS pipeline
- **Latency**: <900ms end-to-end (p95)
- **Multi-Participant**: 2-10 concurrent users
- **Emotion Preservation**: Hume EVI emotion mapping
- **Mix-Minus Audio**: No echo/feedback in conferences

---

## Test Environment

### Infrastructure
- **Node.js Server**: Azure App Service (realtime-translation-1760218638)
- **Asterisk Server**: Azure VM (4.185.84.26)
- **SIP Clients**: Softphones or hardware phones

### Required API Keys
```bash
# Set in Azure App Service Configuration
DEEPGRAM_API_KEY=<your-key>
DEEPL_API_KEY=<your-key>
ELEVENLABS_API_KEY=<your-key>
HUME_API_KEY=<your-key>
```

### SIP Configuration
```
SIP Server: 4.185.84.26:5060
Extensions:
  - 100: Echo test
  - 1000, 2000, 3000: Translation conferences
  - 9000+: Direct ConfBridge (no translation)
```

---

## Test Phases

### Phase 1: Basic Audio Pipeline Tests

#### Test 1.1: Echo Test (Extension 100)
**Purpose**: Verify basic Asterisk audio routing

**Procedure**:
1. Configure SIP client to connect to 4.185.84.26:5060
2. Dial extension 100
3. Speak into microphone
4. Verify you hear your own voice echoed back

**Expected Results**:
- Audio quality: Clear, no distortion
- Latency: <50ms (local echo)
- No audio drops or glitches

**Pass/Fail Criteria**:
- ✅ Pass: Clear audio echo with <50ms delay
- ❌ Fail: No audio, distorted audio, or >100ms delay

---

#### Test 1.2: Frame Collector Verification
**Purpose**: Verify 20ms frame processing

**Procedure**:
1. SSH to Azure VM: `ssh azureuser@4.185.84.26`
2. Monitor named pipes: `ls -la /tmp/asterisk_media/`
3. Start Node.js server with frame collector
4. Make test call to extension 1000
5. Monitor frame statistics in server logs

**Expected Results**:
```
Frame Statistics:
- Frame size: 640 bytes (320 samples @ 16kHz)
- Frame interval: 20ms ±1ms
- Buffer utilization: <50%
- Frame drops: 0
- Reordering events: <1%
```

**Pass/Fail Criteria**:
- ✅ Pass: Frame drops <0.1%, timing within ±2ms
- ❌ Fail: Frame drops >1%, timing drift >5ms

---

#### Test 1.3: Pacing Governor Timing
**Purpose**: Verify strict 20ms output cadence

**Procedure**:
1. Enable pacing governor debug logs
2. Make test call with continuous speech
3. Monitor output frame timing
4. Verify no stalls or timing drift

**Expected Results**:
```
Pacing Governor Statistics:
- Output interval: 20ms ±0.5ms
- Placeholder frames: <10% (during translation gaps)
- Crossfade events: Smooth transitions
- Drift correction: <5 adjustments per minute
- Asterisk stalls: 0
```

**Pass/Fail Criteria**:
- ✅ Pass: Timing accuracy ±1ms, no stalls
- ❌ Fail: Timing drift >2ms, any stalls detected

---

### Phase 2: Translation Pipeline Tests

#### Test 2.1: ASR Accuracy (Deepgram)
**Purpose**: Verify speech recognition quality

**Test Sentences** (English):
1. "Hello, how are you today?"
2. "The quick brown fox jumps over the lazy dog."
3. "I need to schedule a meeting for tomorrow at 3 PM."
4. "Can you help me with the technical documentation?"

**Procedure**:
1. Dial extension 1000 (translation conference)
2. Speak each test sentence clearly
3. Monitor ASR output in server logs
4. Record transcription and confidence scores

**Expected Results**:
- Transcription accuracy: >95%
- Confidence score: >0.9
- Latency: <250ms from speech end
- Partial results: Progressive refinement

**Pass/Fail Criteria**:
- ✅ Pass: >95% accuracy, <250ms latency
- ❌ Fail: <90% accuracy, >500ms latency

---

#### Test 2.2: Machine Translation Quality (DeepL)
**Purpose**: Verify translation accuracy and context preservation

**Test Phrases** (English → Spanish):
1. "Good morning" → "Buenos días"
2. "How much does it cost?" → "¿Cuánto cuesta?"
3. "I don't understand" → "No entiendo"
4. "Where is the bathroom?" → "¿Dónde está el baño?"

**Procedure**:
1. Configure source language: English, target: Spanish
2. Speak test phrases in English
3. Verify Spanish translation output in logs
4. Check context preservation across multiple phrases

**Expected Results**:
- Translation accuracy: >95%
- Context usage: Previous 500 chars retained
- Latency: <200ms per translation
- Cache hits: >50% for repeated phrases

**Pass/Fail Criteria**:
- ✅ Pass: Accurate translation with context
- ❌ Fail: Mistranslations or context loss

---

#### Test 2.3: TTS Quality (ElevenLabs)
**Purpose**: Verify synthesized speech quality

**Procedure**:
1. Translate test phrases through full pipeline
2. Listen to synthesized output on SIP phone
3. Evaluate naturalness and clarity
4. Measure TTS latency

**Expected Results**:
- Audio quality: Natural, clear pronunciation
- Latency: <250ms from translation complete
- Emotion mapping: Appropriate prosody (when Hume EVI enabled)
- No robotic artifacts

**Pass/Fail Criteria**:
- ✅ Pass: Natural speech, <250ms latency
- ❌ Fail: Robotic sound, >500ms latency

---

#### Test 2.4: End-to-End Latency
**Purpose**: Measure total translation latency

**Measurement Points**:
```
T1: Speaker finishes sentence
T2: ASR produces final transcript
T3: MT completes translation
T4: TTS audio generation complete
T5: Listener hears translated audio

Total Latency = T5 - T1
```

**Procedure**:
1. Use latency measurement script: `node test-latency-measurement.js`
2. Speak test sentences with clear pauses
3. Record latency for each component
4. Calculate p50, p95, p99 percentiles

**Expected Results**:
```
Latency Breakdown (Target):
- ASR: <250ms (T2 - T1)
- MT: <200ms (T3 - T2)
- TTS: <250ms (T4 - T3)
- Audio transmission: <200ms (T5 - T4)
- Total (p95): <900ms
```

**Pass/Fail Criteria**:
- ✅ Pass: p95 latency <900ms
- ⚠️  Warning: p95 between 900-1200ms
- ❌ Fail: p95 latency >1200ms

---

### Phase 3: Emotion Preservation Tests

#### Test 3.1: Hume EVI Emotion Detection
**Purpose**: Verify emotion analysis from audio

**Test Scenarios**:
1. **Neutral**: "The meeting is scheduled for Tuesday."
2. **Happy/Excited**: "That's fantastic news! I'm so happy!"
3. **Sad/Subdued**: "Unfortunately, the project was cancelled."
4. **Angry/Intense**: "This is completely unacceptable!"

**Procedure**:
1. Enable Hume EVI debug logs
2. Speak each test sentence with appropriate emotion
3. Monitor emotion vectors in logs
4. Verify arousal, valence, energy values

**Expected Results**:
```
Emotion Vectors:
- Neutral: arousal ≈ 0.5, valence ≈ 0, energy ≈ 0.5
- Happy: arousal > 0.7, valence > 0.5, energy > 0.6
- Sad: arousal < 0.3, valence < -0.3, energy < 0.4
- Angry: arousal > 0.8, valence < -0.4, energy > 0.7
```

**Pass/Fail Criteria**:
- ✅ Pass: Emotion vectors match expected ranges
- ❌ Fail: Emotion detection inaccurate or missing

---

#### Test 3.2: Emotion-Aware TTS
**Purpose**: Verify emotion mapping to voice parameters

**Procedure**:
1. Use same test sentences from 3.1
2. Monitor voice settings applied to TTS:
   - Stability (from arousal)
   - Style (from valence + rate)
   - Similarity boost (from energy)
3. Listen to synthesized output
4. Verify prosody matches emotion

**Expected Results**:
- Happy speech → higher style, lower stability (more dynamic)
- Sad speech → lower style, higher stability (more monotone)
- Angry speech → higher energy, faster rate
- Emotion preservation across languages

**Pass/Fail Criteria**:
- ✅ Pass: Synthesized speech reflects source emotion
- ❌ Fail: Flat/monotone output regardless of input

---

### Phase 4: Multi-Participant Conference Tests

#### Test 4.1: Direct ConfBridge (Extension 9000)
**Purpose**: Verify basic multi-participant audio without translation

**Procedure**:
1. Connect Phone A to extension 9000
2. Connect Phone B to extension 9000
3. Connect Phone C to extension 9000
4. Each participant speaks in turn
5. Verify all participants hear each other

**Expected Results**:
- All participants hear clear audio
- 16kHz sample rate maintained
- No echo or feedback
- 20ms mixing interval
- CPU usage <5% per participant

**Pass/Fail Criteria**:
- ✅ Pass: Clear audio for all, no echo
- ❌ Fail: Echo, feedback, or missing audio

---

#### Test 4.2: Mix-Minus Verification
**Purpose**: Verify each participant doesn't hear themselves

**Procedure**:
1. Connect 3 phones to extension 9000
2. Phone A speaks: "This is Phone A"
3. Phone B speaks: "This is Phone B"
4. Phone C speaks: "This is Phone C"
5. Each participant confirms they DON'T hear their own voice

**Expected Results**:
```
Audio Matrix (who hears whom):
        Hears A  Hears B  Hears C
Phone A    NO      YES      YES
Phone B    YES     NO       YES
Phone C    YES     YES      NO
```

**Pass/Fail Criteria**:
- ✅ Pass: No participant hears their own voice
- ❌ Fail: Any participant hears echo of themselves

---

#### Test 4.3: Translation Conference (Extension 1000)
**Purpose**: Verify multi-participant translation with emotion

**Setup**:
- Phone A: English speaker
- Phone B: Spanish speaker
- Phone C: German speaker

**Procedure**:
1. All phones dial extension 1000
2. Phone A (English): "Hello everyone, how are you?"
3. Phone B (Spanish): "Hola, estoy bien, gracias"
4. Phone C (German): "Guten Tag, alles ist gut"
5. Monitor translation logs for all streams
6. Verify each participant hears others in their language

**Expected Results**:
- Phone A hears: Spanish→English, German→English
- Phone B hears: English→Spanish, German→Spanish
- Phone C hears: English→German, Spanish→German
- Emotion preserved in all translations
- Latency <900ms per translation
- No audio cross-talk or echo

**Pass/Fail Criteria**:
- ✅ Pass: All translations accurate, emotion preserved
- ❌ Fail: Mistranslations, echo, or missing audio

---

#### Test 4.4: Dynamic Join/Leave
**Purpose**: Verify mix-minus updates when participants change

**Procedure**:
1. Start with 2 participants in conference 1000
2. Add 3rd participant (dynamic mix-minus update)
3. Remove 1 participant (mix-minus reconfiguration)
4. Add 2 more participants (scale to 5)
5. Monitor ConfBridge events and mix-minus updates

**Expected Results**:
- Mix-minus reconfigured within <1 second
- No audio glitches during reconfiguration
- All active participants hear correct audio
- Translation pipelines created/destroyed appropriately
- No memory leaks

**Pass/Fail Criteria**:
- ✅ Pass: Smooth transitions, no audio issues
- ❌ Fail: Audio drops, crashes, or memory leaks

---

### Phase 5: Load Testing

#### Test 5.1: 2-Participant Conference
**Purpose**: Baseline performance with minimal load

**Metrics to Monitor**:
- CPU usage (Node.js + Asterisk)
- Memory usage
- Network bandwidth
- Translation latency (p50, p95, p99)
- Frame drop rate

**Expected Results**:
```
Performance (2 participants):
- CPU: <10% (Node.js), <5% (Asterisk)
- Memory: <500MB (Node.js), <200MB (Asterisk)
- Bandwidth: ~128kbps per stream
- Latency (p95): <800ms
- Frame drops: <0.1%
```

---

#### Test 5.2: 5-Participant Conference
**Purpose**: Medium load testing

**Procedure**:
1. Connect 5 SIP phones to extension 1000
2. Simulate natural conversation (turn-taking)
3. Monitor all metrics for 15 minutes
4. Check for performance degradation

**Expected Results**:
```
Performance (5 participants):
- CPU: <25% (Node.js), <10% (Asterisk)
- Memory: <1.5GB (Node.js), <400MB (Asterisk)
- Bandwidth: ~640kbps total
- Latency (p95): <900ms
- Frame drops: <0.5%
- No crashes or errors
```

**Pass/Fail Criteria**:
- ✅ Pass: Metrics within expected ranges
- ❌ Fail: Latency >1200ms or frame drops >2%

---

#### Test 5.3: 10-Participant Conference (Stress Test)
**Purpose**: Maximum load validation

**Procedure**:
1. Use load testing script: `node test-load-simulation.js`
2. Simulate 10 concurrent participants
3. Run for 30 minutes
4. Monitor system stability

**Expected Results**:
```
Performance (10 participants):
- CPU: <50% (Node.js), <20% (Asterisk)
- Memory: <3GB (Node.js), <800MB (Asterisk)
- Bandwidth: ~1.28Mbps total
- Latency (p95): <1000ms (acceptable degradation)
- Frame drops: <1%
- System remains stable
```

**Pass/Fail Criteria**:
- ✅ Pass: System stable, latency <1200ms
- ⚠️  Warning: Some audio quality degradation
- ❌ Fail: Crashes, disconnects, or latency >2000ms

---

## Automated Testing Scripts

### test-latency-measurement.js
Automated latency measurement across full pipeline:
```bash
node test-latency-measurement.js --extension 1000 --duration 300
```

Outputs:
- Component-level latency breakdown
- Percentile statistics (p50, p95, p99)
- CSV export for analysis

---

### test-load-simulation.js
Simulates multiple concurrent participants:
```bash
node test-load-simulation.js --participants 10 --duration 1800
```

Features:
- Simulated SIP clients
- Natural conversation patterns
- Real-time metrics collection
- Stress testing

---

### test-monitoring-dashboard.html
Real-time monitoring interface:
```
URL: https://realtime-translation-1760218638.azurewebsites.net/test-monitoring.html
```

Displays:
- Active conferences and participants
- Per-stream latency graphs
- CPU/Memory usage
- Translation quality metrics
- Emotion analysis visualization

---

## Troubleshooting

### Issue: High Latency (>1200ms)

**Possible Causes**:
1. Network latency between Azure services
2. API rate limiting (Deepgram, DeepL, ElevenLabs)
3. Insufficient CPU resources
4. TTS audio generation bottleneck

**Solutions**:
- Check network latency: `ping deepgram.com`
- Monitor API response times in logs
- Scale Azure App Service to higher tier
- Enable TTS caching for repeated phrases

---

### Issue: Audio Drops or Glitches

**Possible Causes**:
1. Frame collector buffer overflow
2. Pacing governor timing drift
3. Network packet loss
4. Asterisk configuration issues

**Solutions**:
- Increase frame buffer size (8 → 16 frames)
- Check network quality: `mtr 4.185.84.26`
- Verify Asterisk jitter buffer: `asterisk -rx "core show settings"`
- Review named pipe permissions

---

### Issue: Translation Errors

**Possible Causes**:
1. ASR misrecognition
2. MT context loss
3. Unsupported language pairs
4. API key issues

**Solutions**:
- Test ASR independently with known phrases
- Check DeepL supported languages
- Verify API keys in Azure configuration
- Enable detailed translation logs

---

### Issue: Emotion Not Preserved

**Possible Causes**:
1. Hume EVI not enabled
2. Emotion vector not passed to TTS
3. ElevenLabs voice doesn't support emotion control
4. Audio quality insufficient for emotion detection

**Solutions**:
- Verify `HUME_API_KEY` configured
- Check emotion mapping in logs
- Use ElevenLabs voices with emotion support
- Ensure 16kHz audio throughout pipeline

---

## Performance Optimization

### CPU Optimization
- Use Node.js clustering for multiple cores
- Enable V8 performance flags
- Profile with `node --prof`

### Memory Optimization
- Implement LRU cache for translations
- Limit audio buffer retention
- Monitor for memory leaks with heap dumps

### Network Optimization
- Use CDN for static assets
- Enable gzip compression
- Optimize WebSocket frame size

### Audio Quality Optimization
- Fine-tune VAD thresholds
- Adjust prosodic segmenter parameters
- Calibrate comfort noise levels

---

## Success Criteria Summary

### Phase 1 (Audio Pipeline)
- ✅ Frame processing at 20ms granularity
- ✅ Frame drops <0.1%
- ✅ No timing drift or stalls

### Phase 2 (Translation)
- ✅ ASR accuracy >95%
- ✅ MT accuracy >95%
- ✅ TTS naturalness (subjective quality)
- ✅ Total latency (p95) <900ms

### Phase 3 (Emotion)
- ✅ Emotion detection working
- ✅ Emotion preserved in TTS
- ✅ Natural prosody across languages

### Phase 4 (Multi-Participant)
- ✅ Mix-minus working (no echo)
- ✅ Dynamic join/leave handling
- ✅ 10+ concurrent participants supported

### Production Ready When:
- ✅ All individual tests passing
- ✅ 10-participant stress test stable
- ✅ 24-hour stability test complete
- ✅ Documentation complete

---

## Next Steps After Testing

1. **Optimization Based on Results**
   - Address any performance bottlenecks
   - Fine-tune parameters for best quality

2. **Production Hardening**
   - Implement rate limiting
   - Add comprehensive error recovery
   - Set up monitoring/alerting

3. **Documentation Updates**
   - Record test results
   - Update configuration guides
   - Create user documentation

4. **Deployment Planning**
   - Define rollback procedures
   - Set up staging environment
   - Plan production cutover

---

## Resources

- **Monitoring Dashboard**: https://realtime-translation-1760218638.azurewebsites.net/test-monitoring.html
- **Implementation Status**: [IMPLEMENTATION_STATUS.md](./IMPLEMENTATION_STATUS.md)
- **Asterisk Config Guide**: [asterisk-config/README.md](./asterisk-config/README.md)
- **SIP Integration**: [SIP_INTEGRATION_GUIDE.md](./SIP_INTEGRATION_GUIDE.md)

---

**Document Version**: 1.0
**Last Updated**: 2025-10-16
**Status**: Ready for Testing
