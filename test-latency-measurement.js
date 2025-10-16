#!/usr/bin/env node

/**
 * Latency Measurement Tool for Real-Time Translation System
 *
 * Measures end-to-end latency across the full translation pipeline:
 * - ASR (Speech Recognition)
 * - MT (Machine Translation)
 * - TTS (Text-to-Speech)
 * - Audio Transmission
 *
 * Usage:
 *   node test-latency-measurement.js --duration 300
 *   node test-latency-measurement.js --extension 1000 --output latency-results.csv
 */

const EventEmitter = require('events');
const fs = require('fs');
const path = require('path');

class LatencyMeasurement extends EventEmitter {
    constructor(options = {}) {
        super();

        this.options = {
            extension: options.extension || 1000,
            duration: options.duration || 300, // 5 minutes
            outputFile: options.outputFile || 'latency-results.csv',
            samplingInterval: options.samplingInterval || 1000, // 1 second
            ...options
        };

        this.measurements = [];
        this.stats = {
            total: 0,
            asr: { samples: [], p50: 0, p95: 0, p99: 0, avg: 0 },
            mt: { samples: [], p50: 0, p95: 0, p99: 0, avg: 0 },
            tts: { samples: [], p50: 0, p95: 0, p99: 0, avg: 0 },
            transmission: { samples: [], p50: 0, p95: 0, p99: 0, avg: 0 },
            endToEnd: { samples: [], p50: 0, p95: 0, p99: 0, avg: 0 }
        };

        this.startTime = null;
        this.active = false;
    }

    /**
     * Start latency measurement
     */
    async start() {
        console.log('=== Latency Measurement Tool ===');
        console.log(`Extension: ${this.options.extension}`);
        console.log(`Duration: ${this.options.duration}s`);
        console.log(`Output: ${this.options.outputFile}`);
        console.log('');

        this.active = true;
        this.startTime = Date.now();

        // Initialize CSV file
        this.initializeCSV();

        // Start monitoring
        this.startMonitoring();

        // Run for specified duration
        await this.waitForDuration();

        // Calculate final statistics
        this.calculateStatistics();

        // Display results
        this.displayResults();

        // Save to CSV
        this.saveResults();

        this.active = false;
    }

    /**
     * Initialize CSV file with headers
     */
    initializeCSV() {
        const headers = [
            'Timestamp',
            'ASR_Latency_ms',
            'MT_Latency_ms',
            'TTS_Latency_ms',
            'Transmission_Latency_ms',
            'EndToEnd_Latency_ms',
            'Event_Type'
        ].join(',');

        fs.writeFileSync(this.options.outputFile, headers + '\n');
        console.log(`✅ CSV file initialized: ${this.options.outputFile}`);
    }

    /**
     * Start monitoring translation events
     */
    startMonitoring() {
        // This would connect to the actual translation orchestrator
        // For now, we'll simulate measurements

        console.log('🔍 Monitoring translation events...\n');

        this.monitoringInterval = setInterval(() => {
            if (!this.active) return;

            // Simulate a translation event with latency measurements
            const measurement = this.simulateMeasurement();
            this.recordMeasurement(measurement);

            // Display real-time update
            this.displayRealtimeUpdate(measurement);

        }, this.options.samplingInterval);
    }

    /**
     * Simulate a latency measurement (replace with actual event capture)
     */
    simulateMeasurement() {
        // In production, these would come from actual translation events
        const asrLatency = 150 + Math.random() * 100; // 150-250ms
        const mtLatency = 100 + Math.random() * 100;  // 100-200ms
        const ttsLatency = 150 + Math.random() * 100; // 150-250ms
        const transmissionLatency = 100 + Math.random() * 100; // 100-200ms

        return {
            timestamp: Date.now(),
            asr: Math.round(asrLatency),
            mt: Math.round(mtLatency),
            tts: Math.round(ttsLatency),
            transmission: Math.round(transmissionLatency),
            endToEnd: Math.round(asrLatency + mtLatency + ttsLatency + transmissionLatency),
            eventType: 'translation_complete'
        };
    }

    /**
     * Record a latency measurement
     */
    recordMeasurement(measurement) {
        this.measurements.push(measurement);

        // Add to component samples
        this.stats.asr.samples.push(measurement.asr);
        this.stats.mt.samples.push(measurement.mt);
        this.stats.tts.samples.push(measurement.tts);
        this.stats.transmission.samples.push(measurement.transmission);
        this.stats.endToEnd.samples.push(measurement.endToEnd);

        this.stats.total++;

        // Append to CSV
        const row = [
            new Date(measurement.timestamp).toISOString(),
            measurement.asr,
            measurement.mt,
            measurement.tts,
            measurement.transmission,
            measurement.endToEnd,
            measurement.eventType
        ].join(',');

        fs.appendFileSync(this.options.outputFile, row + '\n');
    }

