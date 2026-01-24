# 🔄 OpenAI Provider Swap - Implementation Package

## Overview
This package contains everything needed to swap the current rule-based AI with OpenAI integration while maintaining the exact same contract and safety mechanisms.

**Current Status**: System is production-approved with rule-based AI
**Target**: Replace AI provider with OpenAI (simple provider swap)
**Time Required**: ~1 hour total

---

## 📦 Files Created

### 1. **ai-service-openai.js**
The main OpenAI service that replaces the rule-based AI.
- Maintains exact same `/optimize` endpoint
- Includes permission checking (ai.optimization_allowed)
- Has automatic fallback to rule-based if OpenAI fails
- Validates all decisions against knob limits
- Comprehensive logging for observability

### 2. **.env.openai.example**
Environment configuration template.
- Copy to `.env` and add your OpenAI API key
- Configure model selection (gpt-4-turbo-preview recommended)

### 3. **package-openai.json**
NPM package configuration with required dependencies:
- express
- openai (official SDK)
- dotenv

### 4. **deploy-openai-provider.sh**
Automated deployment script that:
- Backs up current service
- Installs dependencies
- Validates API key configuration
- Deploys and starts the service
- Runs health checks
- Tests the optimization endpoint

### 5. **test-openai-integration.js**
Comprehensive test suite that verifies:
- OpenAI responses are valid
- Permission checking works
- Fallback mechanism works
- All response contracts are maintained

### 6. **4_ARTIFACTS_TEMPLATE.md**
Template for collecting the 4 required artifacts after deployment:
1. Real snapshot JSON
2. Real OpenAI response JSON
3. BucketScheduler logs with idempotency proof
4. SQL metrics showing improvement

---

## 🚀 Deployment Steps

### Step 1: Configure API Key
```bash
# Copy example to .env
cp .env.openai.example .env

# Edit and add your OpenAI API key
nano .env
# Set: OPENAI_API_KEY=sk-your-actual-key-here
```

### Step 2: Deploy to Azure VM
```bash
# Run deployment script
bash deploy-openai-provider.sh
```

The script will:
- Copy files to VM (if not already there)
- Install dependencies
- Validate configuration
- Deploy the OpenAI service
- Run health checks

### Step 3: Verify Deployment
```bash
# Check service status
ssh azureuser@20.170.155.53 "pm2 status"

# Check logs
ssh azureuser@20.170.155.53 "pm2 logs ai-optimizer --lines 50"

# Run test suite
node test-openai-integration.js
```

### Step 4: Run Production Test
1. Start calls between extensions 3333 and 4444
2. Let run for 10-15 minutes
3. Monitor optimization decisions being made

### Step 5: Collect 4 Artifacts
Use the commands in `4_ARTIFACTS_TEMPLATE.md` to collect:
1. Actual snapshot sent to OpenAI
2. OpenAI response with request_id
3. BucketScheduler logs showing UUID and idempotency
4. SQL metrics showing RMS/clipping improvements

---

## ✅ Success Criteria

The deployment is successful when:
1. Service health shows `model: openai-gpt-4-turbo-preview`
2. Optimization responses include `request_id` from OpenAI
3. Decisions are contextual (not fixed rules)
4. Metrics show improvement (RMS closer to -18 dBFS)
5. No errors in pm2 logs

---

## 🔧 Troubleshooting

### Service using fallback mode?
- Check API key in .env file
- Verify key starts with `sk-`
- Check OpenAI API status

### No decisions being made?
- Verify `ai.optimization_allowed: true` in snapshots
- Check optimizer-agent is running
- Check database has recent snapshots

### Decisions not being applied?
- Verify bucket-scheduler is running
- Check scheduled_knob_updates table
- Look for "APPLY" in scheduler logs

---

## 📊 Monitoring Commands

```bash
# View real-time logs
ssh azureuser@20.170.155.53 "pm2 logs ai-optimizer --lines 100"

# Check decision rate
ssh azureuser@20.170.155.53 "pm2 logs ai-optimizer | grep optimization_complete | tail -20"

# View scheduled updates
ssh azureuser@20.170.155.53 "sudo -u postgres psql monitoring_v2 -c 'SELECT * FROM scheduled_knob_updates ORDER BY created_at DESC LIMIT 10;'"

# Check current knob values
ssh azureuser@20.170.155.53 "sudo -u postgres psql monitoring_v2 -c \"SELECT station_key, (knobs_json->>'pcm.input_gain_db')::float as gain FROM knob_snapshots_5s WHERE station_key LIKE 'St_3_%' ORDER BY bucket_ts DESC LIMIT 4;\""
```

---

## 🎯 Final Notes

- This is a **provider swap only** - no architecture changes
- The system is already production-approved
- OpenAI integration maintains all existing safety mechanisms
- Fallback ensures system never fails due to API issues
- Total implementation time: ~1 hour

**Once deployed and tested, submit the 4 artifacts for immediate approval.**