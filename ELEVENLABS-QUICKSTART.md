# ElevenLabs Voice Cloning - Quick Start

**Get personalized voices in 15 minutes - no bureaucracy!**

---

## ✅ What You'll Get

- 🎙️ **4 custom voices** (Boyan, Denitsa, Miroslav, Velislava)
- 🌍 **29+ languages** (same voice speaks English, Hebrew, etc.)
- ⚡ **Low latency** (< 500ms with streaming)
- 🎯 **High quality** (arguably better than Azure)
- ✅ **Instant access** (no approval needed)

---

## Step 1: Create ElevenLabs Account (5 minutes)

### 1.1 Sign Up

**Go to:** https://elevenlabs.io/sign-up

- Sign up with your email
- Verify email

### 1.2 Choose Plan

**Recommended:** Professional ($99/month)
- 100,000 characters/month
- Voice cloning included
- Commercial license

**Or:** Start with Free Trial
- 10,000 characters
- Test before buying

### 1.3 Get API Key

1. Click your **profile icon** (top right)
2. Go to **"Profile + API Key"**
3. Click **"Create API Key"**
4. **Copy the key** (looks like: `sk_abc123...`)

---

## Step 2: Configure API Key (1 minute)

Add to your `.env` file:

```bash
# ElevenLabs TTS
ELEVENLABS_API_KEY=sk_your_api_key_here
```

**Edit the file:**
```bash
nano .env
# Add the line above, save (Ctrl+X, Y, Enter)
```

---

## Step 3: Clone All 4 Voices (5 minutes)

Run the automated setup:

```bash
node setup-elevenlabs-voices.js
```

**What it does:**
- ✅ Validates your API key
- ✅ Uploads audio samples (from processed recordings)
- ✅ Clones all 4 voices automatically
- ✅ Saves voice IDs to `config/elevenlabs-voices.json`

**Output:**
```
========================================
ElevenLabs Voice Cloning Setup
========================================

✓ API Key validated
  Plan: Professional
  Usage: 0 / 100,000 characters

Processing: Boyan Tiholov
────────────────────────────────────────────────────────────
  Found 7 audio files
  Uploading and cloning voice...
  ✓ Voice cloned successfully!
  Voice ID: abc123xyz...

... (repeats for all 4 users)

✓ Configuration saved to: config/elevenlabs-voices.json
```

**Time:** ~5 minutes (uploads 32 audio samples)

---

## Step 4: Test Synthesis (2 minutes)

```bash
node test-elevenlabs.js
```

**What it does:**
- Tests each voice in English and Hebrew
- Saves MP3 files to `output/` folder
- Shows latency and usage stats

**Play the results:**
```bash
afplay output/test_Boyan_Tiholov_English.mp3
afplay output/test_Boyan_Tiholov_Hebrew.mp3
```

**Expected output:**
```
Testing voice: Boyan Tiholov
────────────────────────────────────────────────────────────
  Test 1 (English): "Hello, this is a test..."
    ✓ Synthesized in 487ms
    Audio size: 45.2 KB
    Saved to: output/test_Boyan_Tiholov_English.mp3

  Test 2 (Hebrew): "שלום, זה מבחן..."
    ✓ Synthesized in 512ms
    Audio size: 38.7 KB
    Saved to: output/test_Boyan_Tiholov_Hebrew.mp3
```

---

## Step 5: Update Conference Server (3 minutes)

### 5.1 Update `conference-server.js`

Add at the top:

```javascript
const ElevenLabsTTSService = require('./elevenlabs-tts-service');

// Initialize ElevenLabs
const elevenLabs = new ElevenLabsTTSService(process.env.ELEVENLABS_API_KEY);

// Load voice configuration
const elevenLabsVoices = require('./config/elevenlabs-voices.json');
```

### 5.2 Replace TTS synthesis section

Find the translation handler and update:

