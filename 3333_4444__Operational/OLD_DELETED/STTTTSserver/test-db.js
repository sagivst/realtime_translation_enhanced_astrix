const { Pool } = require("pg");

const pool = new Pool({
  host: "localhost",
  port: 5432,
  database: "audio_optimization",
  user: "audio_app",
  password: "SecurePass2025!"
});

async function test() {
  try {
    const client = await pool.connect();
    console.log("✅ Database connection successful!");
    
    // Check tables
    const tables = await client.query(`
      SELECT table_name FROM information_schema.tables 
      WHERE table_schema = "public" 
      ORDER BY table_name
    `);
    console.log("📊 Tables in database:", tables.rows.map(r => r.table_name).join(", "));
    
    // Check parameters count
    const params = await client.query("SELECT COUNT(*) FROM parameters");
    console.log("⚙️  Parameters configured:", params.rows[0].count);
    
    // Check for test call
    const calls = await client.query("SELECT * FROM calls LIMIT 1");
    if (calls.rows.length > 0) {
      console.log("📞 Test call found:", calls.rows[0].external_call_id);
    }
    
    client.release();
    await pool.end();
    console.log("✅ All database tests passed!");
  } catch (error) {
    console.error("❌ Database test failed:", error.message);
    process.exit(1);
  }
}

test();
