const ioClient = require('socket.io-client');
const monitoringClient = ioClient('http://localhost:3001');

monitoringClient.on('connect', () => {
    console.log('Connected, sending NEW test data...');
    
    // Register and send metrics
    monitoringClient.emit('register-station', {
        station_id: 'STATION_3',
        capabilities: { name: 'Voice Monitor', type: 'voice', critical: true }
    });
    
    setTimeout(() => {
        const testData = {
            station_id: 'STATION_3',
            call_id: 'REALTIME-' + Date.now(),
            channel: '3333',
            metrics: {
                snr_db: 32.5,
                audio_level_dbfs: -14,
                voice_activity_ratio: 0.92,
                cpu_usage_pct: 15,
                memory_usage_mb: 256,
                jitter_ms: 8,
                packet_loss_pct: 0.1
            },
            knobs_effective: [
                { name: 'agc.enabled', value: true },
                { name: 'agc.target_level_dbfs', value: -16 },
                { name: 'noise.reduction_strength', value: 0.9 },
                { name: 'echo.cancellation', value: true }
            ],
            timestamp: new Date().toISOString()
        };
        
        monitoringClient.emit('metrics', testData);
        console.log('Sent REALTIME test data:', testData.call_id);
        
        setTimeout(() => process.exit(0), 1000);
    }, 500);
});

monitoringClient.on('error', (err) => {
    console.error('Error:', err);
    process.exit(1);
});
