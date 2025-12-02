  1. Create new server: conference-server-rtp.js
    - Copy from conference-server.js
    - Remove AudioSocket support (7000/7001)
    - Keep only RTP support (7777/8888)
    - Run on different ports to avoid conflicts
    - the new open source media-gateway for 7777 and 8888, keeping the expected UUID
    - Extension number format etc, we need to get the best and fastest connectivity via PCM 16Mhz     etc... 
    Then at the end of the translating flow, just after the timing (sync) and buffering there is current connection to a websocket on 7000 and 7001  that need to kept untouched and a new connection should be done now to the new media-gateway for 7777 and 8888, crossing the OUT/speaker of the tow extensions to allow 7777 to here 8888 translated mic and 8888 to hare 7777 translated mic... 

  2. Two servers running in parallel:
    - conference-server.js → handles 7000/7001 (AudioSocket)
    - conference-server-rtp.js → handles 7777/8888 (RTP/ExternalMedia)

⏺ FINAL CORRECTED PLAN - For Approval

  ⚠️ DECLARATION: ON any confirmation 1/2/3 that you are asking from me that “ you are working only and directly on “http://20.170.155.53/“ and that you willl never touch the production VM (http://4.185.84.26/) or brake 7000 and 7001 old functionality….!!! and that you have review agin, just now Connect_open-source_media_gateway_RTP_audio_to_translation_pipeline.md and maked sure we are working exactly by it…!!!

Please make sure to revied Connect_open-source_media_gateway_RTP_audio_to_translation_pipeline.md befor the decliration...!!!
  ---
  GOAL:

  Connect open-source media gateway RTP audio to translation pipeline WHILE keeping browser monitoring
  working

  ---
  WHAT'S WORKING NOW:

  1. ✅ Open-source media gateway at /home/azureuser/test-externalmedia/
    - RTP on ports 17000, 18000
    - Browser monitoring: http://20.170.155.53:3001/test-translation.html
  2. ✅ Translation pipeline at /home/azureuser/translation-app/

  ---
  WHAT WE'LL DO:

  Step 1: Modify /home/azureuser/test-externalmedia/externalmedia-test-server.js

  1a. Add translation pipeline imports (top of file):
  const { ASRStreamingWorker } = require('../translation-app/asr-streaming-worker');
  const { DeepLIncrementalMT } = require('../translation-app/deepl-incremental-mt');
  const ElevenLabsTTSService = require('../translation-app/elevenlabs-tts-service');
  const AudioStreamBuffer = require('../translation-app/audio-stream-buffer');

  1b. Add to constructor:
  this.sessions = new Map();
  this.translator7777 = new DeepLIncrementalMT(process.env.DEEPL_API_KEY);
  this.translator8888 = new DeepLIncrementalMT(process.env.DEEPL_API_KEY);
  this.ttsService = new ElevenLabsTTSService(process.env.ELEVENLABS_API_KEY);

  1c. In RTP receiver (line ~118) - ADD translation flow, KEEP browser flow:
  rtpReceiver.on('message', (msg) => {
    const pcmAudio = msg.slice(12);

    // KEEP: Send to browser for monitoring
    if (this.extensions[ext].browserWs) {
      this.extensions[ext].browserWs.send(pcmAudio);
    }

    // NEW: Also send to translation pipeline
    const uuid = `${ext}-${Date.now()}`;
    this.handleAudioIn(uuid, ext, pcmAudio);
  });

  1d. Add new methods for translation:
  async handleAudioIn(uuid, ext, pcmAudio) {
    let session = this.sessions.get(ext);
    if (!session) {
      session = await this.createSession(uuid, ext);
      this.sessions.set(ext, session);
    }
    session.asrWorker.sendAudio(pcmAudio);
  }

  async createSession(uuid, ext) {
    const qaConfig = {
      sourceLang: ext === '7777' ? 'en' : 'es',
      targetLang: ext === '7777' ? 'es' : 'en'
    };

    const session = {
      uuid, extension: ext,
      asrWorker: new ASRStreamingWorker(process.env.DEEPGRAM_API_KEY, {
        language: qaConfig.sourceLang,
        sampleRate: 16000,
        encoding: 'linear16'
      }),
      audioBuffer: new AudioStreamBuffer({
        sampleRate: 16000, channels: 1, bitDepth: 16
      }),
      translator: ext === '7777' ? this.translator7777 : this.translator8888
    };

    // ASR → Translation → TTS → Buffer
    session.asrWorker.on('transcript', async (transcript) => {
      const translated = await session.translator.translate(
        transcript.text, qaConfig.sourceLang, qaConfig.targetLang
      );
      const audioBuffer = await this.ttsService.synthesize(translated);
      session.audioBuffer.addAudio(audioBuffer);
    });

    // Buffer → RTP send (cross-routed!)
    session.audioBuffer.on('audioReady', (audioData) => {
      const targetExt = (ext === '7777') ? '8888' : '7777';
      this.sendRTPTranslation(targetExt, audioData.buffer);
    });

    session.asrWorker.start();
    return session;
  }

  sendRTPTranslation(ext, pcmBuffer) {
    const rtpPacket = this.createRTPPacket(pcmBuffer, ext);
    // Send to Asterisk
    const config = this.extensions[ext];
    if (config.rtpSender && config.asteriskHost && config.asteriskPort) {
      config.rtpSender.send(rtpPacket, config.asteriskPort, config.asteriskHost);
    }
  }

  createRTPPacket(pcmBuffer, ext) {
    const header = Buffer.alloc(12);
    header[0] = 0x80;
    header[1] = 0x00;
    // Add sequence, timestamp, SSRC...
    return Buffer.concat([header, pcmBuffer]);
  }

  ---
  RESULT:

  Parallel flows:
  1. ✅ Browser monitoring - Still works exactly as before
  2. ✅ Translation flow - NEW: RTP → ASR → MT → TTS → Buffer → RTP (cross-routed)

  ---
  FILES TO MODIFY:

  - Only 1 file: /home/azureuser/test-externalmedia/externalmedia-test-server.js

  NOT TOUCHING:

  - ✅ Translation pipeline files (unchanged)
  - ✅ Asterisk config (unchanged)
  - ✅ Extensions 7000/7001 (completely untouched)

  TIME: ~1 hour

  SUCCESS:

  - ✅ Browser monitoring still works
  - ✅ 7777 ↔ 8888 translation works
  - ✅ 7000/7001 still work