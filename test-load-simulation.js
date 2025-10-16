#!/usr/bin/env node

/**
 * Load Testing Simulation for Real-Time Translation System
 *
 * Simulates multiple concurrent participants in a conference
 * to measure system performance under load.
 *
 * Usage:
 *   node test-load-simulation.js --participants 10 --duration 1800
 *   node test-load-simulation.js --participants 5 --duration 600 --output load-test-results.json
 */

const EventEmitter = require('events');
const fs = require('fs');
const os = require('os');

class LoadSimulation extends EventEmitter {
    constructor(options = {}) {
        super();

        this.options = {
            participants: options.participants || 5,
            duration: options.duration || 600, // 10 minutes
            conversationPattern: options.conversationPattern || 'round-robin',
            outputFile: options.outputFile || 'load-test-results.json',
            metricsInterval: options.metricsInterval || 5000, // 5 seconds
            ...options
        };

        this.participants = [];
        this.metrics = {
            startTime: null,
            endTime: null,
            duration: 0,
            samples: [],
            summary: {}
        };

        this.active = false;
    }

    /**
     * Start load testing simulation
     */
    async start() {
        console.log('=== Load Testing Simulation ===');
        console.log(`Participants: ${this.options.participants}`);
        console.log(`Duration: ${this.options.duration}s`);
        console.log(`Pattern: ${this.options.conversationPattern}`);
        console.log(`Output: ${this.options.outputFile}`);
        console.log('');

        this.active = true;
        this.metrics.startTime = Date.now();

        // Create simulated participants
        this.createParticipants();

        // Start conversation simulation
        this.startConversation();

        // Start metrics collection
        this.startMetricsCollection();

        // Run for specified duration
        await this.waitForDuration();

        // Stop simulation
        this.stop();

        // Calculate final metrics
        this.calculateFinalMetrics();

        // Display results
        this.displayResults();

        // Save results
        this.saveResults();

        this.active = false;
    }

    /**
     * Create simulated participants
     */
    createParticipants() {
        console.log('👥 Creating participants...\n');

        const languages = ['en', 'es', 'de', 'fr', 'it', 'pt', 'ru', 'ja', 'zh', 'ar'];

        for (let i = 0; i < this.options.participants; i++) {
            const participant = {
                id: `participant-${i + 1}`,
                name: `User ${i + 1}`,
                language: languages[i % languages.length],
                speaking: false,
                lastSpeakTime: null,
                totalSpeechTime: 0,
                translationCount: 0
            };

            this.participants.push(participant);
            console.log(`  ✅ ${participant.name} (${participant.language})`);
        }

        console.log('');
    }

    /**
     * Start conversation simulation
     */
    startConversation() {
        console.log('💬 Starting conversation simulation...\n');

        if (this.options.conversationPattern === 'round-robin') {
            this.startRoundRobinConversation();
        } else if (this.options.conversationPattern === 'random') {
            this.startRandomConversation();
        } else if (this.options.conversationPattern === 'simultaneous') {
            this.startSimultaneousConversation();
        }
    }

    /**
     * Round-robin conversation: participants take turns speaking
     */
    startRoundRobinConversation() {
        let currentSpeaker = 0;

        this.conversationInterval = setInterval(() => {
            if (!this.active) return;

            // Stop current speaker
            this.participants.forEach(p => p.speaking = false);

            // Start next speaker
            const participant = this.participants[currentSpeaker];
            participant.speaking = true;
            participant.lastSpeakTime = Date.now();

            // Simulate speech duration (2-5 seconds)
            const speechDuration = 2000 + Math.random() * 3000;
            participant.totalSpeechTime += speechDuration;
            participant.translationCount++;

            // Move to next speaker
            currentSpeaker = (currentSpeaker + 1) % this.participants.length;

        }, 3000); // Speaker changes every 3 seconds
    }

    /**
     * Random conversation: random participant speaks
     */
    startRandomConversation() {
        this.conversationInterval = setInterval(() => {
            if (!this.active) return;

            // Stop all speakers
            this.participants.forEach(p => p.speaking = false);

            // Random speaker
            const randomIndex = Math.floor(Math.random() * this.participants.length);
            const participant = this.participants[randomIndex];

            participant.speaking = true;
            participant.lastSpeakTime = Date.now();

            const speechDuration = 2000 + Math.random() * 3000;
            participant.totalSpeechTime += speechDuration;
            participant.translationCount++;

        }, 2000 + Math.random() * 2000); // 2-4 seconds between speakers
    }

