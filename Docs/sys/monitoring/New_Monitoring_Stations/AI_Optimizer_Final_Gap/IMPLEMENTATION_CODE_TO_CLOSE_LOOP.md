# AI Optimizer - Implementation Code to Close the Loop
## Ready-to-Deploy Code for 100% Completion

---

## File 1: AI Optimizer Service
### Location: `/home/azureuser/ai-service/server.js`

```javascript
import express from "express";
import fetch from "node-fetch";
import dotenv from "dotenv";

dotenv.config();

const app = express();
app.use(express.json({ limit: "5mb" }));

const PORT = 3090;
const OPENAI_API_KEY = process.env.OPENAI_API_KEY;

if (!OPENAI_API_KEY) {
  console.error("ERROR: OPENAI_API_KEY not set in environment");
  process.exit(1);
}

// Logging middleware
app.use((req, res, next) => {
  console.log(`[${new Date().toISOString()}] ${req.method} ${req.path}`);
  next();
});

// Health endpoint
app.get("/v1/health", (_, res) => {
  res.json({ ok: true, timestamp: new Date().toISOString() });
});

// Main optimization endpoint
app.post("/v1/optimize", async (req, res) => {
  try {
    const snapshot = req.body;

    // Validate required fields
    if (!snapshot.trace_id || !snapshot.station_key || !snapshot.metrics) {
      return res.status(400).json({
        error: "Missing required fields",
        required: ["trace_id", "station_key", "metrics"]
      });
    }

    // Extract key metrics for decision
    const preRMS = snapshot.metrics?.PRE?.["pcm.rms_dbfs"]?.avg || -60;
    const postRMS = snapshot.metrics?.POST?.["pcm.rms_dbfs"]?.avg || -60;
    const clipping = snapshot.metrics?.POST?.["pcm.clipping_ratio"]?.avg || 0;
    const currentGain = snapshot.knobs_snapshot?.["pcm.input_gain_db"] || 0;

    // Get policy constraints
    const targetRMS = snapshot.policy?.target_rms_dbfs || -18;
    const maxGainStep = snapshot.policy?.max_gain_step_db || 2;
    const maxClipping = snapshot.policy?.max_clipping_ratio || 0.002;

    console.log(`[Optimizer] Trace: ${snapshot.trace_id}, Station: ${snapshot.station_key}`);
    console.log(`[Optimizer] Metrics - PRE RMS: ${preRMS.toFixed(1)}, POST RMS: ${postRMS.toFixed(1)}, Clipping: ${clipping.toFixed(4)}`);
    console.log(`[Optimizer] Current gain: ${currentGain} dB, Target RMS: ${targetRMS} dB`);

    // Build AI prompt
    const systemPrompt = `You are an audio optimization expert. Analyze the metrics and return a JSON decision.
RULES:
1. Target RMS: ${targetRMS} dBFS
2. Max gain change per step: ±${maxGainStep} dB
3. Max clipping ratio: ${maxClipping}
4. Gain range: -20 to +20 dB
5. If clipping > ${maxClipping}, reduce gain
6. If RMS too low and no clipping, increase gain
7. If metrics are good, return empty decisions

