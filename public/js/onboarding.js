/**
 * Onboarding & Voice Calibration Logic
 * Handles user onboarding flow and voice profile creation
 */

// Initialize Socket.io
const socket = io();

// Global state
let currentScreen = 'welcomeScreen';
let selectedLanguage = null;
let mediaRecorder = null;
let audioContext = null;
let analyser = null;
let micStream = null;
let calibrationPhrases = [];
let currentPhraseIndex = 0;
let recordedPhrases = [];
let isRecording = false;
let profileId = null;

// Silence detection for auto-stop
let silenceDetectionInterval = null;
let silenceDuration = 0;
let isSpeaking = false;
const CALIBRATION_SILENCE_THRESHOLD = 0.03;  // RMS threshold for silence
const CALIBRATION_SILENCE_DURATION_MS = 1000;  // 1000ms of silence to auto-stop

// Calibration phrases by language
const PHRASES = {
    en: [
        "Hello, my name is John and I'm testing the voice calibration system.",
        "The quick brown fox jumps over the lazy dog.",
        "I would like to schedule a meeting for tomorrow afternoon.",
        "Can you please repeat what you just said? I didn't catch that.",
        "Thank you very much for your help with this translation."
    ],
    es: [
        "Hola, me llamo Juan y estoy probando el sistema de calibración de voz.",
        "El veloz murciélago hindú comía feliz cardillo y kiwi.",
        "Me gustaría programar una reunión para mañana por la tarde.",
        "¿Puedes repetir lo que acabas de decir? No lo escuché bien.",
        "Muchas gracias por tu ayuda con esta traducción."
    ],
    fr: [
        "Bonjour, je m'appelle Jean et je teste le système de calibration vocale.",
        "Portez ce vieux whisky au juge blond qui fume.",
        "Je voudrais planifier une réunion pour demain après-midi.",
        "Pouvez-vous répéter ce que vous venez de dire? Je n'ai pas compris.",
        "Merci beaucoup pour votre aide avec cette traduction."
    ],
    de: [
        "Hallo, mein Name ist Hans und ich teste das Sprachkalibrierungssystem.",
        "Zwölf Boxkämpfer jagen Viktor quer über den großen Sylter Deich.",
        "Ich möchte ein Treffen für morgen Nachmittag vereinbaren.",
        "Können Sie bitte wiederholen, was Sie gerade gesagt haben? Ich habe es nicht verstanden.",
        "Vielen Dank für Ihre Hilfe bei dieser Übersetzung."
    ],
    it: [
        "Ciao, mi chiamo Giovanni e sto testando il sistema di calibrazione vocale.",
        "Pranzo d'acqua fa volti sghembi.",
        "Vorrei programmare una riunione per domani pomeriggio.",
        "Può ripetere quello che ha appena detto? Non ho capito.",
        "Grazie mille per il tuo aiuto con questa traduzione."
    ],
    pt: [
        "Olá, meu nome é João e estou testando o sistema de calibração de voz.",
        "Um pequeno jabuti xereta viu dez cegonhas felizes.",
        "Gostaria de agendar uma reunião para amanhã à tarde.",
        "Pode repetir o que acabou de dizer? Não entendi.",
        "Muito obrigado pela sua ajuda com esta tradução."
    ],
    ja: [
        "こんにちは、私の名前は太郎で音声キャリブレーションシステムをテストしています。",
        "いろはにほへと　ちりぬるを　わかよたれそ　つねならむ",
        "明日の午後にミーティングをスケジュールしたいのですが。",
        "今言ったことをもう一度言っていただけますか？聞き取れませんでした。",
        "この翻訳を手伝っていただきありがとうございます。"
    ],
    ko: [
        "안녕하세요, 제 이름은 철수이고 음성 보정 시스템을 테스트하고 있습니다.",
        "다람쥐 헌 쳇바퀴에 타고파.",
        "내일 오후에 회의를 예약하고 싶습니다.",
        "방금 말씀하신 것을 다시 한 번 말씀해 주시겠습니까? 잘 못 들었습니다.",
        "이 번역을 도와주셔서 대단히 감사합니다."
    ],
    zh: [
        "你好，我叫小明，正在测试语音校准系统。",
        "天地玄黄，宇宙洪荒，日月盈昃，辰宿列张。",
        "我想安排明天下午的会议。",
        "你能重复一下刚才说的话吗？我没听清楚。",
        "非常感谢你帮助我完成这个翻译。"
    ],
    ru: [
        "Здравствуйте, меня зовут Иван, и я тестирую систему голосовой калибровки.",
        "Съешь же ещё этих мягких французских булок да выпей чаю.",
        "Я хотел бы назначить встречу на завтра после обеда.",
        "Не могли бы вы повторить то, что только что сказали? Я не расслышал.",
        "Большое спасибо за помощь с этим переводом."
    ]
};

