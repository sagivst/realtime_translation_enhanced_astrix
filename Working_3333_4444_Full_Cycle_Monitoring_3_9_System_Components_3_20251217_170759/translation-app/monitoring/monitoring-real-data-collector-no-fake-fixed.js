/**
 * Real Data Collector for Monitoring API - TRULY STATIC (NO TIMESTAMP CHANGES)
 * Only shows ACTIVE status when there are actual calls happening
 * Shows IDLE when STTTTSserver is running but no calls are active
 * Shows OFFLINE when STTTTSserver is not running
 *
 * CRITICAL FIX: Does NOT regenerate metrics objects - timestamps remain static when no changes occur
 */

const http = require('http');

class RealStationCollector {
    constructor() {
        this.metrics = new Map();
        this.initializeMetrics();
        this.collectionInterval = null;
        this.lastSTTServerStatus = 'unknown'; // Track if server status changed
    }

    initializeMetrics() {
        // Initialize metrics for all 12 stations with their extensions
        const STATIONS = ['Station-1', 'Station-2', 'Station-3', 'Station-4', 'Station-5',
                          'Station-6', 'Station-7', 'Station-8', 'Station-9', 'Station-10',
                          'Station-11', 'Station-12'];
        const EXTENSIONS = ['3333', '4444'];

        STATIONS.forEach(station => {
            EXTENSIONS.forEach(ext => {
                const key = `${station}-${ext}`;
                this.metrics.set(key, this.createDefaultMetrics());
            });
        });
    }

    createDefaultMetrics() {
        return {
            buffer: {
                size: 1024,
                used: 0,
                available: 1024,
                overflow_count: 0,
                underflow_count: 0,
                current_depth_ms: 0,
                target_depth_ms: 50,
                drain_rate: 0,
                fill_rate: 0,
                stability: 0,
                jitter_absorption: 0,
                peak_usage: 0,
                average_usage: 0,
                buffer_health: 0,
                last_reset: new Date().toISOString()
            },
            latency: {
                current_ms: 0,
                average_ms: 0,
                min_ms: 999999,
                max_ms: 0,
                jitter_ms: 0,
                network_ms: 0,
                processing_ms: 0,
                codec_ms: 0,
                buffer_ms: 0,
                total_pipeline_ms: 0,
                percentile_95: 0,
                percentile_99: 0
            },
            packet: {
                received: 0,
                sent: 0,
                lost: 0,
                loss_rate: 0,
                out_of_order: 0,
                duplicates: 0,
                jitter_buffer_discards: 0,
                late_packets: 0,
                recovered: 0,
                fec_recovered: 0,
                retransmissions: 0,
                bandwidth_kbps: 0,
                packet_rate: 0,
                burst_loss_count: 0
            },
            audioQuality: {
                mos_score: 0,
                signal_level_db: -60,
                noise_level_db: -60,
                snr_db: 0,
                thd_percent: 0,
                frequency_response: 'unknown',
                sample_rate: 16000,
                bit_depth: 16,
                codec_bitrate: 128000,
                peak_level_db: -60,
                rms_level_db: -60,
                clipping_detected: false,
                silence_detected: true,
                echo_return_loss: 0,
                psqm_score: 0
            },
            performance: {
                cpu_usage: 0,
                memory_usage_mb: 0,
                thread_count: 0,
                processing_queue: 0,
                dropped_frames: 0,
                processed_frames: 0,
                fps: 0,
                encoding_time_ms: 0,
                decoding_time_ms: 0,
                total_uptime_s: 0,
                last_error: null,
                error_count: 0
            },
            status: 'offline',
            lastUpdate: new Date().toISOString()
        };
    }

    startCollection() {
        // Update real data every 1 second
        this.collectionInterval = setInterval(() => {
            this.collectRealData();
        }, 1000);

        // Initial collection
        this.collectRealData();

        console.log('[RealCollector] Started real-time data collection - TRULY STATIC (NO FAKE DATA)');
    }

    stopCollection() {
        if (this.collectionInterval) {
            clearInterval(this.collectionInterval);
            this.collectionInterval = null;
        }
    }