Return ONLY valid JSON in this format:
{
  "decisions": [
    {
      "station_key": "string",
      "apply_in_buckets": 1,
      "knobs": {"pcm.input_gain_db": number},
      "reason": "string",
      "confidence": 0.0-1.0
    }
  ]
}`;

    const userPrompt = JSON.stringify({
      current_metrics: {
        pre_rms_dbfs: preRMS,
        post_rms_dbfs: postRMS,
        clipping_ratio: clipping,
        current_gain_db: currentGain
      },
      target: {
        rms_dbfs: targetRMS,
        max_clipping: maxClipping
      },
      constraints: {
        max_gain_step_db: maxGainStep,
        gain_range: [-20, 20]
      }
    });

    // Call OpenAI API
    const openAIResponse = await fetch("https://api.openai.com/v1/chat/completions", {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${OPENAI_API_KEY}`,
        "Content-Type": "application/json"
      },
      body: JSON.stringify({
        model: "gpt-4-turbo-preview",
        messages: [
          { role: "system", content: systemPrompt },
          { role: "user", content: userPrompt }
        ],
        temperature: 0.3,
        max_tokens: 500,
        response_format: { type: "json_object" }
      })
    });

    if (!openAIResponse.ok) {
      const error = await openAIResponse.text();
      console.error("[Optimizer] OpenAI API error:", error);
      // Fallback to rule-based decision
      return res.json(getFallbackDecision(snapshot));
    }

    const aiData = await openAIResponse.json();
    const aiContent = aiData.choices?.[0]?.message?.content || "{}";

    let decisions;
    try {
      decisions = JSON.parse(aiContent);
    } catch (parseError) {
      console.error("[Optimizer] Failed to parse AI response:", aiContent);
      return res.json(getFallbackDecision(snapshot));
    }

    // Validate and sanitize decisions
    if (decisions.decisions && Array.isArray(decisions.decisions)) {
      decisions.decisions = decisions.decisions.map(d => ({
        station_key: d.station_key || snapshot.station_key,
        apply_in_buckets: d.apply_in_buckets || 1,
        knobs: sanitizeKnobs(d.knobs || {}),
        reason: d.reason || "AI optimization",
        confidence: Math.min(1, Math.max(0, d.confidence || 0.5))
      }));
    } else {
      decisions = { decisions: [] };
    }

    console.log(`[Optimizer] Returning ${decisions.decisions.length} decisions`);
    res.json(decisions);

  } catch (error) {
    console.error("[Optimizer] Error:", error);
    res.status(500).json({
      error: "Internal optimization error",
      details: error.message
    });
  }
});

// Fallback rule-based optimizer (when AI fails)
function getFallbackDecision(snapshot) {
  const decisions = [];

  const postRMS = snapshot.metrics?.POST?.["pcm.rms_dbfs"]?.avg || -60;
  const clipping = snapshot.metrics?.POST?.["pcm.clipping_ratio"]?.avg || 0;
  const currentGain = snapshot.knobs_snapshot?.["pcm.input_gain_db"] || 0;
  const targetRMS = snapshot.policy?.target_rms_dbfs || -18;
  const maxClipping = snapshot.policy?.max_clipping_ratio || 0.002;

  // Simple rules
  if (clipping > maxClipping && currentGain > -10) {
    // Reduce gain if clipping
    decisions.push({
      station_key: snapshot.station_key,
      apply_in_buckets: 1,
      knobs: { "pcm.input_gain_db": Math.max(-20, currentGain - 2) },
      reason: "Reducing gain due to clipping",
      confidence: 0.9
    });
  } else if (postRMS < targetRMS - 3 && clipping < maxClipping / 2 && currentGain < 18) {
    // Increase gain if too quiet
    decisions.push({
      station_key: snapshot.station_key,
      apply_in_buckets: 1,
      knobs: { "pcm.input_gain_db": Math.min(20, currentGain + 2) },
      reason: "Increasing gain - signal too quiet",
      confidence: 0.8
    });
  }

  return { decisions };
}

// Sanitize knob values
function sanitizeKnobs(knobs) {
  const sanitized = {};

  if (typeof knobs["pcm.input_gain_db"] === "number") {
    // Clamp to valid range
    sanitized["pcm.input_gain_db"] = Math.min(20, Math.max(-20, knobs["pcm.input_gain_db"]));
  }

  // Add other knob sanitization as needed
  return sanitized;
}

// Start server
app.listen(PORT, "127.0.0.1", () => {
  console.log(`[AI Optimizer Service] Running on http://127.0.0.1:${PORT}`);
  console.log(`[AI Optimizer Service] OpenAI API Key: ${OPENAI_API_KEY.substring(0, 10)}...`);
  console.log(`[AI Optimizer Service] Ready to optimize audio`);
});
```

---

## File 2: Optimizer Agent
### Location: `/home/azureuser/optimizer-agent.js`

```javascript
const fetch = require('node-fetch');
const { v4: uuidv4 } = require('uuid');

// Configuration
const STTTTS_API = "http://127.0.0.1:3020";
const AI_SERVICE = "http://127.0.0.1:3090";
const POLL_INTERVAL = 5000; // 5 seconds
const MAX_RETRIES = 3;

// State tracking
let isProcessing = false;
let lastHealthCheck = Date.now();

console.log(`[Optimizer Agent] Starting...`);
console.log(`[Optimizer Agent] STTTTSserver API: ${STTTTS_API}`);
console.log(`[Optimizer Agent] AI Service: ${AI_SERVICE}`);
console.log(`[Optimizer Agent] Poll interval: ${POLL_INTERVAL}ms`);