// DOM Elements
const screens = {
    welcome: document.getElementById('welcomeScreen'),
    options: document.getElementById('optionsScreen'),
    language: document.getElementById('languageScreen'),
    micSetup: document.getElementById('micSetupScreen'),
    instructions: document.getElementById('instructionsScreen'),
    recording: document.getElementById('recordingScreen'),
    processing: document.getElementById('processingScreen'),
    completion: document.getElementById('completionScreen'),
    error: document.getElementById('errorScreen')
};

// Buttons
const startCalibrationBtn = document.getElementById('startCalibrationBtn');
const skipCalibrationBtn = document.getElementById('skipCalibrationBtn');
const continueWithProfileBtn = document.getElementById('continueWithProfileBtn');
const backToLanguageBtn = document.getElementById('backToLanguageBtn');
const welcomeLanguageCards = document.querySelectorAll('#welcomeScreen .language-card');
const languageCards = document.querySelectorAll('#languageScreen .language-card');
const allowMicBtn = document.getElementById('allowMicBtn');
const backToLangBtn = document.getElementById('backToLangBtn');
const startRecordingBtn = document.getElementById('startRecordingBtn');
const backToMicBtn = document.getElementById('backToMicBtn');
const recordPhraseBtn = document.getElementById('recordPhraseBtn');
const stopRecordingBtn = document.getElementById('stopRecordingBtn');
const nextPhraseBtn = document.getElementById('nextPhraseBtn');
const goToConferenceBtn = document.getElementById('goToConferenceBtn');
const recalibrateBtn = document.getElementById('recalibrateBtn');
const retryBtn = document.getElementById('retryBtn');
const skipErrorBtn = document.getElementById('skipErrorBtn');

// Status elements
const micStatus = document.getElementById('micStatus');
const recordingStatus = document.getElementById('recordingStatus');
const connectionStatus = document.getElementById('connectionStatus');
const connectionText = document.getElementById('connectionText');

// Visualizers
const micVisualizer = document.getElementById('micVisualizer');
const micVisualizerCtx = micVisualizer?.getContext('2d');
const recordingVisualizer = document.getElementById('recordingVisualizer');
const recordingVisualizerCtx = recordingVisualizer?.getContext('2d');

// Socket event listeners
socket.on('connect', () => {
    console.log('Connected to server');
    updateConnectionStatus('Connected', true);
});

socket.on('disconnect', () => {
    console.log('Disconnected from server');
    updateConnectionStatus('Disconnected', false);
});

socket.on('profile-created', (data) => {
    console.log('Profile created:', data);
    profileId = data.profileId;
    localStorage.setItem('voiceProfileId', profileId);
});

socket.on('calibration-processed', (data) => {
    console.log('Calibration processed:', data);
    // Move to next phrase or completion
    if (currentPhraseIndex < calibrationPhrases.length) {
        nextPhrase();
    } else {
        finishCalibration();
    }
});

socket.on('error', (error) => {
    console.error('Server error:', error);
    showError(error.message || 'An error occurred');
});

// Event Listeners

