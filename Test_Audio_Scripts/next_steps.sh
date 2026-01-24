#!/bin/bash

echo "=== NEXT STEPS FOR 25-MINUTE TEST ==="
echo ""

# Step 1: Convert to Asterisk format
echo "1. Converting audio to Asterisk format (8kHz mono WAV)..."
cd /Users/sagivstavinsky/realtime-translation-enhanced_astrix/Test_Audio_Scripts/

ffmpeg -i english_3333.aiff -acodec pcm_s16le -ac 1 -ar 8000 english_3333_25min.wav
ffmpeg -i french_4444.aiff -acodec pcm_s16le -ac 1 -ar 8000 french_4444_25min.wav

echo "✅ Conversion complete"
echo ""

# Step 2: Upload to server
echo "2. Uploading to Asterisk server..."
scp english_3333_25min.wav azureuser@20.170.155.53:/tmp/
scp french_4444_25min.wav azureuser@20.170.155.53:/tmp/

echo "✅ Upload complete"
echo ""

# Step 3: Install on Asterisk
echo "3. Run these commands on the server:"
echo "ssh azureuser@20.170.155.53"
echo ""
echo "# Move files to Asterisk sounds directory"
echo "sudo mv /tmp/*_25min.wav /var/lib/asterisk/sounds/"
echo "sudo chown asterisk:asterisk /var/lib/asterisk/sounds/*_25min.wav"
echo ""
echo "# Configure music on hold"
echo "sudo nano /etc/asterisk/musiconhold.conf"
echo "# Add these sections:"
echo "[test_3333]"
echo "mode=files"
echo "directory=/var/lib/asterisk/sounds"
echo "application=/usr/bin/mpg123 -q -s --mono -r 8000 -f 8192"
echo ""
echo "[test_4444]"  
echo "mode=files"
echo "directory=/var/lib/asterisk/sounds"
echo "application=/usr/bin/mpg123 -q -s --mono -r 8000 -f 8192"
echo ""
echo "# Reload Asterisk"
echo "sudo asterisk -rx 'moh reload'"
echo "sudo asterisk -rx 'dialplan reload'"
