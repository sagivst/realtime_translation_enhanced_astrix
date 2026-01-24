#!/usr/bin/env node
/**
 * Database Status Check
 * Checks if the monitoring database is accessible
 * Date: 2026-01-11
 */

const { Pool } = require('pg');

console.log("=== DATABASE STATUS CHECK ===\n");
console.log("Checking PostgreSQL monitoring_v2 database...\n");

// Database configuration (from your system)
const pool = new Pool({
  host: '20.170.155.53',  // Azure VM
  port: 5432,
  database: 'monitoring_v2',
  user: 'monitoring_user',
  password: 'monitoring_pass',
  connectionTimeoutMillis: 5000,
  query_timeout: 3000
});

async function checkDatabase() {
  try {
    // Test 1: Basic connection
    console.log("TEST 1: Testing database connection...");
    const client = await pool.connect();
    console.log("✅ Connected to database successfully");

    // Test 2: Simple query
    console.log("\nTEST 2: Testing simple query...");
    const result = await client.query('SELECT NOW() as current_time');
    console.log(`✅ Query successful. Server time: ${result.rows[0].current_time}`);

    // Test 3: Check tables
    console.log("\nTEST 3: Checking monitoring tables...");
    const tablesQuery = `
      SELECT table_name
      FROM information_schema.tables
      WHERE table_schema = 'public'
      ORDER BY table_name
    `;
    const tables = await client.query(tablesQuery);
    console.log(`✅ Found ${tables.rows.length} tables:`);
    tables.rows.forEach(row => console.log(`  - ${row.table_name}`));

    // Test 4: Check recent traces
    console.log("\nTEST 4: Checking recent traces...");
    const tracesQuery = `
      SELECT trace_id, started_at, ended_at
      FROM traces
      ORDER BY started_at DESC
      LIMIT 5
    `;
    const traces = await client.query(tracesQuery);
    console.log(`✅ Found ${traces.rows.length} recent traces`);

    // Test 5: Check database size and connections
    console.log("\nTEST 5: Checking database statistics...");
    const statsQuery = `
      SELECT
        pg_database_size('monitoring_v2')/1024/1024 as db_size_mb,
        (SELECT count(*) FROM pg_stat_activity WHERE datname = 'monitoring_v2') as active_connections
    `;
    const stats = await client.query(statsQuery);
    console.log(`✅ Database size: ${Math.round(stats.rows[0].db_size_mb)} MB`);
    console.log(`✅ Active connections: ${stats.rows[0].active_connections}`);

    // Test 6: Check for blocking queries
    console.log("\nTEST 6: Checking for blocking queries...");
    const blockingQuery = `
      SELECT
        pid,
        usename,
        application_name,
        state,
        query_start,
        LEFT(query, 100) as query_snippet
      FROM pg_stat_activity
      WHERE state != 'idle'
        AND query_start < NOW() - INTERVAL '1 minute'
        AND datname = 'monitoring_v2'
    `;
    const blocking = await client.query(blockingQuery);
    if (blocking.rows.length > 0) {
      console.log(`⚠️  WARNING: Found ${blocking.rows.length} long-running queries:`);
      blocking.rows.forEach(row => {
        console.log(`  PID ${row.pid}: ${row.state} - ${row.query_snippet}...`);
      });
    } else {
      console.log("✅ No long-running queries detected");
    }

    // Release connection
    client.release();

    console.log("\n" + "=".repeat(50));
    console.log("DATABASE STATUS: OPERATIONAL");
    console.log("=".repeat(50));
    console.log("\nAll database checks passed successfully!");

  } catch (error) {
    console.log("\n❌ DATABASE ERROR:", error.message);

    if (error.code === 'ECONNREFUSED') {
      console.log("\nPossible issues:");
      console.log("  1. PostgreSQL service is not running");
      console.log("  2. Firewall blocking port 5432");
      console.log("  3. Wrong host/port configuration");
    } else if (error.code === '28P01') {
      console.log("\nAuthentication failed. Check username/password");
    } else if (error.code === 'ETIMEDOUT') {
      console.log("\nConnection timeout. Database may be overloaded or network issue");
    }

    process.exit(1);
  } finally {
    await pool.end();
  }
}

// Run the check
checkDatabase().catch(console.error);