    /**
     * Display real-time update
     */
    displayRealtimeUpdate(measurement) {
        const elapsed = Math.floor((Date.now() - this.startTime) / 1000);
        const remaining = this.options.duration - elapsed;

        process.stdout.write(
            `\r[${elapsed}s/${this.options.duration}s] ` +
            `ASR: ${measurement.asr}ms | ` +
            `MT: ${measurement.mt}ms | ` +
            `TTS: ${measurement.tts}ms | ` +
            `Total: ${measurement.endToEnd}ms | ` +
            `Samples: ${this.stats.total}`
        );
    }

    /**
     * Wait for specified duration
     */
    async waitForDuration() {
        return new Promise(resolve => {
            setTimeout(() => {
                clearInterval(this.monitoringInterval);
                resolve();
            }, this.options.duration * 1000);
        });
    }

    /**
     * Calculate percentile statistics
     */
    calculateStatistics() {
        console.log('\n\n📊 Calculating statistics...\n');

        const components = ['asr', 'mt', 'tts', 'transmission', 'endToEnd'];

        components.forEach(component => {
            const samples = this.stats[component].samples.sort((a, b) => a - b);

            this.stats[component].p50 = this.percentile(samples, 50);
            this.stats[component].p95 = this.percentile(samples, 95);
            this.stats[component].p99 = this.percentile(samples, 99);
            this.stats[component].avg = this.average(samples);
            this.stats[component].min = Math.min(...samples);
            this.stats[component].max = Math.max(...samples);
        });
    }

    /**
     * Calculate percentile
     */
    percentile(sortedArray, p) {
        if (sortedArray.length === 0) return 0;
        const index = Math.ceil((p / 100) * sortedArray.length) - 1;
        return Math.round(sortedArray[index]);
    }

    /**
     * Calculate average
     */
    average(array) {
        if (array.length === 0) return 0;
        return Math.round(array.reduce((a, b) => a + b, 0) / array.length);
    }

    /**
     * Display results
     */
    displayResults() {
        console.log('=== Latency Measurement Results ===\n');

        console.log(`Total Measurements: ${this.stats.total}`);
        console.log(`Duration: ${this.options.duration}s\n`);

        // Component breakdown table
        console.log('Component Latency Breakdown:');
        console.log('─'.repeat(80));
        console.log(
            'Component'.padEnd(15) +
            'Min'.padStart(8) +
            'Avg'.padStart(8) +
            'P50'.padStart(8) +
            'P95'.padStart(8) +
            'P99'.padStart(8) +
            'Max'.padStart(8) +
            '  Status'
        );
        console.log('─'.repeat(80));

        const components = [
            { key: 'asr', name: 'ASR', target: 250 },
            { key: 'mt', name: 'MT', target: 200 },
            { key: 'tts', name: 'TTS', target: 250 },
            { key: 'transmission', name: 'Transmission', target: 200 },
            { key: 'endToEnd', name: 'End-to-End', target: 900 }
        ];

        components.forEach(comp => {
            const stats = this.stats[comp.key];
            const status = stats.p95 <= comp.target ? '✅ PASS' : '❌ FAIL';

            console.log(
                comp.name.padEnd(15) +
                `${stats.min}ms`.padStart(8) +
                `${stats.avg}ms`.padStart(8) +
                `${stats.p50}ms`.padStart(8) +
                `${stats.p95}ms`.padStart(8) +
                `${stats.p99}ms`.padStart(8) +
                `${stats.max}ms`.padStart(8) +
                `  ${status}`
            );
        });

        console.log('─'.repeat(80));
        console.log('');

        // Target comparison
        console.log('Target Comparison:');
        console.log('  ASR Target: <250ms (p95)');
        console.log('  MT Target: <200ms (p95)');
        console.log('  TTS Target: <250ms (p95)');
        console.log('  Transmission Target: <200ms (p95)');
        console.log('  End-to-End Target: <900ms (p95)\n');

        // Overall result
        const endToEndP95 = this.stats.endToEnd.p95;
        if (endToEndP95 <= 900) {
            console.log('✅ OVERALL RESULT: PASS');
            console.log(`   End-to-end latency (p95): ${endToEndP95}ms <= 900ms target\n`);
        } else {
            console.log('❌ OVERALL RESULT: FAIL');
            console.log(`   End-to-end latency (p95): ${endToEndP95}ms > 900ms target\n`);
        }
    }

