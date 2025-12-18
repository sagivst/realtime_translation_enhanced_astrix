// Station Audio Integration Module
// Automatically captures and streams audio from monitored stations to the dashboard

const WebSocket = require('ws');
const dgram = require('dgram');

class StationAudioCapture {
  constructor(stationId, extensionId) {
    this.stationId = stationId;
    this.extensionId = extensionId;
    this.audioServerUrl = 'ws://localhost:8099';
    this.ws = null;
    this.rtpSocket = null;
    this.isConnected = false;
    this.audioBuffer = [];
    this.rtpPort = null;

    // Audio format from Asterisk/telephony
    this.audioFormat = {
      codec: 'PCMU',  // G.711 μ-law
      sampleRate: 8000,
      channels: 1,
      payloadType: 0
    };

    console.log(`[AUDIO-CAPTURE] Initializing for ${stationId} extension ${extensionId}`);
  }

  // Start capturing audio for this station
  async startCapture(rtpPort) {
    this.rtpPort = rtpPort;

    // Connect to audio streaming server
    await this.connectToAudioServer();

    // Start RTP listener if port provided
    if (rtpPort) {
      this.startRTPListener(rtpPort);
    }

    console.log(`[AUDIO-CAPTURE] Started capture for ${this.stationId} on RTP port ${rtpPort}`);
  }

  // Connect to the audio streaming server
  async connectToAudioServer() {
    return new Promise((resolve, reject) => {
      try {
        this.ws = new WebSocket(this.audioServerUrl);

        this.ws.on('open', () => {
          this.isConnected = true;

          // Register this stream
          this.ws.send(JSON.stringify({
            type: 'register',
            stationId: this.stationId,
            extensionId: this.extensionId,
            format: this.audioFormat
          }));

          console.log(`[AUDIO-CAPTURE] Connected to audio server for ${this.stationId}`);
          resolve();
        });

        this.ws.on('error', (err) => {
          console.error(`[AUDIO-CAPTURE] WebSocket error for ${this.stationId}:`, err.message);
          this.isConnected = false;
        });

        this.ws.on('close', () => {
          console.log(`[AUDIO-CAPTURE] WebSocket closed for ${this.stationId}`);
          this.isConnected = false;

          // Attempt reconnection after 5 seconds
          setTimeout(() => {
            if (!this.isConnected) {
              this.connectToAudioServer();
            }
          }, 5000);
        });

      } catch (err) {
        reject(err);
      }
    });
  }

  // Start listening for RTP packets
  startRTPListener(port) {
    this.rtpSocket = dgram.createSocket('udp4');

    this.rtpSocket.on('message', (msg, rinfo) => {
      // Parse RTP header (first 12 bytes)
      const version = (msg[0] >> 6) & 0x03;
      const payloadType = msg[1] & 0x7f;
      const sequenceNumber = (msg[2] << 8) | msg[3];
      const timestamp = (msg[4] << 24) | (msg[5] << 16) | (msg[6] << 8) | msg[7];

      // Extract audio payload (skip 12-byte RTP header)
      const audioPayload = msg.slice(12);

      // Send to audio server if connected
      if (this.isConnected && this.ws && this.ws.readyState === WebSocket.OPEN) {
        // Send as binary with metadata prefix
        const metadata = Buffer.from(JSON.stringify({
          stationId: this.stationId,
          extensionId: this.extensionId,
          sequenceNumber,
          timestamp,
          payloadType
        }) + '\n');

        const packet = Buffer.concat([metadata, audioPayload]);
        this.ws.send(packet);
      }

      // Store in buffer for local processing
      this.audioBuffer.push({
        timestamp,
        sequenceNumber,
        payload: audioPayload
      });

      // Keep buffer size manageable (last 10 seconds)
      if (this.audioBuffer.length > 800) { // 8000Hz / 10ms packets = 800 packets/sec
        this.audioBuffer.shift();
      }
    });

    this.rtpSocket.on('error', (err) => {
      console.error(`[AUDIO-CAPTURE] RTP socket error for ${this.stationId}:`, err.message);
    });

    this.rtpSocket.bind(port);
    console.log(`[AUDIO-CAPTURE] RTP listener started on port ${port} for ${this.stationId}`);
  }

  // Send PCM audio directly (from decoded streams)
  sendPCMAudio(pcmBuffer) {
    if (this.isConnected && this.ws && this.ws.readyState === WebSocket.OPEN) {
      const metadata = Buffer.from(JSON.stringify({
        stationId: this.stationId,
        extensionId: this.extensionId,
        format: 'PCM16',
        sampleRate: 16000,
        channels: 1
      }) + '\n');

      const packet = Buffer.concat([metadata, pcmBuffer]);
      this.ws.send(packet);
    }
  }

