/**
 * Latency Collector Integration Example
 *
 * Shows how to integrate LatencyCollector into audiosocket-integration.js
 * WITHOUT modifying the pipeline logic.
 *
 * APPROACH:
 * - Listen to existing events that already fire
 * - Record latency data from event payloads that already exist
 * - Zero pipeline modifications
 * - Safe to add/remove without affecting production
 */

// ADD THIS AT TOP OF audiosocket-integration.js (after other requires)
const LatencyCollector = require('./latency-collector');
const latencyCollector = new LatencyCollector();

// EXAMPLE: Integrate with Socket.IO (in conference-server.js or where io is initialized)
function integrateLatencyCollector(io) {
    // Register Socket.IO handlers for monitoring dashboard
    latencyCollector.registerSocketHandlers(io);

    console.log('[LatencyCollector] ✓ Integrated with Socket.IO');
}

// EXAMPLE: Hook into existing ASR transcript events
function hookASREvents(asrWorker, channelId) {
    // This code ALREADY exists - we just add one line to record latency
    asrWorker.on('transcript', (transcript) => {
        // [EXISTING CODE - DO NOT MODIFY]
        console.log('[Pipeline] Transcript:', transcript.text);
        const io = getIO();
        if (io) {
            io.emit('transcriptionFinal', {
                text: transcript.text,
                language: transcript.language,
                confidence: transcript.confidence
            });
        }

        // [NEW CODE - ONE LINE]
        latencyCollector.recordASRLatency(channelId, transcript);
    });

    asrWorker.on('final', (transcript) => {
        // [EXISTING CODE - DO NOT MODIFY]
        console.log('[Pipeline] Final:', transcript.text);
        // ... existing translation pipeline code ...

        // [NEW CODE - ONE LINE]
        latencyCollector.recordASRLatency(channelId, transcript);
    });
}

// EXAMPLE: Hook into existing pipeline complete event
function hookPipelineEvents(io, channelId) {
    // The pipelineComplete event ALREADY fires with all timing data
    // We just need to record it

    // [EXISTING CODE - DO NOT MODIFY]
    // This is in audiosocket-integration.js around line 390:
    /*
    io.emit('pipelineComplete', {
        original: originalText,
        translation: translationResult.text,
        totalTime,
        translationTime,
        ttsTime,
        convertTime,
        sendTime,
        audioSize: pcm8Buffer.length,
        audioDuration: (pcm8Buffer.length / 2 / 8000).toFixed(2)
    });
    */

    // [NEW CODE - ADD AFTER io.emit('pipelineComplete', ...)]
    // Record all timing data in one go
    const pipelineData = {
        translationTime,
        ttsTime,
        convertTime,
        sendTime
    };

    latencyCollector.recordTranslationLatency(channelId, translationTime);
    latencyCollector.recordTTSLatency(channelId, ttsTime);
    latencyCollector.recordEndToEndLatency(channelId, totalTime, pipelineData);
}

// EXAMPLE: Set channel metadata (language, conference ID)
function setChannelMetadata(channelId, language, conferenceId) {
    latencyCollector.setChannelLanguage(channelId, language);
    latencyCollector.setChannelConference(channelId, conferenceId);
}

// ============================================================================
// COMPLETE INTEGRATION PATCH FOR audiosocket-integration.js
// ============================================================================

