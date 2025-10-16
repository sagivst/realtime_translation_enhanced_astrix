/**
 * Test Frame Pipeline - Phase 1 Demonstration
 *
 * Tests the Frame Collector and Pacing Governor integration:
 * - Creates named pipe connections
 * - Reads 20ms frames from Asterisk
 * - Processes frames (simple echo for now)
 * - Outputs frames at precise 20ms intervals
 *
 * Usage:
 *   node test-frame-pipeline.js <channel_id>
 *
 * Example:
 *   node test-frame-pipeline.js ch_test123
 */

const { FrameCollector } = require('./frame-collector');
const { PacingGovernor } = require('./pacing-governor');

// Get channel ID from command line
const channelId = process.argv[2] || `ch_test_${Date.now()}`;

console.log('==============================================');
console.log('  Frame Pipeline Test - Phase 1');
console.log('==============================================');
console.log();
console.log(`Channel ID: ${channelId}`);
console.log(`Pipe Base:  /tmp/asterisk_media/`);
console.log();
console.log('Waiting for Asterisk to create named pipes...');
console.log('(Dial an extension that uses ExternalMedia channel)');
console.log();

// Statistics interval
let statsInterval;

// Create frame collector
const collector = new FrameCollector(channelId);

// Setup event handlers
collector.on('connected', () => {
    console.log('✓ Frame Collector connected!');
    console.log();

    // Create pacing governor
    const governor = new PacingGovernor(collector);

    // Handle incoming frames
    collector.on('frame', (frame) => {
        // For Phase 1 testing: Simple echo
        // Just push the same frame back for output
        // In Phase 2, this will be replaced with translated audio
        governor.addFrame(frame.data);
    });

    // Monitor output
    governor.on('frameOutput', (info) => {
        if (info.tick % 50 === 0) { // Every 1 second (50 frames)
            const stats = governor.getStats();
            console.log(`[${info.tick}] Queue: ${info.queueDepth}, ` +
                       `Placeholder: ${stats.placeholderRatio}, ` +
                       `Translated: ${stats.translatedRatio}`);
        }
    });

    // Start governor
    governor.start();
    console.log('✓ Pacing Governor started!');
    console.log();
    console.log('Pipeline Status:');
    console.log('  ┌─────────────┐   20ms   ┌──────────────┐   echo   ┌─────────────┐');
    console.log('  │  Asterisk   │─────────▶│    Frame     │─────────▶│   Pacing    │');
    console.log('  │             │          │  Collector   │          │  Governor   │');
    console.log('  │             │◀─────────│              │◀─────────│             │');
    console.log('  └─────────────┘   20ms   └──────────────┘          └─────────────┘');
    console.log();
    console.log('Press Ctrl+C to stop');
    console.log();

    // Print statistics every 5 seconds
    statsInterval = setInterval(() => {
        console.log();
        console.log('=== Statistics ===');
        console.log('Frame Collector:', collector.getStats());
        console.log();
        console.log('Pacing Governor:', governor.getStats());
        console.log('==================');
        console.log();
    }, 5000);

    // Cleanup on exit
    process.on('SIGINT', () => {
        console.log();
        console.log('Shutting down...');

        clearInterval(statsInterval);
        governor.stop();
        collector.disconnect();

        console.log('✓ Pipeline stopped');
        console.log();

        // Final statistics
        console.log('=== Final Statistics ===');
        console.log('Frame Collector:', collector.getStats());
        console.log();
        console.log('Pacing Governor:', governor.getStats());
        console.log('========================');

        process.exit(0);
    });
});

collector.on('error', (error) => {
    console.error('✗ Collector error:', error);
    process.exit(1);
});

collector.on('disconnected', () => {
    console.log('✓ Frame Collector disconnected');
    clearInterval(statsInterval);
});

// Start connection (waits for pipes)
collector.connect().catch(err => {
    console.error('✗ Failed to connect:', err.message);
    console.log();
    console.log('Troubleshooting:');
    console.log('  1. Ensure Asterisk is running: sudo systemctl status asterisk');
    console.log('  2. Check module is loaded: sudo asterisk -rx "module show like externalmedia"');
    console.log('  3. Dial an extension that uses ExternalMedia (e.g., extension 2000)');
    console.log('  4. Check pipes directory: ls -l /tmp/asterisk_media/');
    console.log();
    process.exit(1);
});
