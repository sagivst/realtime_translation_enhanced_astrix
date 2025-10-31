#!/bin/bash
# Comprehensive Checkpoint Creation Script

DESCRIPTION="${1:-Manual checkpoint}"
TIMESTAMP=$(date +%Y%m%d-%H%M%S)
CHECKPOINT_DIR="checkpoints/checkpoint-${TIMESTAMP}"

echo "Creating checkpoint: ${CHECKPOINT_DIR}"
echo "Description: ${DESCRIPTION}"

# Create directory structure
mkdir -p "${CHECKPOINT_DIR}/asterisk-configs"
mkdir -p "${CHECKPOINT_DIR}/public"

# Copy application files
echo "Copying application files..."
cp conference-server.js "${CHECKPOINT_DIR}/"
cp audiosocket-integration.js "${CHECKPOINT_DIR}/"
cp public/dashboard-single.html "${CHECKPOINT_DIR}/"

# Copy Asterisk configuration files
echo "Copying Asterisk configurations..."
sudo cp /etc/asterisk/sip.conf "${CHECKPOINT_DIR}/asterisk-configs/"
sudo cp /etc/asterisk/extensions.conf "${CHECKPOINT_DIR}/asterisk-configs/"
sudo cp /etc/asterisk/modules.conf "${CHECKPOINT_DIR}/asterisk-configs/"
sudo chown -R azureuser:azureuser "${CHECKPOINT_DIR}/asterisk-configs/"

# Create checkpoint info file
cat > "${CHECKPOINT_DIR}/CHECKPOINT_INFO.txt" << EOF
Checkpoint: ${TIMESTAMP}
Created: $(date)
Description: ${DESCRIPTION}

Application Files:
- conference-server.js
- audiosocket-integration.js
- dashboard-single.html

Asterisk Configuration Files:
- sip.conf
- extensions.conf
- modules.conf

System Status at Checkpoint Creation:
- External IP: $(sudo asterisk -rx 'sip show settings' 2>/dev/null | grep externip | head -1)
- SIP Peers: $(sudo asterisk -rx 'sip show peers' 2>/dev/null | grep -E '^(1001|1002)')
- Active Calls: $(sudo asterisk -rx 'core show channels' 2>/dev/null | tail -1)
- Server Process: $(pgrep -f 'node conference-server' || echo 'Not running')

To restore this checkpoint:
  ./restore-checkpoint.sh checkpoint-${TIMESTAMP}
EOF

echo "✓ Checkpoint created: ${CHECKPOINT_DIR}"
echo "Files backed up: 6 total (3 app + 3 asterisk)"
ls -lh "${CHECKPOINT_DIR}"