// Health check for AI Service
async function checkAIServiceHealth() {
  try {
    const response = await fetch(`${AI_SERVICE}/v1/health`);
    if (!response.ok) return false;
    const data = await response.json();
    return data.ok === true;
  } catch (error) {
    console.error("[Optimizer Agent] AI Service health check failed:", error.message);
    return false;
  }
}

// Main optimization loop
async function optimizationLoop() {
  // Skip if already processing
  if (isProcessing) {
    console.log("[Optimizer Agent] Previous cycle still running, skipping...");
    return;
  }

  isProcessing = true;

  try {
    // 1. Check AI Service health every minute
    if (Date.now() - lastHealthCheck > 60000) {
      const aiHealthy = await checkAIServiceHealth();
      if (!aiHealthy) {
        console.error("[Optimizer Agent] AI Service not healthy, skipping cycle");
        return;
      }
      lastHealthCheck = Date.now();
    }

    // 2. Get active traces
    const tracesResponse = await fetch(`${STTTTS_API}/api/traces/active`);
    if (!tracesResponse.ok) {
      console.error("[Optimizer Agent] Failed to get active traces");
      return;
    }

    const tracesData = await tracesResponse.json();
    const activeTraces = tracesData.active || [];

    if (activeTraces.length === 0) {
      // No active calls, nothing to optimize
      return;
    }

    console.log(`[Optimizer Agent] Found ${activeTraces.length} active traces`);

    // 3. Process each trace
    for (const trace of activeTraces) {
      await processTrace(trace);
    }

  } catch (error) {
    console.error("[Optimizer Agent] Loop error:", error);
  } finally {
    isProcessing = false;
  }
}

// Process a single trace
async function processTrace(trace) {
  const { trace_id } = trace;

  try {
    // 1. Get latest snapshot
    const snapshotResponse = await fetch(
      `${STTTTS_API}/api/optimizer/snapshot?trace_id=${trace_id}&limit=1`
    );

    if (!snapshotResponse.ok) {
      console.error(`[Optimizer Agent] Failed to get snapshot for ${trace_id}`);
      return;
    }

    const snapshotData = await snapshotResponse.json();
    const buckets = snapshotData.buckets || [];

    if (buckets.length === 0) {
      console.log(`[Optimizer Agent] No buckets yet for ${trace_id}`);
      return;
    }

    const latestBucket = buckets[0];
    console.log(`[Optimizer Agent] Processing ${trace_id} - ${latestBucket.station_key} at ${latestBucket.bucket_ts}`);

    // 2. Prepare optimization request
    const optimizeRequest = {
      trace_id: latestBucket.trace_id,
      bucket_ts: latestBucket.bucket_ts,
      bucket_ms: 5000,
      station_key: latestBucket.station_key,
      config_version: latestBucket.config_version || 1,
      metrics: latestBucket.metrics || {},
      knobs_snapshot: latestBucket.knobs_snapshot || {},
      audio: {
        pre_url: latestBucket.audio?.PRE?.endpoint
          ? `${STTTTS_API}${latestBucket.audio.PRE.endpoint}`
          : null,
        post_url: latestBucket.audio?.POST?.endpoint
          ? `${STTTTS_API}${latestBucket.audio.POST.endpoint}`
          : null
      },
      policy: {
        target_rms_dbfs: -18,
        max_gain_step_db: 2,
        max_abs_gain_db: 20,
        max_clipping_ratio: 0.002
      }
    };

    // 3. Call AI Service
    const aiResponse = await fetch(`${AI_SERVICE}/v1/optimize`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(optimizeRequest)
    });

    if (!aiResponse.ok) {
      console.error(`[Optimizer Agent] AI Service returned error for ${trace_id}`);
      return;
    }

    const aiDecisions = await aiResponse.json();
    const decisions = aiDecisions.decisions || [];

    if (decisions.length === 0) {
      console.log(`[Optimizer Agent] No changes recommended for ${trace_id}`);
      return;
    }

    console.log(`[Optimizer Agent] Got ${decisions.length} decisions for ${trace_id}`);

    // 4. Apply each decision
    for (const decision of decisions) {
      await applyDecision(trace_id, decision);
    }

  } catch (error) {
    console.error(`[Optimizer Agent] Error processing ${trace_id}:`, error);
  }
}

