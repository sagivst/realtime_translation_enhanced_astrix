/**
 * Deepgram Speech-to-Text Service
 * Provides streaming STT with speaker context support
 */

const { createClient } = require('@deepgram/sdk');
const EventEmitter = require('events');

class DeepgramSTTService extends EventEmitter {
  constructor(config = {}) {
    super();

    this.config = {
      apiKey: config.apiKey || process.env.DEEPGRAM_API_KEY,
      model: config.model || 'nova-2',
      language: config.language || 'en',
      sampleRate: config.sampleRate || 16000,
      encoding: config.encoding || 'linear16',
      channels: config.channels || 1,
      punctuate: config.punctuate !== false,
      interimResults: config.interimResults !== false,
      endpointing: config.endpointing || 300, // 300ms silence detection
      ...config
    };

    this.client = null;
    this.isReady = false;
    this.activeConnections = new Map();
  }

  /**
   * Initialize Deepgram client
   */
  async initialize() {
    console.log('[Deepgram] Initializing STT service...');

    if (!this.config.apiKey) {
      throw new Error('Deepgram API key not configured');
    }

    try {
      this.client = createClient(this.config.apiKey);
      this.isReady = true;

      console.log('[Deepgram] ✓ STT service ready');
      console.log(`[Deepgram] Model: ${this.config.model}`);
      console.log(`[Deepgram] Language: ${this.config.language}`);

      return true;
    } catch (error) {
      console.error('[Deepgram] Initialization failed:', error);
      throw error;
    }
  }

  /**
   * Transcribe audio buffer (non-streaming)
   * @param {Buffer} audioBuffer - PCM audio data
   * @param {Object} options - Transcription options
   * @returns {Promise<Object>} Transcription result
   */
  async transcribe(audioBuffer, options = {}) {
    if (!this.isReady) {
      throw new Error('Deepgram service not initialized');
    }

    const startTime = Date.now();

    try {
      const language = options.language || this.config.language;
      const channelId = options.channelId || 'default';

      // Prepare request options
      const requestOptions = {
        model: this.config.model,
        language,
        punctuate: this.config.punctuate,
        encoding: this.config.encoding,
        sample_rate: this.config.sampleRate,
        channels: this.config.channels
      };

      // Add speaker context if provided (for voice profile enhancement)
      if (options.speakerContext) {
        // Note: Deepgram doesn't directly support speaker embeddings,
        // but we can use keywords for speaker-specific vocabulary
        requestOptions.keywords = options.speakerContext.keywords || [];
      }

      // Call Deepgram API
      const { result, error } = await this.client.listen.prerecorded.transcribeFile(
        audioBuffer,
        requestOptions
      );

      if (error) {
        throw error;
      }

      // Extract transcript
      const transcript = result.results?.channels?.[0]?.alternatives?.[0];

      if (!transcript || !transcript.transcript) {
        return {
          text: '',
          confidence: 0,
          latency: Date.now() - startTime,
          channelId
        };
      }

      const latency = Date.now() - startTime;

      // Log latency
      console.log(`[Deepgram] Transcribed in ${latency}ms: "${transcript.transcript.substring(0, 50)}..."`);

      if (latency > 200) {
        console.warn(`[Deepgram] ⚠ High latency: ${latency}ms (target: ≤200ms)`);
      }

      return {
        text: transcript.transcript,
        confidence: transcript.confidence,
        words: transcript.words || [],
        latency,
        channelId,
        language
      };

    } catch (error) {
      console.error('[Deepgram] Transcription error:', error);
      throw error;
    }
  }

  /**
   * Create streaming connection for real-time transcription
   * @param {Object} options - Connection options
   * @returns {Object} Stream controller
   */
  createStream(options = {}) {
    if (!this.isReady) {
      throw new Error('Deepgram service not initialized');
    }

    const streamId = `stream_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    const language = options.language || this.config.language;
    const channelId = options.channelId || 'default';

    console.log(`[Deepgram] Creating stream: ${streamId} (${language})`);

    try {
      // Create live transcription connection
      const connection = this.client.listen.live({
        model: this.config.model,
        language,
        punctuate: this.config.punctuate,
        interim_results: this.config.interimResults,
        encoding: this.config.encoding,
        sample_rate: this.config.sampleRate,
        channels: this.config.channels,
        endpointing: this.config.endpointing
      });

      // Store connection
      const streamController = {
        streamId,
        channelId,
        language,
        connection,
        isActive: true,
        startTime: Date.now()
      };

      this.activeConnections.set(streamId, streamController);

      // Handle transcription results
      connection.on('Results', (data) => {
        const transcript = data.channel?.alternatives?.[0];

        if (transcript && transcript.transcript) {
          const result = {
            streamId,
            channelId,
            text: transcript.transcript,
            confidence: transcript.confidence,
            isFinal: data.is_final,
            speechFinal: data.speech_final,
            words: transcript.words || []
          };

          // Emit result
          this.emit('transcription', result);
        }
      });

      // Handle errors
      connection.on('Error', (error) => {
        console.error(`[Deepgram] Stream error (${streamId}):`, error);
        this.emit('error', { streamId, channelId, error });
      });

      // Handle close
      connection.on('Close', () => {
        console.log(`[Deepgram] Stream closed: ${streamId}`);
        this.activeConnections.delete(streamId);
        this.emit('close', { streamId, channelId });
      });

      // Return controller with methods
      return {
        streamId,
        send: (audioChunk) => {
          if (streamController.isActive) {
            connection.send(audioChunk);
          }
        },
        finish: () => {
          if (streamController.isActive) {
            connection.finish();
            streamController.isActive = false;
          }
        },
        close: () => {
          if (streamController.isActive) {
            connection.close();
            streamController.isActive = false;
            this.activeConnections.delete(streamId);
          }
        }
      };

    } catch (error) {
      console.error('[Deepgram] Failed to create stream:', error);
      throw error;
    }
  }

  /**
   * Close all active streams
   */
  closeAllStreams() {
    console.log(`[Deepgram] Closing ${this.activeConnections.size} active streams...`);

    for (const [streamId, controller] of this.activeConnections.entries()) {
      if (controller.isActive && controller.connection) {
        controller.connection.close();
      }
      this.activeConnections.delete(streamId);
    }

    console.log('[Deepgram] ✓ All streams closed');
  }

  /**
   * Get service status
   */
  getStatus() {
    return {
      ready: this.isReady,
      model: this.config.model,
      language: this.config.language,
      activeStreams: this.activeConnections.size
    };
  }

  /**
   * Shutdown service
   */
  async shutdown() {
    console.log('[Deepgram] Shutting down...');

    this.closeAllStreams();
    this.isReady = false;

    console.log('[Deepgram] ✓ Service stopped');
  }
}

module.exports = DeepgramSTTService;
