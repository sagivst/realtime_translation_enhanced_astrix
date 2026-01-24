# OpenAI Integration Guide

## Quick Start

### 1. Get OpenAI API Key
1. Sign up at https://platform.openai.com
2. Navigate to API Keys section
3. Create new secret key
4. Copy key (starts with `sk-`)

### 2. Configure Environment
```bash
# Create .env file
cat > .env << EOF
OPENAI_API_KEY=sk-your-actual-key-here
OPENAI_MODEL=gpt-4-turbo-preview
AI_SERVICE_PORT=3090
EOF

# Secure the file
chmod 600 .env
```

### 3. Install Dependencies
```bash
npm install openai@^4.0.0
```

### 4. Test Connection
```javascript
const OpenAI = require('openai');
const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

async function testConnection() {
  const completion = await openai.chat.completions.create({
    model: "gpt-4-turbo-preview",
    messages: [{ role: "user", content: "Hello" }],
    max_tokens: 10
  });
  console.log('Connection successful:', completion.choices[0].message);
}
```

## Model Selection

### Available Models

| Model | Speed | Quality | Cost | Use Case |
|-------|-------|---------|------|----------|
| gpt-4-turbo-preview | Medium | Excellent | High | Production optimization |
| gpt-4 | Slow | Excellent | Highest | Complex decisions |
| gpt-3.5-turbo | Fast | Good | Low | Development/Testing |
| gpt-3.5-turbo-16k | Fast | Good | Medium | Large context |

### Recommended Configuration
```javascript
// Production
const PRODUCTION_CONFIG = {
  model: 'gpt-4-turbo-preview',
  temperature: 0.3,  // Consistent decisions
  max_tokens: 500,
  response_format: { type: 'json_object' }
};

// Development
const DEV_CONFIG = {
  model: 'gpt-3.5-turbo',
  temperature: 0.5,
  max_tokens: 300
};
```

## API Integration

### Basic Implementation
```javascript
const OpenAI = require('openai');

class OpenAIOptimizer {
  constructor(apiKey) {
    this.openai = new OpenAI({
      apiKey,
      timeout: 2000,
      maxRetries: 2
    });
  }

  async analyzeMetrics(snapshot) {
    const messages = [
      {
        role: 'system',
        content: this.getSystemPrompt()
      },
      {
        role: 'user',
        content: this.formatSnapshot(snapshot)
      }
    ];

    try {
      const completion = await this.openai.chat.completions.create({
        model: 'gpt-4-turbo-preview',
        messages,
        temperature: 0.3,
        max_tokens: 500,
        response_format: { type: 'json_object' }
      });

      return this.parseResponse(completion);
    } catch (error) {
      return this.handleError(error);
    }
  }
}
```

### Advanced Features

#### Streaming Responses
```javascript
const stream = await openai.chat.completions.create({
  model: 'gpt-4-turbo-preview',
  messages,
  stream: true
});

for await (const chunk of stream) {
  process.stdout.write(chunk.choices[0]?.delta?.content || '');
}
```

#### Function Calling
```javascript
const tools = [{
  type: 'function',
  function: {
    name: 'adjust_knob',
    description: 'Adjust an audio processing knob',
    parameters: {
      type: 'object',
      properties: {
        knob: { type: 'string' },
        value: { type: 'number' }
      }
    }
  }
}];

const completion = await openai.chat.completions.create({
  model: 'gpt-4-turbo-preview',
  messages,
  tools,
  tool_choice: 'auto'
});
```

## Prompt Engineering

### Effective System Prompts

```javascript
const SYSTEM_PROMPTS = {
  expert: `You are an expert audio engineer with 20 years of experience
          in real-time audio processing and optimization. You understand
          signal processing, psychoacoustics, and communication clarity.`,

  technical: `You are an audio optimization AI. Analyze metrics precisely.
             Make conservative adjustments. Prioritize stability.
             Response must be valid JSON with specific knob changes.`,

  concise: `Audio optimizer. Input: metrics. Output: knob adjustments JSON.`
};
```

### Structured User Prompts

```javascript
function createUserPrompt(snapshot) {
  return `
CURRENT METRICS (5-second aggregate):
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
PRE-PROCESSING:
• RMS Level: ${snapshot.metrics.PRE['pcm.amplitude_rms'].avg} (Target: 5240-10400)
• Peak Level: ${snapshot.metrics.PRE['pcm.amplitude_peak'].max}
• Clipping: ${snapshot.metrics.PRE['pcm.clipping_ratio'].avg} (Target: <0.001)

