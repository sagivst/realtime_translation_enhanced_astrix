/**
 * XTTS v2 Local TTS Service
 * Handles text-to-speech synthesis using locally-hosted XTTS v2
 * with custom voice embeddings
 */

const { spawn } = require('child_process');
const path = require('path');
const fs = require('fs').promises;
const EventEmitter = require('events');

class XTTSService extends EventEmitter {
  constructor(config = {}) {
    super();

    this.config = {
      pythonPath: config.pythonPath || path.join(__dirname, '../../xtts-server/venv-xtts/bin/python'),
      modelPath: config.modelPath || path.join(__dirname, '../../data/models/xtts-v2'),
      speakerEmbeddingsPath: config.speakerEmbeddingsPath || path.join(__dirname, '../../data/voice-embeddings'),
      sampleRate: config.sampleRate || 16000, // 16kHz for compatibility
      maxLatency: config.maxLatency || 300, // Target 300ms for TTS
      ...config
    };

    this.pythonProcess = null;
    this.isReady = false;
    this.requestQueue = [];
    this.activeRequests = new Map();
  }

  /**
   * Initialize XTTS service and start Python inference server
   */
  async initialize() {
    console.log('[XTTS] Initializing XTTS v2 service...');

    try {
      // Check if model exists, download if needed
      await this.ensureModel();

      // Start Python inference server
      await this.startInferenceServer();

      this.isReady = true;
      console.log('[XTTS] ✓ XTTS v2 service ready');
      this.emit('ready');

      return true;
    } catch (error) {
      console.error('[XTTS] Failed to initialize:', error);
      throw error;
    }
  }

  /**
   * Ensure XTTS v2 model is downloaded
   */
  async ensureModel() {
    try {
      await fs.access(this.config.modelPath);
      console.log('[XTTS] ✓ Model found at', this.config.modelPath);
    } catch (error) {
      console.log('[XTTS] Model not found, downloading XTTS v2...');
      // Model will be downloaded on first synthesis
      await fs.mkdir(this.config.modelPath, { recursive: true });
    }
  }

  /**
   * Start the Python inference server
   */
  async startInferenceServer() {
    return new Promise((resolve, reject) => {
      const serverScript = path.join(__dirname, 'xtts-inference-server.py');

      this.pythonProcess = spawn(this.config.pythonPath, [
        serverScript,
        '--model-path', this.config.modelPath,
        '--sample-rate', this.config.sampleRate.toString(),
        '--port', '5001'
      ]);

      this.pythonProcess.stdout.on('data', (data) => {
        const output = data.toString();
        console.log('[XTTS Python]', output.trim());

        if (output.includes('Server ready')) {
          resolve();
        }
      });

      this.pythonProcess.stderr.on('data', (data) => {
        console.error('[XTTS Python Error]', data.toString().trim());
      });

      this.pythonProcess.on('error', (error) => {
        console.error('[XTTS] Python process error:', error);
        reject(error);
      });

      this.pythonProcess.on('exit', (code) => {
        console.log('[XTTS] Python process exited with code', code);
        this.isReady = false;
        this.emit('stopped');
      });

      // Timeout after 30 seconds
      setTimeout(() => reject(new Error('XTTS server startup timeout')), 30000);
    });
  }

  /**
   * Synthesize speech from text using voice embedding
   * @param {string} text - Text to synthesize
   * @param {string} voiceEmbeddingId - Voice profile ID
   * @param {string} language - Target language code
   * @returns {Promise<Buffer>} PCM audio buffer (16-bit, 16kHz)
   */
  async synthesize(text, voiceEmbeddingId, language = 'en') {
    if (!this.isReady) {
      throw new Error('XTTS service not ready');
    }

    const startTime = Date.now();
    const requestId = `req_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;

    try {
      // Load voice embedding
      const embedding = await this.loadVoiceEmbedding(voiceEmbeddingId);

      // Call Python inference server via HTTP
      const audioBuffer = await this.callInferenceAPI({
        text,
        embedding,
        language,
        sample_rate: this.config.sampleRate
      });

      const latency = Date.now() - startTime;
      console.log(`[XTTS] Synthesis complete in ${latency}ms (${text.length} chars)`);

      // Monitor latency
      if (latency > this.config.maxLatency) {
        console.warn(`[XTTS] ⚠ High latency: ${latency}ms (target: ${this.config.maxLatency}ms)`);
      }

      return audioBuffer;
    } catch (error) {
      console.error('[XTTS] Synthesis failed:', error);
      throw error;
    }
  }

  /**
   * Load voice embedding from storage
   */
  async loadVoiceEmbedding(voiceEmbeddingId) {
    const embeddingPath = path.join(
      this.config.speakerEmbeddingsPath,
      `${voiceEmbeddingId}.npz`
    );

    try {
      const embeddingData = await fs.readFile(embeddingPath);
      return embeddingData;
    } catch (error) {
      throw new Error(`Voice embedding not found: ${voiceEmbeddingId}`);
    }
  }

  /**
   * Call Python inference API
   */
  async callInferenceAPI(params) {
    const axios = require('axios');

    try {
      const response = await axios.post('http://localhost:5001/synthesize', params, {
        responseType: 'arraybuffer',
        timeout: this.config.maxLatency * 3 // Allow 3x latency for safety
      });

      return Buffer.from(response.data);
    } catch (error) {
      throw new Error(`Inference API call failed: ${error.message}`);
    }
  }

  /**
   * Stream synthesis (for low-latency streaming)
   * Returns audio chunks as they're generated
   */
  async *synthesizeStream(text, voiceEmbeddingId, language = 'en') {
    // TODO: Implement streaming synthesis
    // This will require modifications to the Python inference server
    // to support chunked output
    throw new Error('Streaming synthesis not yet implemented');
  }

  /**
   * Shutdown the XTTS service
   */
  async shutdown() {
    console.log('[XTTS] Shutting down...');

    if (this.pythonProcess) {
      this.pythonProcess.kill('SIGTERM');

      // Wait for graceful shutdown
      await new Promise((resolve) => {
        setTimeout(resolve, 2000);
        if (this.pythonProcess && !this.pythonProcess.killed) {
          this.pythonProcess.kill('SIGKILL');
        }
      });
    }

    this.isReady = false;
    console.log('[XTTS] ✓ Service stopped');
  }

  /**
   * Get service health status
   */
  getStatus() {
    return {
      ready: this.isReady,
      queueSize: this.requestQueue.length,
      activeRequests: this.activeRequests.size,
      modelPath: this.config.modelPath
    };
  }
}

module.exports = XTTSService;
