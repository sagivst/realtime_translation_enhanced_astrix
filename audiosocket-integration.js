// ============================================================================
// AudioSocket TCP Orchestrator Integration
// ============================================================================

const AudioSocketOrchestrator = require('./audiosocket-orchestrator');
const { ASRStreamingWorker } = require('./asr-streaming-worker');

// Initialize AudioSocket orchestrator (listens on port 5050 for Asterisk)
const audioSocketOrchestrator = new AudioSocketOrchestrator(5050);

// Start orchestrator
audioSocketOrchestrator.start();

// ASR worker for transcription
let asrWorker = null;

// Initialize ASR worker when first audio arrives
async function initializeASRWorker() {
    if (asrWorker && asrWorker.connected) {
        return asrWorker;
    }

    if (!deepgramApiKey) {
        console.warn('[AudioSocket] No Deepgram API key, ASR disabled');
        return null;
    }

    try {
        asrWorker = new ASRStreamingWorker(deepgramApiKey, 'en');
        await asrWorker.connect();
        console.log('[AudioSocket] ✓ ASR worker connected');

        // Forward transcripts to Socket.IO clients
        asrWorker.on('partial', (transcript) => {
            console.log('[AudioSocket] Partial:', transcript.text);
            io.emit('transcriptionPartial', {
                text: transcript.text,
                language: transcript.language,
                type: 'partial'
            });
        });

        asrWorker.on('final', (transcript) => {
            console.log('[AudioSocket] Final:', transcript.text);
            io.emit('transcriptionFinal', {
                text: transcript.text,
                language: transcript.language,
                confidence: transcript.confidence,
                type: 'final'
            });
        });

        return asrWorker;
    } catch (err) {
        console.error('[AudioSocket] ASR initialization failed:', err.message);
        return null;
    }
}

// Handle incoming PCM frames from AudioSocket
audioSocketOrchestrator.on('pcm-frame', async (frame) => {
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
audioSocketOrchestrator.on('connection', (info) => {
    console.log('[AudioSocket] ✓ Asterisk connected:', info.connectionId);
});

audioSocketOrchestrator.on('handshake', (info) => {
    console.log('[AudioSocket] ✓ Handshake complete:', info.uuid);
});

audioSocketOrchestrator.on('disconnect', (info) => {
    console.log('[AudioSocket] Asterisk disconnected:', {
        connectionId: info.connectionId,
        uuid: info.uuid,
        duration: `${info.duration.toFixed(1)}s`,
        frames: info.framesReceived
    });
});

// Make orchestrator available globally
global.audioSocketOrchestrator = audioSocketOrchestrator;

// Clean up on shutdown
process.on('SIGTERM', () => {
    if (audioSocketOrchestrator) {
        audioSocketOrchestrator.stop();
    }
    if (asrWorker) {
        asrWorker.disconnect();
    }
});

process.on('SIGINT', () => {
    if (audioSocketOrchestrator) {
        audioSocketOrchestrator.stop();
    }
    if (asrWorker) {
        asrWorker.disconnect();
    }
});

console.log('[AudioSocket] Orchestrator initialized on port 5050');
