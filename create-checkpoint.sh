#!/bin/bash
CHECKPOINT_DIR="/home/azureuser/translation-app/checkpoints"
TIMESTAMP=$(date +%Y%m%d-%H%M%S)
CHECKPOINT_NAME="checkpoint-$TIMESTAMP"
mkdir -p "$CHECKPOINT_DIR/$CHECKPOINT_NAME/public"
echo "Creating checkpoint: $CHECKPOINT_NAME"
cp audiosocket-integration.js "$CHECKPOINT_DIR/$CHECKPOINT_NAME/" 2>/dev/null || true
cp conference-server.js "$CHECKPOINT_DIR/$CHECKPOINT_NAME/" 2>/dev/null || true  
cp translation-pipeline.js "$CHECKPOINT_DIR/$CHECKPOINT_NAME/" 2>/dev/null || true
cp package.json "$CHECKPOINT_DIR/$CHECKPOINT_NAME/" 2>/dev/null || true
cp public/dashboard.html "$CHECKPOINT_DIR/$CHECKPOINT_NAME/public/" 2>/dev/null || true
cp public/monitoring-dashboard.html "$CHECKPOINT_DIR/$CHECKPOINT_NAME/public/" 2>/dev/null || true
echo "Checkpoint: $CHECKPOINT_NAME" > "$CHECKPOINT_DIR/$CHECKPOINT_NAME/info.txt"
echo "Created: $(date)" >> "$CHECKPOINT_DIR/$CHECKPOINT_NAME/info.txt"
cd "$CHECKPOINT_DIR" && ls -t | tail -n +11 | xargs -r rm -rf
echo "Checkpoint saved: $CHECKPOINT_NAME"
