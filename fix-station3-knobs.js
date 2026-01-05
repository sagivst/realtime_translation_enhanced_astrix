const { Pool } = require("pg");

// Database connection
const dbPool = new Pool({
  host: "localhost",
  database: "audio_optimization",
  user: "sagivstavinsky",
  password: "",
  port: 5432
});

// Mapping from matrix_X_knob to proper names for Station 3
const station3Mapping = {
  'matrix_1_knob': 'audioQuality.speechLevel',
  'matrix_2_knob': 'audioQuality.speechLevel.peak',
  'matrix_3_knob': 'audioQuality.snr',
  'matrix_4_knob': 'audioQuality.clipping',
  'matrix_5_knob': 'custom.successRate',
  'matrix_6_knob': 'audioQuality.noise',
  'matrix_7_knob': 'performance.cpu',
  'matrix_8_knob': 'performance.memory',
  'matrix_9_knob': 'dsp.agc.currentGain',
  'matrix_10_knob': 'dsp.noiseReduction.noiseLevel',
  'matrix_11_knob': 'latency.processing',
  'matrix_12_knob': 'performance.bandwidth',
  'matrix_13_knob': 'custom.totalProcessed',
  'matrix_14_knob': 'custom.successRate.processing',
  'matrix_15_knob': 'custom.processingSpeed',
  'matrix_16_knob': 'performance.queue',
  'matrix_17_knob': 'buffer.processing',
  'matrix_18_knob': 'latency.jitter'
};

async function updateStation3Records() {
  try {
    console.log("Starting Station 3 knob names fix...\n");

    // First, check how many Station 3 records exist
    const countResult = await dbPool.query(
      "SELECT COUNT(*) FROM station_snapshots WHERE station_id LIKE '%STATION_3%'"
    );
    console.log(`Found ${countResult.rows[0].count} Station 3 records to update\n`);

    // Get all Station 3 records
    const result = await dbPool.query(
      "SELECT id, station_id, knobs FROM station_snapshots WHERE station_id LIKE '%STATION_3%'"
    );

    let updated = 0;
    for (const row of result.rows) {
      const oldKnobs = row.knobs || {};
      const newKnobs = {};

      // Transform matrix_X_knob to proper names for first 18 matrices
      Object.entries(oldKnobs).forEach(([key, value]) => {
        if (station3Mapping[key]) {
          // Use proper name for matrices 1-18
          newKnobs[station3Mapping[key]] = value;
        } else if (key.match(/^matrix_(\d+)_knob$/)) {
          // Remove matrices 19-75 for Station 3
          const matrixNum = parseInt(key.match(/matrix_(\d+)_knob/)[1]);
          if (matrixNum > 18) {
            // Skip matrices above 18 for Station 3
            return;
          }
        } else {
          // Keep other knobs as is (main_volume, balance, etc.)
          newKnobs[key] = value;
        }
      });

      // Update the record
      await dbPool.query(
        "UPDATE station_snapshots SET knobs = $1 WHERE id = $2",
        [JSON.stringify(newKnobs), row.id]
      );

      updated++;
      if (updated % 100 === 0) {
        console.log(`Updated ${updated} records...`);
      }
    }

    console.log(`\n✅ Successfully updated ${updated} Station 3 records!`);
    console.log("Station 3 now uses proper parameter names instead of matrix_X_knob\n");

    // Show a sample of the updated data
    const sampleResult = await dbPool.query(
      "SELECT station_id, knobs FROM station_snapshots WHERE station_id LIKE '%STATION_3%' ORDER BY timestamp DESC LIMIT 1"
    );

    if (sampleResult.rows[0]) {
      console.log("Sample of updated Station 3 knobs:");
      const knobs = sampleResult.rows[0].knobs;
      console.log("  First 5 keys:", Object.keys(knobs).slice(0, 5).join(", "));
      console.log("  Total knob count:", Object.keys(knobs).length);
    }

  } catch (error) {
    console.error("Error updating Station 3 records:", error.message);
  } finally {
    await dbPool.end();
  }
}

// Run the update
updateStation3Records();