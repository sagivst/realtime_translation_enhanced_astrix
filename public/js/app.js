// Initialize Socket.io connection
const socket = io();

// Speech recognition variables
let recognition;
let isRecording = false;
let currentLanguage = 'en-US';

// DOM elements
const startBtn = document.getElementById('startBtn');
const stopBtn = document.getElementById('stopBtn');
const sourceLanguage = document.getElementById('sourceLanguage');
const statusText = document.getElementById('statusText');
const statusIndicator = document.getElementById('statusIndicator');
const originalText = document.getElementById('originalText');
const translatedText = document.getElementById('translatedText');
const interimText = document.getElementById('interimText');
const interimTranslation = document.getElementById('interimTranslation');
const historyLog = document.getElementById('historyLog');
const clearHistoryBtn = document.getElementById('clearHistoryBtn');
const connectionStatus = document.getElementById('connectionStatus');
const sourceFlag = document.getElementById('sourceFlag');
const targetFlag = document.getElementById('targetFlag');
const manualInput = document.getElementById('manualInput');
const translateBtn = document.getElementById('translateBtn');

// Socket.io event handlers
socket.on('connect', () => {
    console.log('Connected to server');
    updateConnectionStatus('Connected', true);
});

socket.on('disconnect', () => {
    console.log('Disconnected from server');
    updateConnectionStatus('Disconnected', false);
});

socket.on('translation', (data) => {
    console.log('Received translation:', data);
    displayTranslation(data);
});

socket.on('error', (error) => {
    console.error('Server error:', error);
    updateStatus('Error: ' + error.message, 'error');
});

// Initialize Speech Recognition
function initSpeechRecognition() {
    if (!('webkitSpeechRecognition' in window) && !('SpeechRecognition' in window)) {
        alert('Speech recognition is not supported in this browser. Please use Chrome or Edge.');
        return false;
    }

    const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
    recognition = new SpeechRecognition();

    recognition.continuous = true;
    recognition.interimResults = true;
    recognition.lang = currentLanguage;
    recognition.maxAlternatives = 1;

    recognition.onstart = () => {
        console.log('Speech recognition started');
        isRecording = true;
        updateStatus('Listening...', 'listening');
        startBtn.disabled = true;
        stopBtn.disabled = false;
    };

    recognition.onresult = (event) => {
        let interimTranscript = '';
        let finalTranscript = '';

        for (let i = event.resultIndex; i < event.results.length; i++) {
            const transcript = event.results[i][0].transcript;

            if (event.results[i].isFinal) {
                finalTranscript += transcript;
            } else {
                interimTranscript += transcript;
            }
        }

        // Display interim results
        if (interimTranscript) {
            interimText.textContent = interimTranscript;
            interimText.style.display = 'block';
        } else {
            interimText.style.display = 'none';
        }

        // Send final results to server for translation
        if (finalTranscript) {
            console.log('Final transcript:', finalTranscript);

            // Clear placeholder if exists
            const placeholder = originalText.querySelector('.placeholder');
            if (placeholder) {
                originalText.innerHTML = '';
            }

            // Add to display
            const p = document.createElement('p');
            p.textContent = finalTranscript;
            p.className = 'final-text';
            originalText.appendChild(p);

            // Send to server
            socket.emit('speech', {
                text: finalTranscript,
                language: currentLanguage,
                isFinal: true
            });

            // Scroll to bottom
            originalText.scrollTop = originalText.scrollHeight;
            interimText.textContent = '';
            interimText.style.display = 'none';
        }

        // Send interim results too (for real-time preview)
        if (interimTranscript && !finalTranscript) {
            socket.emit('speech', {
                text: interimTranscript,
                language: currentLanguage,
                isFinal: false
            });
        }
    };

    recognition.onerror = (event) => {
        console.error('Speech recognition error:', event.error);
        updateStatus('Error: ' + event.error, 'error');

        if (event.error === 'no-speech') {
            updateStatus('No speech detected. Try again.', 'warning');
        } else if (event.error === 'not-allowed') {
            alert('Microphone access denied. Please allow microphone access and reload the page.');
        }
    };

    recognition.onend = () => {
        console.log('Speech recognition ended');
        isRecording = false;
        updateStatus('Stopped', 'idle');
        startBtn.disabled = false;
        stopBtn.disabled = true;
    };

    return true;
}

