const express = require('express');
const http = require('http');
const socketIo = require('socket.io');
const path = require('path');
require('dotenv').config();

const app = express();
const server = http.createServer(app);
const io = socketIo(server, {
  cors: {
    origin: "*",
    methods: ["GET", "POST"]
  }
});

// Serve static files from public directory
app.use(express.static(path.join(__dirname, 'public')));

// Translation service - using a simple translation API
// For production, you should use Google Cloud Translate API with proper credentials
const { Translate } = require('@google-cloud/translate').v2;

// Simple in-memory translation (fallback if no API key)
// For better results, set up Google Cloud Translate API credentials
let translate;
try {
  translate = new Translate();
} catch (error) {
  console.warn('Google Translate API not configured. Using fallback translation.');
}

// Simple translation function with fallback
async function translateText(text, targetLang = 'ja') {
  if (!text || text.trim() === '') return '';

  try {
    if (translate) {
      const [translation] = await translate.translate(text, targetLang);
      return translation;
    } else {
      // Fallback: return text with indication it's not translated
      return `[Translation needed: ${text}]`;
    }
  } catch (error) {
    console.error('Translation error:', error);
    return `[Translation error: ${text}]`;
  }
}

// Socket.io connection handling
io.on('connection', (socket) => {
  console.log('New client connected:', socket.id);

  // Handle speech recognition results
  socket.on('speech', async (data) => {
    try {
      const { text, language, isFinal } = data;
      console.log(`Received ${isFinal ? 'final' : 'interim'} speech:`, text);

      // Determine translation direction
      let targetLang;
      if (language === 'en-US' || language === 'en') {
        targetLang = 'ja'; // English to Japanese
      } else if (language === 'ja-JP' || language === 'ja') {
        targetLang = 'en'; // Japanese to English
      } else {
        targetLang = 'ja'; // Default to Japanese
      }

      // Translate the text
      const translatedText = await translateText(text, targetLang);

      // Emit translation back to all clients
      io.emit('translation', {
        original: text,
        translated: translatedText,
        sourceLang: language,
        targetLang: targetLang,
        isFinal: isFinal,
        timestamp: new Date().toISOString()
      });
    } catch (error) {
      console.error('Error processing speech:', error);
      socket.emit('error', { message: 'Translation error occurred' });
    }
  });

  // Handle manual text translation
  socket.on('translate', async (data) => {
    try {
      const { text, sourceLang, targetLang } = data;
      const translatedText = await translateText(text, targetLang);

      socket.emit('translation', {
        original: text,
        translated: translatedText,
        sourceLang: sourceLang,
        targetLang: targetLang,
        isFinal: true,
        timestamp: new Date().toISOString()
      });
    } catch (error) {
      console.error('Error translating text:', error);
      socket.emit('error', { message: 'Translation error occurred' });
    }
  });

  socket.on('disconnect', () => {
    console.log('Client disconnected:', socket.id);
  });
});

// Root route
app.get('/', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

// Health check endpoint
app.get('/health', (req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

const PORT = process.env.PORT || 3000;
server.listen(PORT, () => {
  console.log(`Server running on http://localhost:${PORT}`);
  console.log('Real-time translation service is ready!');
});
