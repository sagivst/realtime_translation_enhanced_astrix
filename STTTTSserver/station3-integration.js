/**
 * Station-3 Integration Module for STTTTSserver
 * Adds REAL Deepgram metrics collection and dynamic knob loading
 */

const fs = require('fs');
const path = require('path');

class Station3Integration {
    constructor(extensionId) {
        this.extensionId = extensionId;
        this.stationId = 'STATION_3';
        this.configPath = `/tmp/station3-${extensionId}-config.json`;
        this.knobs = this.loadKnobs();
        this.metrics = {};
        this.audioStartTime = Date.now();

        // Watch for config changes
        this.watchConfig();

        console.log(`[STATION-3] Initialized for extension ${extensionId}`);
    }

    /**
     * Load knobs from config file
     */
    loadKnobs() {
        try {
            if (fs.existsSync(this.configPath)) {
                const config = JSON.parse(fs.readFileSync(this.configPath, 'utf8'));
                console.log(`[STATION-3] Loaded knobs for ${this.extensionId}:`, config.deepgram ? 'Found Deepgram settings' : 'No Deepgram settings');
                return config;
            }
        } catch (e) {
            console.log(`[STATION-3] Using defaults for ${this.extensionId}:`, e.message);
        }

        // Return defaults if no config
        return {
            deepgram: {
                model: 'nova-2',
                language: 'en-US',
                punctuate: true,
                interimResults: true,
                endpointing: 300,
                vadTurnoff: 500,
                smartFormat: true,
                diarize: true
            }
        };
    }

    /**
     * Watch config file for changes
     */
    watchConfig() {
        fs.watchFile(this.configPath, { interval: 5000 }, () => {
            console.log(`[STATION-3] Config changed for ${this.extensionId}, reloading...`);
            this.knobs = this.loadKnobs();

            // Emit event for reconnection if needed
            if (this.onKnobsChanged) {
                this.onKnobsChanged(this.knobs);
            }
        });
    }

    /**
     * Get Deepgram configuration from knobs
     */
    getDeepgramConfig() {
        const dg = this.knobs.deepgram || {};
        return {
            model: dg.model || 'nova-2',
            encoding: 'linear16',
            sample_rate: 16000,
            channels: 1,
            language: dg.language || 'en-US',
            punctuate: dg.punctuate !== false,
            interim_results: dg.interimResults !== false,
            endpointing: dg.endpointing || 300,
            vad_turnoff: dg.vadTurnoff || 500,
            smart_format: dg.smartFormat !== false,
            diarize: dg.diarize || false,
            utterances: dg.utterances || true,
            numerals: dg.numerals || true
        };
    }

    /**
     * Record a metric and send to monitoring
     */
    recordMetric(name, value) {
        this.metrics[name] = value;

        // Send to monitoring server
        this.sendToMonitoring({
            station_id: this.stationId,
            extension: this.extensionId,
            metric_name: name,
            metric_value: value,
            timestamp: Date.now()
        });
    }

    /**
     * Send data to monitoring server
     */
    sendToMonitoring(data) {
        const http = require('http');
        const postData = JSON.stringify(data);

        const options = {
            hostname: 'localhost',
            port: 8007,
            path: '/update',
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Content-Length': Buffer.byteLength(postData)
            }
        };

        const req = http.request(options, (res) => {
            // Ignore response
        });

        req.on('error', (e) => {
            // Silently fail - monitoring is not critical
        });

        req.write(postData);
        req.end();
    }

    /**
     * Handle Deepgram transcript event
     */
    onTranscript(data) {
        const transcript = data.channel?.alternatives?.[0]?.transcript || '';
        const confidence = data.channel?.alternatives?.[0]?.confidence || 0;
        const isFinal = data.is_final || false;
        const words = data.channel?.alternatives?.[0]?.words || [];

        // Record REAL metrics
        this.recordMetric('stt_confidence', confidence);
        this.recordMetric('stt_latency', Date.now() - this.audioStartTime);
        this.recordMetric('words_recognized', words.length);
        this.recordMetric('transcript_length', transcript.length);
        this.recordMetric('is_final', isFinal ? 1 : 0);

        // Reset audio start time for next segment
        if (isFinal) {
            this.audioStartTime = Date.now();
        }

        console.log(`[STATION-3] Transcript metrics: confidence=${confidence.toFixed(2)}, words=${words.length}, final=${isFinal}`);
    }

    /**
     * Handle Deepgram metadata event
     */
    onMetadata(data) {
        if (data.model_info) {
            this.recordMetric('model_name', data.model_info.name);
            this.recordMetric('model_version', data.model_info.version);
        }
        if (data.request_id) {
            this.recordMetric('request_id', data.request_id);
        }
    }

    /**
     * Handle Deepgram error event
     */
    onError(error) {
        this.recordMetric('stt_error', 1);
        this.recordMetric('error_type', error.type || 'unknown');
        console.log(`[STATION-3] STT Error recorded:`, error.message);
    }

    /**
     * Handle audio chunk before sending to Deepgram
     */
    onAudioChunk(chunk) {
        // Calculate audio metrics
        const rms = this.calculateRMS(chunk);
        const energy = this.calculateEnergy(chunk);

        this.recordMetric('audio_rms', rms);
        this.recordMetric('audio_energy', energy);
        this.recordMetric('chunk_size', chunk.length);
    }

    /**
     * Calculate RMS of audio chunk
     */
    calculateRMS(buffer) {
        let sum = 0;
        for (let i = 0; i < buffer.length; i += 2) {
            const sample = buffer.readInt16LE(i) / 32768.0;
            sum += sample * sample;
        }
        return Math.sqrt(sum / (buffer.length / 2));
    }

    /**
     * Calculate energy of audio chunk
     */
    calculateEnergy(buffer) {
        let energy = 0;
        for (let i = 0; i < buffer.length; i += 2) {
            const sample = Math.abs(buffer.readInt16LE(i) / 32768.0);
            energy += sample;
        }
        return energy / (buffer.length / 2);
    }

    /**
     * Get current metrics summary
     */
    getMetricsSummary() {
        return {
            station_id: this.stationId,
            extension: this.extensionId,
            metrics: this.metrics,
            knobs: this.knobs
        };
    }
}

module.exports = Station3Integration;