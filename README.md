# Real-time Translation App - English ⇄ Japanese

A complete simultaneous translation application with real-time English-Japanese translation powered by speech recognition, Node.js, Express, and Socket.io.

## Features

- **Real-time Speech Recognition** - Uses Web Speech API for live voice-to-text conversion
- **Simultaneous Translation** - Instant translation between English and Japanese
- **Bidirectional Support** - Switch between English→Japanese and Japanese→English
- **Live Preview** - See interim results as you speak
- **Translation History** - Review past translations with timestamps
- **Manual Translation** - Type text for translation when needed
- **Responsive Design** - Works on desktop, tablet, and mobile devices
- **Socket.io Integration** - Real-time communication between client and server

## Prerequisites

- **Node.js** (v14 or higher) - [Download here](https://nodejs.org/)
- **npm** (comes with Node.js)
- **Modern Browser** - Chrome, Edge, or Safari (for Web Speech API support)
- **Microphone** - Required for speech recognition

## Installation

1. **Navigate to the project directory:**
   ```bash
   cd realtime-translation-app
   ```

2. **Install dependencies:**
   ```bash
   npm install
   ```

3. **Set up environment variables (Optional - for Google Cloud Translate API):**

   Create a `.env` file in the root directory:
   ```bash
   touch .env
   ```

   Add your Google Cloud credentials (optional):
   ```
   GOOGLE_APPLICATION_CREDENTIALS=/path/to/your/credentials.json
   PORT=3000
   ```

   > **Note:** The app will work without Google Cloud Translate API credentials, but translations will show placeholders. For production use, set up Google Cloud Translate API:
   > 1. Create a project in [Google Cloud Console](https://console.cloud.google.com/)
   > 2. Enable the Cloud Translation API
   > 3. Create a service account and download credentials JSON
   > 4. Set the path in `.env` file

## Running the Application

1. **Start the server:**
   ```bash
   node server.js
   ```

   Or add a script to `package.json` and use:
   ```bash
   npm start
   ```

2. **Access the application:**
   Open your browser and navigate to:
   ```
   http://localhost:3000
   ```

3. **Allow microphone access** when prompted by your browser.

## Usage

### Speech Recognition Mode

1. **Select source language** from the dropdown (English or Japanese)
2. **Click "Start Speaking"** button
3. **Speak clearly** into your microphone
4. **View real-time translation** in the translation panel
5. **Click "Stop"** when finished

### Manual Translation Mode

1. Type your text in the manual input textarea
2. Click "Translate" button
3. View the translation in the translation panel

### Features

- **Switch Languages:** Change the source language anytime using the dropdown
- **View History:** All translations are logged with timestamps
- **Clear History:** Remove all translations using the "Clear" button
- **Connection Status:** Monitor server connection in the footer

## Project Structure

```
realtime-translation-app/
├── server.js                 # Express server with Socket.io
├── package.json             # Project dependencies
├── .env                     # Environment variables (optional)
├── README.md               # This file
└── public/                 # Frontend files
    ├── index.html         # Main HTML page
    ├── css/
    │   └── style.css      # Styling
    └── js/
        └── app.js         # Client-side JavaScript
```

## How It Works

### Client Side (Frontend)

1. **Web Speech API** captures voice input
2. Converts speech to text in real-time
3. Sends text to server via **Socket.io**
4. Receives translated text from server
5. Displays both original and translated text

### Server Side (Backend)

1. **Express** serves static files and handles HTTP requests
2. **Socket.io** manages WebSocket connections
3. Receives speech text from clients
4. Uses **Google Cloud Translate API** for translation
5. Broadcasts translations back to clients

## Supported Languages

- **English (US)** - `en-US`
- **Japanese** - `ja-JP`

## Browser Compatibility

| Browser | Speech Recognition | Socket.io | Translation Display |
|---------|-------------------|-----------|-------------------|
| Chrome | ✅ | ✅ | ✅ |
| Edge | ✅ | ✅ | ✅ |
| Safari | ✅ (limited) | ✅ | ✅ |
| Firefox | ❌ | ✅ | ✅ |

> **Note:** Web Speech API is not supported in Firefox. Use Chrome or Edge for best experience.

## Customization

### Change Port

Edit `server.js` or set in `.env`:
```javascript
const PORT = process.env.PORT || 3000;
```

### Add More Languages

1. Update language options in `public/index.html`
2. Update flag emojis in `public/js/app.js`
3. Update translation logic in `server.js`

### Modify UI Theme

Edit colors and styles in `public/css/style.css`

## Troubleshooting

### Microphone Not Working

- Check browser permissions for microphone access
- Ensure you're using HTTPS or localhost
- Try a different browser (Chrome recommended)

### Translations Not Working

- Check if Google Cloud Translate API is configured
- Verify API credentials in `.env` file
- Check server console for error messages

### Connection Issues

- Ensure server is running on the correct port
- Check firewall settings
- Verify Socket.io connection in browser console

### Speech Recognition Not Starting

- Ensure you're using a supported browser
- Check microphone permissions
- Look for errors in browser console

## API Endpoints

- `GET /` - Main application page
- `GET /health` - Health check endpoint
- WebSocket events:
  - `speech` - Send speech text to server
  - `translate` - Request manual translation
  - `translation` - Receive translation from server

## Development

### Install Development Dependencies

```bash
npm install --save-dev nodemon
```

### Run in Development Mode

Add to `package.json`:
```json
"scripts": {
  "start": "node server.js",
  "dev": "nodemon server.js"
}
```

Run with auto-reload:
```bash
npm run dev
```

## Security Notes

- Keep API credentials secure (never commit `.env` to git)
- Use HTTPS in production
- Implement rate limiting for API calls
- Add authentication for production use

## Future Enhancements

- [ ] Add more language pairs
- [ ] Save translation history to database
- [ ] Export translations to file
- [ ] Add voice output (text-to-speech)
- [ ] Support multiple simultaneous users
- [ ] Add translation confidence scores
- [ ] Implement user authentication
- [ ] Add language auto-detection

## License

ISC

## Contributing

Contributions are welcome! Please feel free to submit a Pull Request.

## Support

For issues and questions, please open an issue on the project repository.

## Credits

Built with:
- [Express.js](https://expressjs.com/)
- [Socket.io](https://socket.io/)
- [Google Cloud Translate API](https://cloud.google.com/translate)
- [Web Speech API](https://developer.mozilla.org/en-US/docs/Web/API/Web_Speech_API)

---

Made with ❤️ for real-time communication
