# Voice Calibration & Performance Improvement Guide

**Date:** 2025-10-13
**Current Performance:** 96.3% average confidence (Excellent!)
**Profile ID:** `profile-1760338620951-7jhymud`

---

## 📊 Performance Analysis Summary

### ✅ What's Working Great
- **Speech Recognition Accuracy:** 96.3% average (93-99% range)
- **Silence Detection:** Natural speech boundaries, no mid-word cuts
- **Voice Profile:** Successfully loaded and active
- **Latency:** STT processing 0.4s - 2.1s (acceptable)

### ⚠️ Areas for Improvement
1. **14 Empty Audio Detections** - Wasting API calls on noise
2. **Very Long Speech Chunks** - Up to 39.7 seconds (628KB files)
3. **HMLCP Not Learning** - No patterns to extract (accuracy too high!)

---

## 🎯 Recommended Code Changes

### Change #1: Reduce False Positive Audio Detections

**Problem:** 14 instances of "No speech detected" after sending audio

**Root Cause:** Threshold too sensitive (0.03), picks up breathing/noise

**Solution:** Increase silence threshold to filter noise

```javascript
// File: public/js/conference-silence-detection.js
// Line 48 - Change from:
const SILENCE_THRESHOLD = 0.03;

// To:
const SILENCE_THRESHOLD = 0.045;  // Increased to reduce false positives

// Also update line 50:
const MIN_SPEECH_DURATION_MS = 500;  // Changed from 300 to 500ms
```

**Expected Impact:** Reduce empty audio by ~80%

---

### Change #2: Add Maximum Chunk Duration

**Problem:** Speech chunks up to 39.7 seconds cause:
- High latency (long wait before processing)
- Large file sizes (628KB)
- Harder for HMLCP to learn patterns

**Solution:** Force send after 15 seconds max

```javascript
// File: public/js/conference-silence-detection.js
// Add after line 50:

const MAX_SPEECH_DURATION_MS = 15000;  // 15 seconds maximum

// Then in detectSilence() function, add after line 445 (after RMS calculation):

// Force send if speaking too long
if (isSpeaking) {
    const speechDuration = Date.now() - speechStartTime;
    if (speechDuration >= MAX_SPEECH_DURATION_MS) {
        console.log(`[Silence Detection] Max duration reached (${speechDuration}ms) - force sending`);
        sendBufferedAudio();
        return;
    }
}

// Then continue with existing silence check...
```

**Expected Impact:**
- Chunks never exceed 15 seconds
- Better translation latency
- More granular HMLCP pattern learning

---

### Change #3: Faster Silence Detection

**Problem:** 800ms silence wait feels sluggish for responsive conversations

**Solution:** Reduce to 600ms for snappier response

```javascript
// File: public/js/conference-silence-detection.js
// Line 49 - Change from:
const SILENCE_DURATION_MS = 800;

// To:
const SILENCE_DURATION_MS = 600;  // Faster response for natural conversation
```

**Trade-off:** May split sentences more often, but better for conversations

---

### Change #4: Add Low Confidence Verification

**Problem:** HMLCP can't learn if there are no errors

**Solution:** Ask user to verify transcriptions with <95% confidence

```javascript
// File: public/js/conference-silence-detection.js
// Add after line 121 (after displayTranscription):

socket.on('transcription-result', (data) => {
    console.log('Transcription:', data);
    displayTranscription(data.text);

    // NEW: Add verification prompt for low confidence
    if (data.confidence && data.confidence < 0.95) {
        promptVerification(data.text, data.rawText, data.confidence);
    }
});

// Add new function at the end of the file:
function promptVerification(text, rawText, confidence) {
    const transcriptionDisplay = document.getElementById('transcriptionDisplay');

    // Add verification UI
    const verifyDiv = document.createElement('div');
    verifyDiv.className = 'verification-prompt';
    verifyDiv.innerHTML = `
        <div class="verify-header">
            <span class="verify-icon">⚠️</span>
            <span>Low confidence (${Math.round(confidence * 100)}%) - Please verify:</span>
        </div>
        <div class="verify-text">"${text}"</div>
        <div class="verify-actions">
            <button class="btn-verify-correct" onclick="verifyCorrect('${text}')">✓ Correct</button>
            <button class="btn-verify-edit" onclick="verifyEdit('${text}', '${rawText}')">✏️ Edit</button>
        </div>
    `;

    transcriptionDisplay.appendChild(verifyDiv);
    transcriptionDisplay.scrollTop = transcriptionDisplay.scrollHeight;
}

function verifyCorrect(text) {
    // Remove verification prompt
    document.querySelector('.verification-prompt')?.remove();
    console.log('[Verification] User confirmed:', text);
}

function verifyEdit(text, rawText) {
    const corrected = prompt('Please correct the transcription:', text);
    if (corrected && corrected !== text) {
        // Send correction to server for HMLCP learning
        socket.emit('correction-feedback', {
            original: rawText,
            interpreted: text,
            corrected: corrected
        });

        console.log('[Verification] Correction sent:', text, '→', corrected);
    }

    // Remove verification prompt
    document.querySelector('.verification-prompt')?.remove();
}
```

