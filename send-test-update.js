const ioClient = require('socket.io-client');
const monitoringClient = ioClient('http://localhost:3001');

monitoringClient.on('connect', () => {
    console.log('Connected, sending test update...');
    
    // Register STATION_3
    monitoringClient.emit('register-station', {
        station_id: 'STATION_3',
        capabilities: {
            name: 'Voice Monitor/Enhancer',
            type: 'voice',
            critical: true
        }
    });
    
    // Send fresh metrics
    setTimeout(() => {
        monitoringClient.emit('metrics', {
            station_id: 'STATION_3',
            call_id: 'test-' + Date.now(),
            channel: '3333',
            metrics: {
                snr_db: 28.5,
                audio_level_dbfs: -16,
                voice_activity_ratio: 0.85,
                cpu_usage_pct: 12,
                memory_usage_mb: 128
            },
            knobs_effective: [
                { name: 'agc.enabled', value: true },
                { name: 'agc.target_level_dbfs', value: -18 },
                { name: 'noise.reduction_strength', value: 0.8 }
            ],
            timestamp: new Date().toISOString()
        });
        
        console.log('Test update sent!');
        setTimeout(() => process.exit(0), 1000);
    }, 500);
});

monitoringClient.on('error', (err) => {
    console.error('Connection error:', err);
    process.exit(1);
});
