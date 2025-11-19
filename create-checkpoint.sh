#!/bin/bash
# Full Directory Checkpoint Creation Script - v8.1
# Backs up ENTIRE /home/azureuser/translation-app/ directory
# PLUS Asterisk, Homer, and Grafana configurations
# Excludes: node_modules, checkpoints, .git, large logs

DESCRIPTION="${1:-Manual checkpoint}"
TIMESTAMP=$(date +%Y%m%d-%H%M%S)
CHECKPOINT_DIR="checkpoints/checkpoint-${TIMESTAMP}"
SOURCE_DIR="/home/azureuser/translation-app"

echo "========================================="
echo "FULL DIRECTORY CHECKPOINT v8.1"
echo "========================================="
echo "Creating checkpoint: ${CHECKPOINT_DIR}"
echo "Description: ${DESCRIPTION}"
echo "Source: ${SOURCE_DIR}"
echo ""

# Create checkpoint directory
mkdir -p "${CHECKPOINT_DIR}"

echo "Copying entire directory (excluding node_modules, checkpoints, .git, logs)..."
rsync -a \
  --exclude "checkpoints/" \
  --exclude "node_modules/" \
  --exclude ".git/" \
  --exclude "*.log" \
  --exclude "*.wav" \
  --exclude "*.tar.gz" \
  --exclude "*.backup" \
  --exclude "*.bak" \
  --exclude "*.old" \
  --exclude "*.tmp" \
  --exclude ".DS_Store" \
  "${SOURCE_DIR}/" "${CHECKPOINT_DIR}/"

# Copy Asterisk configuration files
echo ""
echo "Copying Asterisk configurations..."
mkdir -p "${CHECKPOINT_DIR}/asterisk-configs"
sudo cp /etc/asterisk/sip.conf "${CHECKPOINT_DIR}/asterisk-configs/" 2>/dev/null
sudo cp /etc/asterisk/extensions.conf "${CHECKPOINT_DIR}/asterisk-configs/" 2>/dev/null
sudo cp /etc/asterisk/modules.conf "${CHECKPOINT_DIR}/asterisk-configs/" 2>/dev/null
sudo cp /etc/asterisk/ari.conf "${CHECKPOINT_DIR}/asterisk-configs/" 2>/dev/null
sudo cp /etc/asterisk/http.conf "${CHECKPOINT_DIR}/asterisk-configs/" 2>/dev/null
sudo cp /etc/asterisk/pjsip.conf "${CHECKPOINT_DIR}/asterisk-configs/" 2>/dev/null
sudo cp /etc/asterisk/pjsip_users.conf "${CHECKPOINT_DIR}/asterisk-configs/" 2>/dev/null
sudo cp /etc/asterisk/rtp.conf "${CHECKPOINT_DIR}/asterisk-configs/" 2>/dev/null
sudo chown -R azureuser:azureuser "${CHECKPOINT_DIR}/asterisk-configs/" 2>/dev/null

# Copy Homer configurations
echo ""
echo "Copying Homer configurations..."
mkdir -p "${CHECKPOINT_DIR}/homer-configs"

# Homer App config
if [ -f /opt/homer-app/homer-app.yaml ]; then
  sudo cp /opt/homer-app/homer-app.yaml "${CHECKPOINT_DIR}/homer-configs/" 2>/dev/null
  echo "  ✓ homer-app.yaml"
fi

# Homer Docker configs
if [ -d /opt/homer-docker/all-in-one ]; then
  sudo rsync -a --exclude "*.log" --exclude "data/" /opt/homer-docker/all-in-one/ "${CHECKPOINT_DIR}/homer-configs/homer-docker-all-in-one/" 2>/dev/null
  echo "  ✓ Homer Docker configs"
fi

# Homer UI config (only config files, not node_modules)
if [ -d /opt/homer-ui ]; then
  mkdir -p "${CHECKPOINT_DIR}/homer-configs/homer-ui"
  sudo cp /opt/homer-ui/package.json "${CHECKPOINT_DIR}/homer-configs/homer-ui/" 2>/dev/null
  sudo cp /opt/homer-ui/package-lock.json "${CHECKPOINT_DIR}/homer-configs/homer-ui/" 2>/dev/null
  sudo cp /opt/homer-ui/.env* "${CHECKPOINT_DIR}/homer-configs/homer-ui/" 2>/dev/null
  echo "  ✓ Homer UI configs"
fi

sudo chown -R azureuser:azureuser "${CHECKPOINT_DIR}/homer-configs/" 2>/dev/null

# Copy Grafana configurations
echo ""
echo "Copying Grafana configurations..."
mkdir -p "${CHECKPOINT_DIR}/grafana-configs"

if [ -d /etc/grafana ]; then
  sudo rsync -a --exclude "*.log" --exclude "data/" /etc/grafana/ "${CHECKPOINT_DIR}/grafana-configs/" 2>/dev/null
  echo "  ✓ Grafana configs"
fi

