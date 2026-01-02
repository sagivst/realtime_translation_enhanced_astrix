// STTTTSserver/Monitoring_Stations/station/generic/KnobsResolver.js
// Resolves effective knobs for a given context
// Manages baseline knobs and runtime overrides

export class KnobsResolver {
  /**
   * @param {object} opts
   * @param {object} opts.baselineKnobs - Initial knobs from config
   * @param {object} opts.knobsRegistry - KnobsRegistry for validation
   */
  constructor({ baselineKnobs = {}, knobsRegistry }) {
    this.baselineKnobs = { ...baselineKnobs };
    this.knobsRegistry = knobsRegistry;

    // Runtime overrides (can be updated live)
    this.overrides = new Map();

    // Per-trace overrides
    this.traceOverrides = new Map();

    // Validate baseline knobs
    this._validateKnobs(this.baselineKnobs);
  }

  /**
   * Get effective knobs for a context
   * Priority: trace overrides > global overrides > baseline
   *
   * @param {object} ctx - Must include trace_id
   * @returns {object} Effective knobs map
   */
  getEffectiveKnobs(ctx) {
    // Start with defaults from registry
    const effective = this._getDefaults();

    // Apply baseline knobs
    Object.assign(effective, this.baselineKnobs);

    // Apply global runtime overrides
    for (const [key, value] of this.overrides.entries()) {
      effective[key] = value;
    }

    // Apply trace-specific overrides
    if (ctx?.trace_id) {
      const traceKnobs = this.traceOverrides.get(ctx.trace_id);
      if (traceKnobs) {
        Object.assign(effective, traceKnobs);
      }
    }

    return effective;
  }

  /**
   * Update a global knob value (affects all traces)
   * @param {string} key - Knob key
   * @param {*} value - New value
   * @param {string} source - Who/what is making the change
   */
  updateGlobalKnob(key, value, source = "manual") {
    const def = this.knobsRegistry[key];
    if (!def) {
      throw new Error(`Unknown knob: ${key}`);
    }

    if (!def.liveApply) {
      console.warn(`Knob ${key} requires restart to apply`);
    }

    this._validateKnobValue(key, value);

    const oldValue = this.overrides.get(key) ?? this.baselineKnobs[key];
    this.overrides.set(key, value);

    // Log the change
    console.log(`[KnobsResolver] Global knob update: ${key} = ${oldValue} -> ${value} (source: ${source})`);

    return {
      key,
      oldValue,
      newValue: value,
      source,
      timestamp: new Date().toISOString()
    };
  }

  /**
   * Update a knob for a specific trace only
   * @param {string} traceId - Trace ID
   * @param {string} key - Knob key
   * @param {*} value - New value
   * @param {string} source - Who/what is making the change
   */
  updateTraceKnob(traceId, key, value, source = "manual") {
    const def = this.knobsRegistry[key];
    if (!def) {
      throw new Error(`Unknown knob: ${key}`);
    }

    this._validateKnobValue(key, value);

    if (!this.traceOverrides.has(traceId)) {
      this.traceOverrides.set(traceId, {});
    }

    const traceKnobs = this.traceOverrides.get(traceId);
    const oldValue = traceKnobs[key] ?? this.overrides.get(key) ?? this.baselineKnobs[key];
    traceKnobs[key] = value;

    console.log(`[KnobsResolver] Trace knob update: ${traceId}/${key} = ${oldValue} -> ${value} (source: ${source})`);

    return {
      traceId,
      key,
      oldValue,
      newValue: value,
      source,
      timestamp: new Date().toISOString()
    };
  }

  /**
   * Clear overrides for a trace (e.g., when call ends)
   * @param {string} traceId
   */
  clearTraceOverrides(traceId) {
    if (this.traceOverrides.has(traceId)) {
      console.log(`[KnobsResolver] Clearing overrides for trace: ${traceId}`);
      this.traceOverrides.delete(traceId);
    }
  }

  /**
   * Reset a knob to its default value
   * @param {string} key
   */
  resetKnob(key) {
    const def = this.knobsRegistry[key];
    if (!def) {
      throw new Error(`Unknown knob: ${key}`);
    }

    this.overrides.delete(key);
    console.log(`[KnobsResolver] Reset knob to default: ${key} = ${def.default}`);
  }

  /**
   * Reset all knobs to defaults
   */
  resetAllKnobs() {
    this.overrides.clear();
    this.traceOverrides.clear();
    console.log(`[KnobsResolver] All knobs reset to defaults`);
  }

  /**
   * Get current state (for debugging/monitoring)
   */
  getState() {
    return {
      baseline: this.baselineKnobs,
      globalOverrides: Object.fromEntries(this.overrides),
      traceOverridesCount: this.traceOverrides.size,
      effectiveDefaults: this._getDefaults()
    };
  }

  // ===========================================================================
  // Private helpers
  // ===========================================================================

  _getDefaults() {
    const defaults = {};
    for (const [key, def] of Object.entries(this.knobsRegistry)) {
      defaults[key] = def.default;
    }
    return defaults;
  }

  _validateKnobs(knobs) {
    for (const [key, value] of Object.entries(knobs)) {
      this._validateKnobValue(key, value);
    }
  }

  _validateKnobValue(key, value) {
    const def = this.knobsRegistry[key];
    if (!def) {
      throw new Error(`Unknown knob: ${key}`);
    }

    if (def.type === "float" || def.type === "int") {
      if (typeof value !== "number" || Number.isNaN(value)) {
        throw new Error(`Invalid value type for ${key}: expected number, got ${typeof value}`);
      }
      if (value < def.min || value > def.max) {
        throw new Error(`Value out of range for ${key}: ${value} (allowed ${def.min}..${def.max})`);
      }
      if (def.type === "int" && !Number.isInteger(value)) {
        throw new Error(`Invalid value for ${key}: expected integer`);
      }
    }

    if (def.type === "bool") {
      if (typeof value !== "boolean") {
        throw new Error(`Invalid value type for ${key}: expected boolean, got ${typeof value}`);
      }
    }

    if (def.type === "enum") {
      if (!def.values?.includes(value)) {
        throw new Error(`Invalid enum value for ${key}: ${value} (allowed: ${def.values.join(", ")})`);
      }
    }

    return true;
  }
}