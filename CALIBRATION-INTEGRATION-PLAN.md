# Speech Calibration Integration Plan

## Overview
Multi-layer approach to improve speech recognition and translation quality through AI-based calibration.

---

## Architecture

### Layer 1: Audio Preprocessing (Client-Side)
**Status:** ✅ Already implemented
- Web Audio API noise suppression
- Echo cancellation
- Auto gain control

**Location:** `public/js/conference-silence-detection.js:339-343`

---

### Layer 2: STT Service Optimization (Deepgram)
**Status:** ⏳ To be implemented

#### 2.1 Speaker Adaptation (Onboarding)
Collect voice samples during user onboarding to improve recognition.

**Onboarding Flow:**
1. User joins for first time
2. Show calibration wizard
3. User reads 5-10 sample phrases
4. Send to Deepgram with user profile ID
5. Deepgram learns voice patterns
6. Store profile ID in user session

**Sample Phrases (Multi-lingual):**
```
English:
- "Hello, my name is [name]"
- "I would like to schedule a meeting"
- "The quick brown fox jumps over the lazy dog"
- "What time is the conference call?"
- "Thank you very much for your help"

Spanish:
- "Hola, me llamo [name]"
- "Me gustaría programar una reunión"
...
```

#### 2.2 Custom Keywords
Allow users to add:
- Their name
- Company/product names
- Technical terms
- Frequently used phrases

**Implementation:**
```javascript
// Send to Deepgram with custom keywords
deepgram.transcription.preRecorded({
  keywords: ['Azure', 'Kubernetes', 'microservices'],
  keyword_boost: 1.5
});
```

#### 2.3 Enhanced Models
Use Deepgram's enhanced models for noisy environments:
```javascript
model: 'nova-2',
tier: 'enhanced'  // Better for conferences/noisy audio
```

---

### Layer 3: HMLCP Pattern Learning (Post-STT)
**Status:** ✅ Modules created, ❌ Not integrated

Your HMLCP system learns from actual usage:
1. User speaks
2. STT produces text (may have errors)
3. User can correct errors (feedback)
4. HMLCP extracts patterns
5. Future similar speech → auto-corrected

**Pattern Examples:**
```
User always says "Suh-giv" → STT hears "savage" → Should be "Sagiv"
User's accent: "meeting" → STT: "mating" → Correct: "meeting"
Context: "deploy to [azure/asher/assure]" → Always means "Azure"
```

---

## Integration Steps

### Phase 1: Onboarding UI
**File:** `public/onboarding.html` (new)

Create calibration wizard:
```html
<div id="calibration-screen">
  <h2>Voice Calibration</h2>
  <p>Read these phrases to improve recognition:</p>
  <div id="phrase-display">Hello, my name is...</div>
  <button id="record-phrase">Record</button>
  <progress id="calibration-progress" value="0" max="5"></progress>
</div>
```

**Flow:**
1. Detect first-time user (no profile in localStorage)
2. Show calibration wizard before conference join
3. Record 5 phrases
4. Send to server for processing
5. Store user profile ID
6. Proceed to conference

### Phase 2: Server-Side Profile Management
**File:** `conference-server.js` (modify)

Add profile management:
```javascript
const profiles = new Map(); // userProfileId -> HMLCPProfile

// On user join
socket.on('join-room', (data) => {
  const { username, language, profileId } = data;

  // Load or create HMLCP profile
  if (profileId && profiles.has(profileId)) {
    const profile = profiles.get(profileId);
    console.log('Loaded user profile:', profile.stats);
  } else {
    const profile = new UserProfile(username, language);
    const newProfileId = generateProfileId();
    profiles.set(newProfileId, profile);
    socket.emit('profile-created', { profileId: newProfileId });
  }
});

// On calibration audio
socket.on('calibration-audio', async (data) => {
  const { audioBuffer, phrase, profileId } = data;

  // Send to Deepgram STT
  const transcription = await transcribeAudio(audioBuffer);

  // Compare expected vs actual
  const profile = profiles.get(profileId);
  profile.addCalibrationSample(phrase, transcription);

  // Extract patterns
  const patterns = PatternExtractor.extractPatterns(phrase, transcription);
  profile.addPatterns(patterns);
});
```

### Phase 3: Real-Time Pattern Application
**File:** `conference-server.js` (modify)

Apply corrections in real-time:
```javascript
// On audio stream
socket.on('audio-stream', async (data) => {
  // 1. Transcribe with Deepgram
  const rawTranscription = await transcribeAudio(data.audioBuffer);

  // 2. Apply HMLCP corrections
  const profile = profiles.get(data.profileId);
  const correctedText = profile.applyPatterns(rawTranscription);

  // 3. Translate corrected text
  const translation = await translateText(correctedText, data.targetLang);

  // 4. Send back
  io.to(data.roomId).emit('translated-audio', {
    originalText: correctedText,  // Already corrected!
    translatedText: translation
  });
});
```

### Phase 4: User Feedback Loop
**File:** `public/js/conference-silence-detection.js` (modify)

Allow users to correct mistakes:
```javascript
function addTranslationToFeed(data) {
  const div = document.createElement('div');
  div.innerHTML = `
    <div class="translation-original">
      ${data.originalText}
      <button class="edit-btn" onclick="editTranscription(this)">✏️ Edit</button>
    </div>
  `;
}

function editTranscription(btn) {
  const textDiv = btn.parentElement;
  const originalText = textDiv.textContent.trim();

  const corrected = prompt('Correct the text:', originalText);
  if (corrected) {
    // Send correction to server for learning
    socket.emit('correction-feedback', {
      original: originalText,
      corrected: corrected
    });
  }
}
```

