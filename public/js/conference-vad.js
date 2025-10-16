// Conference app with VAD (Voice Activity Detection)
// Import Socket.IO from global scope (loaded via script tag)
const socket = io();

// Global state
let currentRoom = null;
let currentUsername = null;
let currentLanguage = null;
let vad = null;
let audioContext = null;
let analyser = null;
let isRecording = false;
let audioQueue = [];
let isPlayingAudio = false;

// Latency tracking for rolling average
let latencyHistory = [];
const LATENCY_WINDOW_MS = 60000; // 1 minute window

// DOM Elements
const joinScreen = document.getElementById('joinScreen');
const conferenceScreen = document.getElementById('conferenceScreen');
const usernameInput = document.getElementById('username');
const languageSelect = document.getElementById('language');
const roomIdInput = document.getElementById('roomId');
const joinBtn = document.getElementById('joinBtn');
const leaveBtn = document.getElementById('leaveBtn');
const toggleMicBtn = document.getElementById('toggleMicBtn');
const statusIndicator = document.getElementById('statusIndicator');
const statusText = document.getElementById('statusText');
const participantsList = document.getElementById('participantsList');
const participantCount = document.getElementById('participantCount');
const transcriptionDisplay = document.getElementById('transcriptionDisplay');
const translationFeed = document.getElementById('translationFeed');
const currentRoomId = document.getElementById('currentRoomId');
const currentLanguageDisplay = document.getElementById('currentLanguage');
const latencyStat = document.getElementById('latencyStat');
const avgLatencyStat = document.getElementById('avgLatencyStat');
const connectionStatus = document.getElementById('connectionStatus');
const audioPlayer = document.getElementById('audioPlayer');
const audioVisualizer = document.getElementById('audioVisualizer');
const pipelineLog = document.getElementById('pipelineLog');
const clearLogBtn = document.getElementById('clearLogBtn');

// Audio visualization
const canvasCtx = audioVisualizer.getContext('2d');

// Socket event listeners
socket.on('connect', () => {
    console.log('Connected to server');
    updateConnectionStatus('Connected', true);
});

socket.on('disconnect', () => {
    console.log('Disconnected from server');
    updateConnectionStatus('Disconnected', false);
});

socket.on('room-joined', (data) => {
    console.log('Joined room:', data);
    data.participants.forEach(participant => {
        addParticipant(participant);
    });
    updateStatus('Connected to room', 'success');
});

socket.on('participant-joined', (data) => {
    console.log('Participant joined:', data);
    addParticipant(data);
    showNotification(`${data.username} joined (${data.language.toUpperCase()})`);
});

socket.on('participant-left', (data) => {
    console.log('Participant left:', data);
    removeParticipant(data.participantId);
    showNotification(`${data.username} left`);
});

socket.on('transcription-result', (data) => {
    console.log('Transcription:', data);
    displayTranscription(data.text);
});

socket.on('translated-audio', async (data) => {
    console.log('Received translation:', data);

    // Display translation text
    addTranslationToFeed(data);

    // Update latency stat
    if (data.latency) {
        latencyStat.textContent = `${data.latency}ms`;
        if (data.latency > 2000) {
            latencyStat.style.color = '#e74c3c';
        } else {
            latencyStat.style.color = '#2ecc71';
        }
        updateLatencyAverage(data.latency);
    }

    // Queue audio for playback
    if (data.audioData) {
        try {
            const audioBlob = base64ToBlob(data.audioData, 'audio/mp3');
            audioQueue.push(audioBlob);
            console.log('Audio added to queue. Queue length:', audioQueue.length);

            if (!isPlayingAudio) {
                playNextAudio();
            }
        } catch (error) {
            console.error('Error setting up audio:', error);
        }
    }
});

socket.on('error', (error) => {
    console.error('Server error:', error);
    updateStatus('Error: ' + error.message, 'error');
});

socket.on('pipeline-log', (data) => {
    console.log('Pipeline log:', data);
    addPipelineLog(data);
});

