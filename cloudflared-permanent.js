const { spawn } = require('child_process');
const fs = require('fs');
const path = require('path');

console.log('[Cloudflared] Starting permanent tunnel service...');

// Configuration
const CLOUDFLARED_BIN = '/home/azureuser/cloudflared-linux-amd64';
const TUNNEL_URL_FILE = '/home/azureuser/current-tunnel-url.txt';
const LOG_FILE = '/tmp/cloudflared-permanent.log';

// Function to start cloudflared
function startTunnel() {
    console.log('[Cloudflared] Initiating new tunnel...');

    // Start cloudflared with HTTP (not HTTPS)
    const cloudflared = spawn(CLOUDFLARED_BIN, [
        'tunnel',
        '--url', 'http://localhost:8083',
        '--no-autoupdate'
    ], {
        stdio: ['ignore', 'pipe', 'pipe']
    });

    let tunnelUrl = null;

    // Parse stdout for the tunnel URL
    cloudflared.stdout.on('data', (data) => {
        const output = data.toString();

        // Look for the tunnel URL
        const urlMatch = output.match(/https:\/\/[a-zA-Z0-9-]+\.trycloudflare\.com/);
        if (urlMatch && !tunnelUrl) {
            tunnelUrl = urlMatch[0];
            console.log(`[Cloudflared] ✅ Tunnel established: ${tunnelUrl}`);

            // Save URL to file
            fs.writeFileSync(TUNNEL_URL_FILE, tunnelUrl);

            // Also save to a backup location
            fs.writeFileSync('/tmp/cloudflared-current-url.txt', tunnelUrl);

            console.log(`[Cloudflared] URL saved to ${TUNNEL_URL_FILE}`);
            console.log('[Cloudflared] You can access the monitoring at:');
            console.log(`  → ${tunnelUrl}/api/health`);
            console.log(`  → ${tunnelUrl}/api/snapshots`);
        }

        // Log all output
        fs.appendFileSync(LOG_FILE, `[STDOUT] ${output}`);
    });

    cloudflared.stderr.on('data', (data) => {
        const output = data.toString();
        fs.appendFileSync(LOG_FILE, `[STDERR] ${output}`);

        // Also check stderr for URL (sometimes appears there)
        const urlMatch = output.match(/https:\/\/[a-zA-Z0-9-]+\.trycloudflare\.com/);
        if (urlMatch && !tunnelUrl) {
            tunnelUrl = urlMatch[0];
            console.log(`[Cloudflared] ✅ Tunnel established: ${tunnelUrl}`);
            fs.writeFileSync(TUNNEL_URL_FILE, tunnelUrl);
            fs.writeFileSync('/tmp/cloudflared-current-url.txt', tunnelUrl);
        }
    });

    cloudflared.on('error', (error) => {
        console.error('[Cloudflared] Failed to start:', error);
        process.exit(1);
    });

    cloudflared.on('exit', (code, signal) => {
        console.log(`[Cloudflared] Process exited with code ${code} signal ${signal}`);
        console.log('[Cloudflared] Restarting in 5 seconds...');
        setTimeout(startTunnel, 5000);
    });

    // Health check every minute
    setInterval(() => {
        if (tunnelUrl) {
            console.log(`[Cloudflared] Health check - Tunnel active: ${tunnelUrl}`);
        }
    }, 60000);
}

// Handle process signals
process.on('SIGTERM', () => {
    console.log('[Cloudflared] Received SIGTERM, shutting down...');
    process.exit(0);
});

process.on('SIGINT', () => {
    console.log('[Cloudflared] Received SIGINT, shutting down...');
    process.exit(0);
});

// Start the tunnel
console.log('[Cloudflared] Cloudflared Permanent Tunnel Service');
console.log('[Cloudflared] Routing: http://localhost:8083');
startTunnel();