```javascript
socket.on('translate-and-speak', async (data) => {
    const { text, sourceLanguage, targetLanguage, participantId, userId } = data;

    try {
        // Translate
        const translatedText = await translateText(text, sourceLanguage, targetLanguage);

        // Get voice for user
        const voiceConfig = elevenLabsVoices.voices[userId];

        if (voiceConfig) {
            // Use custom voice
            const result = await elevenLabs.synthesize(
                translatedText,
                voiceConfig.voiceId,
                voiceConfig.settings
            );

            // Send to client
            socket.broadcast.to(data.room).emit('translated-speech', {
                participantId,
                userId,
                originalText: text,
                translatedText,
                audio: result.audio.toString('base64'),
                format: 'mp3',
                language: targetLanguage
            });

            console.log(`✓ TTS: ${userId} (${translatedText.length} chars)`);
        }
    } catch (error) {
        console.error('TTS error:', error);
        socket.emit('tts-error', { error: error.message });
    }
});
```

### 5.3 Restart server

```bash
npm start
```

---

## 📊 Configuration Reference

**File:** `config/elevenlabs-voices.json`

```json
{
  "voices": {
    "Boyan_Tiholov": {
      "voiceId": "abc123...",
      "name": "Boyan Tiholov",
      "modelId": "eleven_multilingual_v2",
      "settings": {
        "stability": 0.5,
        "similarityBoost": 0.75,
        "style": 0,
        "useSpeakerBoost": true
      }
    },
    ...
  }
}
```

---

## 🎛️ Voice Settings Explained

### Stability (0-1)
- **Low (0.3-0.5):** More expressive, varies between generations
- **High (0.7-1.0):** More consistent, less variation
- **Recommended:** 0.5

### Similarity Boost (0-1)
- **Low (0.3-0.5):** More creative liberties
- **High (0.7-1.0):** Closer to original voice
- **Recommended:** 0.75

### Style (0-1)
- **0:** No style exaggeration
- **1:** Maximum style/emotion
- **Recommended:** 0 (neutral)

### Speaker Boost
- **true:** Enhances similarity to original speaker
- **false:** Standard processing
- **Recommended:** true

---

## 🚀 Advanced Usage

### Streaming for Lower Latency

```javascript
const stream = await elevenLabs.synthesizeStreaming(
    text,
    voiceId,
    { optimizeStreamingLatency: 3 }
);

// Stream audio chunks to client as they arrive
stream.on('data', chunk => {
    socket.emit('audio-chunk', chunk);
});
```

### Adjust Settings Per Request

```javascript
const result = await elevenLabs.synthesize(
    text,
    voiceId,
    {
        stability: 0.7,        // More consistent
        similarityBoost: 0.9,  // Higher similarity
        style: 0.3            // Some emotion
    }
);
```

---

## 💰 Pricing & Usage

### Plans

| Plan | Price/Month | Characters | Voice Cloning |
|------|-------------|------------|---------------|
| Free | $0 | 10,000 | ✅ Yes |
| Starter | $5 | 30,000 | ✅ Yes |
| Creator | $22 | 100,000 | ✅ Yes |
| **Professional** | **$99** | **500,000** | ✅ **Yes** |
| Scale | $330 | 2,000,000 | ✅ Yes |

**Recommended:** Professional ($99) for production use

### Character Usage

**Example calculations:**
- 1 minute of speech ≈ 150 words ≈ 750 characters
- 100,000 chars ≈ 133 minutes of audio
- 500,000 chars ≈ 666 minutes ≈ 11 hours

**Your usage:**
- 4-person conference, 1 hour
- Each person speaks 15 min = 11,250 chars
- Total: 45,000 characters
- **Professional plan:** ~11 hours of conferences/month

### Check Usage

```javascript
const usage = await elevenLabs.getUsage();
console.log(`Used: ${usage.characterCount} / ${usage.characterLimit}`);
```

---