// Audio playback queue system
async function playNextAudio() {
    if (audioQueue.length === 0) {
        isPlayingAudio = false;
        console.log('Audio queue empty');
        return;
    }

    isPlayingAudio = true;
    const audioBlob = audioQueue.shift();

    try {
        const audio = new Audio();
        const audioUrl = URL.createObjectURL(audioBlob);

        audio.volume = 1.0;
        audio.muted = false;

        if (audio.setSinkId) {
            try {
                await audio.setSinkId('default');
            } catch (e) {
                console.log('setSinkId not supported:', e);
            }
        }

        audio.src = audioUrl;
        audio.preload = 'auto';

        console.log('Starting audio playback...');
        const playPromise = audio.play();
        if (playPromise !== undefined) {
            await playPromise;
            console.log('Audio playing successfully');
        }

        await new Promise((resolve, reject) => {
            audio.onended = () => {
                console.log('Audio playback ended');
                URL.revokeObjectURL(audioUrl);
                resolve();
            };

            audio.onerror = (e) => {
                console.error('Audio playback error:', e, audio.error);
                URL.revokeObjectURL(audioUrl);
                reject(e);
            };
        });

    } catch (error) {
        console.error('Error playing audio:', error);
        if (error.name === 'NotAllowedError') {
            showNotification('Tap screen to enable audio playback');
        }
    }

    if (audioQueue.length > 0) {
        playNextAudio();
    } else {
        isPlayingAudio = false;
    }
}

// Join room functionality
joinBtn.addEventListener('click', async () => {
    const username = usernameInput.value.trim();
    const language = languageSelect.value;
    let roomId = roomIdInput.value.trim();

    if (!username) {
        alert('Please enter your name');
        return;
    }

    if (!roomId) {
        roomId = generateRoomId();
    }

    currentUsername = username;
    currentLanguage = language;
    currentRoom = roomId;

    socket.emit('join-room', {
        roomId,
        username,
        language
    });

    currentRoomId.textContent = roomId;
    currentLanguageDisplay.textContent = getLanguageName(language);

    joinScreen.classList.remove('active');
    conferenceScreen.classList.add('active');

    // Initialize VAD
    await initializeVAD();

    // Enable audio playback
    try {
        const silentAudio = new Audio('data:audio/mp3;base64,SUQzBAAAAAAAI1RTU0UAAAAPAAADTGF2ZjU4Ljc2LjEwMAAAAAAAAAAAAAAA//tQAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAWGluZwAAAA8AAAACAAADhADAwMDAwMDAwMDAwMDAwMDAwMDAwMDAwMDAwMDAwMDAwMDAwMDAwMDAwMDAwMDAwMDAwMD/////////////////////////////////////////////////////////////////AAAAAExhdmM1OC4xMzQAAAAAAAAAAAAAAAAkAAAAAAAAAAAAA4T/wgAAAAAAAAAAAAAAAAAAAAAAAP/7kGQAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAD/+5BkAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAA//uQZAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAP/7kGQAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAA=');
        silentAudio.play().catch(e => console.log('Silent audio play failed:', e));
        console.log('Audio context unlocked');
    } catch (e) {
        console.log('Could not unlock audio:', e);
    }
});

// Leave room functionality
leaveBtn.addEventListener('click', () => {
    if (isRecording) {
        stopRecording();
    }

    socket.disconnect();
    socket.connect();

    currentRoom = null;
    currentUsername = null;
    currentLanguage = null;
    participantsList.innerHTML = '';
    translationFeed.innerHTML = '<p class="placeholder">Translations will appear here...</p>';
    transcriptionDisplay.innerHTML = '<p class="placeholder">Your speech will appear here...</p>';

    conferenceScreen.classList.remove('active');
    joinScreen.classList.add('active');
});

// Toggle microphone
toggleMicBtn.addEventListener('click', () => {
    if (isRecording) {
        stopRecording();
    } else {
        startRecording();
    }
});

// Clear log button
clearLogBtn.addEventListener('click', () => {
    pipelineLog.innerHTML = '<p class="placeholder">Pipeline events will appear here...</p>';
});