/**
 * Minimal changes to audiosocket-integration.js:
 *
 * 1. Add at top (after requires):
 *    const LatencyCollector = require('./latency-collector');
 *    const latencyCollector = new LatencyCollector();
 *
 * 2. In initializeASRWorker() function, AFTER asrWorker.on('final', ...):
 *
 *    asrWorker.on('final', async (transcript) => {
 *        console.log('[Pipeline] Final:', transcript.text);
 *
 *        // [NEW] Record ASR latency
 *        latencyCollector.recordASRLatency(activeConnectionId, transcript);
 *
 *        // ... rest of existing code (translation pipeline) ...
 *    });
 *
 * 3. In the translation pipeline, AFTER io.emit('pipelineComplete', ...):
 *
 *    io.emit('pipelineComplete', {
 *        original: originalText,
 *        translation: translationResult.text,
 *        totalTime,
 *        translationTime,
 *        ttsTime,
 *        convertTime,
 *        sendTime,
 *        audioSize: pcm8Buffer.length,
 *        audioDuration: (pcm8Buffer.length / 2 / 8000).toFixed(2)
 *    });
 *
 *    // [NEW] Record pipeline latencies
 *    latencyCollector.recordTranslationLatency(activeConnectionId, translationTime);
 *    latencyCollector.recordTTSLatency(activeConnectionId, ttsTime);
 *    latencyCollector.recordEndToEndLatency(activeConnectionId, totalTime, {
 *        translationTime,
 *        ttsTime,
 *        convertTime,
 *        sendTime
 *    });
 *
 * 4. In conference-server.js, AFTER io is initialized:
 *
 *    const io = socketIO(server, ...);
 *
 *    // [NEW] Register latency collector
 *    const { getLatencyCollector } = require('./audiosocket-integration');
 *    if (getLatencyCollector) {
 *        getLatencyCollector().registerSocketHandlers(io);
 *    }
 *
 * 5. Export latencyCollector from audiosocket-integration.js:
 *
 *    module.exports = {
 *        getIO,
 *        setIO,
 *        getLatencyCollector: () => latencyCollector  // [NEW]
 *    };
 */

// ============================================================================
// EXACT CODE TO ADD TO audiosocket-integration.js
// ============================================================================

/*
// TOP OF FILE (after existing requires around line 10):
const LatencyCollector = require('./latency-collector');
const latencyCollector = new LatencyCollector();

// INSIDE asrWorker.on('final', ...) handler (around line 154):
asrWorker.on('final', async (transcript) => {
    console.log('[Pipeline] Final:', transcript.text);

    // Record ASR latency (1 line added)
    latencyCollector.recordASRLatency(activeConnectionId, transcript);

    // ... existing code continues ...
});

// INSIDE asrWorker.on('partial', ...) handler (around line 144):
asrWorker.on('partial', (transcript) => {
    console.log('[Pipeline] Partial:', transcript.text);

    // Record ASR latency (1 line added)
    latencyCollector.recordASRLatency(activeConnectionId, transcript);

    // ... existing code continues ...
});

// AFTER io.emit('pipelineComplete', ...) (around line 390):
io.emit('pipelineComplete', {
    original: originalText,
    translation: translationResult.text,
    totalTime,
    translationTime,
    ttsTime,
    convertTime,
    sendTime,
    audioSize: pcm8Buffer.length,
    audioDuration: (pcm8Buffer.length / 2 / 8000).toFixed(2)
});

// Record pipeline latencies (3 lines added)
latencyCollector.recordTranslationLatency(activeConnectionId, translationTime);
latencyCollector.recordTTSLatency(activeConnectionId, ttsTime);
latencyCollector.recordEndToEndLatency(activeConnectionId, totalTime, {
    translationTime,
    ttsTime,
    convertTime,
    sendTime
});

// BOTTOM OF FILE (modify exports around line 550):
module.exports = {
    getIO,
    setIO,
    getLatencyCollector: () => latencyCollector  // Added this line
};
*/

// ============================================================================
// VERIFICATION: Check if integration is working
// ============================================================================

function verifyIntegration() {
    console.log('=== Latency Collector Integration Verification ===');
    console.log('');
    console.log('1. Check global stats:');
    console.log('   latencyCollector.getGlobalStats()');
    console.log('');
    console.log('2. Check all channels:');
    console.log('   latencyCollector.getAllChannelStats()');
    console.log('');
    console.log('3. Check hierarchical view:');
    console.log('   latencyCollector.getHierarchicalView()');
    console.log('');
    console.log('4. Listen for updates:');
    console.log('   latencyCollector.on("latency-update", (data) => console.log(data))');
    console.log('');
    console.log('5. Test with Socket.IO client:');
    console.log('   socket.emit("get-latency-stats", { type: "hierarchical" })');
    console.log('   socket.on("latency-hierarchical-view", (data) => console.log(data))');
    console.log('');
}

module.exports = {
    integrateLatencyCollector,
    hookASREvents,
    hookPipelineEvents,
    setChannelMetadata,
    verifyIntegration
};
