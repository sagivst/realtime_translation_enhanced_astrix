#!/bin/bash

echo "🚀 Deploying Empty Template to All 16 Station Configurations"
echo "=============================================="
echo "This will replace all station configs with empty templates"
echo "The StationKnobSafeLoader will capture live system values as defaults"
echo ""

# Station configurations (8 stations × 2 extensions = 16 configs)
STATIONS=("STATION_1" "STATION_2" "STATION_3" "STATION_4" "STATION_5" "STATION_6" "STATION_7" "STATION_8")
EXTENSIONS=(3333 4444)

# Counter for tracking progress
COUNT=0
TOTAL=16

# Deploy empty template to each station-extension combination
for STATION in "${STATIONS[@]}"; do
  for EXT in "${EXTENSIONS[@]}"; do
    COUNT=$((COUNT + 1))
    CONFIG_FILE="station-configs/${STATION}-${EXT}-config.json"

    echo "[$COUNT/$TOTAL] Deploying empty template to ${STATION}-${EXT}..."

    # Create the empty config with preserved structure but null values
    cat > "$CONFIG_FILE" << 'EOF'
{
  "station_id": "PLACEHOLDER_STATION",
  "extension": PLACEHOLDER_EXT,
  "timestamp": "",
  "optimization_version": "2.0",
  "source": "empty_template_for_capture",
  "audio_processing": {
    "agc": {
      "enabled": null,
      "targetLevel": null,
      "maxGain": null,
      "attackTime": null,
      "releaseTime": null,
      "holdTime": null
    },
    "aec": {
      "enabled": null,
      "filterLength": null,
      "adaptationRate": null,
      "suppressionLevel": null,
      "tailLength": null,
      "convergenceTime": null,
      "echoCancellation": null
    },
    "noiseReduction": {
      "enabled": null,
      "level": null,
      "spectralFloor": null,
      "preserveVoice": null,
      "adaptiveMode": null,
      "suppressionBands": null
    },
    "compressor": {
      "enabled": null,
      "threshold": null,
      "ratio": null,
      "attack": null,
      "release": null,
      "knee": null
    },
    "limiter": {
      "enabled": null,
      "threshold": null,
      "release": null,
      "lookahead": null
    }
  },
  "codec": {
    "type": null,
    "bitrate": null,
    "complexity": null,
    "vbr": null,
    "dtx": null,
    "fec": null,
    "packetLossPercentage": null,
    "frameSize": null
  },
  "buffers": {
    "jitterBuffer": {
      "enabled": null,
      "minDepth": null,
      "maxDepth": null,
      "targetDepth": null,
      "adaptiveMode": null
    },
    "playback": {
      "size": null,
      "latency": null
    },
    "record": {
      "size": null,
      "latency": null
    }
  },
  "deepgram": {
    "model": null,
    "language": null,
    "punctuate": null,
    "diarize": null,
    "multichannel": null,
    "alternatives": null,
    "interim": null,
    "endpointing": null
  },
  "translation": {
    "enabled": null,
    "sourceLanguage": null,
    "targetLanguage": null,
    "formality": null,
    "timeout": null
  },
  "tts": {
    "voice": null,
    "speed": null,
    "pitch": null,
    "volume": null,
    "emphasis": null,
    "sentencePause": null,
    "ssml": null
  },
  "quality_targets": {
    "target_snr": null,
    "target_mos": null,
    "max_latency": null,
    "max_packet_loss": null
  }
}
EOF

    # Replace placeholders with actual values
    sed -i '' "s/PLACEHOLDER_STATION/${STATION}/g" "$CONFIG_FILE"
    sed -i '' "s/PLACEHOLDER_EXT/${EXT}/g" "$CONFIG_FILE"

    echo "   ✓ Empty template deployed to ${CONFIG_FILE}"
  done
done

echo ""
echo "✅ Deployment Complete!"
echo "=============================================="
echo "All 16 station configurations now have empty templates"
echo ""
echo "Next steps:"
echo "1. Upload these to the server"
echo "2. When STTTTSserver loads each station, StationKnobSafeLoader will:"
echo "   - Detect null values"
echo "   - Capture current system values"
echo "   - Write them as defaults"
echo "   - Preserve them for optimization"
echo ""
echo "Files created in: ./station-configs/"
ls -la station-configs/*.json | wc -l
echo "station configuration files ready"