const { exec } = require('child_process');
const { promisify } = require('util');
const execAsync = promisify(exec);

// Test the special processes
async function testProcesses() {
    console.log('Testing process detection...');
    
    // Test cloudflared
    try {
        const { stdout: cf } = await execAsync('pgrep -f cloudflared');
        console.log('cloudflared PIDs:', cf.trim());
    } catch (e) {
        console.log('cloudflared: NOT FOUND');
    }
    
    // Test continuous-full-monitoring
    try {
        const { stdout: cfm } = await execAsync('pgrep -f continuous-full');
        console.log('continuous-full PIDs:', cfm.trim());
    } catch (e) {
        console.log('continuous-full: NOT FOUND');
    }
    
    // Test STTTSserver
    try {
        const { stdout: stt } = await execAsync('pgrep -f STTTTSserver');
        console.log('STTTTSserver PIDs:', stt.trim());
    } catch (e) {
        console.log('STTTTSserver: NOT FOUND');
    }
}

testProcesses();