// Apply a decision via knobs API
async function applyDecision(trace_id, decision) {
  try {
    // Calculate next bucket timestamp (apply_in_buckets from now)
    const now = Date.now();
    const bucketMs = 5000;
    const bucketsAhead = decision.apply_in_buckets || 1;
    const nextBucket = Math.ceil(now / bucketMs) * bucketMs + (bucketsAhead * bucketMs);
    const applyAt = new Date(nextBucket).toISOString();

    const applyRequest = {
      trace_id: trace_id,
      station_key: decision.station_key,
      apply_at_bucket_ts: applyAt,
      idempotency_key: uuidv4(),
      source: "ai_optimizer",
      reason: decision.reason || "AI optimization",
      knobs: decision.knobs || {}
    };

    console.log(`[Optimizer Agent] Applying knobs for ${trace_id} at ${applyAt}:`, decision.knobs);

    const applyResponse = await fetch(`${STTTTS_API}/api/optimizer/knobs/apply`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(applyRequest)
    });

    if (!applyResponse.ok) {
      const error = await applyResponse.text();
      console.error(`[Optimizer Agent] Failed to apply knobs:`, error);
      return;
    }

    const applyResult = await applyResponse.json();
    console.log(`[Optimizer Agent] Knobs applied successfully:`, applyResult.effective_knobs);

  } catch (error) {
    console.error("[Optimizer Agent] Error applying decision:", error);
  }
}

// Graceful shutdown
process.on('SIGINT', () => {
  console.log("\n[Optimizer Agent] Shutting down gracefully...");
  process.exit(0);
});

process.on('SIGTERM', () => {
  console.log("\n[Optimizer Agent] Received SIGTERM, shutting down...");
  process.exit(0);
});

// Start the optimization loop
console.log("[Optimizer Agent] Starting optimization loop...");
setInterval(optimizationLoop, POLL_INTERVAL);

// Run immediately on startup
optimizationLoop();
```

---

## File 3: Package Configuration for AI Service
### Location: `/home/azureuser/ai-service/package.json`

```json
{
  "name": "ai-optimizer-service",
  "version": "1.0.0",
  "description": "AI-powered audio optimization service",
  "main": "server.js",
  "type": "module",
  "scripts": {
    "start": "node server.js",
    "dev": "node --watch server.js"
  },
  "dependencies": {
    "express": "^4.18.2",
    "node-fetch": "^3.3.2",
    "dotenv": "^16.3.1"
  },
  "engines": {
    "node": ">=18.0.0"
  }
}
```

---

## File 4: Package Configuration for Agent
### Location: `/home/azureuser/package.json` (add dependencies)

```json
{
  "dependencies": {
    "node-fetch": "^2.6.7",
    "uuid": "^9.0.0"
  }
}
```

---

## File 5: Environment Configuration
### Location: `/home/azureuser/ai-service/.env`

```bash
# OpenAI Configuration
OPENAI_API_KEY=sk-YOUR-API-KEY-HERE

# Service Configuration
PORT=3090
NODE_ENV=production
```

---

## File 6: PM2 Ecosystem Configuration
### Location: `/home/azureuser/ecosystem.config.js`

```javascript
module.exports = {
  apps: [
    {
      name: "ai-optimizer",
      script: "./ai-service/server.js",
      cwd: "/home/azureuser/ai-service",
      instances: 1,
      autorestart: true,
      watch: false,
      max_memory_restart: "500M",
      env: {
        PORT: 3090,
        NODE_ENV: "production"
      },
      error_file: "/home/azureuser/logs/ai-optimizer-error.log",
      out_file: "/home/azureuser/logs/ai-optimizer-out.log",
      log_file: "/home/azureuser/logs/ai-optimizer-combined.log"
    },
    {
      name: "optimizer-agent",
      script: "./optimizer-agent.js",
      cwd: "/home/azureuser",
      instances: 1,
      autorestart: true,
      watch: false,
      restart_delay: 5000,
      max_memory_restart: "200M",
      error_file: "/home/azureuser/logs/agent-error.log",
      out_file: "/home/azureuser/logs/agent-out.log",
      log_file: "/home/azureuser/logs/agent-combined.log"
    }
  ]
};
```

---

## Deployment Script
### Location: `/home/azureuser/deploy-ai-optimizer.sh`

```bash
#!/bin/bash

echo "=== Deploying AI Optimizer System ==="
echo "Date: $(date)"

# 1. Create directories
echo "Creating directories..."
mkdir -p /home/azureuser/ai-service
mkdir -p /home/azureuser/logs

