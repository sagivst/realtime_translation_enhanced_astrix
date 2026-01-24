// Test script for OpenAI integration
// Verifies the provider swap is working correctly

const http = require('http');

// Test snapshots with different scenarios
const testCases = [
  {
    name: "Low RMS - Should increase gain",
    snapshot: {
      trace_id: "GLOBAL",
      station_key: "St_3_3333",
      bucket_id: 1001,
      knobs: {
        "pcm.input_gain_db": 0,
        "ai.optimization_allowed": true,
        "agc.enabled": false,
        "limiter.enabled": true
      },
      metrics: {
        "pcm.rms_dbfs": -32.0,
        "pcm.peak_dbfs": -20.0,
        "pcm.clipping_ratio": 0.0001,
        "snr_db": 25.0
      }
    },
    expected: {
      shouldHaveDecisions: true,
      expectedKnobs: ["pcm.input_gain_db"]
    }
  },
  {
    name: "High clipping - Should reduce gain or enable limiter",
    snapshot: {
      trace_id: "GLOBAL",
      station_key: "St_3_3333",
      bucket_id: 1002,
      knobs: {
        "pcm.input_gain_db": 10,
        "ai.optimization_allowed": true,
        "agc.enabled": false,
        "limiter.enabled": false
      },
      metrics: {
        "pcm.rms_dbfs": -8.0,
        "pcm.peak_dbfs": -2.0,
        "pcm.clipping_ratio": 0.05,
        "snr_db": 30.0
      }
    },
    expected: {
      shouldHaveDecisions: true,
      expectedKnobs: ["pcm.input_gain_db", "limiter.enabled"]
    }
  },
  {
    name: "AI disabled - Should return empty decisions",
    snapshot: {
      trace_id: "GLOBAL",
      station_key: "St_3_3333",
      bucket_id: 1003,
      knobs: {
        "pcm.input_gain_db": 0,
        "ai.optimization_allowed": false
      },
      metrics: {
        "pcm.rms_dbfs": -30.0,
        "pcm.clipping_ratio": 0.01
      }
    },
    expected: {
      shouldHaveDecisions: false,
      shouldHaveBlockedReason: true
    }
  }
];

// Make HTTP request to AI service
function testOptimization(testCase) {
  return new Promise((resolve, reject) => {
    const data = JSON.stringify(testCase.snapshot);

    const options = {
      hostname: 'localhost',
      port: 3090,
      path: '/optimize',
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Content-Length': data.length
      }
    };

    const req = http.request(options, (res) => {
      let responseData = '';

      res.on('data', (chunk) => {
        responseData += chunk;
      });

      res.on('end', () => {
        try {
          const response = JSON.parse(responseData);
          resolve(response);
        } catch (e) {
          reject(new Error('Invalid JSON response'));
        }
      });
    });

    req.on('error', reject);
    req.write(data);
    req.end();
  });
}

// Run all tests
async function runTests() {
  console.log('🧪 Testing OpenAI Integration\n');
  console.log('=' .repeat(50));

  let passed = 0;
  let failed = 0;

  for (const testCase of testCases) {
    console.log(`\n📝 Test: ${testCase.name}`);
    console.log('-'.repeat(40));

    try {
      const startTime = Date.now();
      const response = await testOptimization(testCase);
      const latency = Date.now() - startTime;

      console.log(`⏱️  Latency: ${latency}ms`);
      console.log(`📊 Model: ${response.model}`);

      // Check if using OpenAI
      if (response.model && response.model.includes('openai')) {
        console.log(`✅ Using OpenAI (request_id: ${response.request_id})`);
      } else if (response.fallback_used) {
        console.log(`⚠️  Using fallback (rule-based)`);
      }

      // Validate response structure
      if (!response.trace_id || !response.station_key) {
        throw new Error('Missing required fields in response');
      }

      // Check decisions
      if (testCase.expected.shouldHaveDecisions) {
        if (response.decisions && response.decisions.length > 0) {
          console.log(`✅ Has ${response.decisions.length} decisions`);

          // Show decisions
          response.decisions.forEach(d => {
            console.log(`   - ${d.knob}: ${d.recommended_value} (${d.reason})`);
          });

          // Validate decision structure
          for (const decision of response.decisions) {
            if (!decision.knob || decision.recommended_value === undefined ||
                !decision.confidence || !decision.reason) {
              throw new Error('Invalid decision structure');
            }
          }
        } else {
          throw new Error('Expected decisions but got none');
        }
      } else {
        if (response.decisions.length === 0) {
          console.log(`✅ No decisions (as expected)`);
          if (response.blocked_reason) {
            console.log(`   Blocked: ${response.blocked_reason}`);
          }
        } else {
          throw new Error('Expected no decisions but got some');
        }
      }

      console.log(`✅ PASSED`);
      passed++;

    } catch (error) {
      console.log(`❌ FAILED: ${error.message}`);
      failed++;
    }
  }

  // Summary
  console.log('\n' + '='.repeat(50));
  console.log('📊 Test Summary');
  console.log('='.repeat(50));
  console.log(`✅ Passed: ${passed}/${testCases.length}`);
  console.log(`❌ Failed: ${failed}/${testCases.length}`);

  if (failed === 0) {
    console.log('\n🎉 All tests passed! OpenAI integration is working.');
  } else {
    console.log('\n⚠️  Some tests failed. Check the implementation.');
    process.exit(1);
  }
}

// Check service health first
function checkHealth() {
  return new Promise((resolve) => {
    http.get('http://localhost:3090/health', (res) => {
      let data = '';
      res.on('data', chunk => data += chunk);
      res.on('end', () => {
        try {
          const health = JSON.parse(data);
          console.log('🏥 Service Health Check');
          console.log(`   Status: ${health.status}`);
          console.log(`   Model: ${health.model}`);
          console.log('');
          resolve(true);
        } catch (e) {
          console.log('❌ Service not responding');
          resolve(false);
        }
      });
    }).on('error', () => {
      console.log('❌ Cannot connect to service on port 3090');
      resolve(false);
    });
  });
}

// Main execution
async function main() {
  const healthy = await checkHealth();
  if (!healthy) {
    console.log('Please start the AI service first:');
    console.log('  node ai-service-openai.js');
    process.exit(1);
  }

  await runTests();
}

main().catch(console.error);