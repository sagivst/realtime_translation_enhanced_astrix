#!/bin/bash
# Comprehensive Checkpoint Restore Script

if [ -z "$1" ]; then
    echo "Usage: ./restore-checkpoint.sh <checkpoint-directory>"
    echo ""
    echo "Available checkpoints:"
    ls -1 checkpoints/ | grep checkpoint-
    exit 1
fi

CHECKPOINT="$1"
CHECKPOINT_PATH="checkpoints/${CHECKPOINT}"

if [ ! -d "${CHECKPOINT_PATH}" ]; then
    echo "Error: Checkpoint not found: ${CHECKPOINT_PATH}"
    exit 1
fi

echo "========================================="
echo "CHECKPOINT RESTORE"
echo "========================================="
echo "Checkpoint: ${CHECKPOINT}"
echo ""

# Show checkpoint info if available
if [ -f "${CHECKPOINT_PATH}/CHECKPOINT_INFO.txt" ]; then
    echo "Checkpoint Information:"
    cat "${CHECKPOINT_PATH}/CHECKPOINT_INFO.txt"
    echo ""
fi

read -p "Do you want to restore APPLICATION files? (y/n): " -n 1 -r APP_RESTORE
echo ""

read -p "Do you want to restore ASTERISK configs? (y/n): " -n 1 -r AST_RESTORE
echo ""

# Restore application files
if [[ $APP_RESTORE =~ ^[Yy]$ ]]; then
    echo "Restoring application files..."
    
    # Backup current files
    BACKUP_DIR="backups/pre-restore-$(date +%Y%m%d-%H%M%S)"
    mkdir -p "${BACKUP_DIR}"
    cp conference-server.js "${BACKUP_DIR}/" 2>/dev/null
    cp audiosocket-integration.js "${BACKUP_DIR}/" 2>/dev/null
    cp public/dashboard-single.html "${BACKUP_DIR}/" 2>/dev/null
    echo "  ✓ Current files backed up to: ${BACKUP_DIR}"
    
    # Restore from checkpoint
    cp "${CHECKPOINT_PATH}/conference-server.js" .
    cp "${CHECKPOINT_PATH}/audiosocket-integration.js" .
    cp "${CHECKPOINT_PATH}/dashboard-single.html" public/ 2>/dev/null || cp "${CHECKPOINT_PATH}/dashboard-single.html" public/
    echo "  ✓ Application files restored"
    
    # Restart server
    echo "  Restarting Node.js server..."
    pkill -9 node
    sleep 2
    nohup node conference-server.js > /tmp/server-restored.log 2>&1 &
    sleep 3
    if pgrep -f 'node conference-server' > /dev/null; then
        echo "  ✓ Server restarted successfully"
    else
        echo "  ✗ Server failed to start - check /tmp/server-restored.log"
    fi
fi

# Restore Asterisk configs
if [[ $AST_RESTORE =~ ^[Yy]$ ]]; then
    echo "Restoring Asterisk configurations..."
    
    if [ ! -d "${CHECKPOINT_PATH}/asterisk-configs" ]; then
        echo "  ✗ No Asterisk configs found in this checkpoint"
    else
        # Backup current configs
        sudo mkdir -p /etc/asterisk/backups
        BACKUP_TIMESTAMP=$(date +%Y%m%d-%H%M%S)
        sudo cp /etc/asterisk/sip.conf "/etc/asterisk/backups/sip.conf.${BACKUP_TIMESTAMP}"
        sudo cp /etc/asterisk/extensions.conf "/etc/asterisk/backups/extensions.conf.${BACKUP_TIMESTAMP}"
        sudo cp /etc/asterisk/modules.conf "/etc/asterisk/backups/modules.conf.${BACKUP_TIMESTAMP}"
        echo "  ✓ Current configs backed up to /etc/asterisk/backups/"
        
        # Restore from checkpoint
        sudo cp "${CHECKPOINT_PATH}/asterisk-configs/sip.conf" /etc/asterisk/
        sudo cp "${CHECKPOINT_PATH}/asterisk-configs/extensions.conf" /etc/asterisk/
        sudo cp "${CHECKPOINT_PATH}/asterisk-configs/modules.conf" /etc/asterisk/
        echo "  ✓ Asterisk configs restored"
        
        # Restart Asterisk
        echo "  Restarting Asterisk..."
        sudo systemctl restart asterisk
        sleep 5
        
        if sudo systemctl is-active --quiet asterisk; then
            echo "  ✓ Asterisk restarted successfully"
            echo ""
            echo "  SIP Peers Status:"
            sudo asterisk -rx 'sip show peers' | grep -E '^(Name|1001|1002)'
        else
            echo "  ✗ Asterisk failed to restart - check logs"
        fi
    fi
fi

echo ""
echo "========================================="
echo "RESTORE COMPLETE"
echo "========================================="