// Initialize VAD (Voice Activity Detection)
async function initializeVAD() {
    try {
        console.log('[VAD] Initializing Voice Activity Detection...');
        updateStatus('Initializing voice detection...', 'idle');

        // Wait for MicVAD to be available (with timeout)
        let waitCount = 0;
        const maxWait = 300; // 30 seconds (300 * 100ms)
        while (typeof window.MicVAD === 'undefined') {
            console.log('[VAD] Waiting for MicVAD library...', waitCount);
            await new Promise(resolve => setTimeout(resolve, 100));
            waitCount++;

            if (waitCount >= maxWait) {
                throw new Error('VAD library failed to load after 30 seconds. Check internet connection or browser console for errors.');
            }
        }

        // Create VAD instance with optimized settings
        vad = await window.MicVAD.new({
            // Called when speech starts
            onSpeechStart: () => {
                console.log('[VAD] Speech started - begin recording');
                updateStatus('Listening...', 'recording');

                // Start visualization
                if (!isRecording) {
                    visualizeAudio();
                }
            },

            // Called when speech ends - send complete utterance
            onSpeechEnd: async (audioData) => {
                console.log('[VAD] Speech ended - processing utterance');
                console.log('[VAD] Audio data length:', audioData.length, 'samples');

                // Convert Float32Array to WebM blob
                try {
                    // Create audio buffer from Float32Array
                    const sampleRate = 16000; // VAD uses 16kHz
                    const audioBuffer = audioContext.createBuffer(1, audioData.length, sampleRate);
                    audioBuffer.getChannelData(0).set(audioData);

                    // Convert to WAV format for Deepgram
                    const wavBlob = audioBufferToWav(audioBuffer);
                    const arrayBuffer = await wavBlob.arrayBuffer();

                    console.log('[VAD] Sending', Math.round(wavBlob.size / 1024), 'KB to server');

                    // Send to server for transcription
                    socket.emit('audio-stream', {
                        audioBuffer: arrayBuffer,
                        roomId: currentRoom
                    });

                    updateStatus('Processing...', 'processing');
                } catch (error) {
                    console.error('[VAD] Error processing audio:', error);
                    updateStatus('Error processing audio', 'error');
                }
            },

            // VAD sensitivity settings
            positiveSpeechThreshold: 0.8,    // Higher = less sensitive to start
            negativeSpeechThreshold: 0.3,    // Lower = more sensitive to stop
            minSpeechFrames: 3,               // Minimum frames to consider speech
            preSpeechPadFrames: 5,           // Include 5 frames before speech starts
            redemptionFrames: 8,              // Allow 8 frames of silence before ending

            // Model settings
            model: 'v5',                      // Use latest VAD model
            workletURL: 'https://cdn.jsdelivr.net/npm/@ricky0123/vad-web@0.0.19/dist/vad.worklet.bundle.min.js',
            modelURL: 'https://cdn.jsdelivr.net/npm/@ricky0123/vad-web@0.0.19/dist/silero_vad.onnx',
        });

        // Initialize audio context for visualization
        audioContext = new (window.AudioContext || window.webkitAudioContext)();
        analyser = audioContext.createAnalyser();
        analyser.fftSize = 256;

        console.log('[VAD] Initialization complete');
        updateStatus('Ready to speak (VAD enabled)', 'success');

    } catch (error) {
        console.error('[VAD] Error initializing:', error);
        alert('Could not initialize voice detection. Please check microphone permissions.');
        updateStatus('VAD initialization failed', 'error');
    }
}

// Convert AudioBuffer to WAV format
function audioBufferToWav(audioBuffer) {
    const numberOfChannels = audioBuffer.numberOfChannels;
    const sampleRate = audioBuffer.sampleRate;
    const format = 1; // PCM
    const bitDepth = 16;

    const bytesPerSample = bitDepth / 8;
    const blockAlign = numberOfChannels * bytesPerSample;

    const data = audioBuffer.getChannelData(0);
    const dataLength = data.length * bytesPerSample;
    const buffer = new ArrayBuffer(44 + dataLength);
    const view = new DataView(buffer);

    // WAV header
    writeString(view, 0, 'RIFF');
    view.setUint32(4, 36 + dataLength, true);
    writeString(view, 8, 'WAVE');
    writeString(view, 12, 'fmt ');
    view.setUint32(16, 16, true); // fmt chunk size
    view.setUint16(20, format, true);
    view.setUint16(22, numberOfChannels, true);
    view.setUint32(24, sampleRate, true);
    view.setUint32(28, sampleRate * blockAlign, true);
    view.setUint16(32, blockAlign, true);
    view.setUint16(34, bitDepth, true);
    writeString(view, 36, 'data');
    view.setUint32(40, dataLength, true);

    // Write PCM data
    let offset = 44;
    for (let i = 0; i < data.length; i++) {
        const sample = Math.max(-1, Math.min(1, data[i]));
        view.setInt16(offset, sample < 0 ? sample * 0x8000 : sample * 0x7FFF, true);
        offset += 2;
    }

    return new Blob([buffer], { type: 'audio/wav' });
}

function writeString(view, offset, string) {
    for (let i = 0; i < string.length; i++) {
        view.setUint8(offset + i, string.charCodeAt(i));
    }
}