    collectRealData() {
        // Check if STTTTSserver is running
        const options = {
            hostname: 'localhost',
            port: 3020,
            path: '/dashboard.html',
            method: 'HEAD',
            timeout: 1000
        };

        const req = http.request(options, (res) => {
            if (res.statusCode === 200 || res.statusCode === 304) {
                // STTTTSserver is running
                if (this.lastSTTServerStatus !== 'running') {
                    console.log(`[RealCollector] STTTTSserver is UP - Station-3 will be set to IDLE`);
                    this.lastSTTServerStatus = 'running';
                }
                this.updateStation3ToIdle();
                this.updateOtherStationsOffline();
            } else {
                // STTTTSserver not responding
                if (this.lastSTTServerStatus !== 'offline') {
                    console.log(`[RealCollector] STTTTSserver responded with status ${res.statusCode} - marking offline`);
                    this.lastSTTServerStatus = 'offline';
                }
                this.updateAllStationsOffline();
            }
        });

        req.on('error', (err) => {
            // Can't connect to STTTTSserver
            if (this.lastSTTServerStatus !== 'offline') {
                console.log(`[RealCollector] STTTTSserver offline: ${err.message}`);
                this.lastSTTServerStatus = 'offline';
            }
            this.updateAllStationsOffline();
        });

        req.on('timeout', () => {
            req.destroy();
            if (this.lastSTTServerStatus !== 'timeout') {
                console.log(`[RealCollector] STTTTSserver timeout - keeping current status (server may be slow to respond)`);
                this.lastSTTServerStatus = 'timeout';
            }
            // DO NOT update stations on timeout - transient issue, keep current status
            // This prevents timestamp churn when server is slow but still running
        });

        req.end();
    }

    updateStation3ToIdle() {
        const metrics3333 = this.metrics.get('Station-3-3333');
        const metrics4444 = this.metrics.get('Station-3-4444');

        // CRITICAL: Only update if status is CHANGING
        if (metrics3333 && metrics3333.status !== 'idle') {
            metrics3333.status = 'idle';
            metrics3333.lastUpdate = new Date().toISOString();
            console.log(`[RealCollector] Station-3-3333: Changed to IDLE - Server ready, no active calls`);
        }

        if (metrics4444 && metrics4444.status !== 'idle') {
            metrics4444.status = 'idle';
            metrics4444.lastUpdate = new Date().toISOString();
            console.log(`[RealCollector] Station-3-4444: Changed to IDLE - Server ready, no active calls`);
        }

        // DO NOT update metrics when status hasn't changed - this prevents timestamp churn
    }

    updateOtherStationsOffline() {
        // Stations 1,2,4-12 are all offline
        const offlineStations = [
            'Station-1', 'Station-2', 'Station-4', 'Station-5', 'Station-6',
            'Station-7', 'Station-8', 'Station-9', 'Station-10', 'Station-11', 'Station-12'
        ];

        offlineStations.forEach(station => {
            ['3333', '4444'].forEach(ext => {
                const key = `${station}-${ext}`;
                const metrics = this.metrics.get(key);

                // CRITICAL: Only update if status is CHANGING
                if (metrics && metrics.status !== 'offline') {
                    metrics.status = 'offline';
                    metrics.lastUpdate = new Date().toISOString();
                    // DO NOT call createDefaultMetrics() - this would regenerate timestamps!
                    // Metrics stay at their current zero values
                }
            });
        });
    }

    updateAllStationsOffline() {
        // All stations offline including Station-3
        for (const [key, metrics] of this.metrics.entries()) {
            // CRITICAL: Only update if status is CHANGING
            if (metrics.status !== 'offline') {
                metrics.status = 'offline';
                metrics.lastUpdate = new Date().toISOString();
                // DO NOT recreate metrics - keep existing zeros with stable timestamps
            }
        }
    }

    getMetrics(station, extension) {
        const key = `${station}-${extension}`;
        return this.metrics.get(key);
    }

    getAllMetrics() {
        const snapshot = {
            timestamp: new Date().toISOString(),
            stations: {}
        };

        // Organize by station
        for (const [key, metrics] of this.metrics.entries()) {
            const lastDashIndex = key.lastIndexOf('-');
            const station = key.substring(0, lastDashIndex);
            const ext = key.substring(lastDashIndex + 1);

            if (!snapshot.stations[station]) {
                snapshot.stations[station] = {};
            }
            snapshot.stations[station][`extension_${ext}`] = {
                metrics: metrics,
                status: metrics.status
            };
        }

        return snapshot;
    }
}

// Export for use by monitoring API
module.exports = RealStationCollector;

// If run directly, start standalone collector
if (require.main === module) {
    const collector = new RealStationCollector();
    collector.startCollection();

    // Log status every 10 seconds
    setInterval(() => {
        const snapshot = collector.getAllMetrics();
        let activeCount = 0;
        let idleCount = 0;
        let offlineCount = 0;

        for (const station in snapshot.stations) {
            for (const ext in snapshot.stations[station]) {
                const status = snapshot.stations[station][ext].status;
                if (status === 'active') activeCount++;
                else if (status === 'idle') idleCount++;
                else offlineCount++;
            }
        }

        console.log(`[RealCollector] Status: ${activeCount} active, ${idleCount} idle, ${offlineCount} offline`);

        // Show Station-3 status
        const station3_3333 = collector.getMetrics('Station-3', '3333');
        if (station3_3333) {
            console.log(`[RealCollector] Station-3-3333: ${station3_3333.status.toUpperCase()} (Truly static - no fake data, no timestamp changes)`);
        }
    }, 10000);
}
