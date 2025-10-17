#!/bin/bash

# Deploy SIP Users to Azure Asterisk Server
# This script uploads user configuration and reloads PJSIP

set -e

ASTERISK_IP="4.185.84.26"
ASTERISK_USER="azureuser"

echo "========================================"
echo "Deploying SIP User Configuration"
echo "========================================"
echo ""

# Step 1: Upload configuration
echo "Step 1: Uploading pjsip_users.conf..."
scp pjsip_users.conf ${ASTERISK_USER}@${ASTERISK_IP}:~/

# Step 2: Backup existing configuration
echo ""
echo "Step 2: Backing up existing pjsip.conf..."
ssh ${ASTERISK_USER}@${ASTERISK_IP} "sudo cp /etc/asterisk/pjsip.conf /etc/asterisk/pjsip.conf.backup-\$(date +%Y%m%d-%H%M%S)"

# Step 3: Check if pjsip.conf includes users file
echo ""
echo "Step 3: Checking pjsip.conf for include directive..."
ssh ${ASTERISK_USER}@${ASTERISK_IP} "grep -q '#include pjsip_users.conf' /etc/asterisk/pjsip.conf || echo '#include pjsip_users.conf' | sudo tee -a /etc/asterisk/pjsip.conf"

# Step 4: Copy uploaded file to Asterisk config directory
echo ""
echo "Step 4: Installing pjsip_users.conf..."
ssh ${ASTERISK_USER}@${ASTERISK_IP} "sudo cp ~/pjsip_users.conf /etc/asterisk/pjsip_users.conf"
ssh ${ASTERISK_USER}@${ASTERISK_IP} "sudo chown asterisk:asterisk /etc/asterisk/pjsip_users.conf"
ssh ${ASTERISK_USER}@${ASTERISK_IP} "sudo chmod 644 /etc/asterisk/pjsip_users.conf"

# Step 5: Reload PJSIP
echo ""
echo "Step 5: Reloading PJSIP module..."
ssh ${ASTERISK_USER}@${ASTERISK_IP} "sudo asterisk -rx 'pjsip reload'"

# Step 6: Verify users are registered
echo ""
echo "Step 6: Verifying PJSIP endpoints..."
ssh ${ASTERISK_USER}@${ASTERISK_IP} "sudo asterisk -rx 'pjsip show endpoints'"

echo ""
echo "========================================"
echo "✅ Deployment Complete!"
echo "========================================"
echo ""
echo "Users configured:"
echo "  • user1 / Translation2025!"
echo "  • user2 / RealTime2025!"
echo "  • user3 / MultiLang2025!"
echo "  • guest (no password)"
echo ""
echo "Test by registering with:"
echo "  Server: ${ASTERISK_IP}:5060"
echo "  Username: user1"
echo "  Password: Translation2025!"
echo ""
