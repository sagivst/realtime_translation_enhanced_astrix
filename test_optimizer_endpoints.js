#!/usr/bin/env node

const http = require('http');

const HOST = 'localhost';
const PORT = 3020;

// Colors for output
const colors = {
  reset: '\x1b[0m',
  green: '\x1b[32m',
  red: '\x1b[31m',
  yellow: '\x1b[33m',
  cyan: '\x1b[36m'
};

// Helper function for HTTP requests
function makeRequest(method, path, data = null) {
  return new Promise((resolve, reject) => {
    const options = {
      hostname: HOST,
      port: PORT,
      path: path,
      method: method,
      headers: {
        'Content-Type': 'application/json'
      }
    };

    const req = http.request(options, (res) => {
      let body = '';
      res.on('data', chunk => body += chunk);
      res.on('end', () => {
        try {
          const response = JSON.parse(body);
          resolve({ status: res.statusCode, data: response });
        } catch (e) {
          resolve({ status: res.statusCode, data: body });
        }
      });
    });

    req.on('error', reject);

    if (data) {
      req.write(JSON.stringify(data));
    }
    req.end();
  });
}

async function testEndpoints() {
  console.log(`${colors.cyan}=== OptimizerAPI Endpoint Tests ===${colors.reset}\n`);

  const tests = [
    {
      name: '1. GET /api/traces/active',
      method: 'GET',
      path: '/api/traces/active',
      expected: (res) => res.data.success === true && Array.isArray(res.data.active)
    },
    {
      name: '2. GET /api/optimizer/snapshot (no trace)',
      method: 'GET',
      path: '/api/optimizer/snapshot?trace_id=non_existent_trace',
      expected: (res) => res.data.success === false && res.data.error.includes('No completed buckets')
    },
    {
      name: '3. GET /api/audio/segment (missing params)',
      method: 'GET',
      path: '/api/audio/segment',
      expected: (res) => res.data.success === false && res.data.error.includes('Missing required parameters')
    },
    {
      name: '4. POST /api/optimizer/knobs/apply (valid)',
      method: 'POST',
      path: '/api/optimizer/knobs/apply',
      data: {
        trace_id: 'test_trace_' + Date.now(),
        station_key: 'St_3_3333',
        apply_at_bucket_ts: new Date(Date.now() + 3600000).toISOString(),
        idempotency_key: generateUUID(),
        source: 'test_script',
        reason: 'Endpoint validation test',
        knobs: {
          voice_enabled: true,
          sample_rate: 16000,
          gain: 1.2
        }
      },
      expected: (res) => res.data.success === true && res.data.accepted === true
    },
    {
      name: '5. POST /api/optimizer/knobs/apply (past date)',
      method: 'POST',
      path: '/api/optimizer/knobs/apply',
      data: {
        trace_id: 'test_trace_past',
        station_key: 'St_3_3333',
        apply_at_bucket_ts: new Date(Date.now() - 3600000).toISOString(),
        idempotency_key: generateUUID(),
        knobs: { gain: 1.0 }
      },
      expected: (res) => res.data.success === false && res.data.error.includes('future')
    },
    {
      name: '6. GET /api/traces/active?max_age=30%20minutes',
      method: 'GET',
      path: '/api/traces/active?max_age=30%20minutes',
      expected: (res) => res.data.success === true && Array.isArray(res.data.active)
    }
  ];

  let passed = 0;
  let failed = 0;

  for (const test of tests) {
    try {
      console.log(`Testing: ${test.name}`);
      const result = await makeRequest(test.method, test.path, test.data);
      
      if (test.expected(result)) {
        console.log(`  ${colors.green}✓ PASSED${colors.reset}`);
        if (result.data.active) {
          console.log(`    Found ${result.data.active.length} active traces`);
        }
        if (result.data.accepted) {
          console.log(`    Knob update accepted for ${result.data.apply_at_bucket_ts}`);
        }
        passed++;
      } else {
        console.log(`  ${colors.red}✗ FAILED${colors.reset}`);
        console.log(`    Response: ${JSON.stringify(result.data, null, 2)}`);
        failed++;
      }
    } catch (error) {
      console.log(`  ${colors.red}✗ ERROR: ${error.message}${colors.reset}`);
      failed++;
    }
    console.log('');
  }

  console.log(`${colors.cyan}=== Test Summary ===${colors.reset}`);
  console.log(`${colors.green}Passed: ${passed}${colors.reset}`);
  console.log(`${colors.red}Failed: ${failed}${colors.reset}`);
  console.log(`Total: ${tests.length}\n`);

  return failed === 0;
}

function generateUUID() {
  return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, function(c) {
    const r = Math.random() * 16 | 0;
    const v = c === 'x' ? r : (r & 0x3 | 0x8);
    return v.toString(16);
  });
}

// Run tests
testEndpoints().then(success => {
  if (success) {
    console.log(`${colors.green}All tests passed! OptimizerAPI is working correctly.${colors.reset}`);
    process.exit(0);
  } else {
    console.log(`${colors.red}Some tests failed. Please review the results above.${colors.reset}`);
    process.exit(1);
  }
}).catch(err => {
  console.error(`${colors.red}Test execution failed: ${err.message}${colors.reset}`);
  process.exit(1);
});
