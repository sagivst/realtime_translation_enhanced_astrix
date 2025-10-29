/**
 * Asterisk-Based Realtime Translation Server
 * Main entry point integrating all services
 */

const express = require('express');
const http = require('http');
const path = require('path');
const FrameOrchestrator = require('./orchestrator/frame-orchestrator');
const XTTSService = require('./tts-service/xtts-service');
const VoiceProfileManager = require('./voice-profiles/voice-profile-manager');
const DeepgramSTTService = require('./stt-service/deepgram-stt-service');
const DeepLMTService = require('./mt-service/deepl-mt-service');

// Load environment variables
require('dotenv').config();

class AsteriskTranslationServer {
  constructor(config = {}) {
    this.config = {
      port: config.port || process.env.PORT || 3000,
      frameSize: config.frameSize || 20, // 20ms frames
      sampleRate: config.sampleRate || 16000, // 16kHz
      maxLatency: config.maxLatency || 900, // ≤900ms target
      ...config
    };

    // Services
    this.services = {
      xtts: null,
      stt: null,
      mt: null,
      voiceProfiles: null,
      orchestrator: null
    };

    // Express app
    this.app = express();
    this.server = null;

    // State
    this.isReady = false;
    this.startTime = null;
  }

  /**
   * Initialize all services
   */
  async initialize() {
    console.log('='.repeat(60));
    console.log('🚀 Asterisk-Based Realtime Translation Server');
    console.log('='.repeat(60));
    console.log('');

    this.startTime = Date.now();

    try {
      // Step 1: Initialize Voice Profile Manager
      console.log('[1/5] Initializing Voice Profile Manager...');
      this.services.voiceProfiles = new VoiceProfileManager({
        profilesPath: path.join(__dirname, '../data/profiles'),
        embeddingsPath: path.join(__dirname, '../data/voice-embeddings'),
        pythonPath: path.join(__dirname, '../xtts-server/venv-xtts/bin/python')
      });
      await this.services.voiceProfiles.initialize();

      // Step 2: Initialize XTTS Service
      console.log('[2/5] Initializing XTTS v2 Service...');
      this.services.xtts = new XTTSService({
        pythonPath: path.join(__dirname, '../xtts-server/venv-xtts/bin/python'),
        modelPath: path.join(__dirname, '../data/models/xtts-v2'),
        speakerEmbeddingsPath: path.join(__dirname, '../data/voice-embeddings'),
        sampleRate: this.config.sampleRate,
        maxLatency: 300
      });
      await this.services.xtts.initialize();

      // Step 3: Initialize STT Service (Deepgram)
      console.log('[3/5] Initializing STT Service (Deepgram)...');
      this.services.stt = new DeepgramSTTService({
        apiKey: process.env.DEEPGRAM_API_KEY,
        model: 'nova-2',
        sampleRate: this.config.sampleRate
      });
      await this.services.stt.initialize();

      // Step 4: Initialize MT Service (DeepL)
      console.log('[4/5] Initializing MT Service (DeepL)...');
      this.services.mt = new DeepLMTService({
        apiKey: process.env.DEEPL_API_KEY,
        targetLatency: 100
      });
      await this.services.mt.initialize();

      // Step 5: Initialize Frame Orchestrator
      console.log('[5/5] Initializing Frame Orchestrator...');
      this.services.orchestrator = new FrameOrchestrator({
        frameSize: this.config.frameSize,
        sampleRate: this.config.sampleRate,
        maxLatency: this.config.maxLatency
      });
      await this.services.orchestrator.initialize(this.services);

      // Setup Express routes
      this.setupRoutes();

      // Setup event listeners
      this.setupEventListeners();

      const initTime = Date.now() - this.startTime;
      console.log('');
      console.log('='.repeat(60));
      console.log(`✓ All services initialized in ${initTime}ms`);
      console.log('='.repeat(60));
      console.log('');

      this.isReady = true;
      return true;

    } catch (error) {
      console.error('');
      console.error('✗ Initialization failed:', error);
      throw error;
    }
  }

