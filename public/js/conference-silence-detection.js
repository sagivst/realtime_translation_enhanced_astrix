/**
 * Conference App with Silence Detection (No External Dependencies)
 *
 * This version uses Web Audio API to detect silence and natural speech boundaries.
 * NO MORE ARBITRARY 1.45s CHUNKING!
 *
 * How it works:
 * 1. Continuously monitors audio volume using Web Audio API analyser
 * 2. Detects when user starts speaking (volume above threshold)
 * 3. Buffers audio while speaking
 * 4. Detects when user stops (600ms of silence)
 * 5. Sends complete utterance to server
 *
 * Benefits:
 * - Natural speech boundaries (no mid-word cuts)
 * - Better STT accuracy
 * - Better translations
 * - HMLCP receives complete sentences
 * - No external CDN dependencies
 *
 * Tunable parameters (lines 49-51):
 * - SILENCE_THRESHOLD: 0.03 (RMS volume threshold)
 * - SILENCE_DURATION_MS: 600 (ms of silence to wait)
 * - MIN_SPEECH_DURATION_MS: 300 (minimum speech length)
 */

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
let playbackGain = null; // Audio ducking gain node
let isUserSpeaking = false; // Track if local user is speaking (for auto-mute)

// Audio transport abstraction (WebRTC or SIP)
let audioTransport = null;
let selectedTransportType = 'webrtc'; // Default to WebRTC

// Streaming chunking state
let currentUtteranceId = null; // Track current utterance for grouping chunks
let utteranceChunkCount = 0; // Track how many chunks sent for current utterance

// Silence detection state
let silenceDetectionInterval = null;
let silenceDuration = 0;
let isSpeaking = false;
let speechStartTime = 0;  // Track when speech started
let chunkStartTime = 0;  // Track when current chunk started recording
const SILENCE_THRESHOLD = 0.03;  // RMS threshold for silence (increased from 0.01 to reduce false positives)
const SILENCE_DURATION_MS = 1500;  // ms of silence before sending (handles natural mid-sentence pauses)
const MIN_SPEECH_DURATION_MS = 800; // Minimum speech duration to send (prevents very short fragments)
const MAX_BUFFER_TIME_MS = 1800;  // Maximum time to buffer before forcing send (1800ms for better transcription quality with good real-time feedback)

// Smart Queue constants for latency optimization
const MAX_AUDIO_AGE_MS = 3000;  // Drop audio older than 3 seconds (stale)
const STALE_CHECK_INTERVAL_MS = 1000; // Check for stale audio every second

// Latency tracking for rolling average
let latencyHistory = [];
let lastLatencyUpdate = 0;  // Track when we last received latency data
const LATENCY_WINDOW_MS = 60000; // 1 minute window
const LATENCY_STALE_THRESHOLD_MS = 10000; // Warn if no latency data for 10 seconds

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

// Audio transport DOM elements
const audioTransportSelect = document.getElementById('audioTransport');
const sipConfigSection = document.getElementById('sipConfigSection');
const sipServerInput = document.getElementById('sipServer');
const sipUsernameInput = document.getElementById('sipUsername');
const sipPasswordInput = document.getElementById('sipPassword');

// Audio visualization (defensive check in case element doesn't exist)
const canvasCtx = audioVisualizer ? audioVisualizer.getContext('2d') : null;

// Socket event listeners
socket.on('connect', () => {
    console.log('Connected to server');
    updateConnectionStatus('Connected', true);
});