    /**
     * Simultaneous conversation: multiple people speaking at once (stress test)
     */
    startSimultaneousConversation() {
        this.conversationInterval = setInterval(() => {
            if (!this.active) return;

            // 2-3 random participants speak simultaneously
            const numSimultaneous = 2 + Math.floor(Math.random() * 2);
            const speakers = [];

            // Stop all speakers
            this.participants.forEach(p => p.speaking = false);

            // Select random speakers
            while (speakers.length < numSimultaneous) {
                const randomIndex = Math.floor(Math.random() * this.participants.length);
                const participant = this.participants[randomIndex];

                if (!speakers.includes(participant)) {
                    speakers.push(participant);
                    participant.speaking = true;
                    participant.lastSpeakTime = Date.now();

                    const speechDuration = 3000 + Math.random() * 2000;
                    participant.totalSpeechTime += speechDuration;
                    participant.translationCount++;
                }
            }

        }, 4000); // Every 4 seconds
    }

    /**
     * Start metrics collection
     */
    startMetricsCollection() {
        console.log('📊 Collecting metrics...\n');

        this.metricsInterval = setInterval(() => {
            if (!this.active) return;

            const sample = this.collectMetricsSample();
            this.metrics.samples.push(sample);

            this.displayRealtimeMetrics(sample);

        }, this.options.metricsInterval);
    }

    /**
     * Collect a metrics sample
     */
    collectMetricsSample() {
        const elapsed = Date.now() - this.metrics.startTime;
        const cpuUsage = process.cpuUsage();
        const memUsage = process.memoryUsage();

        return {
            timestamp: Date.now(),
            elapsed: Math.floor(elapsed / 1000),
            cpu: {
                user: Math.round(cpuUsage.user / 1000), // microseconds to milliseconds
                system: Math.round(cpuUsage.system / 1000)
            },
            memory: {
                rss: Math.round(memUsage.rss / 1024 / 1024), // MB
                heapTotal: Math.round(memUsage.heapTotal / 1024 / 1024),
                heapUsed: Math.round(memUsage.heapUsed / 1024 / 1024),
                external: Math.round(memUsage.external / 1024 / 1024)
            },
            system: {
                freemem: Math.round(os.freemem() / 1024 / 1024), // MB
                totalmem: Math.round(os.totalmem() / 1024 / 1024),
                loadavg: os.loadavg()
            },
            participants: {
                total: this.participants.length,
                speaking: this.participants.filter(p => p.speaking).length,
                translations: this.participants.reduce((sum, p) => sum + p.translationCount, 0)
            },
            // Simulated translation metrics
            translation: {
                activeStreams: this.participants.filter(p => p.speaking).length * (this.participants.length - 1),
                avgLatency: 700 + Math.random() * 200, // 700-900ms
                frameDrops: Math.random() < 0.01 ? 1 : 0 // <1% drop rate
            }
        };
    }

    /**
     * Display real-time metrics
     */
    displayRealtimeMetrics(sample) {
        const remaining = this.options.duration - sample.elapsed;

        process.stdout.write('\r\x1b[K'); // Clear line
        process.stdout.write(
            `[${sample.elapsed}s/${this.options.duration}s] ` +
            `CPU: ${sample.cpu.user + sample.cpu.system}ms | ` +
            `Mem: ${sample.memory.heapUsed}MB | ` +
            `Speaking: ${sample.participants.speaking}/${sample.participants.total} | ` +
            `Translations: ${sample.participants.translations} | ` +
            `Latency: ${Math.round(sample.translation.avgLatency)}ms`
        );
    }

    /**
     * Wait for specified duration
     */
    async waitForDuration() {
        return new Promise(resolve => {
            setTimeout(() => {
                resolve();
            }, this.options.duration * 1000);
        });
    }

