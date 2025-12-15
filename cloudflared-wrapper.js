#!/usr/bin/env node

const { spawn } = require('child_process');
const path = require('path');

console.log('Starting Cloudflared tunnel wrapper...');

// Configuration
const CLOUDFLARED_PATH = '/home/azureuser/cloudflared-linux-amd64';
const TARGET_URL = 'http://localhost:8083';
const RETRY_DELAY = 5000; // 5 seconds

let tunnelProcess = null;
let currentTunnelUrl = null;

function startTunnel() {
    console.log('Launching cloudflared tunnel to', TARGET_URL);

    // Kill any existing tunnel process
    if (tunnelProcess) {
        tunnelProcess.kill();
        tunnelProcess = null;
    }

    // Start new tunnel
    tunnelProcess = spawn(CLOUDFLARED_PATH, [
        'tunnel',
        '--url', TARGET_URL,
        '--no-tls-verify'
    ]);

    // Capture stdout to find the tunnel URL
    tunnelProcess.stdout.on('data', (data) => {
        const output = data.toString();

        // Look for the tunnel URL in the output
        const urlMatch = output.match(/https:\/\/[a-z0-9-]+\.trycloudflare\.com/);
        if (urlMatch && !currentTunnelUrl) {
            currentTunnelUrl = urlMatch[0];
            console.log('✓ Cloudflared tunnel established:', currentTunnelUrl);

            // Write URL to file for other services to read
            const fs = require('fs');
            fs.writeFileSync('/tmp/cloudflared-url.txt', currentTunnelUrl);

            // Also log it prominently
            console.log('\n' + '='.repeat(60));
            console.log('TUNNEL URL:', currentTunnelUrl);
            console.log('='.repeat(60) + '\n');
        }

        // Forward all output for debugging
        process.stdout.write(data);
    });

    tunnelProcess.stderr.on('data', (data) => {
        process.stderr.write(data);
    });

    tunnelProcess.on('error', (error) => {
        console.error('Failed to start cloudflared:', error);
        setTimeout(startTunnel, RETRY_DELAY);
    });

    tunnelProcess.on('exit', (code, signal) => {
        console.log(`Cloudflared process exited with code ${code} and signal ${signal}`);
        currentTunnelUrl = null;

        // Auto-restart after delay
        console.log(`Restarting tunnel in ${RETRY_DELAY/1000} seconds...`);
        setTimeout(startTunnel, RETRY_DELAY);
    });
}

// Handle process termination gracefully
process.on('SIGTERM', () => {
    console.log('Received SIGTERM, shutting down gracefully...');
    if (tunnelProcess) {
        tunnelProcess.kill();
    }
    process.exit(0);
});

process.on('SIGINT', () => {
    console.log('Received SIGINT, shutting down gracefully...');
    if (tunnelProcess) {
        tunnelProcess.kill();
    }
    process.exit(0);
});

// Start the tunnel
startTunnel();

// Keep the process alive
setInterval(() => {
    // Health check - could add more logic here
    if (!tunnelProcess) {
        console.log('Tunnel process not running, restarting...');
        startTunnel();
    }
}, 30000); // Check every 30 seconds