// Welcome screen language selection - shows options based on profile existence
welcomeLanguageCards.forEach(card => {
    card.addEventListener('click', () => {
        const lang = card.dataset.lang;
        selectedLanguage = lang;

        // Check if profile exists for this language
        const existingProfileId = localStorage.getItem('voiceProfileId');
        const existingProfileLang = localStorage.getItem('voiceLanguage');
        const hasProfileForLanguage = existingProfileId && existingProfileLang === lang;

        // Navigate to options screen
        navigateToScreen('options');

        // Update language-specific text
        document.getElementById('existingProfileLangName').textContent = getLanguageName(lang);
        document.getElementById('skipLanguageName').textContent = getLanguageName(lang);

        // Show/hide Option #1 based on profile existence for THIS language
        const existingProfileSection = document.getElementById('existingProfileSection');
        if (hasProfileForLanguage) {
            existingProfileSection.style.display = 'block';
            document.getElementById('existingProfileId').textContent = existingProfileId.substring(0, 15) + '...';
            console.log(`Profile found for ${getLanguageName(lang)}:`, existingProfileId);
        } else {
            existingProfileSection.style.display = 'none';
            console.log(`No profile found for ${getLanguageName(lang)}`);
        }
    });
});

// Back to language selection
backToLanguageBtn.addEventListener('click', () => {
    navigateToScreen('welcome');
});

// Continue with existing profile
continueWithProfileBtn.addEventListener('click', () => {
    // User already has a profile for this language, go directly to conference
    console.log('Continuing with existing profile:', localStorage.getItem('voiceProfileId'), selectedLanguage);
    goToConference();
});

// Start calibration - go to mic setup
startCalibrationBtn.addEventListener('click', () => {
    navigateToScreen('micSetup');
});

// Skip calibration - create default profile for selected language
skipCalibrationBtn.addEventListener('click', () => {
    skipCalibrationWithLanguage();
});

// Calibration flow language selection (for recalibration)
languageCards.forEach(card => {
    card.addEventListener('click', () => {
        // Remove selected from all cards
        languageCards.forEach(c => c.classList.remove('selected'));

        // Add selected to clicked card
        card.classList.add('selected');
        selectedLanguage = card.dataset.lang;

        // Enable navigation to mic setup
        setTimeout(() => {
            navigateToScreen('micSetup');
        }, 300);
    });
});

allowMicBtn.addEventListener('click', setupMicrophone);
backToLangBtn.addEventListener('click', () => navigateToScreen('language'));
startRecordingBtn.addEventListener('click', startCalibration);
backToMicBtn.addEventListener('click', () => navigateToScreen('micSetup'));
recordPhraseBtn.addEventListener('click', startRecordingPhrase);
stopRecordingBtn.addEventListener('click', stopRecordingPhrase);
nextPhraseBtn.addEventListener('click', nextPhrase);
goToConferenceBtn.addEventListener('click', goToConference);
recalibrateBtn.addEventListener('click', restartCalibration);
retryBtn.addEventListener('click', () => navigateToScreen('welcome'));
skipErrorBtn.addEventListener('click', () => {
    // If error occurred during calibration, skip and use default profile
    if (selectedLanguage) {
        skipCalibrationWithLanguage();
    } else {
        // No language selected yet, go back to welcome
        navigateToScreen('welcome');
    }
});

// Functions

// Text-to-Speech function to read calibration phrase
async function speakPhrase(text, language) {
    return new Promise((resolve, reject) => {
        // Check if browser supports speech synthesis
        if (!('speechSynthesis' in window)) {
            console.error('❌ Speech Synthesis not supported in this browser');
            resolve(false);
            return;
        }

        console.log('[TTS] Speaking phrase:', text.substring(0, 50) + '...');

        const utterance = new SpeechSynthesisUtterance(text);

        // Set language for TTS
        const langMap = {
            'en': 'en-US',
            'es': 'es-ES',
            'fr': 'fr-FR',
            'de': 'de-DE',
            'it': 'it-IT',
            'pt': 'pt-PT',
            'ja': 'ja-JP',
            'ko': 'ko-KR',
            'zh': 'zh-CN',
            'ru': 'ru-RU'
        };
        utterance.lang = langMap[language] || 'en-US';

        // Slow and clear speech for calibration
        utterance.rate = 0.8;  // Slower than normal (0.8x speed)
        utterance.pitch = 1.0;  // Normal pitch
        utterance.volume = 1.0;  // Full volume

        utterance.onend = () => {
            console.log('✓ [TTS] Phrase spoken successfully');
            resolve(true);
        };

        utterance.onerror = (event) => {
            console.error('❌ [TTS] Speech error:', event.error);
            resolve(false);
        };

        // Speak the phrase
        window.speechSynthesis.speak(utterance);
    });
}