Server learns from corrections:
```javascript
socket.on('correction-feedback', (data) => {
  const profile = profiles.get(socket.profileId);

  // Extract what went wrong
  const pattern = PatternExtractor.extractCorrectionPattern(
    data.original,
    data.corrected
  );

  // Add to user profile
  profile.addPattern(pattern);

  console.log('Learned new pattern:', pattern);
});
```

---

## Data Flow

```
┌─────────────────────────────────────────────────────────────┐
│ ONBOARDING (One-time)                                       │
├─────────────────────────────────────────────────────────────┤
│ User speaks phrases → Deepgram learns → Profile created    │
└─────────────────────────────────────────────────────────────┘
                            ↓
┌─────────────────────────────────────────────────────────────┐
│ REAL-TIME USAGE                                              │
├─────────────────────────────────────────────────────────────┤
│ 1. Audio Recording (preprocessed)                           │
│    ├─ Noise suppression                                     │
│    ├─ Echo cancellation                                     │
│    └─ Silence detection                                     │
│                                                              │
│ 2. STT (Deepgram with profile)                              │
│    ├─ Speaker-adapted model                                 │
│    ├─ Custom keywords                                       │
│    └─ Enhanced model                                        │
│                                                              │
│ 3. HMLCP Correction (post-STT)                              │
│    ├─ Apply learned patterns                                │
│    ├─ Context-aware fixes                                   │
│    └─ User-specific corrections                             │
│                                                              │
│ 4. Translation (DeepL)                                      │
│ 5. TTS (Azure)                                              │
└─────────────────────────────────────────────────────────────┘
                            ↓
┌─────────────────────────────────────────────────────────────┐
│ FEEDBACK LOOP                                                │
├─────────────────────────────────────────────────────────────┤
│ User corrects error → Pattern extracted → Profile updated  │
└─────────────────────────────────────────────────────────────┘
```

---

## File Changes Required

### New Files
- `public/onboarding.html` - Calibration wizard UI
- `public/css/onboarding.css` - Calibration styling
- `public/js/onboarding.js` - Calibration logic
- `CALIBRATION-INTEGRATION-PLAN.md` - This file

### Modified Files
- `conference-server.js` - Add profile management + HMLCP integration
- `public/js/conference-silence-detection.js` - Add correction UI
- `public/index.html` - Add link to onboarding for new users
- `hmlcp/user-profile.js` - Add calibration methods
- `hmlcp/pattern-extractor.js` - Add correction pattern extraction

---

## Storage Strategy

### Option 1: In-Memory (Current)
- Store profiles in Map during server runtime
- Lost on server restart
- Good for development/testing

### Option 2: LocalStorage (Client)
- Store profile patterns in browser
- Persists across sessions
- Privacy-friendly (no server storage)
- Send patterns to server on each connection

### Option 3: Database (Production)
- Store profiles in MongoDB/PostgreSQL
- Persistent across server restarts
- User accounts required
- Better for production

**Recommendation:** Start with LocalStorage (Option 2), migrate to Database (Option 3) for production.

---

## Privacy Considerations

### Data Collection
- Voice samples: Used only for STT improvement, not stored
- Transcription patterns: Anonymized, no raw audio
- User corrections: Only text patterns, no PII

### User Control
- Opt-in calibration (can skip)
- Clear data button
- Export profile data
- Delete profile anytime

### Compliance
- GDPR: Users can request data deletion
- CCPA: Users can opt-out of data collection
- Minimal data collection (patterns only, no audio)

---

## Performance Metrics

Track calibration effectiveness:
```javascript
profile.stats = {
  totalUtterances: 150,
  correctionsMade: 12,
  patternsLearned: 8,
  recognitionAccuracy: 94.5%, // Before: 87%
  avgConfidenceScore: 0.92
};
```

Display in UI:
- "Recognition accuracy improved by 7.5%!"
- "8 patterns learned from your speech"

---

## Next Steps

1. ✅ Review this plan
2. ⬜ Create onboarding UI
3. ⬜ Integrate HMLCP into conference-server.js
4. ⬜ Add Deepgram speaker adaptation
5. ⬜ Implement feedback loop
6. ⬜ Test with real users
7. ⬜ Measure improvement metrics

---

## Questions to Decide

1. **Onboarding mandatory or optional?**
   - Mandatory: Better accuracy, might annoy users
   - Optional: User-friendly, lower adoption

2. **How many calibration phrases?**
   - 3 phrases: Quick, less accurate
   - 5 phrases: Balanced (recommended)
   - 10 phrases: Better accuracy, takes longer

3. **Storage strategy?**
   - Start with LocalStorage or go straight to database?

4. **Deepgram tier?**
   - Standard: Cheaper, good quality
   - Enhanced: More expensive, better for noisy environments

---

## Estimated Implementation Time

- Onboarding UI: 4-6 hours
- Server integration: 6-8 hours
- HMLCP integration: 4-6 hours
- Feedback loop: 3-4 hours
- Testing + refinement: 6-8 hours

**Total: ~25-35 hours**

---

## References

- [Deepgram Speaker Diarization](https://developers.deepgram.com/docs/diarization)
- [Deepgram Keywords](https://developers.deepgram.com/docs/keywords)
- [Azure Custom Speech](https://learn.microsoft.com/en-us/azure/ai-services/speech-service/custom-speech-overview)
- Your HMLCP architecture: `HMLCP-ARCHITECTURE.md`