POST-PROCESSING:
• RMS Level: ${snapshot.metrics.POST['pcm.amplitude_rms'].avg}
• Peak Level: ${snapshot.metrics.POST['pcm.amplitude_peak'].max}

CURRENT SETTINGS:
• Input Gain: ${snapshot.knobs['pcm.input_gain_db']} dB
• AGC: ${snapshot.knobs['agc.enabled'] ? 'ON' : 'OFF'}
• Limiter: ${snapshot.knobs['limiter.enabled'] ? 'ON' : 'OFF'}

ANALYSIS REQUIREMENTS:
1. If RMS < 5240, increase gain gradually (2-4 dB steps)
2. If clipping > 0.001, reduce gain or enable limiter
3. Maximum 5 adjustments per cycle
4. Provide confidence score (0-1) for each decision

OUTPUT FORMAT:
{
  "decisions": [
    {
      "knob": "parameter_name",
      "recommended_value": number_or_boolean,
      "confidence": 0.0-1.0,
      "reason": "brief explanation"
    }
  ]
}`;
}
```

### Prompt Optimization Tips

1. **Be Specific**: Include exact targets and ranges
2. **Provide Context**: Show before/after metrics
3. **Structure Data**: Use clear formatting
4. **Define Output**: Specify exact JSON structure
5. **Set Constraints**: Maximum changes, step sizes

## Error Handling

### Retry Strategy
```javascript
async function callWithRetry(func, maxRetries = 3) {
  for (let i = 0; i < maxRetries; i++) {
    try {
      return await func();
    } catch (error) {
      if (i === maxRetries - 1) throw error;

      const delay = Math.pow(2, i) * 1000; // Exponential backoff
      console.log(`Retry ${i + 1} after ${delay}ms`);
      await new Promise(resolve => setTimeout(resolve, delay));
    }
  }
}
```

### Error Types
```javascript
function handleOpenAIError(error) {
  if (error.status === 429) {
    // Rate limit
    return {
      fallback: true,
      reason: 'Rate limit exceeded'
    };
  }

  if (error.status === 401) {
    // Invalid API key
    console.error('Invalid API key');
    process.exit(1);
  }

  if (error.status === 503) {
    // Service unavailable
    return {
      fallback: true,
      reason: 'OpenAI service unavailable'
    };
  }

  // Network or timeout
  return {
    fallback: true,
    reason: error.message
  };
}
```

## Cost Management

### Token Calculation
```javascript
function estimateTokens(text) {
  // Rough estimate: 1 token ≈ 4 characters
  return Math.ceil(text.length / 4);
}

function calculateCost(tokens, model = 'gpt-4-turbo-preview') {
  const pricing = {
    'gpt-4-turbo-preview': { input: 0.01, output: 0.03 }, // per 1K tokens
    'gpt-3.5-turbo': { input: 0.0005, output: 0.0015 }
  };

  const rate = pricing[model];
  return (tokens.input * rate.input + tokens.output * rate.output) / 1000;
}
```

### Optimization Strategies

1. **Batch Processing**
```javascript
// Instead of individual calls
for (const trace of traces) {
  await analyzeTrace(trace); // ❌ Expensive
}

// Batch multiple traces
const batchPrompt = traces.map(formatTrace).join('\n');
await analyzeBatch(batchPrompt); // ✅ Efficient
```

2. **Caching**
```javascript
const decisionCache = new Map();

function getCachedDecision(snapshotHash) {
  const cached = decisionCache.get(snapshotHash);
  if (cached && Date.now() - cached.timestamp < 30000) {
    return cached.decision;
  }
  return null;
}
```

3. **Smart Sampling**
```javascript
// Only analyze when metrics change significantly
function shouldAnalyze(current, previous) {
  const rmsDiff = Math.abs(current.rms - previous.rms);
  return rmsDiff > 500; // Significant change threshold
}
```

## Monitoring

### Usage Tracking
```javascript
class UsageMonitor {
  constructor() {
    this.dailyTokens = 0;
    this.dailyCost = 0;
    this.requests = [];
  }

  track(completion) {
    const usage = completion.usage;
    this.dailyTokens += usage.total_tokens;

    const cost = calculateCost({
      input: usage.prompt_tokens,
      output: usage.completion_tokens
    });

    this.dailyCost += cost;
    this.requests.push({
      timestamp: Date.now(),
      tokens: usage.total_tokens,
      cost
    });

    // Alert if approaching limits
    if (this.dailyCost > 50) {
      console.warn('Daily cost exceeds $50');
    }
  }

  getDailySummary() {
    return {
      requests: this.requests.length,
      tokens: this.dailyTokens,
      cost: this.dailyCost.toFixed(2),
      avgTokensPerRequest: Math.round(this.dailyTokens / this.requests.length)
    };
  }
}
```

