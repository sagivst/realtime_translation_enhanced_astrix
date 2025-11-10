/**
 * Simple test: Originate call to SIP endpoint and add to bridge
 */

const ariClient = require('ari-client');

// ARI configuration
const config = {
    url: 'http://localhost:8088',
    username: 'translation-app',
    password: 'translation123',
    applicationName: 'test-bridge-app' // Use different app name to avoid conflicts
};

async function testBridgeCall() {
    try {
        console.log('[Test] Connecting to Asterisk ARI...');
        const ari = await ariClient.connect(config.url, config.username, config.password);
        console.log('[Test] ✓ Connected to ARI');

        // Create a mixing bridge (conference room 2000 - Target Language Bridge)
        console.log('[Test] Creating bridge 2000 (Target Language Bridge)...');
        const bridge = ari.Bridge();
        await bridge.create({ type: 'mixing', name: 'target-language-bridge-2000' });
        console.log('[Test] ✓ Bridge created:', bridge.id);

        // Set up StasisStart event handler
        let channelInStasis = null;
        ari.on('StasisStart', async (event, channel) => {
            console.log('[Test] ✓ Channel entered Stasis:', channel.id);
            channelInStasis = channel;
            
            // Answer the channel
            try {
                await channel.answer();
                console.log('[Test] ✓ Channel answered');
            } catch (e) {
                console.log('[Test] Channel already answered');
            }
            
            // Add to bridge
            try {
                await bridge.addChannel({ channel: channel.id });
                console.log('[Test] ✓ Channel added to bridge');
                console.log('\n[Test] ===== SUCCESS =====');
                console.log('[Test] user3 is now in bridge:', bridge.id);
                console.log('[Test] Bridge will stay active for 20 seconds...');
                
                // Keep active for 20 seconds then cleanup
                setTimeout(async () => {
                    console.log('[Test] Cleaning up...');
                    try {
                        await channel.hangup();
                        await bridge.destroy();
                        console.log('[Test] ✓ Cleanup complete');
                        process.exit(0);
                    } catch (e) {
                        process.exit(0);
                    }
                }, 20000);
            } catch (error) {
                console.error('[Test] ✗ Failed to add to bridge:', error.message);
                process.exit(1);
            }
        });

        // Start the application
        ari.start(config.applicationName);
        console.log('[Test] ✓ Stasis app started:', config.applicationName);

        // Originate call to endpoint user3
        console.log('[Test] Originating call to PJSIP/user3...');
        const channel = ari.Channel();
        
        await channel.originate({
            endpoint: 'PJSIP/user3',
            app: config.applicationName,
            appArgs: 'bridge-test',
            callerId: 'Translation Bridge <2000>',
            timeout: 30
        });
        
        console.log('[Test] ✓ Call originated to user3');
        console.log('[Test] Waiting for StasisStart event...');
        
    } catch (error) {
        console.error('[Test] ✗ Error:', error.message);
        if (error.response) {
            console.error('[Test] Response:', JSON.stringify(error.response, null, 2));
        }
        process.exit(1);
    }
}

testBridgeCall();
