/**
 * monitoring-wrapper.js
 * MONITORING-ONLY wrapper for SafeLoader
 * This file works ONLY in monitoring context
 * NEVER modifies STTTTSserver core
 */

console.log('[MonitoringWrapper] Starting MONITORING-ONLY wrapper v1.0');
console.log('[MonitoringWrapper] Working directory: monitoring/');
console.log('[MonitoringWrapper] This wrapper DOES NOT modify STTTTSserver');

// Initialize monitoring-only SafeLoader
global.MonitoringSafeLoader = null;
global.MonitoringActive = false;

try {
    // Check if StationKnobSafeLoader exists
    const safeLoaderPath = '../StationKnobSafeLoader.js';
    const fs = require('fs');

    if (fs.existsSync(__dirname + '/' + safeLoaderPath)) {
        console.log('[MonitoringWrapper] Found SafeLoader, loading in READ-ONLY mode...');

        // Load SafeLoader in monitoring context only
        const SafeLoaderModule = require(safeLoaderPath);

        // Create monitoring-only instance
        global.MonitoringSafeLoader = {
            module: SafeLoaderModule,
            mode: 'READ_ONLY',
            captureEnabled: false,
            writeBackEnabled: false,

            // Read-only capture function
            captureKnobValue: function(knobName, value) {
                console.log(`[MonitoringCapture] ${knobName} = ${value} (READ-ONLY)`);
                // Only log, never write
                return value;
            },

            // Safe status check
            getStatus: function() {
                return {
                    mode: 'READ_ONLY',
                    active: global.MonitoringActive,
                    capturedKnobs: 0,
                    writeBackEnabled: false
                };
            }
        };

        global.MonitoringActive = true;
        console.log('[MonitoringWrapper] SafeLoader loaded in READ-ONLY monitoring mode');

    } else {
        console.log('[MonitoringWrapper] SafeLoader not found, continuing without it');
        console.log('[MonitoringWrapper] Path checked:', __dirname + '/' + safeLoaderPath);
    }

} catch (error) {
    console.error('[MonitoringWrapper] Error loading SafeLoader:', error.message);
    console.log('[MonitoringWrapper] Continuing without SafeLoader functionality');
}

// Load the main STTTTSserver WITHOUT modification
console.log('[MonitoringWrapper] Loading STTTTSserver (no modifications)...');
try {
    require('../STTTTSserver');
    console.log('[MonitoringWrapper] STTTTSserver loaded successfully');
} catch (error) {
    console.error('[MonitoringWrapper] Failed to load STTTTSserver:', error.message);
    console.error('[MonitoringWrapper] Stack:', error.stack);
    process.exit(1);
}

// Add monitoring status endpoint (non-invasive)
if (global.MonitoringActive) {
    setInterval(() => {
        const status = global.MonitoringSafeLoader.getStatus();
        console.log('[MonitoringWrapper] Status:', JSON.stringify(status));
    }, 60000); // Log status every minute
}

console.log('[MonitoringWrapper] Wrapper initialization complete');
console.log('[MonitoringWrapper] System running in MONITORING-ONLY mode');