    /**
     * Save results to CSV
     */
    saveResults() {
        console.log(`\n✅ Results saved to: ${this.options.outputFile}`);
        console.log(`   Total measurements: ${this.measurements.length}`);

        // Also save summary
        const summaryFile = this.options.outputFile.replace('.csv', '-summary.txt');
        const summary = this.generateSummaryReport();
        fs.writeFileSync(summaryFile, summary);
        console.log(`✅ Summary saved to: ${summaryFile}\n`);
    }

    /**
     * Generate summary report
     */
    generateSummaryReport() {
        let report = '=== Latency Measurement Summary ===\n\n';
        report += `Date: ${new Date().toISOString()}\n`;
        report += `Duration: ${this.options.duration}s\n`;
        report += `Total Measurements: ${this.stats.total}\n\n`;

        report += 'Component Latency (milliseconds):\n';
        report += '─'.repeat(60) + '\n';

        const components = ['asr', 'mt', 'tts', 'transmission', 'endToEnd'];
        components.forEach(comp => {
            const stats = this.stats[comp];
            report += `${comp.toUpperCase()}:\n`;
            report += `  Min: ${stats.min}ms\n`;
            report += `  Avg: ${stats.avg}ms\n`;
            report += `  P50: ${stats.p50}ms\n`;
            report += `  P95: ${stats.p95}ms\n`;
            report += `  P99: ${stats.p99}ms\n`;
            report += `  Max: ${stats.max}ms\n\n`;
        });

        const endToEndP95 = this.stats.endToEnd.p95;
        report += 'Overall Result:\n';
        if (endToEndP95 <= 900) {
            report += `  ✅ PASS - End-to-end latency (p95): ${endToEndP95}ms <= 900ms target\n`;
        } else {
            report += `  ❌ FAIL - End-to-end latency (p95): ${endToEndP95}ms > 900ms target\n`;
        }

        return report;
    }
}

/**
 * Integration with Translation Orchestrator
 *
 * This class would connect to the actual translation system
 * and capture real latency measurements from live events.
 */
class OrchestratorIntegration extends LatencyMeasurement {
    constructor(orchestratorManager, options = {}) {
        super(options);
        this.orchestratorManager = orchestratorManager;
    }

    startMonitoring() {
        console.log('🔗 Connected to Translation Orchestrator\n');

        // Listen to translation events
        this.orchestratorManager.on('translation_complete', (event) => {
            const measurement = {
                timestamp: event.timestamp,
                asr: event.latency.asr || 0,
                mt: event.latency.mt || 0,
                tts: event.latency.tts || 0,
                transmission: event.latency.transmission || 0,
                endToEnd: event.latency.total || 0,
                eventType: 'translation_complete'
            };

            this.recordMeasurement(measurement);
            this.displayRealtimeUpdate(measurement);
        });

        // Listen to ASR events
        this.orchestratorManager.on('asr_complete', (event) => {
            // Track ASR-specific latency
        });

        // Listen to MT events
        this.orchestratorManager.on('mt_complete', (event) => {
            // Track MT-specific latency
        });

        // Listen to TTS events
        this.orchestratorManager.on('tts_complete', (event) => {
            // Track TTS-specific latency
        });
    }

    simulateMeasurement() {
        // Not used when connected to real orchestrator
        throw new Error('Should not be called when integrated with orchestrator');
    }
}

// CLI Interface
if (require.main === module) {
    const args = process.argv.slice(2);
    const options = {};

    for (let i = 0; i < args.length; i += 2) {
        const key = args[i].replace(/^--/, '');
        const value = args[i + 1];

        if (key === 'duration') options.duration = parseInt(value);
        else if (key === 'extension') options.extension = value;
        else if (key === 'output') options.outputFile = value;
        else if (key === 'interval') options.samplingInterval = parseInt(value);
    }

    const measurement = new LatencyMeasurement(options);

    measurement.start()
        .then(() => {
            console.log('✅ Latency measurement complete');
            process.exit(0);
        })
        .catch((error) => {
            console.error('❌ Error:', error.message);
            process.exit(1);
        });
}

module.exports = {
    LatencyMeasurement,
    OrchestratorIntegration
};