  /**
   * Setup Express routes
   */
  setupRoutes() {
    // Middleware
    this.app.use(express.json());
    this.app.use(express.static(path.join(__dirname, '../public')));

    // Health check
    this.app.get('/health', (req, res) => {
      res.json({
        status: 'healthy',
        uptime: Date.now() - this.startTime,
        services: {
          xtts: this.services.xtts?.getStatus(),
          stt: this.services.stt?.getStatus(),
          mt: this.services.mt?.getStatus(),
          voiceProfiles: this.services.voiceProfiles?.getStats(),
          orchestrator: this.services.orchestrator?.getStatus()
        }
      });
    });

    // Get metrics
    this.app.get('/api/metrics', (req, res) => {
      res.json({
        orchestrator: this.services.orchestrator.getMetrics(),
        xtts: this.services.xtts.getStatus(),
        stt: this.services.stt.getStatus(),
        mt: this.services.mt.getStats()
      });
    });

    // Get voice profiles
    this.app.get('/api/voice-profiles', async (req, res) => {
      try {
        const userId = req.query.userId;
        let profiles;

        if (userId) {
          profiles = await this.services.voiceProfiles.getUserProfiles(userId);
        } else {
          profiles = Array.from(this.services.voiceProfiles.profiles.values());
        }

        res.json({
          success: true,
          profiles
        });
      } catch (error) {
        res.status(500).json({
          success: false,
          error: error.message
        });
      }
    });

    // Create voice profile
    this.app.post('/api/voice-profiles', async (req, res) => {
      try {
        const { userId, username, language, audioSamples } = req.body;

        if (!userId || !username || !language || !audioSamples || audioSamples.length < 3) {
          return res.status(400).json({
            success: false,
            error: 'Missing required fields or insufficient audio samples (min 3)'
          });
        }

        // Convert base64 audio samples to buffers
        const buffers = audioSamples.map(sample => Buffer.from(sample, 'base64'));

        const profile = await this.services.voiceProfiles.createProfile({
          userId,
          username,
          language,
          audioSamples: buffers
        });

        res.json({
          success: true,
          profile
        });
      } catch (error) {
        res.status(500).json({
          success: false,
          error: error.message
        });
      }
    });

    // Get service statistics
    this.app.get('/api/stats', (req, res) => {
      res.json({
        uptime: Date.now() - this.startTime,
        voiceProfiles: this.services.voiceProfiles.getStats(),
        mt: this.services.mt.getStats(),
        orchestrator: this.services.orchestrator.getMetrics()
      });
    });

    // 404 handler
    this.app.use((req, res) => {
      res.status(404).sendFile(path.join(__dirname, '../public/index.html'));
    });
  }

  /**
   * Setup event listeners
   */
  setupEventListeners() {
    // Handle orchestrator events
    this.services.orchestrator.on('audio-output', (data) => {
      // Audio output ready - would be sent to Asterisk channel
      console.log(`[Orchestrator] Audio output for channel ${data.channelId}`);
    });

    // Handle STT transcription events
    this.services.stt.on('transcription', (result) => {
      console.log(`[STT] ${result.channelId}: "${result.text}"`);
    });

    // Handle errors
    this.services.stt.on('error', (error) => {
      console.error('[STT Error]', error);
    });

    // Graceful shutdown
    process.on('SIGTERM', () => this.shutdown());
    process.on('SIGINT', () => this.shutdown());
  }

  /**
   * Start the server
   */
  async start() {
    if (!this.isReady) {
      throw new Error('Server not initialized. Call initialize() first.');
    }

    // Start frame orchestrator
    this.services.orchestrator.start();

    // Start HTTP server
    this.server = http.createServer(this.app);

    return new Promise((resolve) => {
      this.server.listen(this.config.port, () => {
        console.log('');
        console.log('='.repeat(60));
        console.log(`🎧 Server listening on http://localhost:${this.config.port}`);
        console.log('='.repeat(60));
        console.log('');
        console.log('Configuration:');
        console.log(`  Frame size:     ${this.config.frameSize}ms`);
        console.log(`  Sample rate:    ${this.config.sampleRate}Hz`);
        console.log(`  Max latency:    ${this.config.maxLatency}ms`);
        console.log('');
        console.log('Services:');
        console.log(`  ✓ XTTS v2       Ready`);
        console.log(`  ✓ Deepgram STT  Ready`);
        console.log(`  ✓ DeepL MT      Ready`);
        console.log(`  ✓ Voice Profiles Ready (${this.services.voiceProfiles.profiles.size} loaded)`);
        console.log(`  ✓ Orchestrator  Running`);
        console.log('');
        console.log('Press Ctrl+C to stop');
        console.log('='.repeat(60));
        console.log('');

        resolve();
      });
    });
  }

  /**
   * Shutdown server and cleanup
   */
  async shutdown() {
    console.log('');
    console.log('='.repeat(60));
    console.log('🛑 Shutting down server...');
    console.log('='.repeat(60));
    console.log('');

    // Stop orchestrator
    if (this.services.orchestrator) {
      this.services.orchestrator.stop();
    }

    // Shutdown services
    if (this.services.xtts) {
      await this.services.xtts.shutdown();
    }

    if (this.services.stt) {
      await this.services.stt.shutdown();
    }

    if (this.services.mt) {
      await this.services.mt.shutdown();
    }

    // Close HTTP server
    if (this.server) {
      await new Promise((resolve) => {
        this.server.close(resolve);
      });
    }

    console.log('');
    console.log('✓ Server stopped gracefully');
    console.log('');

    process.exit(0);
  }
}

// Main execution
if (require.main === module) {
  const server = new AsteriskTranslationServer();

  server.initialize()
    .then(() => server.start())
    .catch((error) => {
      console.error('');
      console.error('✗ Fatal error:', error);
      console.error('');
      process.exit(1);
    });
}

module.exports = AsteriskTranslationServer;
