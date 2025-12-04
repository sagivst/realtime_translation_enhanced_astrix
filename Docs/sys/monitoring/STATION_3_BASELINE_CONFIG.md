# Station-3 Baseline Configuration - CURRENT WORKING VALUES
## Captured December 3, 2024 - DO NOT LOSE THESE!

**CRITICAL**: These are the EXACT values currently working in production.
Any changes must start from these values as the baseline.

---

## Current Working Deepgram Configuration

From STTTTSserver.js (line 473):

```javascript
const connection = deepgram.listen.live({
  model: "nova-3",              // ← WORKING VALUE (not nova-2!)
  encoding: "linear16",         // ← WORKING VALUE
  sample_rate: 16000,           // ← WORKING VALUE
  channels: 1,                  // ← WORKING VALUE
  interim_results: true,        // ← WORKING VALUE
  endpointing: 300,             // ← WORKING VALUE (300ms silence)
  smart_format: true,           // ← WORKING VALUE
  language: extensionId === "3333" ? "en" : "fr"  // ← CRITICAL: English for 3333, French for 4444
});
```

## IMPORTANT DIFFERENCES FROM DOCUMENTATION

1. **Model**: Using `nova-3` NOT `nova-2`
2. **Language**: Extension 3333 uses `"en"`, Extension 4444 uses `"fr"`
3. **Limited Parameters**: Only 8 parameters are set (not all 25 possible)

---

## Complete Station-3 Configuration Files

### For Extension 3333 (English)
File: `/tmp/STATION_3-3333-config.json`

```json
{
  "station_id": "STATION_3",
  "extension": "3333",
  "version": "1.0.0",
  "last_modified": "2024-12-03T18:00:00Z",

  "defaults": {
    "deepgram": {
      "model": "nova-3",
      "encoding": "linear16",
      "sample_rate": 16000,
      "channels": 1,
      "interim_results": true,
      "endpointing": 300,
      "smart_format": true,
      "language": "en",

      "_additional_available": {
        "punctuate": true,
        "profanityFilter": false,
        "redact": false,
        "diarize": false,
        "utterances": true,
        "vad_turnoff": 500,
        "alternatives": 1,
        "numerals": true
      }
    }
  },

  "saved_defaults": {
    "deepgram": {
      "model": "nova-3",
      "encoding": "linear16",
      "sample_rate": 16000,
      "channels": 1,
      "interim_results": true,
      "endpointing": 300,
      "smart_format": true,
      "language": "en"
    }
  },

  "active": {
    "deepgram": {
      "model": "nova-3",
      "encoding": "linear16",
      "sample_rate": 16000,
      "channels": 1,
      "interim_results": true,
      "endpointing": 300,
      "smart_format": true,
      "language": "en"
    }
  },

  "metadata": {
    "source": "captured_from_production",
    "working_verified": true,
    "optimization_count": 0,
    "last_reset": "2024-12-03T18:00:00Z"
  }
}
```

### For Extension 4444 (French)
File: `/tmp/STATION_3-4444-config.json`

```json
{
  "station_id": "STATION_3",
  "extension": "4444",
  "version": "1.0.0",
  "last_modified": "2024-12-03T18:00:00Z",

  "defaults": {
    "deepgram": {
      "model": "nova-3",
      "encoding": "linear16",
      "sample_rate": 16000,
      "channels": 1,
      "interim_results": true,
      "endpointing": 300,
      "smart_format": true,
      "language": "fr",

      "_additional_available": {
        "punctuate": true,
        "profanityFilter": false,
        "redact": false,
        "diarize": false,
        "utterances": true,
        "vad_turnoff": 500,
        "alternatives": 1,
        "numerals": true
      }
    }
  },

  "saved_defaults": {
    "deepgram": {
      "model": "nova-3",
      "encoding": "linear16",
      "sample_rate": 16000,
      "channels": 1,
      "interim_results": true,
      "endpointing": 300,
      "smart_format": true,
      "language": "fr"
    }
  },

  "active": {
    "deepgram": {
      "model": "nova-3",
      "encoding": "linear16",
      "sample_rate": 16000,
      "channels": 1,
      "interim_results": true,
      "endpointing": 300,
      "smart_format": true,
      "language": "fr"
    }
  },

  "metadata": {
    "source": "captured_from_production",
    "working_verified": true,
    "optimization_count": 0,
    "last_reset": "2024-12-03T18:00:00Z"
  }
}
```

---

## Critical Implementation Notes

### 1. PRESERVE CURRENT BEHAVIOR
When implementing the Station3Handler, it MUST:
- Default to these exact values
- Use `nova-3` not `nova-2`
- Maintain language differentiation (en/fr)

### 2. BACKWARD COMPATIBILITY
The handler must map properly:
```javascript
// In getDeepgramConfig()
return {
  model: dg.model || 'nova-3',  // NOT nova-2!
  encoding: dg.encoding || 'linear16',
  sample_rate: dg.sample_rate || 16000,
  channels: dg.channels || 1,
  interim_results: dg.interim_results !== false,
  endpointing: dg.endpointing || 300,
  smart_format: dg.smart_format !== false,
  language: dg.language || (this.extensionId === '3333' ? 'en' : 'fr')
};
```

### 3. VALIDATION BEFORE CHANGES
Before ANY optimization:
1. Verify current config works
2. Make test call
3. Confirm transcription quality
4. Only then allow modifications

---

## Testing Current Configuration

```bash
# Test 1: Verify configs match production
node -e "
const config3333 = require('/tmp/STATION_3-3333-config.json');
const config4444 = require('/tmp/STATION_3-4444-config.json');

console.assert(config3333.active.deepgram.model === 'nova-3', 'Model mismatch!');
console.assert(config3333.active.deepgram.language === 'en', 'Language mismatch for 3333!');
console.assert(config4444.active.deepgram.language === 'fr', 'Language mismatch for 4444!');
console.log('✅ Baseline configs match production');
"

# Test 2: Backup current working config
cp /home/azureuser/translation-app/3333_4444__Operational/STTTTSserver/STTTTSserver.js \
   /home/azureuser/translation-app/3333_4444__Operational/STTTTSserver/STTTTSserver.js.baseline.$(date +%Y%m%d)
```

---

## Recovery Command

If anything breaks, restore to these values:

```bash
# Quick restore to baseline
echo '{
  "deepgram": {
    "model": "nova-3",
    "encoding": "linear16",
    "sample_rate": 16000,
    "channels": 1,
    "interim_results": true,
    "endpointing": 300,
    "smart_format": true,
    "language": "en"
  }
}' > /tmp/STATION_3-3333-recovery.json

echo '{
  "deepgram": {
    "model": "nova-3",
    "encoding": "linear16",
    "sample_rate": 16000,
    "channels": 1,
    "interim_results": true,
    "endpointing": 300,
    "smart_format": true,
    "language": "fr"
  }
}' > /tmp/STATION_3-4444-recovery.json
```

---

**DO NOT PROCEED WITHOUT CONFIRMING THESE VALUES WORK!**