## 🌍 Supported Languages

**ElevenLabs Multilingual v2 supports 29 languages:**

English, Spanish, French, German, Italian, Portuguese, Polish, Turkish, Russian, Dutch, Swedish, Filipino, Japanese, Korean, Hindi, Chinese, Arabic, Czech, Danish, Finnish, Greek, Hebrew, Hungarian, Indonesian, Malay, Norwegian, Romanian, Slovak, Ukrainian

**Your voice speaks ALL of these!**

```javascript
// Same voice, different languages
await elevenLabs.synthesize("Hello, how are you?", voiceId);
await elevenLabs.synthesize("שלום, מה שלומך?", voiceId);
await elevenLabs.synthesize("Hola, ¿cómo estás?", voiceId);
```

---

## 🔧 Troubleshooting

### "Invalid API key"
- Check `.env` file has correct key
- Verify key starts with `sk_`
- Try generating new key in ElevenLabs dashboard

### "Quota exceeded"
- Check usage: `node test-elevenlabs.js`
- Upgrade plan or wait for monthly reset

### "Voice not found"
- Run setup again: `node setup-elevenlabs-voices.js`
- Check `config/elevenlabs-voices.json` exists

### Poor voice quality
- Increase `similarityBoost` to 0.9
- Increase `stability` to 0.7
- Try uploading more/better audio samples

### High latency
- Use streaming: `synthesizeStreaming()`
- Set `optimizeStreamingLatency: 4` (fastest)
- Check network connection

---

## 📚 API Reference

### Main Methods

```javascript
// Clone a voice
voiceId = await elevenLabs.cloneVoice(name, description, audioFiles);

// Synthesize (standard)
result = await elevenLabs.synthesize(text, voiceId, settings);

// Synthesize (streaming)
stream = await elevenLabs.synthesizeStreaming(text, voiceId, settings);

// Get all voices
voices = await elevenLabs.getVoices();

// Get voice details
voice = await elevenLabs.getVoice(voiceId);

// Delete voice
await elevenLabs.deleteVoice(voiceId);

// Check usage
usage = await elevenLabs.getUsage();
```

---

## ✅ Verification Checklist

- [ ] Created ElevenLabs account
- [ ] Got API key
- [ ] Added API key to `.env`
- [ ] Ran `node setup-elevenlabs-voices.js`
- [ ] All 4 voices cloned successfully
- [ ] Ran `node test-elevenlabs.js`
- [ ] Audio files sound good
- [ ] Updated conference server
- [ ] Tested in live conference
- [ ] Working in production!

---

## 🆚 ElevenLabs vs. Azure

| Feature | ElevenLabs | Azure Custom Voice |
|---------|------------|-------------------|
| **Approval** | ✅ None | ❌ Required (days-weeks) |
| **Setup Time** | ✅ 15 minutes | ❌ Days + waiting |
| **Voice Quality** | ⭐⭐⭐⭐⭐ | ⭐⭐⭐⭐⭐ |
| **Languages** | ✅ 29 | ✅ Similar |
| **Latency** | ✅ < 500ms | ✅ < 500ms |
| **Streaming** | ✅ Yes | ✅ Yes |
| **Cost** | $99-330/month | $24-36 per 1M chars |
| **Voice Cloning** | ✅ Instant | ❌ 6-12 hours |
| **Ease of Use** | ✅ Very easy | ❌ Complex |

---

## 📞 Support

**ElevenLabs:**
- Dashboard: https://elevenlabs.io/app
- Docs: https://docs.elevenlabs.io
- Discord: https://discord.gg/elevenlabs

**Your Files:**
- Service: `elevenlabs-tts-service.js`
- Setup: `setup-elevenlabs-voices.js`
- Test: `test-elevenlabs.js`
- Config: `config/elevenlabs-voices.json`

---

**You're all set! Enjoy your personalized multilingual voices!** 🎉
