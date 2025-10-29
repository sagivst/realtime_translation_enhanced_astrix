# HMLCP System Architecture

## Complete System Flow Diagram

```mermaid
flowchart TD
    subgraph Client["Client (Browser)"]
        USER[👤 User Speaking]
        MIC[🎤 Microphone Input]
        SPEAKER[🔊 Audio Output]
    end

    subgraph Server["Conference Server (Internal)"]
        SOCKET[Socket.IO Handler]

        subgraph HMLCP["HMLCP Layer (Internal)"]
            PROFILE[User Profile Manager]
            ULO[ULO Layer<br/>Phrase Mapping]
            PATTERN[Pattern Extractor<br/>Linguistic Analysis]
            VOCAB[Custom Vocabulary<br/>Generator]
        end

        TRANSL[Translation Pipeline]
    end

    subgraph External["External Services (3rd Party)"]
        DEEPGRAM[🎙️ Deepgram STT API]
        DEEPL[🌐 DeepL Translation API]
        AZURE[🗣️ Azure TTS API]
    end

    subgraph Storage["Persistent Storage (Internal)"]
        PROFILES[(User Profiles<br/>JSON Files)]
    end

    %% User Input Flow
    USER -->|speaks| MIC
    MIC -->|audio buffer| SOCKET

    %% HMLCP Profile Loading
    SOCKET -->|1. Load Profile| PROFILE
    PROFILE <-->|read/write| PROFILES
    PROFILE -->|2. Get ULO & Vocab| ULO
    ULO -->|3. Generate| VOCAB

    %% Deepgram with Custom Vocab
    SOCKET -->|4. Audio + Custom Vocab| DEEPGRAM
    VOCAB -.->|keywords: boost=25| DEEPGRAM
    DEEPGRAM -->|5. Raw Transcription| SOCKET

    %% ULO Processing
    SOCKET -->|6. Apply ULO| ULO
    ULO -->|7. Processed Text<br/>phrase mappings applied| TRANSL

    %% Sample Collection
    ULO -->|8. Store Sample| PROFILE

    %% Translation
    TRANSL -->|9. Translate| DEEPL
    DEEPL -->|10. Translated Text| TRANSL

    %% TTS
    TRANSL -->|11. Synthesize| AZURE
    AZURE -->|12. Audio Data| TRANSL

    %% Back to Client
    TRANSL -->|13. Send Audio| SOCKET
    SOCKET -->|14. Emit to Client| SPEAKER
    SPEAKER -->|plays| USER

    %% Auto-save
    PROFILE -.->|auto-save every 5min| PROFILES

    %% Styling
    classDef external fill:#ff6b6b,stroke:#c92a2a,stroke-width:3px,color:#fff
    classDef internal fill:#4dabf7,stroke:#1971c2,stroke-width:2px,color:#fff
    classDef hmlcp fill:#51cf66,stroke:#2f9e44,stroke-width:2px,color:#000
    classDef storage fill:#ffd43b,stroke:#f59f00,stroke-width:2px,color:#000

    class DEEPGRAM,DEEPL,AZURE external
    class SOCKET,TRANSL internal
    class PROFILE,ULO,PATTERN,VOCAB hmlcp
    class PROFILES storage
```

## Data Flow Details

### 1. Profile Loading Phase
```
User connects → Load or create UserProfile → Initialize ULO Layer → Generate custom vocabulary
```

### 2. Speech-to-Text Phase (Deepgram Integration)
```
Audio Buffer → Custom Vocabulary (keywords) → Deepgram API → Raw Transcription
                    ↓
            [Kubernetes:25, PostgreSQL:25, Azure:25, ...]
```

### 3. HMLCP Processing Phase (ULO Layer)
```
Raw Transcription → ULO.apply() → Processed Transcription
                         ↓
                 Phrase Mappings:
                 "check the thing" → "check the server status"
```

### 4. Translation Phase (DeepL Integration)
```
Processed Text → DeepL API → Translated Text
```

### 5. Text-to-Speech Phase (Azure Integration)
```
Translated Text → Azure TTS API → Audio Data → Client
```

## Component Details

### Internal Components

#### 1. User Profile Manager (`hmlcp/user-profile.js`)
- **Purpose**: Store user-specific linguistic characteristics
- **Data**: Tone, directness, phrase mappings, bias terms, corrections
- **Metrics**: IMR, Calibration Index, correction frequency
- **Persistence**: JSON files in `hmlcp/profiles/`