**Expected Impact:** HMLCP learns from actual corrections

---

### Change #5: Add Voice Characteristics to Profile

**Problem:** Using generic threshold (0.03) for all users

**Solution:** Calculate personalized threshold during calibration

```javascript
// File: hmlcp/user-profile.js
// Add after line 39 (after metrics object):

// Voice characteristics (learned during calibration)
this.voiceCharacteristics = {
  avgRMS: 0,           // Average speaking volume
  peakRMS: 0,          // Loudest volume
  quietRMS: 0,         // Quietest volume
  dynamicRange: 0,     // peakRMS - quietRMS
  optimalThreshold: 0, // Calculated: avgRMS * 0.6
  speakingRate: 0,     // Words per minute
  pauseFrequency: 0    // Average pauses per minute
};
```

**Then update calibration handler in conference-server.js:**

```javascript
// File: conference-server.js
// In the 'calibration-audio' handler (around line 550), add after transcription:

// Calculate voice characteristics from calibration audio
const audioAnalysis = analyzeAudioCharacteristics(Buffer.from(audioBuffer));

// Update profile with voice characteristics
if (profile.voiceCharacteristics) {
  profile.voiceCharacteristics.avgRMS =
    (profile.voiceCharacteristics.avgRMS * phraseIndex + audioAnalysis.avgRMS) / (phraseIndex + 1);

  profile.voiceCharacteristics.peakRMS =
    Math.max(profile.voiceCharacteristics.peakRMS, audioAnalysis.peakRMS);

  profile.voiceCharacteristics.quietRMS =
    phraseIndex === 0 ? audioAnalysis.quietRMS :
    Math.min(profile.voiceCharacteristics.quietRMS, audioAnalysis.quietRMS);

  // Calculate optimal threshold (60% of average volume)
  profile.voiceCharacteristics.optimalThreshold =
    profile.voiceCharacteristics.avgRMS * 0.6;

  profile.voiceCharacteristics.dynamicRange =
    profile.voiceCharacteristics.peakRMS - profile.voiceCharacteristics.quietRMS;
}

// Helper function to analyze audio characteristics
function analyzeAudioCharacteristics(audioBuffer) {
  // Simplified - in production, use proper audio analysis library
  return {
    avgRMS: 0.05,  // Placeholder - calculate from actual audio
    peakRMS: 0.15,
    quietRMS: 0.02
  };
}
```

**Expected Impact:** Personalized silence detection per user

---

### Change #6: Enhanced Calibration Phrases

**Problem:** Generic phrases don't capture user-specific vocabulary

**Solution:** Add personalized calibration questions

```javascript
// File: public/js/onboarding.js
// Update PHRASES object (line ~15) to include personalization:

// After standard phrases, add:
const PERSONALIZATION_PROMPTS = {
  en: [
    { type: 'name', prompt: 'Say: "My name is [YOUR NAME]"' },
    { type: 'industry', prompt: 'Say: "I work in [INDUSTRY]"' },
    { type: 'common', prompt: 'Say your most common phrase at work' }
  ],
  // Add for other languages...
};

// In onboarding flow, collect these and send to server as custom vocabulary
```

**Expected Impact:** Better recognition of names, industry terms

---

## 🔧 CSS Styles for Verification UI

Add to `public/css/conference.css`:

```css
/* Verification prompt */
.verification-prompt {
    background: #fff9e6;
    border-left: 4px solid #f39c12;
    padding: 15px;
    margin: 10px 0;
    border-radius: 8px;
    animation: slideIn 0.3s ease-out;
}

.verify-header {
    display: flex;
    align-items: center;
    gap: 8px;
    margin-bottom: 10px;
    font-weight: 600;
    color: #d68910;
}

.verify-icon {
    font-size: 1.2rem;
}

.verify-text {
    background: white;
    padding: 12px;
    border-radius: 6px;
    margin: 10px 0;
    font-size: 1rem;
    color: #2c3e50;
    font-style: italic;
}

.verify-actions {
    display: flex;
    gap: 10px;
    margin-top: 10px;
}

.btn-verify-correct,
.btn-verify-edit {
    padding: 8px 16px;
    border: none;
    border-radius: 6px;
    font-weight: 600;
    cursor: pointer;
    transition: all 0.2s ease;
}

.btn-verify-correct {
    background: #2ecc71;
    color: white;
}

.btn-verify-correct:hover {
    background: #27ae60;
}

.btn-verify-edit {
    background: #3498db;
    color: white;
}

.btn-verify-edit:hover {
    background: #2980b9;
}

@keyframes slideIn {
    from {
        transform: translateX(100%);
        opacity: 0;
    }
    to {
        transform: translateX(0);
        opacity: 1;
    }
}
```

