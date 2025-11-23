#!/bin/bash
# Live monitoring script for PCM audio flow

echo "==================================="
echo "LIVE PCM AUDIO MONITORING"
echo "==================================="
echo ""
echo "Watching for audio packets..."
echo "Make a call to extension 3333 to test"
echo ""
echo "Press Ctrl+C to stop monitoring"
echo "-----------------------------------"

ssh azureuser@20.170.155.53 'tail -f /tmp/sttttserver-clean.log /tmp/gateway-3333-clean.log /tmp/gateway-4444-clean.log 2>/dev/null | grep --line-buffered -E "UDP-|PCM sample|Stripping RTP|Adding RTP|Transcribed|Translated|Asterisk connected|bytes|Translation complete|ERROR"'