socket.on('disconnect', () => {
    console.log('Disconnected from server');
    updateConnectionStatus('Disconnected', false);
    resetLatencyTracking();  // Clear latency data on disconnect
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

// NEW: Listen for interim transcriptions (real-time streaming feedback)
socket.on('interim-transcription', (data) => {
    console.log(`[Streaming] Interim text (${data.chunkCount} chunks):`, data.text);
    // Display interim text in UI (could add a different style for "interim")
    displayInterimTranscription(data.text, data.chunkCount);
});

socket.on('translated-audio', async (data) => {
    console.log('Received translation:', data);

    // Display translation text
    addTranslationToFeed(data);

    // Update latency stat
    if (data.latency) {
        console.log('[Latency] Updating latency stats:', data.latency, 'ms');

        // Log timing breakdown if available
        if (data.timingBreakdown) {
            console.log('[Latency] Timing breakdown:', data.timingBreakdown);
        }

        // Check if elements exist (defensive programming for mobile)
        if (latencyStat) {
            latencyStat.textContent = `${data.latency}ms`;

            // Warn if latency exceeds 2000ms
            if (data.latency > 2000) {
                latencyStat.style.color = '#e74c3c';
            } else {
                latencyStat.style.color = '#2ecc71';
            }
        } else {
            console.error('[Latency] latencyStat element not found!');
        }

        // Update rolling average
        updateLatencyAverage(data.latency);
    }

    // Queue audio for playback if available
    if (data.audioData) {
        try {
            const audioBlob = base64ToBlob(data.audioData, 'audio/mp3');
            const receivedTime = Date.now();

            // Create audio item with timestamp for age tracking
            const audioItem = {
                blob: audioBlob,
                timestamp: receivedTime,
                age: 0 // Will be calculated when playing
            };

            audioQueue.push(audioItem);
            console.log(`[Full-Duplex] Audio added. Queue length: ${audioQueue.length}`);

            // Full-duplex: Start playing immediately (audio ducking reduces volume if user is speaking)
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

// Audio ducking: Listen for peer speaking events
socket.on('peer-speaking', (data) => {
    console.log('[Ducking] Peer speaking:', data.username);
    if (playbackGain && audioContext) {
        // Duck playback to 30% volume with smooth ramp
        playbackGain.gain.linearRampToValueAtTime(
            0.3,
            audioContext.currentTime + 0.05 // 50ms ramp
        );
        console.log('[Ducking] Volume reduced to 30%');
    }
});

socket.on('peer-silence', (data) => {
    console.log('[Ducking] Peer silence:', data.username);
    if (playbackGain && audioContext) {
        // Restore playback to full volume with smooth ramp
        playbackGain.gain.linearRampToValueAtTime(
            1.0,
            audioContext.currentTime + 0.3 // 300ms restore
        );
        console.log('[Ducking] Volume restored to 100%');
    }
});

// Mobile audio unlock state
let audioUnlocked = false;
let unlockAttempts = 0;

// Detect mobile device
const isMobileDevice = /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent);
console.log('🔍 Device detection: isMobile =', isMobileDevice, ', userAgent =', navigator.userAgent);

// Audio playback queue system (Web Audio API - iOS Safari compatible)
async function playNextAudio() {
    // Clean stale audio before playing
    cleanStaleAudio();

    if (audioQueue.length === 0) {
        isPlayingAudio = false;
        console.log('[Audio] Queue empty');
        return;
    }

    // Full-duplex: Allow playback even when user is speaking (audio ducking handles volume)
    isPlayingAudio = true;
    const audioItem = audioQueue.shift();
    const audioBlob = audioItem.blob;
    const age = Date.now() - audioItem.timestamp;

    console.log(`[Audio] Playing audio (${audioBlob.size} bytes, age: ${age}ms, ${audioQueue.length} remaining in queue)`);
    console.log(`[Audio] Mobile device: ${isMobileDevice}, Audio unlocked: ${audioUnlocked}`);

    try {
        // Ensure AudioContext exists and is running
        if (!audioContext) {
            console.error('[Audio] No AudioContext available!');
            throw new Error('AudioContext not initialized');
        }

        // Resume AudioContext if suspended (important for iOS)
        if (audioContext.state === 'suspended') {
            console.log('[Audio] Resuming suspended AudioContext...');
            await audioContext.resume();
        }

        console.log(`[Audio] AudioContext state: ${audioContext.state}`);

        // Convert Blob to ArrayBuffer
        const arrayBuffer = await audioBlob.arrayBuffer();
        console.log('[Audio] Blob converted to ArrayBuffer');

        // Decode audio data
        const audioBuffer = await audioContext.decodeAudioData(arrayBuffer);
        console.log(`[Audio] Audio decoded: ${audioBuffer.duration.toFixed(2)}s`);

        // Create buffer source
        const source = audioContext.createBufferSource();
        source.buffer = audioBuffer;

        // Route through gain node for audio ducking support
        if (playbackGain) {
            source.connect(playbackGain);
            console.log('[Audio] Routed through gain node for ducking');
        } else {
            source.connect(audioContext.destination);
            console.warn('[Audio] No gain node - ducking not available');
        }

        // Wait for playback to finish
        await new Promise((resolve, reject) => {
            source.onended = () => {
                console.log('[Audio] Playback ended normally');
                resolve();
            };

            // Start playback
            source.start(0);
            console.log('✓ [Audio] Playing successfully via Web Audio API');
        });

    } catch (error) {
        console.error('[Audio] Playback failed:', error.name, error.message);

        if (error.name === 'NotAllowedError' || error.name === 'InvalidStateError') {
            console.warn('⚠️ [Audio] Blocked by browser autoplay policy or AudioContext not ready');

            // Try to unlock audio
            if (!audioUnlocked) {
                console.log('[Audio] Attempting to unlock...');
                unlockAudio();
                showNotification('📱 TAP SCREEN to enable sound');

                // Put audio back in queue to retry after unlock
                audioQueue.unshift(audioItem);
                console.log('[Audio] Audio returned to queue, waiting for unlock');
            } else {
                console.error('[Audio] Already unlocked but still getting error!');
                console.error('[Audio] AudioContext state:', audioContext ? audioContext.state : 'null');
            }

            isPlayingAudio = false;
            return;
        } else {
            console.error('[Audio] Playback error:', error);
        }
    }

    // Play next audio in queue
    if (audioQueue.length > 0) {
        console.log(`[Audio] Playing next in queue (${audioQueue.length} remaining)`);
        playNextAudio();
    } else {
        isPlayingAudio = false;
        console.log('[Audio] Queue finished');
    }
}

// Clean stale audio from queue (removes audio older than MAX_AUDIO_AGE_MS)
function cleanStaleAudio() {
    const now = Date.now();
    const originalLength = audioQueue.length;

    audioQueue = audioQueue.filter(item => {
        const age = now - item.timestamp;
        if (age > MAX_AUDIO_AGE_MS) {
            console.log(`[Smart Queue] Removed stale audio (${age}ms old)`);
            return false;
        }
        return true;
    });

    if (audioQueue.length < originalLength) {
        console.log(`[Smart Queue] Cleaned ${originalLength - audioQueue.length} stale audio items`);
    }
}

// Unlock audio on user interaction (critical for mobile)
function unlockAudio() {
    if (audioUnlocked) {
        console.log('[Unlock] Already unlocked, skipping');
        return;
    }

    unlockAttempts++;
    console.log(`[Unlock] Attempt #${unlockAttempts} - Starting unlock process...`);
    console.log(`[Unlock] AudioContext state: ${audioContext ? audioContext.state : 'null'}`);

    // Method 1: Resume AudioContext if it exists
    if (audioContext) {
        if (audioContext.state === 'suspended') {
            console.log('[Unlock] Resuming suspended AudioContext...');
            audioContext.resume().then(() => {
                console.log('✓ [Unlock] AudioContext resumed:', audioContext.state);
                audioUnlocked = true;
                console.log(`✅ [Unlock] SUCCESS on attempt #${unlockAttempts} (AudioContext resume)!`);

                // Start playing queued audio
                if (audioQueue.length > 0 && !isPlayingAudio) {
                    console.log(`[Unlock] Starting queued audio (${audioQueue.length} items)...`);
                    playNextAudio();
                }
            }).catch(e => {
                console.error('[Unlock] Failed to resume AudioContext:', e);
            });
        } else {
            // AudioContext already running, just mark as unlocked
            audioUnlocked = true;
            console.log(`✅ [Unlock] SUCCESS on attempt #${unlockAttempts} (AudioContext already running)!`);

            // Start playing queued audio
            if (audioQueue.length > 0 && !isPlayingAudio) {
                console.log(`[Unlock] Starting queued audio (${audioQueue.length} items)...`);
                playNextAudio();
            }
        }
    } else {
        // Method 2: Use AudioContext to create and play silent buffer
        console.log('[Unlock] Creating temporary AudioContext for unlock...');
        try {
            const tempContext = new (window.AudioContext || window.webkitAudioContext)();

            // Create a silent buffer (0.1 seconds)
            const buffer = tempContext.createBuffer(1, tempContext.sampleRate * 0.1, tempContext.sampleRate);
            const source = tempContext.createBufferSource();
            source.buffer = buffer;
            source.connect(tempContext.destination);
            source.start(0);

            console.log('[Unlock] Silent buffer played');

            // Resume context if suspended
            if (tempContext.state === 'suspended') {
                tempContext.resume().then(() => {
                    audioUnlocked = true;
                    console.log(`✅ [Unlock] SUCCESS on attempt #${unlockAttempts} (temp AudioContext)!`);
                });
            } else {
                audioUnlocked = true;
                console.log(`✅ [Unlock] SUCCESS on attempt #${unlockAttempts} (temp AudioContext)!`);
            }

            // Start playing queued audio
            if (audioQueue.length > 0 && !isPlayingAudio) {
                console.log(`[Unlock] Starting queued audio (${audioQueue.length} items)...`);
                playNextAudio();
            }
        } catch (e) {
            console.error(`❌ [Unlock] FAILED on attempt #${unlockAttempts}:`, e.name, e.message);
            console.log('[Unlock] Will retry on next user interaction');
        }
    }
}

// Store pending join info
let pendingJoin = null;

// DOM elements for calibration options screen
const calibrationOptionsScreen = document.getElementById('calibrationOptionsScreen');
const useExistingProfileBtn = document.getElementById('useExistingProfileBtn');
const startCalibrationFromJoinBtn = document.getElementById('startCalibrationFromJoinBtn');
const skipCalibrationFromJoinBtn = document.getElementById('skipCalibrationFromJoinBtn');

// Join room functionality - now shows calibration options first
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

    // Store join information
    pendingJoin = { username, language, roomId };

    // Show calibration options screen
    showCalibrationOptions(language);
});

// Show calibration options based on language AND username
function showCalibrationOptions(language) {
    const voiceProfileId = localStorage.getItem('voiceProfileId');
    const voiceLanguage = localStorage.getItem('voiceLanguage');
    const voiceUsername = localStorage.getItem('voiceUsername'); // Username associated with the profile

    // Get current username from pending join
    const currentUsername = pendingJoin ? pendingJoin.username : null;

    // SECURITY: Only show existing profile if ALL of these match:
    // 1. Profile ID exists
    // 2. Language matches
    // 3. Username matches (prevents users from using each other's profiles)
    const hasMatchingProfile = voiceProfileId &&
                               voiceLanguage === language &&
                               voiceUsername === currentUsername;

    // Update language-specific text
    const langName = getLanguageName(language);
    document.getElementById('calibrationLanguageName').textContent = langName;
    document.getElementById('profileLangDisplay').textContent = langName;
    document.getElementById('defaultLangDisplay').textContent = langName;

    // Show/hide Option #1 based on complete profile match
    const existingProfileOption = document.getElementById('existingProfileOption');
    if (hasMatchingProfile) {
        existingProfileOption.style.display = 'block';
        document.getElementById('usernameDisplay').textContent = voiceUsername;
        document.getElementById('profileIdDisplay').textContent = voiceProfileId;
        console.log(`✓ Profile match found - Username: ${voiceUsername}, Language: ${langName}, Profile: ${voiceProfileId}`);
    } else {
        existingProfileOption.style.display = 'none';
        if (voiceProfileId && voiceLanguage === language && voiceUsername !== currentUsername) {
            console.log(`⚠️ Profile exists for ${langName} but username mismatch (stored: "${voiceUsername}", current: "${currentUsername}")`);
        } else {
            console.log(`No matching profile for username "${currentUsername}" + ${langName}`);
        }
    }

    // Switch to calibration options screen
    joinScreen.classList.remove('active');
    calibrationOptionsScreen.classList.add('active');
}

// Option 1: Use existing profile
useExistingProfileBtn.addEventListener('click', async () => {
    console.log('User chose: Continue with existing profile');
    proceedToConference();
});

// Option 2: Start calibration
startCalibrationFromJoinBtn.addEventListener('click', () => {
    console.log('User chose: Start calibration');
    // Redirect to onboarding with language pre-selected
    const lang = pendingJoin.language;
    localStorage.setItem('pendingJoin', JSON.stringify(pendingJoin));
    window.location.href = '/onboarding.html?lang=' + lang;
});

// Option 3: Skip calibration (use default profile)
skipCalibrationFromJoinBtn.addEventListener('click', async () => {
    console.log('User chose: Skip calibration (use default profile)');

    // Create default profile for this language + username
    const profileId = generateProfileId();
    localStorage.setItem('voiceProfileId', profileId);
    localStorage.setItem('voiceLanguage', pendingJoin.language);
    localStorage.setItem('voiceUsername', pendingJoin.username); // Link profile to username
    localStorage.setItem('calibrationSkipped', 'true');

    console.log('Creating default profile for', pendingJoin.username, '+', pendingJoin.language);

    // Notify server to create a basic profile with defaults
    socket.emit('create-voice-profile', {
        profileId: profileId,
        language: pendingJoin.language,
        username: pendingJoin.username, // Include username in server profile
        phrasesCount: 0,
        skipped: true
    });

    // Proceed to conference
    proceedToConference();
});

// Proceed to conference with pending join info
async function proceedToConference() {
    if (!pendingJoin) return;

    const { username, language, roomId } = pendingJoin;

    currentUsername = username;
    currentLanguage = language;
    currentRoom = roomId;

    // Save username to localStorage for future sessions
    localStorage.setItem('savedUsername', username);
    console.log('Username saved to localStorage:', username);

    // Get selected custom voice
    const customVoiceId = customVoiceSelect ? customVoiceSelect.value : '';

    // Join the room
    socket.emit('join-room', {
        roomId,
        username,
        language,
        customVoiceId: customVoiceId || null
    });

    // Update UI
    currentRoomId.textContent = roomId;
    currentLanguageDisplay.textContent = getLanguageName(language);

    // Switch to conference screen - hide ALL screens first
    joinScreen.classList.remove('active');
    calibrationOptionsScreen.classList.remove('active');
    conferenceScreen.classList.add('active');

    // Initialize audio
    await initializeAudio();

    // Unlock audio immediately with user interaction
    unlockAudio();

    // Clear pending join
    pendingJoin = null;
}

// Generate profile ID
function generateProfileId() {
    return 'profile-' + Date.now() + '-' + Math.random().toString(36).substring(2, 9);
}

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
        console.log(`[Audio] Initializing with transport: ${selectedTransportType}`);

        // Initialize audio player first
        audioPlayer.volume = 1.0;
        audioPlayer.muted = false;

        // Resume audio context if suspended (important for autoplay policies)
        if (audioContext && audioContext.state === 'suspended') {
            await audioContext.resume();
        }

        // Initialize audio transport based on selected type
        audioTransport = new AudioTransport(selectedTransportType);

        // Build transport configuration
        const transportConfig = {
            echoCancellation: true,
            noiseSuppression: true,
            autoGainControl: true
        };

        // Add SIP-specific configuration if needed
        if (selectedTransportType === 'sip') {
            transportConfig.sipServer = sipServerInput.value || 'wss://localhost:8089/ws';
            transportConfig.sipUsername = sipUsernameInput.value || 'caller1';
            transportConfig.sipPassword = sipPasswordInput.value || 'secret123';
            transportConfig.sipDomain = 'localhost'; // Extract from server URL if needed
            transportConfig.displayName = currentUsername || 'Translation User';
            transportConfig.sipDestination = 'sip:translation@localhost'; // Destination for outbound call
        }

        // Connect via selected transport
        console.log('[Audio] Connecting to audio source via', selectedTransportType);
        const stream = await audioTransport.connect(transportConfig);
        console.log('[Audio] ✓ Audio stream obtained via', selectedTransportType);

        // Set up audio context for visualization
        audioContext = new (window.AudioContext || window.webkitAudioContext)();
        analyser = audioContext.createAnalyser();
        const source = audioContext.createMediaStreamSource(stream);
        source.connect(analyser);
        analyser.fftSize = 256;

        // Initialize gain node for audio ducking
        playbackGain = audioContext.createGain();
        playbackGain.gain.value = 1.0; // Start at full volume
        playbackGain.connect(audioContext.destination);
        console.log('[Audio] Gain node initialized for ducking');

        // Resume audio context immediately after creation
        if (audioContext.state === 'suspended') {
            await audioContext.resume();
        }

        // Set up media recorder
        mediaRecorder = new MediaRecorder(stream, {
            mimeType: 'audio/webm',
            audioBitsPerSecond: 128000
        });

        mediaRecorder.ondataavailable = (event) => {
            if (event.data.size > 0) {
                console.log('Audio data available:', event.data.size, 'bytes');
                audioChunks.push(event.data);
            }
        };

        mediaRecorder.onstop = async () => {
            if (audioChunks.length > 0) {
                // Create complete WebM blob from accumulated chunks
                const audioBlob = new Blob(audioChunks, { type: 'audio/webm' });
                const audioSize = audioBlob.size;

                // Determine chunk status based on speaking state
                const isComplete = !isSpeaking; // If we're not speaking anymore, mark as complete
                const status = isComplete ? 'complete' : 'continuing';

                utteranceChunkCount++;
                console.log(`[Chunking] Sending chunk #${utteranceChunkCount} (${audioSize} bytes, status: ${status}, utteranceId: ${currentUtteranceId})`);

                // Convert to array buffer and send with metadata
                const arrayBuffer = await audioBlob.arrayBuffer();
                socket.emit('audio-chunk', {
                    audioBuffer: arrayBuffer,
                    roomId: currentRoom,
                    utteranceId: currentUtteranceId,
                    status: status,
                    chunkIndex: utteranceChunkCount - 1,
                    timestamp: Date.now()
                });

                // Clear chunks for next recording cycle
                audioChunks = [];
            }
        };

        console.log('Audio initialized');
        updateStatus('Ready to speak', 'idle');

    } catch (error) {
        console.error('Error initializing audio:', error);
        alert('Could not access microphone. Please check permissions.');
    }
}

// Start recording with silence detection
function startRecording() {
    if (!mediaRecorder) {
        alert('Please wait for audio initialization');
        return;
    }

    isRecording = true;
    audioChunks = [];
    silenceDuration = 0;
    isSpeaking = false;
    speechStartTime = 0;  // Reset speech start time
    chunkStartTime = Date.now();  // Track when chunk started

    // Generate new utterance ID for this recording session
    currentUtteranceId = 'utt-' + Date.now() + '-' + Math.random().toString(36).substring(2, 9);
    utteranceChunkCount = 0;
    console.log(`[Chunking] New utterance started: ${currentUtteranceId}`);

    // Start continuous recording with 100ms chunks
    mediaRecorder.start(100);  // timeslice parameter generates chunks every 100ms
    console.log('[Chunking] Recording started - will send after silence OR max buffer time');

    // Start silence detection (check every 50ms)
    silenceDetectionInterval = setInterval(() => {
        detectSilence();
    }, 50);

    // Start visualization
    visualizeAudio();

    // Update UI
    toggleMicBtn.classList.add('recording');
    toggleMicBtn.querySelector('.btn-text').textContent = 'Stop Speaking';
    updateStatus('Ready to speak...', 'idle');
}

// Detect silence and send audio when speech ends
function detectSilence() {
    if (!analyser || !isRecording) return;

    const bufferLength = analyser.frequencyBinCount;
    const dataArray = new Uint8Array(bufferLength);
    analyser.getByteTimeDomainData(dataArray);

    // Calculate RMS (Root Mean Square) volume
    let sum = 0;
    for (let i = 0; i < bufferLength; i++) {
        const normalized = (dataArray[i] - 128) / 128;
        sum += normalized * normalized;
    }
    const rms = Math.sqrt(sum / bufferLength);

    // Log RMS value every second for debugging/tuning (20 checks * 50ms = 1 second)
    if (Math.random() < 0.05) {  // Log ~5% of the time to avoid spam
        console.log(`[Silence Detection] RMS: ${rms.toFixed(4)} (threshold: ${SILENCE_THRESHOLD})`);
    }

    // CHECK FOR MAX BUFFER TIME - Send chunk if we've been recording too long
    const chunkDuration = Date.now() - chunkStartTime;
    if (chunkDuration >= MAX_BUFFER_TIME_MS && isSpeaking) {
        const speechDuration = Date.now() - speechStartTime;
        console.log(`[Chunking] Max buffer time reached (${chunkDuration}ms) - forcing send (speech: ${speechDuration}ms)`);
        sendBufferedAudio('max-buffer');
        return; // Early return to avoid duplicate processing
    }

    // Check if volume is below silence threshold
    if (rms < SILENCE_THRESHOLD) {
        silenceDuration += 50;

        // If we've been silent for long enough AND we were speaking before
        if (silenceDuration >= SILENCE_DURATION_MS && isSpeaking) {
            // Calculate speech duration
            const speechDuration = Date.now() - speechStartTime;

            // Only send if speech was long enough (prevents sending noise/clicks)
            if (speechDuration >= MIN_SPEECH_DURATION_MS) {
                console.log(`[Silence Detection] Silence detected - sending audio (${speechDuration}ms speech)`);
                sendBufferedAudio('silence');
            } else {
                console.log(`[Silence Detection] Speech too short (${speechDuration}ms), ignoring (min: ${MIN_SPEECH_DURATION_MS}ms)`);
                // Clear audio chunks since we're not sending
                audioChunks = [];
            }

            isSpeaking = false;
            isUserSpeaking = false;  // Update global flag for ducking coordination
            updateStatus('Processing...', 'processing');

            // Full-duplex: Audio plays continuously, no need to resume
            // Ducking will automatically restore volume when user stops speaking

            // Audio ducking: Notify peers that user stopped speaking
            if (currentRoom) {
                socket.emit('user-silence', { roomId: currentRoom });
                console.log('[Ducking] Emitted user-silence event');
            }
        }
    } else {
        // Sound detected - reset silence counter
        silenceDuration = 0;

        if (!isSpeaking) {
            console.log('[Silence Detection] Speech started');
            isSpeaking = true;
            isUserSpeaking = true;  // Track for ducking coordination
            speechStartTime = Date.now();  // Track when speech started
            updateStatus('Listening...', 'recording');

            // Full-duplex: Don't clear audio queue - let both audio streams play
            // Audio ducking will reduce volume of incoming audio automatically

            // Audio ducking: Notify peers that user started speaking
            if (currentRoom) {
                socket.emit('user-speaking', { roomId: currentRoom });
                console.log('[Ducking] Emitted user-speaking event');
            }
        }
    }
}

// Send buffered audio
async function sendBufferedAudio(trigger = 'unknown') {
    // Note: Don't check if audioChunks is empty here!
    // The stop() call below will trigger ondataavailable which populates audioChunks
    // Then onstop will handle sending the audio

    console.log(`[Chunking] Triggering send (trigger: ${trigger}) - stopping recorder`);

    // Stop and restart MediaRecorder to get complete WebM file
    if (mediaRecorder.state === 'recording') {
        mediaRecorder.stop();

        // Wait for onstop event to send audio
        // (handled by mediaRecorder.onstop callback)

        // Restart recording after 50ms
        setTimeout(() => {
            if (isRecording) {
                audioChunks = [];
                chunkStartTime = Date.now();  // Reset chunk timer for next chunk
                mediaRecorder.start(100);  // timeslice parameter generates chunks every 100ms

                // For max-buffer triggers, don't reset speech state - we're still speaking
                if (trigger === 'max-buffer') {
                    console.log('[Chunking] Continuing speech - recording next chunk (streaming mode)');
                    updateStatus('Listening... (streaming)', 'recording');
                    // Keep isSpeaking = true, utteranceId stays same (continuing same utterance)
                } else {
                    console.log('[Chunking] Recording restarted - ready for next utterance');
                    updateStatus('Ready to speak...', 'idle');
                    // For silence triggers, generate new utterance ID for next speech
                    currentUtteranceId = 'utt-' + Date.now() + '-' + Math.random().toString(36).substring(2, 9);
                    utteranceChunkCount = 0;
                    console.log(`[Chunking] New utterance ready: ${currentUtteranceId}`);
                }
            }
        }, 50);
    }
}

// Stop recording
function stopRecording() {
    if (!mediaRecorder || !isRecording) return;

    isRecording = false;
    isSpeaking = false;
    isUserSpeaking = false;  // Reset auto-mute flag

    // Stop recording
    if (mediaRecorder.state === 'recording') {
        mediaRecorder.stop();
    }

    // Clear silence detection interval
    if (silenceDetectionInterval) {
        clearInterval(silenceDetectionInterval);
        silenceDetectionInterval = null;
    }

    if (recordingInterval) {
        clearInterval(recordingInterval);
        recordingInterval = null;
    }

    // IMPORTANT: Clear audio queue to prevent all queued audio from playing at once
    console.log(`[Audio] Clearing audio queue (${audioQueue.length} items)`);
    audioQueue = [];
    isPlayingAudio = false;

    // Reset utterance tracking
    currentUtteranceId = null;
    utteranceChunkCount = 0;

    // Update UI
    toggleMicBtn.classList.remove('recording');
    toggleMicBtn.querySelector('.btn-text').textContent = 'Start Speaking';
    updateStatus('Ready to speak', 'idle');

    // Clear visualization
    if (canvasCtx && audioVisualizer) {
        canvasCtx.clearRect(0, 0, audioVisualizer.width, audioVisualizer.height);
    }

    console.log('[Silence Detection] Recording stopped');
}

// Visualize audio
function visualizeAudio() {
    if (!isRecording || !analyser || !canvasCtx || !audioVisualizer) return;

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

    // Remove any interim transcription
    const interim = transcriptionDisplay.querySelector('.transcription-interim');
    if (interim) {
        interim.remove();
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

// Display interim transcription (streaming feedback)
function displayInterimTranscription(text, chunkCount) {
    const placeholder = transcriptionDisplay.querySelector('.placeholder');
    if (placeholder) {
        transcriptionDisplay.innerHTML = '';
    }

    // Update or create interim element
    let interim = transcriptionDisplay.querySelector('.transcription-interim');
    if (!interim) {
        interim = document.createElement('p');
        interim.className = 'transcription-interim';
        interim.style.opacity = '0.7';
        interim.style.fontStyle = 'italic';
        transcriptionDisplay.appendChild(interim);
    }

    interim.textContent = `${text} [streaming... ${chunkCount} chunks]`;
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
    lastLatencyUpdate = now;  // Track when we last received data

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

        console.log('[Latency] Average latency (1min):', avg, 'ms (', latencyHistory.length, 'samples)');

        // Check if element exists (defensive programming for mobile)
        if (avgLatencyStat) {
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
            console.error('[Latency] avgLatencyStat element not found!');
        }
    } else {
        if (avgLatencyStat) {
            avgLatencyStat.textContent = '-';
        }
    }
}

// Monitor for stale latency data (no updates received)
function checkLatencyDataFreshness() {
    if (lastLatencyUpdate === 0) return; // Not started yet

    const now = Date.now();
    const age = now - lastLatencyUpdate;

    if (age > LATENCY_STALE_THRESHOLD_MS) {
        const ageSeconds = Math.round(age / 1000);
        console.log(`[Latency] Data is stale (${ageSeconds}s old)`);

        // Optionally show warning in UI
        if (avgLatencyStat && age > 20000) { // 20+ seconds is very stale
            avgLatencyStat.style.color = '#95a5a6'; // Gray out
        }
    }
}

// Reset latency tracking (e.g., on disconnect)
function resetLatencyTracking() {
    latencyHistory = [];
    lastLatencyUpdate = 0;
    console.log('[Latency] Reset on disconnect');
    if (avgLatencyStat) {
        avgLatencyStat.textContent = '-';
    }
    if (latencyStat) {
        latencyStat.textContent = '-';
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

// Voice Selection System
const customVoiceSelect = document.getElementById('customVoice');
const previewVoiceBtn = document.getElementById('previewVoiceBtn');
const previewStatus = document.getElementById('previewStatus');
const voicePreviewContainer = document.querySelector('.voice-preview-container');
let availableVoices = [];
let previewAudio = null;

// Load custom voices from server
async function loadCustomVoices() {
    try {
        const response = await fetch('/api/voices');
        const data = await response.json();

        if (data.success && data.voices.length > 0) {
            availableVoices = data.voices;

            // Populate dropdown
            data.voices.forEach(voice => {
                const option = document.createElement('option');
                option.value = voice.id;
                option.textContent = voice.name;
                customVoiceSelect.appendChild(option);
            });

            console.log(`✓ Loaded ${data.voices.length} custom voices`);
        } else {
            console.log('No custom voices available');
        }
    } catch (error) {
        console.error('Error loading custom voices:', error);
    }
}

// Handle voice selection change
customVoiceSelect.addEventListener('change', () => {
    const selectedVoice = customVoiceSelect.value;

    if (selectedVoice) {
        // Show preview button when a custom voice is selected
        voicePreviewContainer.style.display = 'block';
    } else {
        // Hide preview button for default option
        voicePreviewContainer.style.display = 'none';
    }
});

// Handle voice preview
previewVoiceBtn.addEventListener('click', async () => {
    const selectedVoice = customVoiceSelect.value;

    if (!selectedVoice) {
        return;
    }

    // Stop any currently playing preview
    if (previewAudio) {
        previewAudio.pause();
        previewAudio = null;
    }

    try {
        previewStatus.textContent = 'Loading preview...';
        previewVoiceBtn.disabled = true;

        // Fetch preview audio
        const response = await fetch(`/api/voice-preview/${selectedVoice}`);

        if (!response.ok) {
            throw new Error('Failed to load preview');
        }

        const audioBlob = await response.blob();
        const audioUrl = URL.createObjectURL(audioBlob);

        // Create and play audio
        previewAudio = new Audio(audioUrl);
        previewAudio.volume = 0.8;

        previewStatus.textContent = 'Playing...';

        previewAudio.onended = () => {
            previewStatus.textContent = '';
            previewVoiceBtn.disabled = false;
            URL.revokeObjectURL(audioUrl);
        };

        previewAudio.onerror = (error) => {
            console.error('Preview playback error:', error);
            previewStatus.textContent = 'Error playing preview';
            previewVoiceBtn.disabled = false;
        };

        await previewAudio.play();

    } catch (error) {
        console.error('Error playing voice preview:', error);
        previewStatus.textContent = 'Failed to load preview';
        previewVoiceBtn.disabled = false;
    }
});

// Initialize on page load
document.addEventListener('DOMContentLoaded', () => {
    console.log('Conference app loaded');
    updateConnectionStatus('Connecting...', false);

    // Load custom voices
    loadCustomVoices();

    // Initialize audio player settings
    audioPlayer.volume = 1.0;
    audioPlayer.muted = false;
    console.log('Audio player initialized: volume =', audioPlayer.volume, ', muted =', audioPlayer.muted);

    // Setup audio transport selector
    if (audioTransportSelect) {
        audioTransportSelect.addEventListener('change', () => {
            selectedTransportType = audioTransportSelect.value;
            console.log('[AudioTransport] Selected transport:', selectedTransportType);

            // Show/hide SIP configuration section
            if (selectedTransportType === 'sip' && sipConfigSection) {
                sipConfigSection.style.display = 'block';
            } else if (sipConfigSection) {
                sipConfigSection.style.display = 'none';
            }
        });

        // Set initial state
        selectedTransportType = audioTransportSelect.value;
        console.log('[AudioTransport] Initial transport:', selectedTransportType);
    }

    // Add global audio unlock listeners for mobile
    const unlockEvents = ['touchstart', 'touchend', 'click', 'keydown'];
    unlockEvents.forEach(event => {
        document.addEventListener(event, unlockAudio, { once: false, passive: true });
    });
    console.log('✓ Audio unlock listeners added for mobile');

    // Start periodic monitoring for latency freshness and audio queue health
    setInterval(() => {
        checkLatencyDataFreshness();
        if (isRecording && audioQueue.length > 0) {
            cleanStaleAudio();  // Periodically clean queue during active recording
        }
    }, STALE_CHECK_INTERVAL_MS);
    console.log('✓ Periodic monitoring started (latency & audio queue health)');

    // Check if returning from onboarding with pending join
    const pendingJoinData = localStorage.getItem('pendingJoin');
    if (pendingJoinData) {
        try {
            pendingJoin = JSON.parse(pendingJoinData);
            localStorage.removeItem('pendingJoin');

            // Auto-fill form and proceed
            usernameInput.value = pendingJoin.username;
            languageSelect.value = pendingJoin.language;
            roomIdInput.value = pendingJoin.roomId;

            console.log('Returning from onboarding, proceeding to conference');
            proceedToConference();
        } catch (e) {
            console.error('Error processing pending join:', e);
        }
    }

    // Pre-fill username if saved
    const savedUsername = localStorage.getItem('savedUsername');
    if (savedUsername) {
        usernameInput.value = savedUsername;
        console.log('Pre-filled username from localStorage:', savedUsername);
    }

    // Log profile status
    const voiceProfileId = localStorage.getItem('voiceProfileId');
    if (voiceProfileId) {
        console.log('Existing user with profile:', voiceProfileId);
    }
});
