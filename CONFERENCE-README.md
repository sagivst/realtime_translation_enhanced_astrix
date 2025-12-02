## Simultaneous Translation Conference Room

A real-time multilingual conference application that enables participants to speak in their native language and be heard by everyone else in their own language, with less than 2000ms latency.

## Features

- **10 Supported Languages**: English, Spanish, French, German, Italian, Portuguese, Japanese, Korean, Chinese, Russian
- **Real-time Speech Recognition**: Powered by Deepgram STT
- **High-Quality Translation**: Using DeepL API
- **Natural Voice Output**: Azure Text-to-Speech with neural voices
- **Low Latency**: Optimized for <2000ms end-to-end latency
- **Multi-participant Rooms**: Multiple users can join the same conference
- **Audio Visualization**: Live waveform display
- **Translation History**: View all translations in real-time feed

## Architecture

```
Speaker's Audio → Deepgram STT → DeepL Translation → Azure TTS → Listener's Audio
    (Microphone)     (Text)          (Translated Text)    (Speech)     (Speakers)
```

### Pipeline Flow

1. **Capture**: User speaks into microphone (2-second audio chunks)
2. **Transcribe**: Deepgram converts speech to text in source language
3. **Translate**: DeepL translates text to each participant's target language
4. **Synthesize**: Azure TTS converts translated text to speech
5. **Deliver**: Audio streams to all participants in real-time

## Prerequisites

### Required Services

You **must** have accounts and API keys for:

1. **Deepgram** - Speech-to-Text
   - Website: https://deepgram.com
   - Free tier: 12,000 minutes/year

2. **DeepL** - Translation
   - Website: https://www.deepl.com/pro-api
   - Free tier: 500,000 characters/month

3. **Azure Speech Services** - Text-to-Speech
   - Website: https://azure.microsoft.com/services/cognitive-services/speech-services/
   - Free tier: 5 million characters/month

### Technical Requirements

- Node.js v14 or higher
- Modern browser (Chrome or Edge recommended)
- Microphone access
- Stable internet connection (minimum 1 Mbps)

## Installation

### 1. Install Dependencies

```bash
npm install
```

This will install:
- `@deepgram/sdk` - Deepgram Speech-to-Text SDK
- `deepl-node` - DeepL Translation API
- `microsoft-cognitiveservices-speech-sdk` - Azure Speech SDK
- `express` - Web server
- `socket.io` - Real-time communication
- `uuid` - Unique identifiers

### 2. Set Up API Keys

Create a `.env` file in the root directory:

```bash
cp .env.example .env
```

Edit `.env` and add your API keys:

```env
PORT=3000

# Deepgram API Key
DEEPGRAM_API_KEY=your_actual_deepgram_api_key

# DeepL API Key
DEEPL_API_KEY=your_actual_deepl_api_key

# Azure Speech Services
AZURE_SPEECH_KEY=your_actual_azure_key
AZURE_SPEECH_REGION=your_azure_region  # e.g., eastus, westus2
```

### 3. Get Your API Keys

#### Deepgram Setup

1. Go to https://deepgram.com
2. Sign up for a free account
3. Navigate to Dashboard → API Keys
4. Create a new API key
5. Copy and paste into `.env`

#### DeepL Setup

1. Go to https://www.deepl.com/pro-api
2. Sign up for DeepL API Free account
3. Navigate to Account → API Keys
4. Copy your authentication key
5. Paste into `.env`

#### Azure Speech Setup

1. Create Azure account at https://azure.microsoft.com
2. Go to Azure Portal → Create Resource
3. Search for "Speech" and create Speech Service
4. Go to your Speech resource
5. Copy "Key" and "Region" from Keys and Endpoint section
6. Paste both into `.env`

## Running the Application

### Start the Server

```bash
node conference-server.js
```

Or use the npm script:

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

**Important**: All three services must show ✓ for the app to work properly.

### Access the Application

1. Open your browser (Chrome or Edge recommended)
2. Go to: `http://localhost:3000`
3. You'll see the conference join screen

## How to Use

### Creating/Joining a Conference

