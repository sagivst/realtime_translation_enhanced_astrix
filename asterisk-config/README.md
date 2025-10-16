# Asterisk ConfBridge Configuration for Real-Time Translation

This directory contains Asterisk configuration files for Phase 4: ConfBridge Mix-Minus implementation.

## Overview

**Mix-Minus Architecture**: Each participant hears everyone EXCEPT themselves (no echo).

**Translation Flow**:
```
SIP Phone → Asterisk → ARI → Node.js Translation Pipeline → ConfBridge → SIP Phone
```

## Files

### `confbridge.conf`
ConfBridge audio configuration optimized for translation:
- **Sample Rate**: 16kHz (matches frame collector)
- **Mix Interval**: 20ms (matches pipeline granularity)
- **Talking Events**: Enabled for ARI integration
- **Silence Detection**: Disabled to preserve all speech

### `extensions.conf`
Asterisk dialplan routing:
- **Conference Extensions**: 1000, 2000, 3000 (auto-translate)
- **Direct ConfBridge**: 9000+ (no translation, for testing)
- **Stasis Integration**: Routes calls to ARI for translation
- **Echo Test**: Extension 100

## Deployment to Azure VM

### 1. SSH to Azure VM
```bash
ssh azureuser@4.185.84.26
```

### 2. Backup Existing Configuration
```bash
sudo cp /etc/asterisk/confbridge.conf /etc/asterisk/confbridge.conf.backup
sudo cp /etc/asterisk/extensions.conf /etc/asterisk/extensions.conf.backup
```

### 3. Deploy Configuration Files
```bash
# Upload from local machine
scp asterisk-config/confbridge.conf azureuser@4.185.84.26:/tmp/
scp asterisk-config/extensions.conf azureuser@4.185.84.26:/tmp/

# On Azure VM, move to Asterisk config directory
sudo mv /tmp/confbridge.conf /etc/asterisk/
sudo mv /tmp/extensions.conf /etc/asterisk/

# Set permissions
sudo chown asterisk:asterisk /etc/asterisk/confbridge.conf
sudo chown asterisk:asterisk /etc/asterisk/extensions.conf
sudo chmod 644 /etc/asterisk/confbridge.conf
sudo chmod 644 /etc/asterisk/extensions.conf
```

### 4. Reload Asterisk Configuration
```bash
sudo asterisk -rx "dialplan reload"
sudo asterisk -rx "module reload app_confbridge.so"
sudo asterisk -rx "confbridge reload"
```

### 5. Verify Configuration
```bash
# Check dialplan
sudo asterisk -rx "dialplan show translation-conference"

# Check ConfBridge config
sudo asterisk -rx "confbridge show profile bridges"
sudo asterisk -rx "confbridge show profile users"

# Check ARI status
sudo asterisk -rx "ari show status"
```

## Testing

### Test 1: Echo Test
```
Dial: 100
Expected: Hear your own voice echoed back
```

### Test 2: Direct ConfBridge (No Translation)
```
Dial: 9000
Expected: Join conference without translation (for audio quality testing)
```

### Test 3: Translation Conference
```
Phone 1: Dial 1000 (English speaker)
Phone 2: Dial 1000 (Spanish speaker)
Expected: Automatic translation between participants
```

## Conference Rooms

| Extension | Conference ID | Purpose |
|-----------|--------------|---------|
| 1000 | conference-1 | Main translation conference |
| 2000 | conference-2 | Secondary conference |
| 3000 | conference-3 | Test conference |
| 9000+ | direct-conf | Direct ConfBridge (no translation) |

## Architecture

### Mix-Minus Flow

For a 3-participant conference (A, B, C):

**Participant A hears:**
- B's translated speech
- C's translated speech
- NOT A's own voice

**Participant B hears:**
- A's translated speech
- C's translated speech
- NOT B's own voice

**Participant C hears:**
- A's translated speech
- B's translated speech
- NOT C's own voice

### ARI Integration

1. **Call arrives** → Asterisk answers
2. **Stasis app starts** → `translation-conference` ARI application
3. **Node.js receives call** → Creates ConfBridge Manager
4. **Audio routing** → Per-participant mix-minus streams
5. **Translation pipeline** → Frame Collector → ASR → MT → TTS
6. **Audio output** → Pacing Governor → Back to participant

## Monitoring

### Check Active Conferences
```bash
sudo asterisk -rx "confbridge list"
```

### Check Conference Details
```bash
sudo asterisk -rx "confbridge show 1000"
```

### Monitor ARI Events
```bash
sudo asterisk -rx "ari set debug on"
tail -f /var/log/asterisk/messages
```

## Troubleshooting

### Issue: No audio in conference
**Solution**: Check sample rate settings
```bash
sudo asterisk -rx "core show settings" | grep "Sample Rate"
```
Should show: 16000 Hz

### Issue: Echo/feedback
**Solution**: Verify mix-minus is working
```bash
sudo asterisk -rx "confbridge show 1000 verbose"
```
Each participant should NOT hear themselves.

### Issue: Translation not working
**Solution**: Check ARI connection
```bash
# On Node.js server
curl http://localhost:8088/ari/asterisk/info
```

## Performance Tuning

### Optimal Settings
```ini
; In confbridge.conf
internal_sample_rate=16000  ; Matches frame collector
mixing_interval=20          ; Matches 20ms frames
dsp_drop_silence=no         ; Preserve all speech
```

### CPU Usage
Monitor with:
```bash
top -p $(pgrep asterisk)
```

Expected CPU: <5% per participant with mix-minus

## Security

### Firewall Rules (Azure VM)
```bash
# Allow SIP (UDP 5060)
sudo ufw allow 5060/udp

# Allow RTP (UDP 10000-20000)
sudo ufw allow 10000:20000/udp

# Allow ARI (TCP 8088 - localhost only)
# (No firewall rule needed - ARI should only listen on localhost)
```

## Next Steps

1. ✅ Deploy configuration to Azure VM
2. ✅ Test echo extension (100)
3. ✅ Test direct ConfBridge (9000)
4. ⏳ Test translation conference (1000) with 2+ participants
5. ⏳ Monitor latency and audio quality
6. ⏳ Optimize for production

## References

- **ConfBridge Documentation**: https://wiki.asterisk.org/wiki/display/AST/ConfBridge
- **ARI Documentation**: https://wiki.asterisk.org/wiki/display/AST/Asterisk+REST+Interface
- **Project Spec**: `../HAsterisk_HumeEVI_Spec.md`
- **Phase Status**: `../PHASE_1_2_STATUS.md`
