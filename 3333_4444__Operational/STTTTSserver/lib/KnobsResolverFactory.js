/**
 * KnobsResolverFactory.js
 * Factory for creating a properly initialized KnobsResolver instance
 * Used by STTTTSserver to provide knobs management to OptimizerAPI
 */

const { KnobsResolver } = require('../Monitoring_Stations/station/generic/KnobsResolver');

class KnobsResolverFactory {
  /**
   * Create a KnobsResolver instance with proper configuration
   * @param {Object} options - Configuration options
   * @param {Object} options.monitoringComponents - Components from monitoring system
   * @param {Object} options.knobsRegistry - Registry of available knobs
   * @returns {KnobsResolver} Properly initialized KnobsResolver instance
   */
  static createKnobsResolver(options = {}) {
    const { monitoringComponents, knobsRegistry } = options;
    
    // Try to get existing resolver from monitoring components
    if (monitoringComponents?.knobsResolver && 
        typeof monitoringComponents.knobsResolver.getEffectiveKnobs === 'function') {
      console.log('[KnobsResolverFactory] Using existing KnobsResolver from monitoring components');
      return monitoringComponents.knobsResolver;
    }
    
    // Create default knobs registry if not provided
    const defaultKnobsRegistry = knobsRegistry || {
      'pcm.input_gain_db': {
        type: 'number',
        min: -20,
        max: 20,
        default: 0,
        description: 'Input gain adjustment in dB'
      },
      'pcm.noise_gate_threshold': {
        type: 'number',
        min: -60,
        max: 0,
        default: -40,
        description: 'Noise gate threshold in dB'
      },
      'pcm.compression_ratio': {
        type: 'number',
        min: 1,
        max: 20,
        default: 1,
        description: 'Audio compression ratio'
      },
      'pcm.echo_cancellation': {
        type: 'boolean',
        default: false,
        description: 'Enable echo cancellation'
      },
      'pipe.buffer_size': {
        type: 'number',
        min: 128,
        max: 8192,
        default: 1024,
        description: 'Audio buffer size in samples'
      }
    };
    
    // Create baseline knobs from registry defaults
    const baselineKnobs = {};
    for (const [key, def] of Object.entries(defaultKnobsRegistry)) {
      baselineKnobs[key] = def.default;
    }
    
    console.log('[KnobsResolverFactory] Creating new KnobsResolver with registry:', 
                Object.keys(defaultKnobsRegistry).join(', '));
    
    // Create new KnobsResolver instance
    const knobsResolver = new KnobsResolver({
      baselineKnobs,
      knobsRegistry: defaultKnobsRegistry
    });
    
    // Add logging wrapper for debugging
    const originalGetEffectiveKnobs = knobsResolver.getEffectiveKnobs.bind(knobsResolver);
    knobsResolver.getEffectiveKnobs = function(ctx) {
      console.log('[KnobsResolver] getEffectiveKnobs called with:', ctx);
      const result = originalGetEffectiveKnobs(ctx);
      console.log('[KnobsResolver] Returning knobs:', result);
      return result;
    };
    
    return knobsResolver;
  }
  
  /**
   * Get or create a singleton KnobsResolver instance
   * @param {Object} options - Configuration options
   * @returns {KnobsResolver} Singleton KnobsResolver instance
   */
  static getSingleton(options = {}) {
    if (!this._singleton) {
      this._singleton = this.createKnobsResolver(options);
      console.log('[KnobsResolverFactory] Created singleton KnobsResolver');
    }
    return this._singleton;
  }
  
  /**
   * Reset the singleton instance (mainly for testing)
   */
  static resetSingleton() {
    this._singleton = null;
    console.log('[KnobsResolverFactory] Singleton reset');
  }
}

module.exports = { KnobsResolverFactory };