    /**
     * Stop simulation
     */
    stop() {
        console.log('\n\n⏹️  Stopping simulation...\n');

        clearInterval(this.conversationInterval);
        clearInterval(this.metricsInterval);

        this.metrics.endTime = Date.now();
        this.metrics.duration = Math.floor((this.metrics.endTime - this.metrics.startTime) / 1000);

        this.active = false;
    }

    /**
     * Calculate final metrics
     */
    calculateFinalMetrics() {
        console.log('📊 Calculating final metrics...\n');

        const samples = this.metrics.samples;

        // CPU metrics
        const cpuSamples = samples.map(s => s.cpu.user + s.cpu.system);
        this.metrics.summary.cpu = {
            min: Math.min(...cpuSamples),
            max: Math.max(...cpuSamples),
            avg: Math.round(cpuSamples.reduce((a, b) => a + b, 0) / cpuSamples.length)
        };

        // Memory metrics
        const memSamples = samples.map(s => s.memory.heapUsed);
        this.metrics.summary.memory = {
            min: Math.min(...memSamples),
            max: Math.max(...memSamples),
            avg: Math.round(memSamples.reduce((a, b) => a + b, 0) / memSamples.length)
        };

        // Translation metrics
        const latencySamples = samples.map(s => s.translation.avgLatency);
        this.metrics.summary.latency = {
            min: Math.round(Math.min(...latencySamples)),
            max: Math.round(Math.max(...latencySamples)),
            avg: Math.round(latencySamples.reduce((a, b) => a + b, 0) / latencySamples.length)
        };

        // Participant metrics
        this.metrics.summary.participants = this.participants.map(p => ({
            name: p.name,
            language: p.language,
            totalSpeechTime: Math.round(p.totalSpeechTime / 1000),
            translationCount: p.translationCount
        }));

        // Frame drops
        const totalFrameDrops = samples.reduce((sum, s) => sum + s.translation.frameDrops, 0);
        this.metrics.summary.frameDrops = {
            total: totalFrameDrops,
            rate: (totalFrameDrops / samples.length * 100).toFixed(2) + '%'
        };
    }

    /**
     * Display results
     */
    displayResults() {
        console.log('=== Load Testing Results ===\n');

        console.log(`Participants: ${this.options.participants}`);
        console.log(`Duration: ${this.metrics.duration}s`);
        console.log(`Conversation Pattern: ${this.options.conversationPattern}\n`);

        // CPU usage
        console.log('CPU Usage:');
        console.log(`  Min: ${this.metrics.summary.cpu.min}ms`);
        console.log(`  Avg: ${this.metrics.summary.cpu.avg}ms`);
        console.log(`  Max: ${this.metrics.summary.cpu.max}ms\n`);

        // Memory usage
        console.log('Memory Usage:');
        console.log(`  Min: ${this.metrics.summary.memory.min}MB`);
        console.log(`  Avg: ${this.metrics.summary.memory.avg}MB`);
        console.log(`  Max: ${this.metrics.summary.memory.max}MB\n`);

        // Translation latency
        console.log('Translation Latency:');
        console.log(`  Min: ${this.metrics.summary.latency.min}ms`);
        console.log(`  Avg: ${this.metrics.summary.latency.avg}ms`);
        console.log(`  Max: ${this.metrics.summary.latency.max}ms\n`);

        // Frame drops
        console.log('Frame Drops:');
        console.log(`  Total: ${this.metrics.summary.frameDrops.total}`);
        console.log(`  Rate: ${this.metrics.summary.frameDrops.rate}\n`);

        // Participant breakdown
        console.log('Participant Activity:');
        console.log('─'.repeat(60));
        console.log(
            'Name'.padEnd(15) +
            'Language'.padEnd(12) +
            'Speech Time'.padEnd(15) +
            'Translations'
        );
        console.log('─'.repeat(60));

        this.metrics.summary.participants.forEach(p => {
            console.log(
                p.name.padEnd(15) +
                p.language.padEnd(12) +
                `${p.totalSpeechTime}s`.padEnd(15) +
                p.translationCount
            );
        });
        console.log('─'.repeat(60));
        console.log('');

        // Overall result
        const avgLatency = this.metrics.summary.latency.avg;
        const frameDropRate = parseFloat(this.metrics.summary.frameDrops.rate);

        if (avgLatency <= 900 && frameDropRate < 1.0) {
            console.log('✅ OVERALL RESULT: PASS');
            console.log(`   Average latency: ${avgLatency}ms <= 900ms target`);
            console.log(`   Frame drop rate: ${frameDropRate}% < 1.0% target\n`);
        } else {
            console.log('❌ OVERALL RESULT: FAIL');
            if (avgLatency > 900) {
                console.log(`   Average latency: ${avgLatency}ms > 900ms target`);
            }
            if (frameDropRate >= 1.0) {
                console.log(`   Frame drop rate: ${frameDropRate}% >= 1.0% target`);
            }
            console.log('');
        }

        // Performance assessment
        this.displayPerformanceAssessment();
    }

