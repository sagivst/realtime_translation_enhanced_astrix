// Initialize Socket.io
const socket = io();

// Global state
let currentRoom = null;
let currentUsername = null;
let currentLanguage = null;
let mediaRecorder = null;
let audioContext = null;
let analyser = null;
let isRecording = false;
let audioChunks = [];
let recordingInterval = null;
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

    // Update UI with existing participants
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

        // Warn if latency exceeds 2000ms
        if (data.latency > 2000) {
            latencyStat.style.color = '#e74c3c';
        } else {
            latencyStat.style.color = '#2ecc71';
        }

        // Update rolling average
        updateLatencyAverage(data.latency);
    }

    // Queue audio for playback if available
    if (data.audioData) {
        try {
            const audioBlob = base64ToBlob(data.audioData, 'audio/mp3');
            audioQueue.push(audioBlob);
            console.log('Audio added to queue. Queue length:', audioQueue.length);

            // Start playing if not already playing
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

// Audio playback queue system (mobile-compatible)
async function playNextAudio() {
    if (audioQueue.length === 0) {
        isPlayingAudio = false;
        console.log('Audio queue empty');
        return;
    }

    isPlayingAudio = true;
    const audioBlob = audioQueue.shift();

    try {
        // Create a NEW audio element for each playback (better for mobile)
        const audio = new Audio();
        const audioUrl = URL.createObjectURL(audioBlob);

        // Configure for maximum volume and loudspeaker on mobile
        audio.volume = 1.0;
        audio.muted = false;

        // Set audio to use loudspeaker on mobile devices
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

        // Play the audio
        const playPromise = audio.play();
        if (playPromise !== undefined) {
            await playPromise;
            console.log('Audio playing successfully');
        }

        // Wait for audio to finish
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

    // Play next audio in queue
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

    // Generate room ID if not provided
    if (!roomId) {
        roomId = generateRoomId();
    }

    currentUsername = username;
    currentLanguage = language;
    currentRoom = roomId;

    // Join the room
    socket.emit('join-room', {
        roomId,
        username,
        language
    });

    // Update UI
    currentRoomId.textContent = roomId;
    currentLanguageDisplay.textContent = getLanguageName(language);

    // Switch to conference screen
    joinScreen.classList.remove('active');
    conferenceScreen.classList.add('active');

    // Initialize audio
    await initializeAudio();

    // Enable audio playback with user interaction (required by browsers)
    try {
        // Create and play a silent audio to unlock audio playback
        const silentAudio = new Audio('data:audio/mp3;base64,SUQzBAAAAAAAI1RTU0UAAAAPAAADTGF2ZjU4Ljc2LjEwMAAAAAAAAAAAAAAA//tQAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAWGluZwAAAA8AAAACAAADhADAwMDAwMDAwMDAwMDAwMDAwMDAwMDAwMDAwMDAwMDAwMDAwMDAwMDAwMDAwMDAwMDAwMD/////////////////////////////////////////////////////////////////AAAAAExhdmM1OC4xMzQAAAAAAAAAAAAAAAAkAAAAAAAAAAAAA4T/wgAAAAAAAAAAAAAAAAAAAAAAAP/7kGQAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAD/+5BkAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAA//uQZAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAP/7kGQAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAA=');
        silentAudio.play().catch(e => console.log('Silent audio play failed:', e));
        console.log('Audio context unlocked via user interaction');
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

    // Reset state
    currentRoom = null;
    currentUsername = null;
    currentLanguage = null;
    participantsList.innerHTML = '';
    translationFeed.innerHTML = '<p class="placeholder">Translations will appear here...</p>';
    transcriptionDisplay.innerHTML = '<p class="placeholder">Your speech will appear here...</p>';

    // Switch back to join screen
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

// Initialize audio context and media recorder
async function initializeAudio() {
    try {
        // Initialize audio player first
        audioPlayer.volume = 1.0;
        audioPlayer.muted = false;

        // Resume audio context if suspended (important for autoplay policies)
        if (audioContext && audioContext.state === 'suspended') {
            await audioContext.resume();
        }

        const stream = await navigator.mediaDevices.getUserMedia({
            audio: {
                echoCancellation: true,
                noiseSuppression: true,
                autoGainControl: true
            }
        });

        // Set up audio context for visualization
        audioContext = new (window.AudioContext || window.webkitAudioContext)();
        analyser = audioContext.createAnalyser();
        const source = audioContext.createMediaStreamSource(stream);
        source.connect(analyser);
        analyser.fftSize = 256;

        // Resume audio context immediately after creation
        if (audioContext.state === 'suspended') {
            await audioContext.resume();
        }

        // Set up media recorder
        mediaRecorder = new MediaRecorder(stream, {
            mimeType: 'audio/webm',
            audioBitsPerSecond: 128000
        });

        mediaRecorder.ondataavailable = async (event) => {
            if (event.data.size > 0) {
                console.log('Audio data available:', event.data.size, 'bytes');

                // Send audio immediately for lower latency
                const arrayBuffer = await event.data.arrayBuffer();
                socket.emit('audio-stream', {
                    audioBuffer: arrayBuffer,
                    roomId: currentRoom
                });
            }
        };

        mediaRecorder.onstop = async () => {
            // Final cleanup - send any remaining data
            if (audioChunks.length > 0) {
                const audioBlob = new Blob(audioChunks, { type: 'audio/webm' });
                audioChunks = [];

                // Convert to array buffer and send
                const arrayBuffer = await audioBlob.arrayBuffer();
                socket.emit('audio-stream', {
                    audioBuffer: arrayBuffer,
                    roomId: currentRoom
                });
            }
        };

        console.log('Audio initialized');
        updateStatus('Ready to speak', 'idle');

    } catch (error) {
        console.error('Error initializing audio:', error);
        alert('Could not access microphone. Please check permissions.');
    }
}

// Start recording
function startRecording() {
    if (!mediaRecorder) {
        alert('Please wait for audio initialization');
        return;
    }

    isRecording = true;
    audioChunks = [];

    // Start recording with timeslice for continuous chunks
    // This sends data every 1500ms without stopping/starting
    mediaRecorder.start(1500);

    // Backup interval to ensure data is sent
    recordingInterval = setInterval(() => {
        if (mediaRecorder.state === 'recording' && audioChunks.length > 0) {
            // Request data if not automatically sent
            try {
                mediaRecorder.requestData();
            } catch (e) {
                console.log('requestData failed:', e);
            }
        }
    }, 1500);

    // Start visualization
    visualizeAudio();

    // Update UI
    toggleMicBtn.classList.add('recording');
    toggleMicBtn.querySelector('.btn-text').textContent = 'Stop Speaking';
    updateStatus('Speaking...', 'recording');
}

// Stop recording
function stopRecording() {
    if (!mediaRecorder || !isRecording) return;

    isRecording = false;

    // Stop recording
    if (mediaRecorder.state === 'recording') {
        mediaRecorder.stop();
    }

    if (recordingInterval) {
        clearInterval(recordingInterval);
        recordingInterval = null;
    }

    // Update UI
    toggleMicBtn.classList.remove('recording');
    toggleMicBtn.querySelector('.btn-text').textContent = 'Start Speaking';
    updateStatus('Ready to speak', 'idle');

    // Clear visualization
    canvasCtx.clearRect(0, 0, audioVisualizer.width, audioVisualizer.height);
}

// Visualize audio
function visualizeAudio() {
    if (!isRecording || !analyser) return;

    requestAnimationFrame(visualizeAudio);

    const bufferLength = analyser.frequencyBinCount;
    const dataArray = new Uint8Array(bufferLength);
    analyser.getByteFrequencyData(dataArray);

    canvasCtx.fillStyle = '#f8f9fa';
    canvasCtx.fillRect(0, 0, audioVisualizer.width, audioVisualizer.height);

    const barWidth = (audioVisualizer.width / bufferLength) * 2.5;
    let barHeight;
    let x = 0;

    for (let i = 0; i < bufferLength; i++) {
        barHeight = (dataArray[i] / 255) * audioVisualizer.height;

        const gradient = canvasCtx.createLinearGradient(0, 0, 0, audioVisualizer.height);
        gradient.addColorStop(0, '#667eea');
        gradient.addColorStop(1, '#764ba2');

        canvasCtx.fillStyle = gradient;
        canvasCtx.fillRect(x, audioVisualizer.height - barHeight, barWidth, barHeight);

        x += barWidth + 1;
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

    // Keep only last 5 items
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

    // Keep only last 20 items
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
    // Simple notification in translation feed
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

    // Add new latency data point with timestamp
    latencyHistory.push({
        timestamp: now,
        latency: latency
    });

    // Remove data points older than 1 minute
    latencyHistory = latencyHistory.filter(point =>
        now - point.timestamp <= LATENCY_WINDOW_MS
    );

    // Calculate average
    if (latencyHistory.length > 0) {
        const sum = latencyHistory.reduce((acc, point) => acc + point.latency, 0);
        const avg = Math.round(sum / latencyHistory.length);

        avgLatencyStat.textContent = `${avg}ms`;

        // Color code based on average latency
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

    // Keep only last 100 items
    while (pipelineLog.children.length > 100) {
        pipelineLog.removeChild(pipelineLog.firstChild);
    }

    // Auto-scroll to bottom
    pipelineLog.scrollTop = pipelineLog.scrollHeight;
}

// Add audio player event listeners for debugging
audioPlayer.addEventListener('play', () => {
    console.log('Audio player: play event');
});

audioPlayer.addEventListener('playing', () => {
    console.log('Audio player: playing event');
});

audioPlayer.addEventListener('pause', () => {
    console.log('Audio player: pause event');
});

audioPlayer.addEventListener('ended', () => {
    console.log('Audio player: ended event');
});

audioPlayer.addEventListener('error', (e) => {
    console.error('Audio player error:', e);
    console.error('Audio player error details:', audioPlayer.error);
});

audioPlayer.addEventListener('loadeddata', () => {
    console.log('Audio player: data loaded');
});

audioPlayer.addEventListener('canplay', () => {
    console.log('Audio player: can play');
});

// Initialize on page load
document.addEventListener('DOMContentLoaded', () => {
    console.log('Conference app loaded');
    updateConnectionStatus('Connecting...', false);

    // Initialize audio player settings
    audioPlayer.volume = 1.0;
    audioPlayer.muted = false;
    console.log('Audio player initialized: volume =', audioPlayer.volume, ', muted =', audioPlayer.muted);
});