---

## 📈 Expected Results After Changes

### Before (Current)
- Empty audio detections: 14 per session
- Max chunk size: 628KB (39.7s)
- Silence threshold: 0.03 (generic)
- HMLCP patterns learned: 0
- Average latency: 1.5s

### After (Predicted)
- Empty audio detections: ~3 per session (79% reduction)
- Max chunk size: 244KB (15s max)
- Silence threshold: 0.045 + personalized
- HMLCP patterns learned: 2-5 per session
- Average latency: 1.2s (20% improvement)

---

## 🚀 Implementation Priority

### Priority 1 (Implement Today - 30 mins)
1. ✅ Change SILENCE_THRESHOLD to 0.045
2. ✅ Change MIN_SPEECH_DURATION_MS to 500
3. ✅ Add MAX_SPEECH_DURATION_MS (15 seconds)

**Test:** Speak for 20+ seconds, verify it sends after 15s

### Priority 2 (Implement This Week - 2 hours)
4. ✅ Add low confidence verification UI
5. ✅ Add verification CSS styles
6. ✅ Implement correction feedback handler

**Test:** Speak unclear words, verify prompts appear

### Priority 3 (Implement Next Week - 4 hours)
7. ✅ Add voiceCharacteristics to UserProfile
8. ✅ Implement audio analysis in calibration
9. ✅ Use personalized threshold

**Test:** Complete full calibration, check profile has voice data

---

## 🧪 Testing Checklist

After implementing changes, test:

- [ ] Breathing/ambient noise doesn't trigger recording
- [ ] Long speech (20+ seconds) splits at 15 seconds
- [ ] Low confidence (<95%) shows verification prompt
- [ ] Corrected transcriptions sent to HMLCP
- [ ] Voice profile contains characteristics
- [ ] Personalized threshold works for your voice
- [ ] Translation latency improved
- [ ] No regression in accuracy

---

## 📊 Metrics to Track

Add logging to track improvements:

```javascript
// Track performance metrics
const performanceMetrics = {
  totalUtterances: 0,
  emptyAudioCount: 0,
  avgChunkSize: 0,
  avgConfidence: 0,
  avgLatency: 0,
  correctionsCount: 0,
  patternsLearned: 0
};

// Update after each transcription
function updateMetrics(data) {
  performanceMetrics.totalUtterances++;
  performanceMetrics.avgConfidence =
    (performanceMetrics.avgConfidence * (performanceMetrics.totalUtterances - 1) + data.confidence)
    / performanceMetrics.totalUtterances;

  console.log('Performance Metrics:', performanceMetrics);
}
```

---

## 🎯 Success Criteria

**You'll know calibration is working when:**

1. ✅ Empty audio < 5% of total utterances
2. ✅ Average chunk size < 200KB
3. ✅ 99% of transcriptions have 95%+ confidence
4. ✅ HMLCP learns 2-5 patterns per hour of use
5. ✅ Translation latency < 1.5s average
6. ✅ User-specific terms recognized correctly
7. ✅ No mid-word cuts or stuttering

---

## 💡 Long-term Enhancements

### Phase 2 (Next Month)
- **Background noise adaptation** - Adjust threshold based on ambient noise
- **Speaking rate normalization** - Detect fast/slow speakers
- **Accent detection** - Use language-specific models
- **Multi-language support** - Switch languages mid-conversation
- **Voice biometrics** - Identify speaker by voice characteristics

### Phase 3 (Future)
- **Emotion detection** - Recognize tone/emotion
- **Context-aware corrections** - Learn domain vocabulary
- **Collaborative learning** - Share anonymous patterns
- **Real-time confidence display** - Show confidence as you speak
- **Adaptive threshold** - Auto-adjust based on environment

---

## 📝 Notes

- Current accuracy (96.3%) is excellent - calibration working!
- Most improvements focus on UX/latency, not accuracy
- HMLCP needs corrections to learn - add verification prompts
- Personalized thresholds will prevent future issues with new users

---

**All changes are local - nothing committed, nothing deployed yet.**

Ready to implement these changes?
