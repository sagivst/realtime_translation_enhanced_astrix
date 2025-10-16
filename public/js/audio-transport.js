/**
 * Audio Transport Abstraction Layer
 *
 * Provides unified interface for multiple audio transport methods:
 * - WebRTC: Direct browser microphone (current implementation)
 * - SIP: SIP.js integration with Asterisk PBX
 *
 * Benefits:
 * - Zero UI changes - just add transport selection dropdown
 * - Same MediaRecorder pipeline works with both transports
 * - Easy to add more transports in the future (PSTN, WebSocket, etc.)
 */

class AudioTransport {
    constructor(type = 'webrtc') {
        this.type = type; // 'webrtc' or 'sip'
        this.stream = null;
        this.sipSession = null;
        this.connected = false;

        console.log(`[AudioTransport] Initialized with type: ${type}`);
    }

    /**
     * Connect to audio source
     * @param {Object} config - Transport-specific configuration
     * @returns {Promise<MediaStream>} - Audio stream for MediaRecorder
     */
    async connect(config) {
        console.log(`[AudioTransport] Connecting via ${this.type}...`);

        if (this.type === 'webrtc') {
            return await this.connectWebRTC(config);
        } else if (this.type === 'sip') {
            return await this.connectSIP(config);
        } else {
            throw new Error(`Unknown transport type: ${this.type}`);
        }
    }

    /**
     * WebRTC Transport (current implementation)
     */
    async connectWebRTC(config) {
        console.log('[AudioTransport/WebRTC] Connecting to microphone...');

        try {
            const stream = await navigator.mediaDevices.getUserMedia({
                audio: {
                    echoCancellation: config?.echoCancellation ?? true,
                    noiseSuppression: config?.noiseSuppression ?? true,
                    autoGainControl: config?.autoGainControl ?? true
                }
            });

            this.stream = stream;
            this.connected = true;

            console.log('[AudioTransport/WebRTC] ✓ Connected to microphone');
            return stream;

        } catch (error) {
            console.error('[AudioTransport/WebRTC] ✗ Connection failed:', error);
            throw new Error(`WebRTC connection failed: ${error.message}`);
        }
    }

    /**
     * SIP Transport (new implementation)
     */
    async connectSIP(config) {
        console.log('[AudioTransport/SIP] Connecting to SIP server...');

        // Validate SIP configuration
        if (!config.sipServer) {
            throw new Error('SIP configuration missing: sipServer required');
        }

        try {
            // Import SIP.js (will be loaded from CDN or npm)
            // Check for SimpleUser in global scope or SIP.SimpleUser
            const SimpleUserClass = typeof SimpleUser !== 'undefined' ? SimpleUser :
                                   (typeof SIP !== 'undefined' && SIP.SimpleUser ? SIP.SimpleUser : null);

            if (!SimpleUserClass) {
                console.error('[AudioTransport/SIP] SIP.js library not loaded!');
                console.error('[AudioTransport/SIP] Checked: window.SimpleUser and window.SIP.SimpleUser - both undefined');
                throw new Error('SIP.js library not available. Please include sip.js in your HTML.');
            }

            console.log('[AudioTransport/SIP] ✓ SIP.js library loaded successfully');

            // Create SIP user agent
            const server = config.sipServer; // e.g., 'wss://your-asterisk-server:8089/ws'
            const options = {
                aor: config.sipUsername ? `sip:${config.sipUsername}@${config.sipDomain}` : undefined,
                media: {
                    constraints: {
                        audio: {
                            echoCancellation: true,
                            noiseSuppression: true,
                            autoGainControl: true
                        },
                        video: false
                    },
                    remote: {
                        audio: document.getElementById('audioPlayer') // Use existing audio player
                    }
                },
                userAgentOptions: {
                    authorizationUsername: config.sipUsername,
                    authorizationPassword: config.sipPassword,
                    displayName: config.displayName || 'Translation User',
                    logLevel: 'debug'
                }
            };

            console.log('[AudioTransport/SIP] Creating SimpleUser with server:', server);

            const simpleUser = new SimpleUserClass(server, options);

            // Setup event handlers
            simpleUser.delegate = {
                onCallCreated: () => {
                    console.log('[AudioTransport/SIP] Call created');
                },
                onCallAnswered: () => {
                    console.log('[AudioTransport/SIP] Call answered');
                    this.connected = true;
                },
                onCallHangup: () => {
                    console.log('[AudioTransport/SIP] Call ended');
                    this.connected = false;
                },
                onCallReceived: () => {
                    console.log('[AudioTransport/SIP] Incoming call received');
                },
                onRegistered: () => {
                    console.log('[AudioTransport/SIP] ✓ Registered with SIP server');
                },
                onUnregistered: () => {
                    console.log('[AudioTransport/SIP] Unregistered from SIP server');
                },
                onServerConnect: () => {
                    console.log('[AudioTransport/SIP] ✓ Connected to SIP server');
                },
                onServerDisconnect: (error) => {
                    console.error('[AudioTransport/SIP] ✗ Disconnected from SIP server:', error);
                }
            };

            // Connect to SIP server
            await simpleUser.connect();
            console.log('[AudioTransport/SIP] Connected, registering...');

            // Register with SIP server
            await simpleUser.register();
            console.log('[AudioTransport/SIP] Registered');

            // Make outbound call to translation service
            if (config.sipDestination) {
                console.log(`[AudioTransport/SIP] Calling ${config.sipDestination}...`);
                await simpleUser.call(config.sipDestination);
            }

            // Get local audio stream from SIP session
            // SIP.js provides the stream through the media constraints
            // We'll get it from the session once the call is established
            const pc = simpleUser.session?.sessionDescriptionHandler?.peerConnection;
            if (!pc) {
                throw new Error('No peer connection available');
            }

            // Get local audio stream
            const localStream = await navigator.mediaDevices.getUserMedia({
                audio: {
                    echoCancellation: true,
                    noiseSuppression: true,
                    autoGainControl: true
                }
            });

            this.stream = localStream;
            this.sipSession = simpleUser;

            console.log('[AudioTransport/SIP] ✓ SIP audio stream ready');
            return localStream;

        } catch (error) {
            console.error('[AudioTransport/SIP] ✗ Connection failed:', error);
            throw new Error(`SIP connection failed: ${error.message}`);
        }
    }

    /**
     * Disconnect from audio source
     */
    async disconnect() {
        console.log(`[AudioTransport] Disconnecting ${this.type} transport...`);

        if (this.type === 'webrtc') {
            if (this.stream) {
                this.stream.getTracks().forEach(track => track.stop());
                console.log('[AudioTransport/WebRTC] ✓ Disconnected');
            }
        } else if (this.type === 'sip') {
            if (this.sipSession) {
                await this.sipSession.hangup();
                await this.sipSession.disconnect();
                console.log('[AudioTransport/SIP] ✓ Disconnected');
            }
        }

        this.stream = null;
        this.sipSession = null;
        this.connected = false;
    }

    /**
     * Get connection status
     */
    isConnected() {
        return this.connected;
    }

    /**
     * Get transport type
     */
    getType() {
        return this.type;
    }

    /**
     * Get current stream
     */
    getStream() {
        return this.stream;
    }
}

// Export for use in conference app
if (typeof module !== 'undefined' && module.exports) {
    module.exports = AudioTransport;
}
