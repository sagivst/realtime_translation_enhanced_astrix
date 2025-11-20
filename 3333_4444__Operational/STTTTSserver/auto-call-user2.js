/**
 * Auto-call user2 to extension 7001 (AudioSocket)
 * Extension 7001 works exactly like 7000 - routes through AudioSocket for translation
 */

const ariClient = require('ari-client');

async function callUser2ToExtension7001() {
    try {
        console.log('[AutoCall] Connecting to ARI...');
        const ari = await ariClient.connect(
            'http://localhost:8088',
            'translation-app',
            'translation123'
        );
        console.log('[AutoCall] ✓ Connected');

        // Call user2 to extension 7001
        console.log('[AutoCall] Calling user2 to extension 7001...');
        const channel = ari.Channel();
        
        await channel.originate({
            endpoint: 'PJSIP/user2',
            extension: '7001',
            context: 'from-internal',
            priority: 1,
            callerId: 'Translation System <7001>',
            timeout: 30
        });
        
        console.log('[AutoCall] ✓ user2 called to extension 7001');
        console.log('[AutoCall] user2 will now go through AudioSocket (port 5050) for translation');
        console.log('[AutoCall] Press Ctrl+C to stop.');
        
    } catch (error) {
        console.error('[AutoCall] ✗ Error:', error.message);
        process.exit(1);
    }
}

callUser2ToExtension7001();
