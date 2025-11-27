// ============================================================================
// ExternalMedia Audio Orchestrator Integration
// ============================================================================

const ExternalMediaOrchestrator = require('./externalmedia-orchestrator');
const { ASRStreamingWorker } = require('./asr-streaming-worker');

// Initialize ExternalMedia orchestrator (listens on port 5050 for Asterisk)
const externalMediaOrchestrator = new ExternalMediaOrchestrator(5050);

// Start orchestrator
externalMediaOrchestrator.start();

// ASR worker for transcription
let asrWorker = null;

// Initialize ASR worker when first audio arrives
async function initializeASRWorker() {
    if (asrWorker && asrWorker.connected) {
        return asrWorker;
    }

    if (!deepgramApiKey) {
        console.warn('[ExternalMedia] No Deepgram API key, ASR disabled');
        return null;
    }

    try {
        asrWorker = new ASRStreamingWorker(deepgramApiKey, 'en');
        await asrWorker.connect();
        console.log('[ExternalMedia] ✓ ASR worker connected');

        // Forward transcripts to Socket.IO clients
        asrWorker.on('partial', (transcript) => {
            console.log('[ExternalMedia] Partial:', transcript.text);
            io.emit('transcriptionPartial', {
                text: transcript.text,
                language: transcript.language,
                type: 'partial'
            });
        });

        asrWorker.on('final', (transcript) => {
            console.log('[ExternalMedia] Final:', transcript.text);
            io.emit('transcriptionFinal', {
                text: transcript.text,
                language: transcript.language,
                confidence: transcript.confidence,
                type: 'final'
            });
        });

        return asrWorker;
    } catch (err) {
        console.error('[ExternalMedia] ASR initialization failed:', err.message);
        return null;
    }
}

// Handle incoming PCM frames from ExternalMedia
externalMediaOrchestrator.on('pcm-frame', async (frame) => {
    // Initialize ASR worker on first frame
    if (!asrWorker) {
        await initializeASRWorker();
    }

    // Send frame to Deepgram
    if (asrWorker && asrWorker.connected) {
        asrWorker.sendAudio(frame.pcm, {
            segmentId: frame.sequenceNumber,
            duration: frame.duration
        });
    }
});

// Log connections
externalMediaOrchestrator.on('connection', (info) => {
    console.log('[ExternalMedia] ✓ Asterisk connected:', info.connectionId);
});

externalMediaOrchestrator.on('disconnect', (info) => {
    console.log('[ExternalMedia] Asterisk disconnected:', {
        connectionId: info.connectionId,
        duration: `${info.duration.toFixed(1)}s`,
        frames: info.framesReceived
    });
});

// Make orchestrator available globally
global.externalMediaOrchestrator = externalMediaOrchestrator;

// Clean up on shutdown
process.on('SIGTERM', () => {
    if (externalMediaOrchestrator) {
        externalMediaOrchestrator.stop();
    }
    if (asrWorker) {
        asrWorker.disconnect();
    }
});

process.on('SIGINT', () => {
    if (externalMediaOrchestrator) {
        externalMediaOrchestrator.stop();
    }
    if (asrWorker) {
        asrWorker.disconnect();
    }
});

console.log('[ExternalMedia] Orchestrator initialized on port 5050');