1. **Enter Your Name**: Type your display name
2. **Select Your Language**: Choose the language you'll speak in
3. **Room ID**:
   - Leave blank to create a new room (you'll get a room ID)
   - Enter an existing room ID to join others
4. Click **"Join Conference"**

### During the Conference

#### Speaking

1. Click **"Start Speaking"** button
2. Speak clearly into your microphone
3. Your speech will be:
   - Transcribed and shown to you
   - Translated for each participant
   - Spoken in their language automatically
4. Click **"Stop Speaking"** when done

#### Listening

- When others speak, you'll:
  - See the translation text in the feed
  - Hear their words in YOUR language automatically
  - See who's speaking and their original text

### Conference Controls

- **Participants Panel** (left): See who's in the room and their languages
- **Audio Visualizer**: See waveform when speaking
- **Transcription Box**: View your own speech transcription
- **Translation Feed** (right): See all translations with timestamps
- **Latency Monitor**: Check real-time latency (should be <2000ms)
- **Leave Room**: Exit the conference

## Supported Languages

| Code | Language | Deepgram | DeepL | Azure Voice |
|------|----------|----------|-------|-------------|
| en | English | ✓ | ✓ | JennyNeural |
| es | Spanish | ✓ | ✓ | ElviraNeural |
| fr | French | ✓ | ✓ | DeniseNeural |
| de | German | ✓ | ✓ | KatjaNeural |
| it | Italian | ✓ | ✓ | ElsaNeural |
| pt | Portuguese | ✓ | ✓ | RaquelNeural |
| ja | Japanese | ✓ | ✓ | NanamiNeural |
| ko | Korean | ✓ | ✓ | SunHiNeural |
| zh | Chinese | ✓ | ✓ | XiaoxiaoNeural |
| ru | Russian | ✓ | ✓ | SvetlanaNeural |

## Performance Optimization

### Latency Breakdown

Target: <2000ms total

- Audio capture: ~100ms (2-second chunks processed)
- Deepgram STT: ~300-500ms
- DeepL translation: ~200-400ms
- Azure TTS: ~400-600ms
- Network/overhead: ~200-300ms

**Total typical latency: 1200-1900ms** ✓

### Tips for Best Performance

1. **Use wired internet** connection
2. **Close unnecessary applications** to free up bandwidth
3. **Use quality microphone** for better STT accuracy
4. **Speak clearly** and at moderate pace
5. **Keep audio chunks at 2 seconds** (optimized in code)
6. **Monitor latency display** - if consistently >2000ms, check connection

## Troubleshooting

### Services Not Working

**Problem**: "Deepgram STT: ✗ (not configured)"

**Solution**:
- Check `.env` file exists in root directory
- Verify `DEEPGRAM_API_KEY` is set correctly
- Restart the server

**Problem**: "DeepL Translation: ✗"

**Solution**:
- Verify `DEEPL_API_KEY` in `.env`
- Check you're using DeepL API key (not DeepL Pro subscription)
- Ensure you haven't exceeded free tier limits

**Problem**: "Azure TTS: ✗"

**Solution**:
- Check both `AZURE_SPEECH_KEY` and `AZURE_SPEECH_REGION` are set
- Verify region format (e.g., "eastus" not "East US")
- Ensure Azure resource is active

### Audio Issues

**Problem**: Microphone not working

**Solution**:
- Allow microphone permission in browser
- Check microphone is connected and selected in system settings
- Try a different browser (Chrome/Edge recommended)

**Problem**: Can't hear translated audio

**Solution**:
- Check speaker volume
- Verify audio element is playing (check browser console)
- Ensure Azure TTS service is configured

### High Latency

**Problem**: Latency >2000ms consistently

**Solution**:
- Check internet connection speed (run speed test)
- Close other bandwidth-intensive applications
- Try connecting from different location/network
- Check API service status pages

### Translation Errors

**Problem**: "[Translation needed: ...]" appears

**Solution**:
- DeepL API key is missing or invalid
- Check API quota hasn't been exceeded
- Verify network connectivity

## API Endpoints

- `GET /` - Main conference interface
- `GET /health` - Health check and service status
- `GET /api/languages` - List supported languages

### Health Check Example

```bash
curl http://localhost:3000/health
```

Response:
```json
{
  "status": "ok",
  "services": {
    "deepgram": true,
    "deepl": true,
    "azure": true
  },
  "activeRooms": 2,
  "activeParticipants": 5
}
```

## Socket.io Events

### Client → Server

- `join-room`: Join a conference room
- `audio-stream`: Send audio chunk for processing

### Server → Client

- `room-joined`: Successfully joined room
- `participant-joined`: New participant joined
- `participant-left`: Participant left room
- `transcription-result`: Your speech transcription
- `translated-audio`: Receive translated audio from others
- `error`: Error occurred

## Project Structure

```
realtime-translation-app/
├── conference-server.js      # Main server with translation pipeline
├── package.json              # Dependencies
├── .env                      # API keys (create from .env.example)
├── .env.example              # Template for environment variables
├── CONFERENCE-README.md      # This file
└── public/
    ├── conference.html       # Conference UI
    ├── css/
    │   └── conference.css    # Styling
    └── js/
        └── conference.js     # Client-side logic
```

## Cost Estimates (Free Tiers)

### Deepgram
- Free: 12,000 minutes/year = 200 hours
- 1-hour conference with 5 people = ~5 hours of transcription
- **~40 conferences/year on free tier**

### DeepL
- Free: 500,000 characters/month
- Average: ~50 characters per sentence
- **~10,000 sentences/month on free tier**

### Azure Speech
- Free: 5 million characters/month for TTS
- Average: ~50 characters per sentence
- **~100,000 sentences/month on free tier**

## Security Considerations

- Keep API keys secure in `.env` file
- Never commit `.env` to git (already in .gitignore)
- Use HTTPS in production
- Implement authentication for production use
- Add rate limiting for API calls
- Monitor API usage to prevent bill shock

## Limitations

- Maximum 2000ms latency (optimized but network-dependent)
- Audio quality depends on microphone and network
- Translation accuracy varies by language pair
- Free tier limits apply to all services
- Browser compatibility (Chrome/Edge best)

## Future Enhancements

- [ ] Add recording/transcription export
- [ ] Implement user authentication
- [ ] Add video conferencing capabilities
- [ ] Support more languages
- [ ] Add real-time captions display
- [ ] Implement speaker diarization
- [ ] Add meeting recordings
- [ ] Mobile app support
- [ ] Improve offline handling
- [ ] Add sentiment analysis

## License

ISC

## Support

For issues related to:
- **API Services**: Contact respective service providers
- **Application Bugs**: Open an issue in the repository
- **Feature Requests**: Submit via GitHub issues

## Credits

Built with:
- [Deepgram](https://deepgram.com) - Speech-to-Text
- [DeepL](https://www.deepl.com) - Translation
- [Azure Speech Services](https://azure.microsoft.com/services/cognitive-services/speech-services/) - Text-to-Speech
- [Socket.io](https://socket.io) - Real-time communication
- [Express.js](https://expressjs.com) - Web framework

---

**Ready to break language barriers! 🌐🎤**
