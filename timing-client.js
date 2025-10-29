/**
 * Timing Server Client
 * Connects conference-server to bidirectional timing server
 */

const net = require('net');

class TimingClient {
    constructor(host = '127.0.0.1', port = 6000) {
        this.host = host;
        this.port = port;
        this.socket = null;
        this.connected = false;
        this.reconnectInterval = 5000;
        this.pendingMessages = [];
    }

    connect() {
        if (this.socket) {
            return Promise.resolve();
        }

        return new Promise((resolve, reject) => {
            console.log(`[TimingClient] Connecting to ${this.host}:${this.port}...`);
            
            this.socket = net.connect(this.port, this.host);
            
            this.socket.on('connect', () => {
                this.connected = true;
                console.log(`[TimingClient] ✓ Connected to timing server`);
                
                // Send any pending messages
                while (this.pendingMessages.length > 0) {
                    const msg = this.pendingMessages.shift();
                    this.socket.write(msg);
                }
                
                resolve();
            });
            
            this.socket.on('data', (data) => {
                // Handle responses from timing server
                const lines = data.toString().split('\n').filter(l => l.trim());
                lines.forEach(line => {
                    try {
                        const msg = JSON.parse(line);
                        this.handleResponse(msg);
                    } catch (err) {
                        console.error(`[TimingClient] Parse error:`, err.message);
                    }
                });
            });
            
            this.socket.on('error', (err) => {
                console.error(`[TimingClient] Error:`, err.message);
                this.connected = false;
            });
            
            this.socket.on('close', () => {
                console.log(`[TimingClient] Disconnected. Reconnecting in ${this.reconnectInterval}ms...`);
                this.connected = false;
                this.socket = null;
                
                setTimeout(() => this.connect(), this.reconnectInterval);
            });
        });
    }

    handleResponse(msg) {
        switch (msg.type) {
            case 'PAIR_REGISTERED':
                console.log(`[TimingClient] Pair registered: ${msg.ext1} ↔ ${msg.ext2}`);
                break;
            case 'PAIR_REMOVED':
                console.log(`[TimingClient] Pair removed: ${msg.extension}`);
                break;
            default:
                console.log(`[TimingClient] Response:`, msg);
        }
    }

    send(message) {
        const data = JSON.stringify(message) + '\n';
        
        if (this.connected && this.socket) {
            this.socket.write(data);
        } else {
            console.log(`[TimingClient] Queuing message (not connected)`);
            this.pendingMessages.push(data);
        }
    }

    registerExtension(extension, uuid) {
        console.log(`[TimingClient] Registering extension: ${extension} (UUID: ${uuid})`);
        this.send({
            type: 'REGISTER_EXTENSION',
            extension,
            uuid
        });
    }

    registerPair(ext1, ext2, callUuid) {
        console.log(`[TimingClient] Registering pair: ${ext1} ↔ ${ext2}`);
        this.send({
            type: 'REGISTER_PAIR',
            ext1,
            ext2,
            callUuid
        });
    }

    sendAudioPacket(fromExt, audioBuffer, timestamp) {
        this.send({
            type: 'AUDIO_PACKET',
            fromExt,
            audioData: audioBuffer.toString('base64'),
            timestamp
        });
    }

    updateLatency(fromExt, toExt, latencyMs) {
        this.send({
            type: 'LATENCY_UPDATE',
            fromExt,
            toExt,
            latencyMs
        });
    }
    sendAudioPacket(fromExt, pcmBuffer, timestamp) {
        // Convert PCM buffer to base64
        const audioData = pcmBuffer.toString("base64");
        this.send({
            type: "AUDIO_PACKET",
            fromExt,
            audioData,
            timestamp: timestamp || Date.now()
        });
    }

    removePair(extension) {
        this.send({
            type: 'REMOVE_PAIR',
            extension
        });
    }
}

module.exports = TimingClient;
