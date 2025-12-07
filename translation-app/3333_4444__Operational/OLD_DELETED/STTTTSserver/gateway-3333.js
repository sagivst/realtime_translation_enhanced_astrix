const dgram = require('dgram');
const WebSocket = require('ws');

// Configuration for 3333
const config = {
    asteriskRtpPort: 4020,     // From Asterisk (via ARI)
    asteriskHost: '127.0.0.1',
    udpOutPort: 6120,          // To STTTTSserver
    udpInPort: 6121,           // From STTTTSserver
    serverHost: '127.0.0.1',
    frameSize: 160,            // 5ms at 16kHz
    sampleRate: 16000,
    extension: '3333'
};

console.log(`Gateway 3333 starting...`);
console.log(`Config:`, config);

// Create UDP sockets
const rtpSocket = dgram.createSocket('udp4');
const udpToServer = dgram.createSocket('udp4');

// Handle RTP from Asterisk
rtpSocket.on('message', (msg, rinfo) => {
    // Skip RTP header (12 bytes)
    if (msg.length > 12) {
        const pcmData = msg.slice(12);

        // Send to STTTTSserver
        udpToServer.send(pcmData, config.udpOutPort, config.serverHost, (err) => {
            if (err) console.error('Error sending to STTTTSserver:', err);
        });

        console.log(`[${new Date().toISOString()}] RTP->UDP: ${pcmData.length} bytes`);
    }
});

// Handle audio from STTTTSserver
udpToServer.on('message', (msg, rinfo) => {
    if (rinfo.port === config.udpInPort) {
        // Create RTP packet
        const rtpHeader = Buffer.alloc(12);
        rtpHeader[0] = 0x80;  // Version 2
        rtpHeader[1] = 0x00;  // Payload type 0 (PCMU)

        const rtpPacket = Buffer.concat([rtpHeader, msg]);

        // Send back to Asterisk
        rtpSocket.send(rtpPacket, config.asteriskRtpPort + 1, config.asteriskHost, (err) => {
            if (err) console.error('Error sending to Asterisk:', err);
        });

        console.log(`[${new Date().toISOString()}] UDP->RTP: ${msg.length} bytes`);
    }
});

// Bind sockets
rtpSocket.bind(config.asteriskRtpPort, () => {
    console.log(`RTP socket listening on port ${config.asteriskRtpPort}`);
});

udpToServer.bind(0, () => {
    console.log(`UDP socket bound for STTTTSserver communication`);
});

// Handle errors
rtpSocket.on('error', (err) => {
    console.error('RTP socket error:', err);
});

udpToServer.on('error', (err) => {
    console.error('UDP socket error:', err);
});

console.log('Gateway 3333 ready');