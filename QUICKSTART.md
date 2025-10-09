# Quick Start Guide

Get your real-time translation app running in 3 simple steps!

## Step 1: Install Dependencies

```bash
npm install
```

## Step 2: Start the Server

```bash
npm start
```

You should see:
```
Server running on http://localhost:3000
Real-time translation service is ready!
```

## Step 3: Open in Browser

1. Open Chrome or Edge browser
2. Navigate to: `http://localhost:3000`
3. Allow microphone access when prompted
4. Click "Start Speaking" and begin translating!

## First Time Usage

### Test with Speech Recognition

1. Keep the default language as "English (US)"
2. Click "Start Speaking"
3. Say something in English (e.g., "Hello, how are you?")
4. See the Japanese translation appear in real-time

### Test Manual Translation

1. Scroll to "Manual Translation" section
2. Type some text (e.g., "Good morning")
3. Click "Translate"
4. View the translation

### Switch to Japanese Input

1. Change language dropdown to "Japanese"
2. Click "Start Speaking"
3. Speak in Japanese
4. See English translation

## Troubleshooting

### "Microphone access denied"
- Click the lock icon in your browser's address bar
- Allow microphone access
- Refresh the page

### "Speech recognition not supported"
- Use Chrome or Edge browser
- Firefox does not support Web Speech API

### Translations show placeholders
- This is normal without Google Cloud API setup
- For real translations, see README.md for API setup

## Next Steps

- Read the full [README.md](README.md) for detailed instructions
- Configure Google Cloud Translate API for production use
- Customize the UI in `public/css/style.css`

## Common Commands

```bash
# Start server
npm start

# Start with auto-reload (development)
npm run dev

# Install nodemon for development
npm install --save-dev nodemon
```

## Support

Having issues? Check the [README.md](README.md) troubleshooting section.

---

Happy translating! 🎤🌐
