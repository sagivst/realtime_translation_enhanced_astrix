# Changelog

All notable changes to the Real-time Translation App will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [1.1.0] - 2025-10-10

### Added
- HTTPS support with automatic SSL certificate detection
- Self-signed SSL certificates (cert.pem, key.pem) for local testing
- Queue-based audio playback system for better mobile compatibility
- Continuous audio recording with timeslice (eliminates gaps)
- Protocol indicator in server startup message (HTTP/HTTPS)
- Deployment status documentation (DEPLOYMENT-STATUS.md)

### Fixed
- **Mobile loudspeaker not working**: Implemented separate Audio elements for each playback
- **Mobile audio freezing and word cutting**: Replaced stop/start recording with continuous streaming
- **Azure TTS API error**: Changed from deprecated `SpeechSynthesizer.fromConfig()` to `new SpeechSynthesizer()`
- **DeepL language code deprecation**: Updated English from 'EN' to 'en-US'
- **Translation feed display**: Original text now appears first, followed by translation
- **Audio playback on mobile**: Better browser autoplay policy handling

### Changed
- Audio recording interval reduced from 2000ms to 1500ms for lower latency
- Audio transmission now happens immediately when data is available
- Server route fixed: Serve 'index.html' instead of non-existent 'conference.html'

### Improved
- Audio player with explicit volume controls (1.0) and unmuted state
- Better error handling for audio playback failures
- Memory leak prevention with proper URL cleanup after playback
- Audio context management and unlocking for mobile browsers

## [1.0.0] - 2025-10-09

### Added
- Initial release
- Real-time speech-to-text using Deepgram API
- Translation using DeepL API
- Text-to-speech using Azure Cognitive Services
- Multi-language support (10 languages)
- WebSocket-based real-time communication
- Audio visualization
- Pipeline logging and latency monitoring
- Room-based conferences with multiple participants

### Features
- Simultaneous translation for multiple participants
- Each participant can use their preferred language
- Visual feedback for audio recording
- Latency statistics display
- Translation feed with original and translated text
- Responsive web interface

---

## Version History

- **v1.1.0** (2025-10-10) - Mobile fixes and HTTPS support
- **v1.0.0** (2025-10-09) - Initial release

[1.1.0]: https://github.com/yourusername/realtime-translation-app/compare/v1.0.0...v1.1.0
[1.0.0]: https://github.com/yourusername/realtime-translation-app/releases/tag/v1.0.0
