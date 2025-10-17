#!/bin/bash

# Fix Mobile Audio Issues
# This script configures Asterisk for mobile NAT traversal

set -e

ASTERISK_IP="4.185.84.26"
ASTERISK_USER="azureuser"

echo "========================================"
echo "Fixing Mobile Audio Configuration"
echo "========================================"
echo ""

# Step 1: Backup current RTP config
echo "Step 1: Backing up rtp.conf..."
ssh ${ASTERISK_USER}@${ASTERISK_IP} "sudo cp /etc/asterisk/rtp.conf /etc/asterisk/rtp.conf.backup-\$(date +%Y%m%d-%H%M%S) 2>/dev/null || true"

# Step 2: Upload new RTP config
echo ""
echo "Step 2: Uploading mobile-friendly RTP configuration..."
scp rtp-mobile.conf ${ASTERISK_USER}@${ASTERISK_IP}:~/
ssh ${ASTERISK_USER}@${ASTERISK_IP} "sudo cp ~/rtp-mobile.conf /etc/asterisk/rtp.conf"
ssh ${ASTERISK_USER}@${ASTERISK_IP} "sudo chown asterisk:asterisk /etc/asterisk/rtp.conf"
ssh ${ASTERISK_USER}@${ASTERISK_IP} "sudo chmod 644 /etc/asterisk/rtp.conf"

# Step 3: Check if pjsip.conf already has transport
echo ""
echo "Step 3: Checking PJSIP transport configuration..."
TRANSPORT_EXISTS=$(ssh ${ASTERISK_USER}@${ASTERISK_IP} "sudo grep -c 'type=transport' /etc/asterisk/pjsip.conf || echo 0")

if [ "$TRANSPORT_EXISTS" -eq "0" ]; then
    echo "Adding transport configuration..."
    scp pjsip-transport-mobile.conf ${ASTERISK_USER}@${ASTERISK_IP}:~/
    ssh ${ASTERISK_USER}@${ASTERISK_IP} "sudo cat ~/pjsip-transport-mobile.conf | sudo tee -a /etc/asterisk/pjsip.conf > /dev/null"
else
    echo "Transport already configured, updating external addresses..."
    ssh ${ASTERISK_USER}@${ASTERISK_IP} "sudo sed -i 's/^external_media_address=.*/external_media_address=4.185.84.26/' /etc/asterisk/pjsip.conf || true"
    ssh ${ASTERISK_USER}@${ASTERISK_IP} "sudo sed -i 's/^external_signaling_address=.*/external_signaling_address=4.185.84.26/' /etc/asterisk/pjsip.conf || true"
fi

# Step 4: Reload modules
echo ""
echo "Step 4: Reloading Asterisk modules..."
ssh ${ASTERISK_USER}@${ASTERISK_IP} "sudo asterisk -rx 'rtp reload'"
ssh ${ASTERISK_USER}@${ASTERISK_IP} "sudo asterisk -rx 'pjsip reload'"

# Step 5: Verify settings
echo ""
echo "Step 5: Verifying RTP configuration..."
ssh ${ASTERISK_USER}@${ASTERISK_IP} "sudo asterisk -rx 'rtp show settings'"

echo ""
echo "========================================"
echo "✅ Mobile Audio Fix Complete!"
echo "========================================"
echo ""
echo "Changes made:"
echo "  ✅ RTP ports: 10000-20000 (matches Azure firewall)"
echo "  ✅ Strict RTP: Disabled (better for mobile NAT)"
echo "  ✅ ICE support: Enabled"
echo "  ✅ External IP: 4.185.84.26 (for NAT traversal)"
echo ""
echo "Try your mobile client now:"
echo "  1. Register with user1 / Translation2025!"
echo "  2. Dial 100 for echo test"
echo "  3. You should now hear echo!"
echo ""
