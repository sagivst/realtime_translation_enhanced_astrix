/**
 * Example Usage of the Audio Streaming System
 *
 * This file demonstrates various ways to use the audio streaming system
 */

const IntegratedAudioServer = require('./integrated-audio-server');

// ============================================================================
// Example 1: Basic Usage with Default Configuration
// ============================================================================

async function basicExample() {
    console.log('=== Example 1: Basic Usage ===\n');

    const server = new IntegratedAudioServer();

    try {
        await server.start();
        console.log('✓ Server started with default configuration\n');

        // Keep running for 60 seconds
        console.log('Server will run for 60 seconds...\n');
        await new Promise(resolve => setTimeout(resolve, 60000));

        await server.stop();
        console.log('✓ Server stopped\n');
    } catch (error) {
        console.error('Error:', error);
    }
}

// ============================================================================
// Example 2: Custom Configuration
// ============================================================================

async function customConfigExample() {
    console.log('=== Example 2: Custom Configuration ===\n');

    const server = new IntegratedAudioServer({
        httpPort: 3031,
        rtpPorts: [3333, 4444, 5555], // Monitor 3 streams
        corsOrigin: 'http://localhost:3021',
        enableMonitoring: true,
        monitoringInterval: 2000, // Update every 2 seconds
        verboseLogging: true
    });

    try {
        await server.start();
        console.log('✓ Server started with custom configuration\n');

        // Run indefinitely (until Ctrl+C)
        console.log('Press Ctrl+C to stop\n');
        process.on('SIGINT', async () => {
            console.log('\nStopping server...');
            await server.stop();
            process.exit(0);
        });
    } catch (error) {
        console.error('Error:', error);
    }
}

// ============================================================================
// Example 3: Programmatic Control and Monitoring
// ============================================================================

async function monitoringExample() {
    console.log('=== Example 3: Programmatic Monitoring ===\n');

    const server = new IntegratedAudioServer({
        httpPort: 3030,
        rtpPorts: [3333, 4444],
        enableMonitoring: true,
        monitoringInterval: 1000
    });

    try {
        await server.start();

        // Access Socket.IO instance for custom events
        const io = server.getSocketIO();

        // Listen for client connections
        io.on('connection', (socket) => {
            console.log(`New client connected: ${socket.id}`);

            socket.on('disconnect', () => {
                console.log(`Client disconnected: ${socket.id}`);
            });
        });

        // Periodically print statistics
        setInterval(() => {
            const stats = server.getSystemStats();

            console.log('\n--- System Statistics ---');
            console.log(`Uptime: ${stats.uptimeFormatted}`);
            console.log(`Total Packets: ${stats.totalPackets}`);
            console.log(`Total Bytes: ${stats.totalBytesFormatted}`);
            console.log(`Active Streams: ${stats.activeStreams}`);
            console.log(`Active Clients: ${stats.activeClients}`);
            console.log(`Throughput: ${stats.throughput.bytesPerSecondFormatted}`);
            console.log(`Errors: ${stats.errors}`);

            // Stream-specific stats
            Object.entries(stats.streams).forEach(([port, streamStats]) => {
                console.log(`\nStream ${port}:`);
                console.log(`  Packets Received: ${streamStats.packetsReceived}`);
                console.log(`  Packets Lost: ${streamStats.packetsLost}`);
                console.log(`  Clients: ${streamStats.clients}`);
                if (streamStats.analysis) {
                    console.log(`  Audio Level: ${streamStats.analysis.level?.toFixed(1) || 'N/A'} dB`);
                }
            });
        }, 5000);

        // Keep running
        await new Promise(() => {});
    } catch (error) {
        console.error('Error:', error);
    }
}

// ============================================================================
// Example 4: Integration with Express App
// ============================================================================

async function expressIntegrationExample() {
    console.log('=== Example 4: Express Integration ===\n');

    const server = new IntegratedAudioServer({
        httpPort: 3030,
        rtpPorts: [3333, 4444]
    });

    try {
        await server.start();

        // Add custom routes to the Express app
        server.addRoute('get', '/custom/status', (req, res) => {
            const stats = server.getSystemStats();
            res.json({
                status: 'ok',
                uptime: stats.uptime,
                streams: stats.activeStreams,
                clients: stats.activeClients
            });
        });

        server.addRoute('post', '/custom/broadcast', (req, res) => {
            const { message } = req.body;
            const io = server.getSocketIO();
            io.emit('custom-message', { message, timestamp: Date.now() });
            res.json({ success: true });
        });

        console.log('✓ Custom routes added');
        console.log('  GET  /custom/status');
        console.log('  POST /custom/broadcast\n');

        // Keep running
        await new Promise(() => {});
    } catch (error) {
        console.error('Error:', error);
    }
}