// Play beep sound to indicate recording start
async function playBeep() {
    if (!audioContext) {
        console.error('❌ Cannot play beep: AudioContext not initialized!');
        return false;
    }

    // Resume AudioContext if suspended (important for autoplay policies)
    if (audioContext.state === 'suspended') {
        console.log('[Beep] AudioContext suspended, resuming...');
        try {
            await audioContext.resume();
            console.log('[Beep] AudioContext resumed:', audioContext.state);
        } catch (e) {
            console.error('[Beep] Failed to resume AudioContext:', e);
            return false;
        }
    }

    try {
        console.log(`[Beep] Starting beep (AudioContext state: ${audioContext.state})`);

        // Create oscillator for beep sound
        const oscillator = audioContext.createOscillator();
        const gainNode = audioContext.createGain();

        oscillator.connect(gainNode);
        gainNode.connect(audioContext.destination);

        // Configure beep: 800 Hz tone, loud, 400ms duration
        oscillator.frequency.value = 800;  // Pleasant beep frequency
        oscillator.type = 'sine';

        // Volume envelope: start loud, fade out
        gainNode.gain.setValueAtTime(0.3, audioContext.currentTime);  // Loud but not painful
        gainNode.gain.exponentialRampToValueAtTime(0.01, audioContext.currentTime + 0.4);  // 400ms duration

        // Play beep
        oscillator.start(audioContext.currentTime);
        oscillator.stop(audioContext.currentTime + 0.4);

        console.log('🔔 Beep playing (800Hz, 400ms, volume: 0.3)');
        return true;
    } catch (e) {
        console.error('❌ Failed to play beep:', e);
        return false;
    }
}

// Detect silence during recording
function detectCalibrationSilence() {
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

    // Check if volume is below silence threshold
    if (rms < CALIBRATION_SILENCE_THRESHOLD) {
        silenceDuration += 50;

        // If we've been silent for long enough AND we were speaking before
        if (silenceDuration >= CALIBRATION_SILENCE_DURATION_MS && isSpeaking) {
            console.log(`[Calibration] Silence detected (${silenceDuration}ms) - auto-stopping recording`);
            stopRecordingPhrase();
        }
    } else {
        // Sound detected - reset silence counter
        silenceDuration = 0;
        if (!isSpeaking) {
            isSpeaking = true;
            console.log('[Calibration] Speech detected');
        }
    }
}

function navigateToScreen(screenName) {
    // Hide all screens
    Object.values(screens).forEach(screen => {
        screen.classList.remove('active');
    });

    // Show target screen
    const targetScreen = screens[screenName];
    if (targetScreen) {
        targetScreen.classList.add('active');
        currentScreen = screenName + 'Screen';
    }
}

async function setupMicrophone() {
    try {
        micStatus.textContent = 'Requesting microphone access...';
        micStatus.className = 'status-message';

        // Request microphone access
        micStream = await navigator.mediaDevices.getUserMedia({
            audio: {
                echoCancellation: true,
                noiseSuppression: true,
                autoGainControl: true
            }
        });

        // Set up audio context for visualization
        audioContext = new (window.AudioContext || window.webkitAudioContext)();
        analyser = audioContext.createAnalyser();
        const source = audioContext.createMediaStreamSource(micStream);
        source.connect(analyser);
        analyser.fftSize = 256;

        // Resume audio context if suspended
        if (audioContext.state === 'suspended') {
            await audioContext.resume();
        }

        micStatus.textContent = 'Microphone connected! Speak to test...';
        micStatus.className = 'status-message success';

        // Activate mic icon
        const micIcon = document.getElementById('micIcon');
        micIcon.classList.add('active');

        // Start visualization
        visualizeMicrophone();

        // Auto-advance after 2 seconds
        setTimeout(() => {
            navigateToScreen('instructions');
        }, 2000);

    } catch (error) {
        console.error('Microphone error:', error);
        micStatus.textContent = 'Could not access microphone. Please check permissions.';
        micStatus.className = 'status-message error';
    }
}