// Start recording
async function startRecording() {
    if (!vad) {
        alert('Please wait for voice detection initialization');
        return;
    }

    try {
        isRecording = true;
        console.log('[VAD] Starting VAD');

        await vad.start();

        // Start visualization
        visualizeAudio();

        // Update UI
        toggleMicBtn.classList.add('recording');
        toggleMicBtn.querySelector('.btn-text').textContent = 'Stop Speaking';
        updateStatus('Ready to speak', 'idle');

        console.log('[VAD] VAD started successfully');
    } catch (error) {
        console.error('[VAD] Error starting:', error);
        alert('Could not start voice detection. Please try again.');
        isRecording = false;
    }
}

// Stop recording
function stopRecording() {
    if (!vad || !isRecording) return;

    isRecording = false;
    console.log('[VAD] Stopping VAD');

    try {
        vad.pause();
    } catch (error) {
        console.error('[VAD] Error stopping:', error);
    }

    // Update UI
    toggleMicBtn.classList.remove('recording');
    toggleMicBtn.querySelector('.btn-text').textContent = 'Start Speaking';
    updateStatus('Ready to speak', 'idle');

    // Clear visualization
    canvasCtx.clearRect(0, 0, audioVisualizer.width, audioVisualizer.height);
}

// Visualize audio (simplified version for VAD mode)
function visualizeAudio() {
    if (!isRecording) return;

    requestAnimationFrame(visualizeAudio);

    // Simple pulsing visualization since we don't have direct analyser access
    const time = Date.now() * 0.003;
    const barCount = 32;
    const barWidth = audioVisualizer.width / barCount;

    canvasCtx.fillStyle = '#f8f9fa';
    canvasCtx.fillRect(0, 0, audioVisualizer.width, audioVisualizer.height);

    for (let i = 0; i < barCount; i++) {
        const barHeight = (Math.sin(time + i * 0.5) * 0.5 + 0.5) * audioVisualizer.height * 0.7;
        const x = i * barWidth;

        const gradient = canvasCtx.createLinearGradient(0, 0, 0, audioVisualizer.height);
        gradient.addColorStop(0, '#667eea');
        gradient.addColorStop(1, '#764ba2');

        canvasCtx.fillStyle = gradient;
        canvasCtx.fillRect(x, audioVisualizer.height - barHeight, barWidth - 1, barHeight);
    }
}

// UI Helper functions
function addParticipant(participant) {
    const existing = document.getElementById(`participant-${participant.id}`);
    if (existing) return;

    const div = document.createElement('div');
    div.id = `participant-${participant.id}`;
    div.className = 'participant-item';
    div.innerHTML = `
        <div class="participant-info">
            <span class="participant-name">${participant.username}</span>
            <span class="participant-lang">${getLanguageName(participant.language)}</span>
        </div>
        <span class="participant-status">🟢</span>
    `;

    participantsList.appendChild(div);
    updateParticipantCount();
}

function removeParticipant(participantId) {
    const element = document.getElementById(`participant-${participantId}`);
    if (element) {
        element.remove();
        updateParticipantCount();
    }
}

function updateParticipantCount() {
    const count = participantsList.children.length;
    participantCount.textContent = count;
}

function displayTranscription(text) {
    const placeholder = transcriptionDisplay.querySelector('.placeholder');
    if (placeholder) {
        transcriptionDisplay.innerHTML = '';
    }

    const p = document.createElement('p');
    p.textContent = text;
    p.className = 'transcription-item';
    transcriptionDisplay.appendChild(p);

    while (transcriptionDisplay.children.length > 5) {
        transcriptionDisplay.removeChild(transcriptionDisplay.firstChild);
    }

    transcriptionDisplay.scrollTop = transcriptionDisplay.scrollHeight;
}

function addTranslationToFeed(data) {
    const placeholder = translationFeed.querySelector('.placeholder');
    if (placeholder) {
        translationFeed.innerHTML = '';
    }

    const div = document.createElement('div');
    div.className = 'translation-item';
    div.innerHTML = `
        <div class="translation-header">
            <strong>${data.speakerUsername}</strong> (${data.speakerLanguage.toUpperCase()})
            <span class="translation-time">${new Date().toLocaleTimeString()}</span>
        </div>
        <div class="translation-original">Original: ${data.originalText}</div>
        <div class="translation-text">Translation: ${data.translatedText}</div>
    `;

    translationFeed.appendChild(div);

    while (translationFeed.children.length > 20) {
        translationFeed.removeChild(translationFeed.firstChild);
    }

    translationFeed.scrollTop = translationFeed.scrollHeight;
}

function updateStatus(text, type) {
    statusText.textContent = text;
    statusIndicator.className = 'status-indicator ' + type;
}