### Performance Metrics
```javascript
async function measurePerformance(func) {
  const start = Date.now();
  const result = await func();
  const duration = Date.now() - start;

  console.log('OpenAI Performance:', {
    duration: `${duration}ms`,
    tokens: result.usage?.total_tokens,
    model: result.model
  });

  return result;
}
```

## Security Best Practices

### 1. API Key Security
```bash
# Never commit keys
echo ".env" >> .gitignore

# Use environment variables
export OPENAI_API_KEY=$(cat /secure/location/api_key)

# Rotate regularly
openai api keys create --name "monitoring-prod-$(date +%Y%m)"
```

### 2. Input Sanitization
```javascript
function sanitizeSnapshot(snapshot) {
  // Remove sensitive data
  delete snapshot.metadata?.apiKeys;
  delete snapshot.metadata?.passwords;

  // Validate structure
  if (!snapshot.metrics || !snapshot.knobs) {
    throw new Error('Invalid snapshot structure');
  }

  return snapshot;
}
```

### 3. Rate Limiting
```javascript
class RateLimiter {
  constructor(maxPerMinute = 20) {
    this.requests = [];
    this.maxPerMinute = maxPerMinute;
  }

  async throttle() {
    const now = Date.now();
    this.requests = this.requests.filter(t => now - t < 60000);

    if (this.requests.length >= this.maxPerMinute) {
      const waitTime = 60000 - (now - this.requests[0]);
      await new Promise(resolve => setTimeout(resolve, waitTime));
    }

    this.requests.push(now);
  }
}
```

## Testing

### Unit Tests
```javascript
const assert = require('assert');

describe('OpenAI Integration', () => {
  it('should handle valid response', async () => {
    const mockResponse = {
      choices: [{
        message: {
          content: '{"decisions": [{"knob": "gain", "value": 3}]}'
        }
      }]
    };

    const result = parseOpenAIResponse(mockResponse);
    assert.equal(result.decisions[0].knob, 'gain');
  });

  it('should fallback on error', async () => {
    const error = new Error('Network error');
    error.status = 503;

    const result = handleOpenAIError(error);
    assert.equal(result.fallback, true);
  });
});
```

### Integration Tests
```bash
# Test script
cat > test_openai.js << 'EOF'
const snapshot = {
  metrics: {
    PRE: { 'pcm.amplitude_rms': { avg: 3000 } }
  },
  knobs: { 'pcm.input_gain_db': 0 }
};

analyzeWithOpenAI(snapshot)
  .then(result => console.log('Success:', result))
  .catch(error => console.error('Failed:', error));
EOF

node test_openai.js
```

## Troubleshooting

### Common Issues

| Issue | Cause | Solution |
|-------|-------|----------|
| 401 Unauthorized | Invalid API key | Check OPENAI_API_KEY environment variable |
| 429 Rate Limit | Too many requests | Implement exponential backoff |
| 503 Service Unavailable | OpenAI down | Use fallback mechanism |
| Timeout | Slow response | Increase timeout, use simpler prompts |
| Invalid JSON | Malformed response | Add response validation, use response_format |
| High costs | Inefficient usage | Optimize prompts, use caching, batch requests |

### Debug Mode
```javascript
if (process.env.DEBUG === 'true') {
  console.log('OpenAI Request:', {
    model: config.model,
    promptLength: prompt.length,
    temperature: config.temperature
  });

  console.log('OpenAI Response:', {
    usage: completion.usage,
    finishReason: completion.choices[0].finish_reason,
    content: completion.choices[0].message.content
  });
}
```

## Migration Guide

### From GPT-3.5 to GPT-4
```javascript
// Update model
- model: 'gpt-3.5-turbo'
+ model: 'gpt-4-turbo-preview'

// Adjust token limits (GPT-4 supports more)
- max_tokens: 500
+ max_tokens: 1000

// Leverage better reasoning
- temperature: 0.7  // More random
+ temperature: 0.3  // More consistent
```

### From Completion to Chat API
```javascript
// Old (Completion API)
const completion = await openai.completions.create({
  model: 'text-davinci-003',
  prompt: 'Analyze: ' + data,
  max_tokens: 100
});

// New (Chat API)
const completion = await openai.chat.completions.create({
  model: 'gpt-4-turbo-preview',
  messages: [
    { role: 'system', content: 'You are an analyzer' },
    { role: 'user', content: data }
  ],
  max_tokens: 100
});
```