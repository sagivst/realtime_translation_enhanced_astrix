# Quick Start - Simultaneous Translation Conference

Get your conference room running in 5 minutes!

## Step 1: Get API Keys (Required)

You need **all three** API keys:

### Deepgram (Speech-to-Text)
1. Go to https://deepgram.com
2. Sign up (free tier: 12,000 min/year)
3. Dashboard → API Keys → Create
4. Copy the key

### DeepL (Translation)
1. Go to https://www.deepl.com/pro-api
2. Sign up for API Free (500K chars/month)
3. Account → API Keys
4. Copy the key

### Azure Speech (Text-to-Speech)
1. Go to https://portal.azure.com
2. Create → Speech Service
3. Go to resource → Keys and Endpoint
4. Copy Key 1 and Region

## Step 2: Configure Environment

Create `.env` file:

```bash
cp .env.example .env
```

Edit `.env` and paste your keys:

```env
DEEPGRAM_API_KEY=your_key_here
DEEPL_API_KEY=your_key_here
AZURE_SPEECH_KEY=your_key_here
AZURE_SPEECH_REGION=eastus  # or your region
```

## Step 3: Start Server

```bash
npm run conference
```

You should see:
```
Conference server running on http://localhost:3000
Services status:
  - Deepgram STT: ✓
  - DeepL Translation: ✓
  - Azure TTS: ✓
```

**All three must show ✓**

## Step 4: Join Conference

1. Open Chrome/Edge browser
2. Go to `http://localhost:3000`
3. Enter your name
4. Select your language
5. Leave Room ID blank (creates new room)
6. Click "Join Conference"

## Step 5: Test Translation

1. Click "Start Speaking"
2. Allow microphone access
3. Say something (e.g., "Hello, this is a test")
4. See your transcription appear
5. Click "Stop Speaking"

## Step 6: Invite Others

1. Share your Room ID (shown at top)
2. Others open http://localhost:3000
3. They enter same Room ID
4. They select THEIR language
5. Everyone speaks and hears in own language!

## Testing Solo

1. Open two browser windows
2. Join same room with different languages
3. Speak in one window
4. Hear translation in other window

## Common Issues

**Services show ✗**
- Check API keys in `.env`
- Restart server
- Verify account is active

**Microphone doesn't work**
- Allow permission in browser
- Use Chrome or Edge
- Check system microphone settings

**High latency (>2000ms)**
- Check internet speed
- Close other apps
- Try different network

## Next Steps

- Read [CONFERENCE-README.md](CONFERENCE-README.md) for full documentation
- Test different language combinations
- Invite friends to test multi-user
- Monitor latency stats at bottom

---

**Start breaking language barriers now! 🌐**
