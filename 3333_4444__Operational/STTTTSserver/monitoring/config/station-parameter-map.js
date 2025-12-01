/**
 * Station Parameter Map
 * Defines which of the 75 parameters each station uses
 */

module.exports = {
  // STATION 1: Asterisk → Gateway (12 parameters)
  STATION_1: [
    'buffer.input',
    'buffer.jitter',
    'latency.network',
    'latency.jitter',
    'latency.min',
    'latency.max',
    'packet.received',
    'packet.loss',
    'packet.outOfOrder',
    'audioQuality.snr',
    'audioQuality.mos',
    'performance.cpu'
  ],

  // STATION 2: Gateway → STTTTSserver (10 parameters)
  STATION_2: [
    'buffer.output',
    'buffer.processing',
    'latency.processing',
    'audioQuality.mos',
    'audioQuality.speechLevel',
    'audioQuality.clipping',
    'performance.cpu',
    'performance.bandwidth',
    'custom.state',
    'custom.successRate'
  ],

  // STATION 3: STTTTSserver → Deepgram (14 parameters)
  STATION_3: [
    'buffer.processing',
    'latency.processing',
    'audioQuality.snr',
    'audioQuality.speechLevel',
    'audioQuality.clipping',
    'audioQuality.noise',
    'dsp.agc.currentGain',
    'dsp.noiseReduction.noiseLevel',
    'performance.cpu',
    'performance.memory',
    'performance.bandwidth',
    'custom.state',
    'custom.successRate',
    'custom.totalProcessed'
  ],

  // STATION 4: Deepgram Response (8 parameters)
  STATION_4: [
    'latency.processing',
    'performance.cpu',
    'performance.queue',
    'custom.state',
    'custom.successRate',
    'custom.totalProcessed',
    'custom.processingSpeed',
    'custom.lastActivity'
  ],

  // STATION 9: STTTTSserver → Gateway (15 parameters)
  STATION_9: [
    'buffer.output',
    'latency.avg',
    'latency.processing',
    'audioQuality.mos',
    'audioQuality.speechLevel',
    'audioQuality.clipping',
    'audioQuality.distortion',
    'dsp.agc.currentGain',
    'dsp.compressor.reduction',
    'dsp.limiter.reduction',
    'performance.cpu',
    'performance.memory',
    'custom.state',
    'custom.totalProcessed',
    'custom.processingSpeed'
  ],

  // STATION 10: Gateway → Asterisk (10 parameters)
  STATION_10: [
    'buffer.output',
    'packet.sent',
    'packet.dropped',
    'latency.processing',
    'audioQuality.mos',
    'audioQuality.thd',
    'performance.cpu',
    'performance.bandwidth',
    'custom.state',
    'custom.successRate'
  ],

  // STATION 11: STTTTSserver → Hume Branch (10 parameters)
  STATION_11: [
    'buffer.processing',
    'latency.processing',
    'audioQuality.snr',
    'audioQuality.speechLevel',
    'dsp.noiseReduction.noiseLevel',
    'performance.cpu',
    'performance.queue',
    'custom.state',
    'custom.successRate',
    'custom.lastActivity'
  ]
};
