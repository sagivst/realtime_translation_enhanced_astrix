#!/bin/bash

# Script to generate 25-minute test audio files for extensions 3333 and 4444
# This will create audio files that can be used as hold music for testing

echo "=== GENERATING 25-MINUTE TEST AUDIO FILES ==="
echo ""
echo "This script provides multiple options to create test audio:"
echo ""

# Option 1: Using macOS 'say' command (if on Mac)
if [[ "$OSTYPE" == "darwin"* ]]; then
    echo "Option 1: Generate using macOS text-to-speech"
    echo "----------------------------------------"

    # English audio for 3333
    echo "Generating English audio (25 minutes)..."
    say -v Daniel -f english_25min_script.txt -o english_3333_25min.aiff
    # Convert to WAV for Asterisk
    ffmpeg -i english_3333_25min.aiff -acodec pcm_s16le -ac 1 -ar 8000 english_3333_25min.wav

    # French audio for 4444
    echo "Generating French audio (25 minutes)..."
    say -v Thomas -f french_25min_script.txt -o french_4444_25min.aiff
    # Convert to WAV for Asterisk
    ffmpeg -i french_4444_25min.aiff -acodec pcm_s16le -ac 1 -ar 8000 french_4444_25min.wav

    echo "✓ Audio files generated"
fi

# Option 2: Using gTTS (Google Text-to-Speech)
echo ""
echo "Option 2: Generate using Google TTS (requires gtts-cli)"
echo "----------------------------------------"
echo "Install: pip install gtts"
echo ""
echo "Commands:"
echo "gtts-cli -f english_25min_script.txt -l en -o english_3333_25min.mp3"
echo "gtts-cli -f french_25min_script.txt -l fr -o french_4444_25min.mp3"
echo ""
echo "Then convert to WAV:"
echo "ffmpeg -i english_3333_25min.mp3 -acodec pcm_s16le -ac 1 -ar 8000 english_3333_25min.wav"
echo "ffmpeg -i french_4444_25min.mp3 -acodec pcm_s16le -ac 1 -ar 8000 french_4444_25min.wav"

# Option 3: Using espeak
echo ""
echo "Option 3: Generate using espeak (cross-platform)"
echo "----------------------------------------"
echo "Install: apt-get install espeak (Linux) or brew install espeak (Mac)"
echo ""
echo "Commands:"
echo "espeak -f english_25min_script.txt -w english_3333_25min_raw.wav"
echo "espeak -v fr -f french_25min_script.txt -w french_4444_25min_raw.wav"
echo ""
echo "Then convert to Asterisk format:"
echo "sox english_3333_25min_raw.wav -r 8000 -c 1 english_3333_25min.wav"
echo "sox french_4444_25min_raw.wav -r 8000 -c 1 french_4444_25min.wav"

# Option 4: Generate test tones with speech markers
echo ""
echo "Option 4: Generate test pattern with sox (no TTS needed)"
echo "----------------------------------------"
echo "This creates a 25-minute audio with tone patterns and markers:"
echo ""

# English test pattern
cat > generate_english_pattern.sh << 'EOF'
#!/bin/bash
# Generate 25-minute test audio with markers every minute

for i in {0..24}; do
    # Generate 1-minute segment with tone
    sox -n -r 8000 -c 1 segment_$i.wav synth 55 sine 440 fade 0.1 55 0.1

    # Add 5-second marker tone at different frequency
    sox -n -r 8000 -c 1 marker_$i.wav synth 5 sine 880

    # Combine
    sox segment_$i.wav marker_$i.wav minute_$i.wav
done

# Concatenate all minutes
sox minute_*.wav english_3333_25min.wav

# Clean up
rm segment_*.wav marker_*.wav minute_*.wav
EOF

# French test pattern (different frequencies)
cat > generate_french_pattern.sh << 'EOF'
#!/bin/bash
# Generate 25-minute test audio with different tone pattern

for i in {0..24}; do
    # Generate 1-minute segment with different tone
    sox -n -r 8000 -c 1 segment_$i.wav synth 55 sine 550 fade 0.1 55 0.1

    # Add 5-second marker tone
    sox -n -r 8000 -c 1 marker_$i.wav synth 5 sine 990

    # Combine
    sox segment_$i.wav marker_$i.wav minute_$i.wav
done

# Concatenate all minutes
sox minute_*.wav french_4444_25min.wav

# Clean up
rm segment_*.wav marker_*.wav minute_*.wav
EOF

chmod +x generate_english_pattern.sh generate_french_pattern.sh

echo "Generated pattern scripts. Run:"
echo "./generate_english_pattern.sh"
echo "./generate_french_pattern.sh"

echo ""
echo "=== UPLOADING TO ASTERISK SERVER ==="
echo ""
echo "Once audio files are generated, upload to Asterisk server:"
echo ""
echo "scp english_3333_25min.wav azureuser@20.170.155.53:/tmp/"
echo "scp french_4444_25min.wav azureuser@20.170.155.53:/tmp/"
echo ""
echo "Then on the server, move to Asterisk sounds:"
echo "sudo mv /tmp/english_3333_25min.wav /var/lib/asterisk/sounds/"
echo "sudo mv /tmp/french_4444_25min.wav /var/lib/asterisk/sounds/"
echo "sudo chown asterisk:asterisk /var/lib/asterisk/sounds/*_25min.wav"

echo ""
echo "=== CONFIGURING ASTERISK HOLD MUSIC ==="
echo ""
cat > asterisk_musiconhold.conf << 'EOF'
; Add to /etc/asterisk/musiconhold.conf

[3333_test]
mode=files
directory=/var/lib/asterisk/sounds
; Play english_3333_25min.wav on loop

[4444_test]
mode=files
directory=/var/lib/asterisk/sounds
; Play french_4444_25min.wav on loop
EOF

echo "Configuration for musiconhold.conf created."
echo ""
echo "=== ASTERISK DIALPLAN UPDATE ==="
echo ""
cat > asterisk_test_dialplan.conf << 'EOF'
; Add to /etc/asterisk/extensions.conf

; Test extensions with 25-minute hold music
exten => 3333,1,NoOp(Starting 25-minute test for English)
 same => n,Answer()
 same => n,MusicOnHold(3333_test)
 same => n,Hangup()

exten => 4444,1,NoOp(Starting 25-minute test for French)
 same => n,Answer()
 same => n,MusicOnHold(4444_test)
 same => n,Hangup()
EOF

echo "Dialplan configuration created."
echo ""
echo "After configuration, reload Asterisk:"
echo "asterisk -rx 'moh reload'"
echo "asterisk -rx 'dialplan reload'"
echo ""
echo "Then dial 3333 and 4444 to start the 25-minute test!"