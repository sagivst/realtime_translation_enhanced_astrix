#!/bin/bash
CHECKPOINT_DIR="/home/azureuser/translation-app/checkpoints"
if [ -z "$1" ]; then
    echo "Available checkpoints:"
    ls -t "$CHECKPOINT_DIR" 2>/dev/null | nl
    echo ""
    echo "Usage: ./restore-checkpoint.sh <number or name>"
    echo "Example: ./restore-checkpoint.sh 1  (restores latest)"
    exit 1
fi
if [[ "$1" =~ ^[0-9]+$ ]]; then
    CHECKPOINT=$(ls -t "$CHECKPOINT_DIR" 2>/dev/null | sed -n "${1}p")
else
    CHECKPOINT="$1"
fi
if [ ! -d "$CHECKPOINT_DIR/$CHECKPOINT" ]; then
    echo "Checkpoint not found: $CHECKPOINT"
    exit 1
fi
echo "Restoring from: $CHECKPOINT"
cat "$CHECKPOINT_DIR/$CHECKPOINT/info.txt" 2>/dev/null
killall -9 node 2>/dev/null || true
sleep 2
cd /home/azureuser/translation-app
cp "$CHECKPOINT_DIR/$CHECKPOINT/"*.js . 2>/dev/null || true
cp "$CHECKPOINT_DIR/$CHECKPOINT/package.json" . 2>/dev/null || true  
cp "$CHECKPOINT_DIR/$CHECKPOINT/public/"*.html public/ 2>/dev/null || true
echo "Restored from checkpoint: $CHECKPOINT"
echo "Run ./start-server.sh to restart"