function visualizeMicrophone() {
    if (!analyser || currentScreen !== 'micSetupScreen') return;

    requestAnimationFrame(visualizeMicrophone);

    const bufferLength = analyser.frequencyBinCount;
    const dataArray = new Uint8Array(bufferLength);
    analyser.getByteFrequencyData(dataArray);

    micVisualizerCtx.fillStyle = '#f8f9fa';
    micVisualizerCtx.fillRect(0, 0, micVisualizer.width, micVisualizer.height);

    const barWidth = (micVisualizer.width / bufferLength) * 2.5;
    let x = 0;

    for (let i = 0; i < bufferLength; i++) {
        const barHeight = (dataArray[i] / 255) * micVisualizer.height;

        const gradient = micVisualizerCtx.createLinearGradient(0, 0, 0, micVisualizer.height);
        gradient.addColorStop(0, '#667eea');
        gradient.addColorStop(1, '#764ba2');

        micVisualizerCtx.fillStyle = gradient;
        micVisualizerCtx.fillRect(x, micVisualizer.height - barHeight, barWidth, barHeight);

        x += barWidth + 1;
    }
}

function startCalibration() {
    if (!selectedLanguage) {
        alert('Please select a language first');
        return;
    }

    // Set up calibration phrases
    calibrationPhrases = PHRASES[selectedLanguage];
    currentPhraseIndex = 0;
    recordedPhrases = [];

    // Navigate to recording screen
    navigateToScreen('recording');

    // Display first phrase
    displayCurrentPhrase();
}

function displayCurrentPhrase() {
    const phraseText = document.getElementById('phraseText');
    const currentPhraseNum = document.getElementById('currentPhraseNum');
    const totalPhrases = document.getElementById('totalPhrases');

    phraseText.textContent = calibrationPhrases[currentPhraseIndex];
    currentPhraseNum.textContent = currentPhraseIndex + 1;
    totalPhrases.textContent = calibrationPhrases.length;

    // Update progress bar
    const progress = ((currentPhraseIndex + 1) / calibrationPhrases.length) * 40 + 60;
    document.getElementById('phraseProgress').style.width = progress + '%';

    // Reset buttons (no "Next Phrase" button needed - auto-advances)
    recordPhraseBtn.style.display = 'flex';
    stopRecordingBtn.style.display = 'none';

    recordingStatus.textContent = "Click 'Record' when ready - the system will read the phrase, then you repeat it";
    recordingStatus.className = 'status-message';
}

async function startRecordingPhrase() {
    if (!micStream) {
        alert('Microphone not set up');
        return;
    }

    try {
        // Reset silence detection state
        silenceDuration = 0;
        isSpeaking = false;
        isRecording = true;

        // Set up media recorder
        mediaRecorder = new MediaRecorder(micStream, {
            mimeType: 'audio/webm',
            audioBitsPerSecond: 128000
        });

        const audioChunks = [];

        mediaRecorder.ondataavailable = (event) => {
            if (event.data.size > 0) {
                audioChunks.push(event.data);
            }
        };

        mediaRecorder.onstop = async () => {
            // Create audio blob
            const audioBlob = new Blob(audioChunks, { type: 'audio/webm' });

            // Store recorded phrase
            recordedPhrases.push({
                phraseIndex: currentPhraseIndex,
                expectedText: calibrationPhrases[currentPhraseIndex],
                audioBlob: audioBlob
            });

            console.log('Phrase recorded:', audioBlob.size, 'bytes');

            // Update UI
            recordingStatus.textContent = 'Phrase recorded successfully! Moving to next phrase...';
            recordingStatus.className = 'status-message success';

            // Send to server for processing
            const arrayBuffer = await audioBlob.arrayBuffer();
            socket.emit('calibration-audio', {
                audioBuffer: arrayBuffer,
                phrase: calibrationPhrases[currentPhraseIndex],
                phraseIndex: currentPhraseIndex,
                language: selectedLanguage,
                profileId: profileId
            });

            // Auto-advance to next phrase after 1.5 seconds
            await delay(1500);
            nextPhrase();
        };

        // Update UI - show "listening" state while TTS plays
        recordPhraseBtn.style.display = 'none';
        recordingStatus.textContent = 'Listen to the phrase...';
        recordingStatus.className = 'status-message';

        // Step 1: Read the phrase using TTS (slowly and clearly)
        const ttsSuccess = await speakPhrase(calibrationPhrases[currentPhraseIndex], selectedLanguage);

        if (!ttsSuccess) {
            console.warn('⚠️ TTS failed, but continuing with calibration');
        }

        // Wait a brief moment after TTS
        await delay(300);

        // Step 2: Play beep sound to indicate recording is about to start
        recordingStatus.textContent = 'Get ready...';
        const beepSuccess = await playBeep();

        if (!beepSuccess) {
            console.warn('⚠️ Beep failed to play, but continuing with recording');
        }

        // Wait for beep to finish before starting recording (500ms delay)
        await delay(500);

        // Step 3: Start recording
        mediaRecorder.start();

        // Update UI - recording in progress
        recordPhraseBtn.style.display = 'none';
        stopRecordingBtn.style.display = 'none';  // Hide manual stop button (auto-stop with silence detection)
        recordingStatus.textContent = '🔴 Recording... Repeat the phrase you just heard';
        recordingStatus.className = 'status-message warning';

        // Activate recording icon
        const recordingIcon = document.getElementById('recordingIcon');
        recordingIcon.classList.add('recording');

        // Start visualization
        visualizeRecording();

        // Start silence detection (check every 50ms)
        silenceDetectionInterval = setInterval(() => {
            detectCalibrationSilence();
        }, 50);

        console.log('[Calibration] Recording started with auto-stop after 1000ms silence');

    } catch (error) {
        console.error('Recording error:', error);
        showError('Failed to start recording');
    }
}