function updateConnectionStatus(text, connected) {
    connectionStatus.textContent = text;
    connectionStatus.style.color = connected ? '#2ecc71' : '#e74c3c';
}

function showNotification(message) {
    const div = document.createElement('div');
    div.className = 'notification-item';
    div.textContent = message;
    translationFeed.appendChild(div);

    setTimeout(() => div.remove(), 5000);
}

// Utility functions
function generateRoomId() {
    return 'room-' + Math.random().toString(36).substr(2, 9);
}

function updateLatencyAverage(latency) {
    const now = Date.now();

    latencyHistory.push({
        timestamp: now,
        latency: latency
    });

    latencyHistory = latencyHistory.filter(point =>
        now - point.timestamp <= LATENCY_WINDOW_MS
    );

    if (latencyHistory.length > 0) {
        const sum = latencyHistory.reduce((acc, point) => acc + point.latency, 0);
        const avg = Math.round(sum / latencyHistory.length);

        avgLatencyStat.textContent = `${avg}ms`;

        if (avg > 2000) {
            avgLatencyStat.style.color = '#e74c3c';
        } else if (avg > 1500) {
            avgLatencyStat.style.color = '#f39c12';
        } else {
            avgLatencyStat.style.color = '#2ecc71';
        }
    } else {
        avgLatencyStat.textContent = '-';
    }
}

function getLanguageName(code) {
    const names = {
        'en': 'English',
        'es': 'Spanish',
        'fr': 'French',
        'de': 'German',
        'it': 'Italian',
        'pt': 'Portuguese',
        'ja': 'Japanese',
        'ko': 'Korean',
        'zh': 'Chinese',
        'ru': 'Russian'
    };
    return names[code] || code;
}

function base64ToBlob(base64, contentType) {
    const byteCharacters = atob(base64);
    const byteArrays = [];

    for (let offset = 0; offset < byteCharacters.length; offset += 512) {
        const slice = byteCharacters.slice(offset, offset + 512);
        const byteNumbers = new Array(slice.length);

        for (let i = 0; i < slice.length; i++) {
            byteNumbers[i] = slice.charCodeAt(i);
        }

        const byteArray = new Uint8Array(byteNumbers);
        byteArrays.push(byteArray);
    }

    return new Blob(byteArrays, { type: contentType });
}

function addPipelineLog(data) {
    const placeholder = pipelineLog.querySelector('.placeholder');
    if (placeholder) {
        pipelineLog.innerHTML = '';
    }

    const div = document.createElement('div');
    div.className = `log-entry ${data.type}`;

    const time = new Date(data.timestamp).toLocaleTimeString('en-US', {
        hour12: false,
        hour: '2-digit',
        minute: '2-digit',
        second: '2-digit',
        fractionalSecondDigits: 3
    });

    const durationText = data.duration ? `${data.duration}ms` : '';

    div.innerHTML = `
        <span class="log-timestamp">${time}</span>
        <span class="log-type ${data.type}">${data.type}</span>
        <span class="log-message">${data.message}</span>
        ${durationText ? `<span class="log-duration">${durationText}</span>` : ''}
    `;

    pipelineLog.appendChild(div);

    while (pipelineLog.children.length > 100) {
        pipelineLog.removeChild(pipelineLog.firstChild);
    }

    pipelineLog.scrollTop = pipelineLog.scrollHeight;
}

// Initialize on page load
document.addEventListener('DOMContentLoaded', () => {
    console.log('Conference app with VAD loaded');
    updateConnectionStatus('Connecting...', false);

    audioPlayer.volume = 1.0;
    audioPlayer.muted = false;
    console.log('Audio player initialized: volume =', audioPlayer.volume, ', muted =', audioPlayer.muted);
});

// Export logs to CSV function (called from HTML onclick)
window.exportLogsToCSV = function() {
    const logs = Array.from(pipelineLog.querySelectorAll('.log-entry'));

    if (logs.length === 0) {
        alert('No logs to export');
        return;
    }

    const csvContent = [
        ['Timestamp', 'Type', 'Message', 'Duration'].join(','),
        ...logs.map(log => {
            const timestamp = log.querySelector('.log-timestamp').textContent;
            const type = log.querySelector('.log-type').textContent;
            const message = log.querySelector('.log-message').textContent;
            const duration = log.querySelector('.log-duration')?.textContent || '';
            return [timestamp, type, `"${message}"`, duration].join(',');
        })
    ].join('\n');

    const blob = new Blob([csvContent], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `pipeline-logs-${Date.now()}.csv`;
    a.click();
    URL.revokeObjectURL(url);
};
