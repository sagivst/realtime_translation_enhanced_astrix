/**
 * Station-3 Integration Patch for STTTTSserver.js
 * This patch adds real monitoring and dynamic knob loading to STTTTSserver
 * Using simple polling approach (checks config every 100ms)
 */

// ============================================================================
// STEP 1: ADD THESE LINES AT THE TOP (around line 50, after other requires)
// ============================================================================

const StationAgent = require('./monitoring/StationAgent');
const StationKnobSafeLoader = require('./StationKnobSafeLoader');

// ============================================================================
// STEP 2: ADD THESE VARIABLES (around line 320, after extension setup)
// ============================================================================

// Station-3 monitoring agents for both extensions
const station3_3333 = new StationAgent('STATION_3', '3333');
const station3_4444 = new StationAgent('STATION_3', '4444');

// Current knob values (to detect changes)
let currentKnobs_3333 = {};
let currentKnobs_4444 = {};

// Store active Deepgram connections for reconnection
const deepgramConnections = {
  '3333': null,
  '4444': null
};

// Track audio start times for latency calculation
const audioStartTimes = {
  '3333': Date.now(),
  '4444': Date.now()
};

// ============================================================================
// STEP 3: ADD THIS POLLING FUNCTION (around line 450, before createDeepgramStreamingConnection)
// ============================================================================

/**
 * Poll for knob updates every 100ms and apply changes
 */
function startKnobPolling() {
  setInterval(() => {
    // Check Station-3 configs for both extensions
    ['3333', '4444'].forEach(extensionId => {
      try {
        // Load current knobs from config file
        const knobs = StationKnobSafeLoader.loadConfig('STATION_3', extensionId);

        // Get current knobs for comparison
        const currentKnobs = extensionId === '3333' ? currentKnobs_3333 : currentKnobs_4444;

        // Check if knobs have changed
        if (JSON.stringify(knobs) !== JSON.stringify(currentKnobs)) {
          console.log(`[STATION-3] Knobs changed for extension ${extensionId}, applying...`);

          // Update stored knobs
          if (extensionId === '3333') {
            currentKnobs_3333 = knobs;
          } else {
            currentKnobs_4444 = knobs;
          }

          // If Deepgram connection exists, reconnect with new settings
          if (deepgramConnections[extensionId]) {
            console.log(`[STATION-3] Reconnecting Deepgram for ${extensionId} with new settings`);

            // Close existing connection
            if (deepgramConnections[extensionId].getReadyState() === 1) {
              deepgramConnections[extensionId].finish();
            }

            // Create new connection with updated knobs
            createDeepgramStreamingConnection(extensionId);
          }
        }
      } catch (e) {
        // Silently ignore errors - knob loading is not critical
      }
    });
  }, 100); // Check every 100ms

  console.log('[STATION-3] Started knob polling (100ms interval)');
}

// ============================================================================
// STEP 4: REPLACE createDeepgramStreamingConnection function (line 467)
// ============================================================================