sudo chown -R azureuser:azureuser "${CHECKPOINT_DIR}/grafana-configs/" 2>/dev/null

# Count files and calculate size
FILE_COUNT=$(find "${CHECKPOINT_DIR}" -type f | wc -l)
DIR_SIZE=$(du -sh "${CHECKPOINT_DIR}" | awk '{print $1}')

# Get directory listing
JS_FILES=$(find "${CHECKPOINT_DIR}" -name "*.js" -type f 2>/dev/null | sed "s|${CHECKPOINT_DIR}/||" | sort)
HTML_FILES=$(find "${CHECKPOINT_DIR}" -name "*.html" -type f 2>/dev/null | sed "s|${CHECKPOINT_DIR}/||" | sort)
SH_FILES=$(find "${CHECKPOINT_DIR}" -name "*.sh" -type f 2>/dev/null | sed "s|${CHECKPOINT_DIR}/||" | sort)

# Create comprehensive checkpoint info file
cat > "${CHECKPOINT_DIR}/CHECKPOINT_INFO.txt" << 'INFO_EOF'
========================================
FULL DIRECTORY CHECKPOINT v8.1
========================================
CHECKPOINT_INFO_HEADER

=== BACKUP TYPE ===
Type: FULL DIRECTORY BACKUP + System Configs
Source: /home/azureuser/translation-app/
Method: rsync with exclusions

=== EXCLUDED FROM BACKUP ===
- node_modules/ (can regenerate with npm install)
- checkpoints/ (don't backup backups)
- .git/ (git handles version control)
- *.log files (logs can be regenerated)
- *.wav files (temporary audio files)
- *.backup, *.bak, *.old, *.tmp files
- Homer/Grafana data directories (too large, regenerated)

=== INCLUDED IN BACKUP ===
✓ ALL JavaScript files (*.js)
✓ ALL HTML files (*.html)
✓ ALL configuration files (.env, package.json, etc.)
✓ ALL shell scripts (*.sh)
✓ ALL subdirectories (public/, 7777-8888-stack/, etc.)
✓ ALL Asterisk configurations (/etc/asterisk/*.conf)
✓ ALL Homer configurations (/opt/homer-app/, /opt/homer-docker/, /opt/homer-ui/)
✓ ALL Grafana configurations (/etc/grafana/)
✓ ANY new files added to the directory

=== ASTERISK CONFIGURATION FILES ===
- sip.conf
- extensions.conf
- modules.conf
- ari.conf
- http.conf
- pjsip.conf
- pjsip_users.conf
- rtp.conf

=== HOMER CONFIGURATION FILES ===
- homer-app.yaml
- Homer Docker all-in-one setup
- Homer UI configuration files

=== GRAFANA CONFIGURATION FILES ===
- grafana.ini
- Provisioning configs
- Dashboard configs

FILE_LISTINGS

=== TO RESTORE THIS CHECKPOINT ===
  ./restore-checkpoint.sh checkpoint-CHECKPOINT_TIMESTAMP

=== NOTES ===
- This is a FULL directory backup (v8.1)
- All files are captured automatically
- New files added to the directory are automatically included
- After restore, run: cd /home/azureuser/translation-app && npm install
- System configs (Asterisk/Homer/Grafana) will be restored to their original locations
INFO_EOF

# Replace placeholders in CHECKPOINT_INFO.txt
sed -i "s|CHECKPOINT_INFO_HEADER|Checkpoint: ${TIMESTAMP}\nCreated: $(date)\nDescription: ${DESCRIPTION}\nTotal Files: ${FILE_COUNT}\nTotal Size: ${DIR_SIZE}|" "${CHECKPOINT_DIR}/CHECKPOINT_INFO.txt"
sed -i "s|CHECKPOINT_TIMESTAMP|${TIMESTAMP}|" "${CHECKPOINT_DIR}/CHECKPOINT_INFO.txt"

# Add file listings
echo "" >> "${CHECKPOINT_DIR}/CHECKPOINT_INFO.txt"
echo "=== FILE LISTING ===" >> "${CHECKPOINT_DIR}/CHECKPOINT_INFO.txt"
echo "JavaScript Files: $(echo "$JS_FILES" | wc -l) files" >> "${CHECKPOINT_DIR}/CHECKPOINT_INFO.txt"
echo "HTML Files: $(echo "$HTML_FILES" | wc -l) files" >> "${CHECKPOINT_DIR}/CHECKPOINT_INFO.txt"
echo "Shell Scripts: $(echo "$SH_FILES" | wc -l) files" >> "${CHECKPOINT_DIR}/CHECKPOINT_INFO.txt"

echo ""
echo "========================================="
echo "✓ Checkpoint created: ${CHECKPOINT_DIR}"
echo "✓ Files backed up: ${FILE_COUNT}"
echo "✓ Total size: ${DIR_SIZE}"
echo "✓ Includes: Asterisk + Homer + Grafana configs"
echo "========================================="