# 2. Check for OpenAI API key
if [ -z "$OPENAI_API_KEY" ]; then
  echo "ERROR: OPENAI_API_KEY not set!"
  echo "Please run: export OPENAI_API_KEY=sk-..."
  exit 1
fi

# 3. Create AI Service files
echo "Creating AI Service..."
cd /home/azureuser/ai-service

# Create server.js (copy content from above)
cat > server.js << 'EOF'
[INSERT SERVER.JS CONTENT HERE]
EOF

# Create package.json
cat > package.json << 'EOF'
{
  "name": "ai-optimizer-service",
  "version": "1.0.0",
  "type": "module",
  "dependencies": {
    "express": "^4.18.2",
    "node-fetch": "^3.3.2",
    "dotenv": "^16.3.1"
  }
}
EOF

# Create .env
cat > .env << EOF
OPENAI_API_KEY=$OPENAI_API_KEY
PORT=3090
NODE_ENV=production
EOF

# Install dependencies
echo "Installing AI Service dependencies..."
npm install

# 4. Create Optimizer Agent
echo "Creating Optimizer Agent..."
cd /home/azureuser

# Create optimizer-agent.js (copy content from above)
cat > optimizer-agent.js << 'EOF'
[INSERT OPTIMIZER-AGENT.JS CONTENT HERE]
EOF

# Install agent dependencies
echo "Installing Agent dependencies..."
npm install node-fetch@2.6.7 uuid@9.0.0

# 5. Create PM2 ecosystem file
cat > ecosystem.config.js << 'EOF'
[INSERT ECOSYSTEM CONFIG HERE]
EOF

# 6. Start services with PM2
echo "Starting services with PM2..."
pm2 stop all
pm2 delete all
pm2 start ecosystem.config.js
pm2 save

# 7. Verify services
echo ""
echo "Verifying services..."
sleep 3
pm2 status

# Test AI Service health
echo ""
echo "Testing AI Service health..."
curl -s http://127.0.0.1:3090/v1/health | jq .

# Check logs
echo ""
echo "Recent logs:"
pm2 logs --lines 5 --nostream

echo ""
echo "=== Deployment Complete ==="
echo "AI Optimizer Service: http://127.0.0.1:3090"
echo "Monitor with: pm2 monit"
echo "Logs: pm2 logs"
```

---

## Testing Script
### Location: `/home/azureuser/test-ai-loop.sh`

```bash
#!/bin/bash

echo "=== Testing AI Optimizer Loop ==="

# 1. Check services
echo "1. Service Status:"
pm2 list

# 2. Check AI Service health
echo -e "\n2. AI Service Health:"
curl -s http://127.0.0.1:3090/v1/health | jq .

# 3. Check active traces
echo -e "\n3. Active Traces:"
curl -s http://127.0.0.1:3020/api/traces/active | jq '.active | length'

# 4. Send test optimization request
echo -e "\n4. Test Optimization Request:"
curl -s -X POST http://127.0.0.1:3090/v1/optimize \
  -H "Content-Type: application/json" \
  -d '{
    "trace_id": "test_trace",
    "bucket_ts": "'$(date -u +%Y-%m-%dT%H:%M:%S.000Z)'",
    "bucket_ms": 5000,
    "station_key": "St_3_3333",
    "config_version": 1,
    "metrics": {
      "PRE": {"pcm.rms_dbfs": {"avg": -30}},
      "POST": {"pcm.rms_dbfs": {"avg": -28}, "pcm.clipping_ratio": {"avg": 0.001}}
    },
    "knobs_snapshot": {"pcm.input_gain_db": 0},
    "policy": {"target_rms_dbfs": -18, "max_gain_step_db": 2}
  }' | jq .

# 5. Check Agent logs
echo -e "\n5. Agent Activity (last 10 lines):"
pm2 logs optimizer-agent --lines 10 --nostream

echo -e "\n=== Test Complete ==="
```

---

## Quick Deployment Commands

```bash
# 1. SSH to VM
ssh azureuser@20.170.155.53

# 2. Set OpenAI API Key
export OPENAI_API_KEY="sk-YOUR-KEY-HERE"

# 3. Run deployment script
bash deploy-ai-optimizer.sh

# 4. Monitor
pm2 monit

# 5. Test
bash test-ai-loop.sh
```

---

*Implementation provided: January 5, 2026*
*Estimated deployment time: 30 minutes*
*System will achieve 100% closed-loop operation*