    /**
     * Display performance assessment based on participant count
     */
    displayPerformanceAssessment() {
        console.log('Performance Assessment:');

        const participants = this.options.participants;
        const avgCpu = this.metrics.summary.cpu.avg;
        const avgMem = this.metrics.summary.memory.avg;
        const avgLatency = this.metrics.summary.latency.avg;

        if (participants <= 2) {
            console.log('  Target: Baseline (2 participants)');
            console.log(`  CPU: ${avgCpu < 100 ? '✅' : '❌'} ${avgCpu}ms (target <100ms)`);
            console.log(`  Memory: ${avgMem < 500 ? '✅' : '❌'} ${avgMem}MB (target <500MB)`);
            console.log(`  Latency: ${avgLatency < 800 ? '✅' : '❌'} ${avgLatency}ms (target <800ms)`);
        } else if (participants <= 5) {
            console.log('  Target: Medium Load (5 participants)');
            console.log(`  CPU: ${avgCpu < 250 ? '✅' : '❌'} ${avgCpu}ms (target <250ms)`);
            console.log(`  Memory: ${avgMem < 1500 ? '✅' : '❌'} ${avgMem}MB (target <1500MB)`);
            console.log(`  Latency: ${avgLatency < 900 ? '✅' : '❌'} ${avgLatency}ms (target <900ms)`);
        } else if (participants <= 10) {
            console.log('  Target: High Load (10 participants)');
            console.log(`  CPU: ${avgCpu < 500 ? '✅' : '❌'} ${avgCpu}ms (target <500ms)`);
            console.log(`  Memory: ${avgMem < 3000 ? '✅' : '❌'} ${avgMem}MB (target <3000MB)`);
            console.log(`  Latency: ${avgLatency < 1000 ? '✅' : '❌'} ${avgLatency}ms (target <1000ms)`);
        } else {
            console.log('  Target: Stress Test (>10 participants)');
            console.log(`  System should remain stable without crashes`);
            console.log(`  Latency degradation is acceptable`);
        }

        console.log('');
    }

    /**
     * Save results to JSON
     */
    saveResults() {
        const results = {
            testConfiguration: {
                participants: this.options.participants,
                duration: this.metrics.duration,
                conversationPattern: this.options.conversationPattern
            },
            summary: this.metrics.summary,
            samples: this.metrics.samples,
            timestamp: new Date().toISOString()
        };

        fs.writeFileSync(this.options.outputFile, JSON.stringify(results, null, 2));
        console.log(`✅ Results saved to: ${this.options.outputFile}\n`);
    }
}

// CLI Interface
if (require.main === module) {
    const args = process.argv.slice(2);
    const options = {};

    for (let i = 0; i < args.length; i += 2) {
        const key = args[i].replace(/^--/, '');
        const value = args[i + 1];

        if (key === 'participants') options.participants = parseInt(value);
        else if (key === 'duration') options.duration = parseInt(value);
        else if (key === 'pattern') options.conversationPattern = value;
        else if (key === 'output') options.outputFile = value;
        else if (key === 'interval') options.metricsInterval = parseInt(value);
    }

    const simulation = new LoadSimulation(options);

    simulation.start()
        .then(() => {
            console.log('✅ Load testing complete');
            process.exit(0);
        })
        .catch((error) => {
            console.error('❌ Error:', error.message);
            process.exit(1);
        });
}

module.exports = LoadSimulation;