function stopRecordingPhrase() {
    if (mediaRecorder && mediaRecorder.state === 'recording') {
        isRecording = false;
        mediaRecorder.stop();

        // Clear silence detection interval
        if (silenceDetectionInterval) {
            clearInterval(silenceDetectionInterval);
            silenceDetectionInterval = null;
        }

        // Update UI
        stopRecordingBtn.style.display = 'none';

        // Deactivate recording icon
        const recordingIcon = document.getElementById('recordingIcon');
        recordingIcon.classList.remove('recording');
    }
}

function visualizeRecording() {
    if (!analyser || !isRecording) return;

    requestAnimationFrame(visualizeRecording);

    const bufferLength = analyser.frequencyBinCount;
    const dataArray = new Uint8Array(bufferLength);
    analyser.getByteFrequencyData(dataArray);

    recordingVisualizerCtx.fillStyle = '#f8f9fa';
    recordingVisualizerCtx.fillRect(0, 0, recordingVisualizer.width, recordingVisualizer.height);

    const barWidth = (recordingVisualizer.width / bufferLength) * 2.5;
    let x = 0;

    for (let i = 0; i < bufferLength; i++) {
        const barHeight = (dataArray[i] / 255) * recordingVisualizer.height;

        const gradient = recordingVisualizerCtx.createLinearGradient(0, 0, 0, recordingVisualizer.height);
        gradient.addColorStop(0, '#e74c3c');
        gradient.addColorStop(1, '#c0392b');

        recordingVisualizerCtx.fillStyle = gradient;
        recordingVisualizerCtx.fillRect(x, recordingVisualizer.height - barHeight, barWidth, barHeight);

        x += barWidth + 1;
    }
}

function nextPhrase() {
    currentPhraseIndex++;

    if (currentPhraseIndex < calibrationPhrases.length) {
        // More phrases to record
        displayCurrentPhrase();
    } else {
        // All phrases recorded, process calibration
        processCalibration();
    }
}

async function processCalibration() {
    navigateToScreen('processing');

    const processingMessage = document.getElementById('processingMessage');

    // Simulate processing stages
    processingMessage.textContent = 'Analyzing voice characteristics...';

    await delay(1500);
    processingMessage.textContent = 'Extracting speech patterns...';

    await delay(1500);
    processingMessage.textContent = 'Creating voice profile...';

    await delay(1500);
    processingMessage.textContent = 'Optimizing recognition model...';

    // Generate profile ID if not already created
    if (!profileId) {
        profileId = generateProfileId();
        localStorage.setItem('voiceProfileId', profileId);
        localStorage.setItem('voiceLanguage', selectedLanguage);
        if (userUsername) {
            localStorage.setItem('voiceUsername', userUsername); // Link profile to username
            console.log('Profile linked to username:', userUsername);
        }

        // Notify server to create profile
        socket.emit('create-voice-profile', {
            profileId: profileId,
            language: selectedLanguage,
            username: userUsername, // Include username in server profile
            phrasesCount: recordedPhrases.length
        });
    }

    await delay(1000);

    // Show completion screen
    finishCalibration();
}

