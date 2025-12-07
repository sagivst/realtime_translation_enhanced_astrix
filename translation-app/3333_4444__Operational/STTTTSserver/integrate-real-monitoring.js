/**
 * Integration helper for Real-Time Monitoring
 * Patches STTTTSserver to capture actual metrics during calls
 */

const { Station3Monitor, Station9Monitor } = require('./real-time-monitor');

// Track active calls
const activeCalls = new Map();

/**
 * Initialize monitoring for a new call
 */
function initializeCallMonitoring(extension, uniqueId) {
    const callKey = `${extension}_${uniqueId}`;

    if (!activeCalls.has(callKey)) {
        const channel = extension === '3333' ? 'caller' : 'callee';

        // Start monitoring for both stations
        Station3Monitor.startCall(uniqueId, channel);
        Station9Monitor.startCall(uniqueId, channel);

        activeCalls.set(callKey, {
            startTime: Date.now(),
            extension: extension,
            uniqueId: uniqueId
        });

        console.log(`🎯 Monitoring initialized for ${callKey}`);
    }
}

/**
 * Process audio going TO Deepgram (Station 3)
 */
function monitorBeforeDeepgram(audioBuffer, extension, uniqueId) {
    try {
        // Process the actual audio buffer to extract real metrics
        Station3Monitor.processAudioChunk(audioBuffer);
    } catch (error) {
        console.error('Error monitoring before Deepgram:', error);
    }
}

/**
 * Process audio FROM TTS (Station 9)
 */
function monitorAfterTTS(audioBuffer, extension, uniqueId) {
    try {
        // Process the actual audio buffer to extract real metrics
        Station9Monitor.processAudioChunk(audioBuffer);
    } catch (error) {
        console.error('Error monitoring after TTS:', error);
    }
}

/**
 * End monitoring for a call
 */
async function endCallMonitoring(extension, uniqueId) {
    const callKey = `${extension}_${uniqueId}`;

    if (activeCalls.has(callKey)) {
        await Station3Monitor.endCall();
        await Station9Monitor.endCall();

        activeCalls.delete(callKey);
        console.log(`🎯 Monitoring ended for ${callKey}`);
    }
}

// Export integration functions
module.exports = {
    initializeCallMonitoring,
    monitorBeforeDeepgram,
    monitorAfterTTS,
    endCallMonitoring,
    activeCalls
};

console.log('✅ Real-time monitoring integration loaded');