  // Stop capturing audio
  stopCapture() {
    if (this.rtpSocket) {
      this.rtpSocket.close();
      this.rtpSocket = null;
    }

    if (this.ws) {
      this.ws.close();
      this.ws = null;
    }

    this.isConnected = false;
    console.log(`[AUDIO-CAPTURE] Stopped capture for ${this.stationId}`);
  }

  // Get current audio buffer
  getAudioBuffer() {
    return this.audioBuffer;
  }
}

// Enhanced Station3Handler with audio capture
class Station3HandlerWithAudio {
  constructor(extensionId) {
    this.extensionId = extensionId;
    this.configPath = `/tmp/STATION_3-${extensionId}-config.json`;
    this.knobs = {};
    this.audioStartTime = Date.now();
    this.stationAgent = null;
    this.audioCapture = null;

    // RTP ports based on extension
    this.rtpPorts = {
      '3333': 10000,  // RTP port for extension 3333
      '4444': 10002   // RTP port for extension 4444
    };

    // Initialize audio capture
    this.initAudioCapture();

    // Start polling for config changes
    this.startPolling();
  }

  // Initialize audio capture for this station
  initAudioCapture() {
    this.audioCapture = new StationAudioCapture('STATION_3', this.extensionId);
    const rtpPort = this.rtpPorts[this.extensionId];

    if (rtpPort) {
      this.audioCapture.startCapture(rtpPort).catch(err => {
        console.error(`[STATION-3] Failed to start audio capture:`, err.message);
      });
    }
  }

  // Initialize StationAgent when available
  initStationAgent(StationAgent) {
    this.stationAgent = new StationAgent('STATION_3', this.extensionId);

    // Add audio streaming capability to StationAgent
    this.stationAgent.getAudioStream = () => {
      return this.audioCapture ? this.audioCapture.getAudioBuffer() : [];
    };

    console.log(`[STATION-3] StationAgent initialized with audio capture for extension ${this.extensionId}`);
  }

  // Poll config file every 100ms
  startPolling() {
    setInterval(() => {
      try {
        const newKnobs = this.loadKnobs();
        if (JSON.stringify(newKnobs) !== JSON.stringify(this.knobs)) {
          this.knobs = newKnobs;
          console.log(`[STATION-3] Config updated for extension ${this.extensionId}`);
          this.onKnobsChanged?.(this.knobs);
        }
      } catch (e) {
        // Silent fail - config loading is not critical
      }
    }, 100);
  }

  // Load knobs from config file
  loadKnobs() {
    const fs = require('fs');
    try {
      if (fs.existsSync(this.configPath)) {
        return JSON.parse(fs.readFileSync(this.configPath, 'utf8'));
      }
    } catch (e) {}
    return { deepgram: {} };
  }

  // Get Deepgram config from knobs
  getDeepgramConfig() {
    const dg = this.knobs.deepgram || {};
    return {
      model: dg.model || 'nova-3',
      language: dg.language || (this.extensionId === '3333' ? 'en' : 'fr'),
      encoding: 'linear16',
      sample_rate: 16000,
      channels: 1,
      punctuate: dg.punctuate !== false,
      interim_results: dg.interimResults !== false,
      endpointing: dg.endpointing || 300,
      vad_turnoff: dg.vadTurnoff || 500,
      smart_format: dg.smartFormat !== false,
      diarize: dg.diarize || false,
      utterances: true,
      numerals: true
    };
  }

  // Record transcript metrics and capture audio
  onTranscript(data) {
    if (!this.stationAgent) return;

    const confidence = data.channel?.alternatives?.[0]?.confidence || 0;
    const words = data.channel?.alternatives?.[0]?.words || [];
    const isFinal = data.is_final;

    this.stationAgent.recordMetric('stt_confidence', confidence);
    this.stationAgent.recordMetric('stt_latency', Date.now() - this.audioStartTime);
    this.stationAgent.recordMetric('words_recognized', words.length);

    if (isFinal) {
      this.audioStartTime = Date.now();
    }
  }

  // Handle incoming audio data (PCM from Deepgram or other sources)
  onAudioData(pcmBuffer) {
    if (this.audioCapture) {
      this.audioCapture.sendPCMAudio(pcmBuffer);
    }
  }

  // Record error metrics
  onError(error) {
    if (!this.stationAgent) return;
    this.stationAgent.recordMetric('stt_error', 1);
    this.stationAgent.recordMetric('error_type', error.type || 'unknown');
  }

  // Record metadata
  onMetadata(data) {
    if (!this.stationAgent) return;
    if (data.model_info) {
      this.stationAgent.recordMetric('model_name', data.model_info.name);
    }
  }

  // Cleanup on shutdown
  cleanup() {
    if (this.audioCapture) {
      this.audioCapture.stopCapture();
    }
  }
}

module.exports = Station3HandlerWithAudio;