// ============================================================================
// Example 5: Event-Driven Architecture
// ============================================================================

async function eventDrivenExample() {
    console.log('=== Example 5: Event-Driven Architecture ===\n');

    const server = new IntegratedAudioServer({
        httpPort: 3030,
        rtpPorts: [3333, 4444]
    });

    // Listen to transport events
    server.transportManager = null; // Will be set after start

    try {
        await server.start();

        // Access transport manager
        const manager = server.transportManager;

        // Monitor streaming events
        manager.on('streaming-started', ({ socket, streamId }) => {
            console.log(`🎵 Stream ${streamId} started for client ${socket.id}`);
        });

        manager.on('streaming-stopped', ({ socket, streamId }) => {
            console.log(`⏹️  Stream ${streamId} stopped for client ${socket.id}`);
        });

        manager.on('quality-changed', ({ socket, streamId, quality, metrics }) => {
            console.log(`📊 Stream ${streamId} quality: ${quality}`);
            if (quality === 'poor' || quality === 'degraded') {
                console.warn(`⚠️  Poor connection quality on stream ${streamId}!`);
                // Could send alert, adjust buffer, etc.
            }
        });

        manager.on('buffer-overflow', ({ socket, streamId, bufferSize, dropped }) => {
            console.warn(`🔴 Buffer overflow on stream ${streamId}!`);
            console.warn(`   Buffer: ${bufferSize}, Dropped: ${dropped}`);
            // Could implement adaptive buffer sizing here
        });

        console.log('✓ Event listeners attached\n');

        // Keep running
        await new Promise(() => {});
    } catch (error) {
        console.error('Error:', error);
    }
}

// ============================================================================
// Example 6: Testing with Simulated RTP Data
// ============================================================================

async function simulatedDataExample() {
    console.log('=== Example 6: Simulated RTP Data ===\n');

    const dgram = require('dgram');
    const server = new IntegratedAudioServer({
        httpPort: 3030,
        rtpPorts: [3333]
    });

    try {
        await server.start();
        console.log('✓ Server started\n');

        // Simulate sending RTP packets
        const socket = dgram.createSocket('udp4');
        let sequenceNumber = 0;
        let timestamp = 0;

        console.log('Sending simulated RTP packets...\n');

        const interval = setInterval(() => {
            // Create RTP header
            const header = Buffer.alloc(12);
            header[0] = 0x80; // Version 2
            header[1] = 96;   // Payload type
            header.writeUInt16BE(sequenceNumber++, 2);
            header.writeUInt32BE(timestamp, 4);
            header.writeUInt32BE(0x12345678, 8); // SSRC

            // Create dummy payload (sine wave)
            const payloadSize = 960; // 20ms at 48kHz
            const payload = Buffer.alloc(payloadSize * 2);

            for (let i = 0; i < payloadSize; i++) {
                const sample = Math.sin(2 * Math.PI * 440 * timestamp / 48000) * 32767;
                payload.writeInt16LE(sample, i * 2);
            }

            const packet = Buffer.concat([header, payload]);

            // Send RTP packet
            socket.send(packet, 3333, 'localhost', (err) => {
                if (err) console.error('Send error:', err);
            });

            timestamp += payloadSize;

            // Print progress
            if (sequenceNumber % 50 === 0) {
                console.log(`Sent ${sequenceNumber} packets`);
            }
        }, 20); // 50 packets/second = 20ms interval

        // Run for 10 seconds then stop
        setTimeout(() => {
            clearInterval(interval);
            socket.close();
            console.log('\n✓ Finished sending test data\n');

            // Keep server running
            console.log('Server still running. Press Ctrl+C to stop.\n');
        }, 10000);

        // Keep running
        await new Promise(() => {});
    } catch (error) {
        console.error('Error:', error);
    }
}

// ============================================================================
// Run Examples
// ============================================================================

// Uncomment the example you want to run:

// basicExample();
// customConfigExample();
// monitoringExample();
// expressIntegrationExample();
// eventDrivenExample();
// simulatedDataExample();

// Or run from command line:
const args = process.argv.slice(2);
const example = args[0] || 'basic';

console.log(`Running example: ${example}\n`);

switch (example) {
    case 'basic':
        basicExample();
        break;
    case 'custom':
        customConfigExample();
        break;
    case 'monitoring':
        monitoringExample();
        break;
    case 'express':
        expressIntegrationExample();
        break;
    case 'events':
        eventDrivenExample();
        break;
    case 'simulated':
        simulatedDataExample();
        break;
    default:
        console.error(`Unknown example: ${example}`);
        console.log('Available examples: basic, custom, monitoring, express, events, simulated');
        process.exit(1);
}