function createDeepgramStreamingConnection(extensionId) {
  try {
    // Load knobs for this extension
    const knobs = StationKnobSafeLoader.loadConfig('STATION_3', extensionId);

    // Store current knobs
    if (extensionId === '3333') {
      currentKnobs_3333 = knobs;
    } else {
      currentKnobs_4444 = knobs;
    }

    // Get Station-3 agent for metrics
    const stationAgent = extensionId === '3333' ? station3_3333 : station3_4444;

    console.log(`[STATION-3] Creating Deepgram connection for ${extensionId} with knobs:`,
      knobs.deepgram ? 'Custom settings' : 'Default settings');

    // Create connection with knob-based settings (instead of hardcoded)
    const connection = deepgram.listen.live({
      model: knobs.deepgram?.model || 'nova-2',
      encoding: 'linear16',
      sample_rate: 16000,
      channels: 1,
      language: knobs.deepgram?.language || 'en-US',
      punctuate: knobs.deepgram?.punctuate !== false,
      interim_results: knobs.deepgram?.interimResults !== false,
      endpointing: knobs.deepgram?.endpointing || 300,
      vad_turnoff: knobs.deepgram?.vadTurnoff || 500,
      smart_format: knobs.deepgram?.smartFormat !== false,
      diarize: knobs.deepgram?.diarize || false,
      utterances: knobs.deepgram?.utterances !== false,
      numerals: knobs.deepgram?.numerals !== false
    });

    // Store connection for later reconnection
    deepgramConnections[extensionId] = connection;

    // Reset audio start time
    audioStartTimes[extensionId] = Date.now();

    // ========================================================================
    // MODIFY EXISTING EVENT HANDLERS TO RECORD REAL METRICS
    // ========================================================================

    // Event: Connection opened
    connection.on(LiveTranscriptionEvents.Open, () => {
      console.log(`[WEBSOCKET] ✓ Connection opened for extension ${extensionId}`);
      streamingStateManager.updateConnection(extensionId, connection, true, true);
      state.lastActivity = Date.now();

      // Record connection metric
      stationAgent.recordMetric('connection_opened', 1);
    });

    // Event: Transcript received (MODIFY EXISTING around line 492)
    connection.on(LiveTranscriptionEvents.Transcript, (data) => {
      const transcript = data.channel?.alternatives?.[0]?.transcript || '';
      const confidence = data.channel?.alternatives?.[0]?.confidence || 0;
      const isFinal = data.is_final || false;
      const words = data.channel?.alternatives?.[0]?.words || [];

      // STATION-3: Record REAL metrics
      stationAgent.recordMetric('stt_confidence', confidence);
      stationAgent.recordMetric('stt_latency', Date.now() - audioStartTimes[extensionId]);
      stationAgent.recordMetric('words_recognized', words.length);
      stationAgent.recordMetric('transcript_length', transcript.length);
      stationAgent.recordMetric('is_final', isFinal ? 1 : 0);

      // Reset audio start time for next segment
      if (isFinal) {
        audioStartTimes[extensionId] = Date.now();
      }

      // Log for debugging
      if (transcript && isFinal) {
        console.log(`[STATION-3] STT metrics for ${extensionId}: confidence=${confidence.toFixed(2)}, words=${words.length}`);
      }

      // ... rest of existing transcript handling code ...
    });

    // Event: Error occurred (MODIFY EXISTING around line 509)
    connection.on(LiveTranscriptionEvents.Error, (error) => {
      console.error(`[ERROR] WebSocket error for ${extensionId}:`, error);

      // STATION-3: Record error metric
      stationAgent.recordMetric('stt_error', 1);
      stationAgent.recordMetric('error_type', error.type || 'unknown');

      streamingStateManager.updateConnection(extensionId, connection, false, false);
      state.lastActivity = Date.now();

      // ... rest of existing error handling code ...
    });

    // Event: Metadata received (MODIFY EXISTING around line 525)
    connection.on(LiveTranscriptionEvents.Metadata, (data) => {
      // STATION-3: Record metadata
      if (data.model_info) {
        stationAgent.recordMetric('model_name', data.model_info.name);
        stationAgent.recordMetric('model_version', data.model_info.version);
      }
      if (data.request_id) {
        stationAgent.recordMetric('request_id', data.request_id);
      }

      console.log(`[METADATA] Received for ${extensionId}:`, data);

      // ... rest of existing metadata handling code ...
    });

    // Event: Connection closed
    connection.on(LiveTranscriptionEvents.Close, () => {
      console.log(`[WEBSOCKET] Connection closed for extension ${extensionId}`);

      // STATION-3: Record disconnection
      stationAgent.recordMetric('connection_closed', 1);

      streamingStateManager.updateConnection(extensionId, null, false, false);
      state.lastActivity = Date.now();

      // ... rest of existing close handling code ...
    });

    return connection;

  } catch (error) {
    console.error(`[ERROR] Failed to create Deepgram connection for ${extensionId}:`, error);

    // Record connection failure
    const stationAgent = extensionId === '3333' ? station3_3333 : station3_4444;
    stationAgent.recordMetric('connection_failed', 1);

    return null;
  }
}

// ============================================================================
// STEP 5: ADD TO AUDIO PROCESSING (around where audio chunks are received)
// ============================================================================

// When audio chunk is received from Gateway (find where audio is processed)
function processAudioChunk(extensionId, audioChunk) {
  // Get Station-3 agent
  const stationAgent = extensionId === '3333' ? station3_3333 : station3_4444;

  // Calculate audio metrics
  const rms = calculateRMS(audioChunk);
  const energy = calculateEnergy(audioChunk);

  // Record audio metrics
  stationAgent.recordMetric('audio_rms', rms);
  stationAgent.recordMetric('audio_energy', energy);
  stationAgent.recordMetric('chunk_size', audioChunk.length);

  // ... rest of existing audio processing ...
}

// Helper functions for audio analysis
function calculateRMS(buffer) {
  let sum = 0;
  for (let i = 0; i < buffer.length; i += 2) {
    const sample = buffer.readInt16LE(i) / 32768.0;
    sum += sample * sample;
  }
  return Math.sqrt(sum / (buffer.length / 2));
}

function calculateEnergy(buffer) {
  let energy = 0;
  for (let i = 0; i < buffer.length; i += 2) {
    const sample = Math.abs(buffer.readInt16LE(i) / 32768.0);
    energy += sample;
  }
  return energy / (buffer.length / 2);
}

// ============================================================================
// STEP 6: START KNOB POLLING ON SERVER START (add to server.listen callback)
// ============================================================================

// Find where the server starts (around line 3000+)
// In the server.listen callback, add:

server.listen(port, () => {
  console.log(`[SERVER] STTTSserver listening on port ${port}`);

  // START STATION-3 KNOB POLLING
  startKnobPolling();

  // Log Station-3 initialization
  console.log('[STATION-3] Monitoring initialized for extensions 3333 and 4444');
  console.log('[STATION-3] Config files:');
  console.log('  - /tmp/station3-3333-config.json');
  console.log('  - /tmp/station3-4444-config.json');
});

// ============================================================================
// SUMMARY OF CHANGES
// ============================================================================

/**
 * 1. Import StationAgent and StationKnobSafeLoader
 * 2. Create station3_3333 and station3_4444 agents
 * 3. Add polling function that checks configs every 100ms
 * 4. Replace hardcoded Deepgram settings with knob-based settings
 * 5. Add real metric recording to all Deepgram events
 * 6. Add audio metrics when processing chunks
 * 7. Start polling when server starts
 *
 * This completes Station-3 integration with:
 * - Real Deepgram metrics (confidence, latency, word count)
 * - Dynamic knob loading (checks every 100ms)
 * - Automatic reconnection when knobs change
 * - Audio quality metrics (RMS, energy)
 */