#### 2. ULO Layer (`hmlcp/ulo-layer.js`)
- **Purpose**: Real-time linguistic adaptation
- **Functions**:
  - `apply(text)` - Apply phrase mappings
  - `learnFromCorrection()` - Update from user feedback
  - `generateCustomVocabulary()` - Create Deepgram keywords
- **Processing**: Phrase mapping, contextual fixes, bias handling

#### 3. Pattern Extractor (`hmlcp/pattern-extractor.js`)
- **Purpose**: Analyze user linguistic patterns
- **Analyzes**: Token frequency, sentence structure, tone, directness
- **Output**: Profile characteristics for calibration

### External Services

#### 1. Deepgram STT API
- **Integration Point**: `transcribeAudio()` in conference-server.js:87
- **HMLCP Enhancement**: Custom vocabulary keywords (boost=25)
- **Input**: Audio buffer + keywords array
- **Output**: Transcription + confidence score

#### 2. DeepL Translation API
- **Integration Point**: `translateText()` in conference-server.js:119
- **HMLCP Enhancement**: Receives ULO-processed text
- **Input**: Processed transcription
- **Output**: Translated text

#### 3. Azure TTS API
- **Integration Point**: `synthesizeSpeech()` in conference-server.js:147
- **HMLCP Enhancement**: None (receives final translated text)
- **Input**: Translated text
- **Output**: MP3 audio buffer

## API Endpoints

### HMLCP Management APIs (Internal)

```
GET  /api/hmlcp/profile/:userId/:language
     → Get user profile statistics

POST /api/hmlcp/correction
     → Submit correction for learning
     Body: { userId, language, rawInput, correctedIntent }

POST /api/hmlcp/analyze
     → Analyze linguistic patterns
     Body: { userId, language }

GET  /api/hmlcp/vocabulary/:userId/:language
     → Get custom vocabulary for user

POST /api/hmlcp/save
     → Manually save profile
     Body: { userId, language }
```

## File Structure

```
realtime-translation-app/
├── conference-server.js          [Main server - Integration point]
├── hmlcp/
│   ├── index.js                  [Module exports]
│   ├── user-profile.js           [Profile management]
│   ├── ulo-layer.js              [Real-time adaptation]
│   ├── pattern-extractor.js      [Linguistic analysis]
│   └── profiles/                 [Persistent storage]
│       ├── testuser_en.json
│       └── testuser2_en.json
└── HMLCP.md                      [Specification document]
```

## Key Integration Points

### conference-server.js

```javascript
// Line 87: Deepgram with custom vocabulary
async function transcribeAudio(audioBuffer, language, customVocab = [])

// Line 318-323: Profile loading before transcription
const { profile, uloLayer, patternExtractor } = await getUserProfile(...)
const customVocab = uloLayer.generateCustomVocabulary()

// Line 335-339: Pass custom vocab to Deepgram
const { text: transcription } = await transcribeAudio(
  Buffer.from(audioBuffer),
  participant.language,
  customVocab  // ← HMLCP integration
)

// Line 366: Apply ULO processing
const processedTranscription = uloLayer.apply(transcription)

// Line 400-404: Send processed text to DeepL
const translatedText = await translateText(
  finalTranscription,  // ← ULO-processed
  participant.language,
  targetParticipant.language
)
```

## Performance Characteristics

- **Profile Loading**: ~10ms (cached in memory after first load)
- **ULO Processing**: <1ms (string replacement operations)
- **Custom Vocabulary**: Generated once per session, no overhead
- **Auto-save**: Every 5 minutes, async operation
- **Pattern Analysis**: On-demand via API, ~50-100ms for typical profile

## Security & Privacy

- **Local Storage**: All profiles stored locally on server
- **No Cloud Sync**: Profiles never leave the server
- **User Isolation**: Each user has separate profile file
- **No PII Required**: Profiles identified by username only

## Future Enhancements

1. **Real-time Pattern Analysis**: Automatically analyze patterns after N samples
2. **Multi-language Profiles**: Separate characteristics per language
3. **Shared Vocabulary**: Organization-wide technical term dictionaries
4. **Active Learning**: Prompt users for corrections on low-confidence transcriptions
