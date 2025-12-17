/**
 * UniversalCollector - Collects ALL 75 parameters
 *
 * Single collector that tries to measure everything.
 * Filtering happens at StationAgent level.
 */

const BufferMetrics = require('./collectors/BufferMetrics');
const LatencyMetrics = require('./collectors/LatencyMetrics');
const PacketMetrics = require('./collectors/PacketMetrics');
const AudioQualityMetrics = require('./collectors/AudioQualityMetrics');
const PerformanceMetrics = require('./collectors/PerformanceMetrics');
const DSPMetrics = require('./collectors/DSPMetrics');
const CustomMetrics = require('./collectors/CustomMetrics');

class UniversalCollector {
  constructor() {
    this.collectors = {};
    this.initializeAllCollectors();
    console.log(`[UniversalCollector] Initialized with ${Object.keys(this.collectors).length} parameters`);
  }

  initializeAllCollectors() {
    // Buffer Parameters (10)
    this.collectors['buffer.total'] = new BufferMetrics.BufferTotalCollector();
    this.collectors['buffer.input'] = new BufferMetrics.BufferInputCollector();
    this.collectors['buffer.output'] = new BufferMetrics.BufferOutputCollector();
    this.collectors['buffer.jitter'] = new BufferMetrics.BufferJitterCollector();
    this.collectors['buffer.underrun'] = new BufferMetrics.BufferUnderrunCollector();
    this.collectors['buffer.overrun'] = new BufferMetrics.BufferOverrunCollector();
    this.collectors['buffer.playback'] = new BufferMetrics.BufferPlaybackCollector();
    this.collectors['buffer.record'] = new BufferMetrics.BufferRecordCollector();
    this.collectors['buffer.network'] = new BufferMetrics.BufferNetworkCollector();
    this.collectors['buffer.processing'] = new BufferMetrics.BufferProcessingCollector();

    // Latency Parameters (8)
    this.collectors['latency.avg'] = new LatencyMetrics.LatencyAvgCollector();
    this.collectors['latency.min'] = new LatencyMetrics.LatencyMinCollector();
    this.collectors['latency.max'] = new LatencyMetrics.LatencyMaxCollector();
    this.collectors['latency.jitter'] = new LatencyMetrics.LatencyJitterCollector();
    this.collectors['latency.variance'] = new LatencyMetrics.LatencyVarianceCollector();
    this.collectors['latency.percentile95'] = new LatencyMetrics.Latency95thCollector();
    this.collectors['latency.network'] = new LatencyMetrics.LatencyNetworkCollector();
    this.collectors['latency.processing'] = new LatencyMetrics.LatencyProcessingCollector();

    // Packet Parameters (12)
    this.collectors['packet.loss'] = new PacketMetrics.PacketLossCollector();
    this.collectors['packet.received'] = new PacketMetrics.PacketReceivedCollector();
    this.collectors['packet.sent'] = new PacketMetrics.PacketSentCollector();
    this.collectors['packet.dropped'] = new PacketMetrics.PacketDroppedCollector();
    this.collectors['packet.outOfOrder'] = new PacketMetrics.PacketOutOfOrderCollector();
    this.collectors['packet.duplicate'] = new PacketMetrics.PacketDuplicateCollector();
    this.collectors['packet.retransmit'] = new PacketMetrics.PacketRetransmitCollector();
    this.collectors['packet.corruption'] = new PacketMetrics.PacketCorruptionCollector();
    this.collectors['packet.fragmentation'] = new PacketMetrics.PacketFragmentationCollector();
    this.collectors['packet.reassembly'] = new PacketMetrics.PacketReassemblyCollector();
    this.collectors['packet.throughput'] = new PacketMetrics.PacketThroughputCollector();
    this.collectors['packet.bandwidth'] = new PacketMetrics.PacketBandwidthCollector();

    // Audio Quality Parameters (10)
    this.collectors['audioQuality.snr'] = new AudioQualityMetrics.SNRCollector();
    this.collectors['audioQuality.mos'] = new AudioQualityMetrics.MOSCollector();
    this.collectors['audioQuality.pesq'] = new AudioQualityMetrics.PESQCollector();
    this.collectors['audioQuality.polqa'] = new AudioQualityMetrics.POLQACollector();
    this.collectors['audioQuality.thd'] = new AudioQualityMetrics.THDCollector();
    this.collectors['audioQuality.speechLevel'] = new AudioQualityMetrics.SpeechLevelCollector();
    this.collectors['audioQuality.clipping'] = new AudioQualityMetrics.ClippingCollector();
    this.collectors['audioQuality.noise'] = new AudioQualityMetrics.NoiseCollector();
    this.collectors['audioQuality.echo'] = new AudioQualityMetrics.EchoCollector();
    this.collectors['audioQuality.distortion'] = new AudioQualityMetrics.DistortionCollector();

    // Performance Parameters (8)
    this.collectors['performance.cpu'] = new PerformanceMetrics.CPUCollector();
    this.collectors['performance.memory'] = new PerformanceMetrics.MemoryCollector();
    this.collectors['performance.bandwidth'] = new PerformanceMetrics.BandwidthCollector();
    this.collectors['performance.throughput'] = new PerformanceMetrics.ThroughputCollector();
    this.collectors['performance.threads'] = new PerformanceMetrics.ThreadsCollector();
    this.collectors['performance.queue'] = new PerformanceMetrics.QueueCollector();
    this.collectors['performance.cache'] = new PerformanceMetrics.CacheCollector();
    this.collectors['performance.io'] = new PerformanceMetrics.IOWaitCollector();

    // DSP Parameters (20)
    this.collectors['dsp.agc.currentGain'] = new DSPMetrics.AGCCurrentGainCollector();
    this.collectors['dsp.agc.targetLevel'] = new DSPMetrics.AGCTargetLevelCollector();
    this.collectors['dsp.agc.attackTime'] = new DSPMetrics.AGCAttackTimeCollector();
    this.collectors['dsp.agc.releaseTime'] = new DSPMetrics.AGCReleaseTimeCollector();
    this.collectors['dsp.agc.maxGain'] = new DSPMetrics.AGCMaxGainCollector();
    this.collectors['dsp.aec.echoLevel'] = new DSPMetrics.AECEchoLevelCollector();
    this.collectors['dsp.aec.suppression'] = new DSPMetrics.AECSuppressionCollector();
    this.collectors['dsp.aec.tailLength'] = new DSPMetrics.AECTailLengthCollector();
    this.collectors['dsp.aec.convergenceTime'] = new DSPMetrics.AECConvergenceCollector();
    this.collectors['dsp.noiseReduction.noiseLevel'] = new DSPMetrics.NRNoiseLevelCollector();
    this.collectors['dsp.noiseReduction.suppression'] = new DSPMetrics.NRSuppressionCollector();
    this.collectors['dsp.noiseReduction.snrImprovement'] = new DSPMetrics.NRSNRImprovementCollector();
    this.collectors['dsp.compressor.reduction'] = new DSPMetrics.CompressorReductionCollector();
    this.collectors['dsp.compressor.threshold'] = new DSPMetrics.CompressorThresholdCollector();
    this.collectors['dsp.compressor.ratio'] = new DSPMetrics.CompressorRatioCollector();
    this.collectors['dsp.limiter.reduction'] = new DSPMetrics.LimiterReductionCollector();
    this.collectors['dsp.limiter.threshold'] = new DSPMetrics.LimiterThresholdCollector();
    this.collectors['dsp.equalizer.response'] = new DSPMetrics.EqualizerResponseCollector();
    this.collectors['dsp.equalizer.preset'] = new DSPMetrics.EqualizerPresetCollector();
    this.collectors['dsp.gate.attenuation'] = new DSPMetrics.GateAttenuationCollector();

    // Custom Parameters (7)
    this.collectors['custom.state'] = new CustomMetrics.StateCollector();
    this.collectors['custom.successRate'] = new CustomMetrics.SuccessRateCollector();
    this.collectors['custom.warningCount'] = new CustomMetrics.WarningCountCollector();
    this.collectors['custom.criticalCount'] = new CustomMetrics.CriticalCountCollector();
    this.collectors['custom.totalProcessed'] = new CustomMetrics.TotalProcessedCollector();
    this.collectors['custom.processingSpeed'] = new CustomMetrics.ProcessingSpeedCollector();
    this.collectors['custom.lastActivity'] = new CustomMetrics.LastActivityCollector();
  }

  /**
   * Collect ALL 75 parameters
   * Returns all values (null for unavailable)
   */
  async collectAll(context) {
    const metrics = {};
    const alerts = [];

    for (const [key, collector] of Object.entries(this.collectors)) {
      try {
        const value = await collector.collect(context);
        metrics[key] = value;

        // Check thresholds only for non-null values
        if (value !== null && value !== undefined) {
          const validation = collector.validate(value);
          if (validation.level === 'warning' || validation.level === 'critical') {
            alerts.push({
              metric: key,
              level: validation.level,
              value: value,
              threshold: validation.threshold,
              message: validation.message
            });
          }
        }
      } catch (error) {
        metrics[key] = null;
        // Silent error - parameter not available in this context
      }
    }

    return { metrics, alerts };
  }

  /**
   * Get total collector count
   */
  getCollectorCount() {
    return Object.keys(this.collectors).length;
  }
}

module.exports = UniversalCollector;