function finishCalibration() {
    navigateToScreen('completion');

    // Update stats
    document.getElementById('profileLanguage').textContent = getLanguageName(selectedLanguage);
    document.getElementById('profilePhrases').textContent = recordedPhrases.length;
    document.getElementById('profileId').textContent = profileId ? profileId.substring(0, 10) + '...' : 'Generated';
}

function skipCalibrationWithLanguage() {
    if (!selectedLanguage) {
        alert('Please select a language first');
        return;
    }

    // Create a basic profile without calibration
    profileId = generateProfileId();
    localStorage.setItem('voiceProfileId', profileId);
    localStorage.setItem('voiceLanguage', selectedLanguage);
    if (userUsername) {
        localStorage.setItem('voiceUsername', userUsername); // Link profile to username
        console.log('Default profile linked to username:', userUsername);
    }
    localStorage.setItem('calibrationSkipped', 'true');

    console.log('Skipping calibration - creating default profile for', userUsername, '+', selectedLanguage);

    // Notify server to create a basic profile
    socket.emit('create-voice-profile', {
        profileId: profileId,
        language: selectedLanguage,
        username: userUsername, // Include username in server profile
        phrasesCount: 0,  // No calibration phrases
        skipped: true
    });

    // Go directly to conference
    goToConference();
}

function goToConference() {
    // Mark onboarding as completed (even if calibration was skipped)
    localStorage.setItem('onboardingCompleted', 'true');

    // Clean up
    if (micStream) {
        micStream.getTracks().forEach(track => track.stop());
    }

    // Navigate back to conference (it will auto-proceed with pending join)
    window.location.href = '/index.html';
}

function restartCalibration() {
    // Reset state
    currentPhraseIndex = 0;
    recordedPhrases = [];
    profileId = null;

    // Clear storage
    localStorage.removeItem('voiceProfileId');
    localStorage.removeItem('voiceLanguage');

    // Navigate back to welcome
    navigateToScreen('welcome');
}

function showError(message) {
    navigateToScreen('error');
    document.getElementById('errorMessage').textContent = message;
}

function updateConnectionStatus(text, connected) {
    connectionText.textContent = text;

    if (connected) {
        connectionStatus.className = 'connection-status connected';
    } else {
        connectionStatus.className = 'connection-status disconnected';
    }
}

function generateProfileId() {
    return 'profile-' + Date.now() + '-' + Math.random().toString(36).substring(2, 9);
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

function delay(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
}

// Global variable to store username from conference
let userUsername = null;

// Initialize on page load
document.addEventListener('DOMContentLoaded', () => {
    const existingProfileId = localStorage.getItem('voiceProfileId');
    const existingProfileLang = localStorage.getItem('voiceLanguage');

    if (existingProfileId && existingProfileLang) {
        console.log('Existing profile detected:', existingProfileId, '(', existingProfileLang, ')');
        console.log('User must select language to see if profile matches');
    } else {
        console.log('No existing profile - new user');
    }

    // Retrieve username from pendingJoin (passed from conference)
    const pendingJoinData = localStorage.getItem('pendingJoin');
    if (pendingJoinData) {
        try {
            const pendingJoin = JSON.parse(pendingJoinData);
            userUsername = pendingJoin.username;
            console.log('Username retrieved from pendingJoin:', userUsername);
        } catch (e) {
            console.error('Error parsing pendingJoin:', e);
        }
    }

    // Check if redirected from conference with language parameter
    const urlParams = new URLSearchParams(window.location.search);
    const preselectedLang = urlParams.get('lang');

    if (preselectedLang) {
        console.log('Pre-selected language from conference:', preselectedLang);
        selectedLanguage = preselectedLang;
        console.log('Skipping language selection, going directly to microphone setup');
        // Show mic setup screen immediately (no delay)
        navigateToScreen('micSetup');
    } else {
        // Show welcome screen for normal flow
        navigateToScreen('welcome');
    }

    console.log('Onboarding app loaded');
    updateConnectionStatus('Connecting...', false);
});