// Display translation
function displayTranslation(data) {
    // Clear placeholder if exists
    const placeholder = translatedText.querySelector('.placeholder');
    if (placeholder) {
        translatedText.innerHTML = '';
    }

    if (data.isFinal) {
        // Add to translation display
        const p = document.createElement('p');
        p.textContent = data.translated;
        p.className = 'final-text';
        translatedText.appendChild(p);

        // Add to history
        addToHistory(data);

        // Scroll to bottom
        translatedText.scrollTop = translatedText.scrollHeight;

        // Clear interim
        interimTranslation.textContent = '';
        interimTranslation.style.display = 'none';
    } else {
        // Show interim translation
        interimTranslation.textContent = data.translated;
        interimTranslation.style.display = 'block';
    }
}

// Add to history log
function addToHistory(data) {
    const historyItem = document.createElement('div');
    historyItem.className = 'history-item';

    const timestamp = new Date(data.timestamp).toLocaleTimeString();

    historyItem.innerHTML = `
        <div class="history-timestamp">${timestamp}</div>
        <div class="history-original">
            <strong>${data.sourceLang === 'ja-JP' || data.sourceLang === 'ja' ? '🇯🇵' : '🇺🇸'}:</strong> ${data.original}
        </div>
        <div class="history-translated">
            <strong>${data.targetLang === 'ja' ? '🇯🇵' : '🇺🇸'}:</strong> ${data.translated}
        </div>
    `;

    historyLog.appendChild(historyItem);
    historyLog.scrollTop = historyLog.scrollHeight;
}

// Update status
function updateStatus(text, type = 'idle') {
    statusText.textContent = text;
    statusIndicator.className = 'status-indicator ' + type;
}

// Update connection status
function updateConnectionStatus(text, isConnected) {
    connectionStatus.textContent = text;
    connectionStatus.className = 'connection-status ' + (isConnected ? 'connected' : 'disconnected');
}

// Update language flags
function updateLanguageFlags() {
    if (currentLanguage === 'en-US') {
        sourceFlag.textContent = '🇺🇸';
        targetFlag.textContent = '🇯🇵';
    } else {
        sourceFlag.textContent = '🇯🇵';
        targetFlag.textContent = '🇺🇸';
    }
}

// Event Listeners
startBtn.addEventListener('click', () => {
    if (!recognition) {
        if (!initSpeechRecognition()) {
            return;
        }
    }

    try {
        recognition.lang = currentLanguage;
        recognition.start();
    } catch (error) {
        console.error('Error starting recognition:', error);
        updateStatus('Error starting recognition', 'error');
    }
});

stopBtn.addEventListener('click', () => {
    if (recognition && isRecording) {
        recognition.stop();
    }
});

sourceLanguage.addEventListener('change', (e) => {
    currentLanguage = e.target.value;
    updateLanguageFlags();

    if (recognition && isRecording) {
        recognition.stop();
        setTimeout(() => {
            recognition.lang = currentLanguage;
            recognition.start();
        }, 300);
    }
});

clearHistoryBtn.addEventListener('click', () => {
    historyLog.innerHTML = '';
    originalText.innerHTML = '<p class="placeholder">Speak to see your text here...</p>';
    translatedText.innerHTML = '<p class="placeholder">Translation will appear here...</p>';
    interimText.style.display = 'none';
    interimTranslation.style.display = 'none';
});

// Manual translation
translateBtn.addEventListener('click', () => {
    const text = manualInput.value.trim();
    if (!text) return;

    const targetLang = currentLanguage === 'en-US' ? 'ja' : 'en';

    socket.emit('translate', {
        text: text,
        sourceLang: currentLanguage,
        targetLang: targetLang
    });

    manualInput.value = '';
});

manualInput.addEventListener('keypress', (e) => {
    if (e.key === 'Enter' && !e.shiftKey) {
        e.preventDefault();
        translateBtn.click();
    }
});

// Initialize on page load
document.addEventListener('DOMContentLoaded', () => {
    updateLanguageFlags();
    updateStatus('Ready', 'idle');

    // Initialize speech recognition
    initSpeechRecognition();
});
