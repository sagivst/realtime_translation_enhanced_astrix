# Monitoring Dashboard Deployment Instructions

**Target**: Azure Dev VM 20.170.155.53 (Port 3021)
**File**: monitoring-tree-dashboard-enhanced.html
**Date**: November 29, 2025

## ⚠️ IMPORTANT SAFETY REMINDERS

- **ONLY** work on DEV VM: 20.170.155.53
- **NEVER** touch PRODUCTION: 4.185.84.26
- **ONLY** modify files in monitoring partition
- **DO NOT** modify STTTTSserver.js

---

## 📋 DEPLOYMENT STEPS

### Step 1: Backup Current Dashboard

```bash
# Connect to dev VM
ssh azureuser@20.170.155.53

# Navigate to public directory
cd /home/azureuser/translation-app/3333_4444__Operational/STTTTSserver/public/

# Backup existing dashboard (if it exists)
cp monitoring-tree-dashboard.html monitoring-tree-dashboard.html.backup-$(date +%Y%m%d-%H%M%S)
```

### Step 2: Deploy New Dashboard

From your local machine:

```bash
# Copy the enhanced dashboard to the dev VM
scp /Users/sagivstavinsky/realtime-translation-enhanced_astrix/monitoring-tree-dashboard-enhanced.html \
    azureuser@20.170.155.53:/home/azureuser/translation-app/3333_4444__Operational/STTTTSserver/public/monitoring-tree-dashboard.html
```

### Step 3: Verify Deployment

```bash
# On the dev VM, verify the file
ssh azureuser@20.170.155.53 "ls -la /home/azureuser/translation-app/3333_4444__Operational/STTTTSserver/public/monitoring-tree-dashboard.html"
```

### Step 4: Check Monitoring Server Status

```bash
# Ensure monitoring server is running on port 3021
ssh azureuser@20.170.155.53 "ps aux | grep monitoring-server | grep -v grep"

# If not running, start it:
ssh azureuser@20.170.155.53 "cd /home/azureuser/translation-app/3333_4444__Operational/STTTTSserver && nohup node monitoring-server.js > /tmp/monitoring-server.log 2>&1 &"
```

### Step 5: Access the Dashboard

Open your browser and navigate to:
```
http://20.170.155.53:3021/monitoring-tree-dashboard.html
```

---

## 🎯 FEATURES IMPLEMENTED

### Level 1: Station Grid View
- ✅ **11 monitoring stations** configured (was 8)
- ✅ **Dark professional theme** (backoffice style)
- ✅ **Voice/Text badges** to distinguish station types
- ✅ **Real-time status indicators** with pulse animation
- ✅ **Quick metrics display** (Buffer, Latency, Packets, CPU)
- ✅ **System-wide statistics bar**
- ✅ **WebSocket connection status**

### Level 2: Expanded Station View
- ✅ **Full-screen station details**
- ✅ **55 parameter boxes** per station
- ✅ **Parameter categorization** (Buffer, Latency, Packet, Audio, Performance, Custom)
- ✅ **Color-coded status** (green/yellow/red)
- ✅ **Click to edit parameters**
- ✅ **Back navigation to grid**

### Level 3: Parameter Edit Mode
- ✅ **Modal editor for parameters**
- ✅ **Parameter path display**
- ✅ **Legal ranges configuration**
- ✅ **Threshold settings** (Warning/Critical)
- ✅ **Save/Reset/Cancel actions**
- ✅ **Keyboard shortcuts** (ESC to close)

---

## 🔧 STATION CONFIGURATION

The 11 stations are configured as follows:

### Voice Stations (8)
1. **Station 1**: Asterisk RTP (voice)
2. **Station 2**: Gateway RX (voice)
3. **Station 3**: STT Processing (voice)
4. **Station 4**: Deepgram API (voice)
8. **Station 8**: ElevenLabs TTS (voice)
9. **Station 9**: STT Server TX (voice)
10. **Station 10**: Gateway TX (voice)
11. **Station 11**: Hume EVI (voice)

### Text Stations (3)
5. **Station 5**: Translation Prep (text)
6. **Station 6**: DeepL API (text)
7. **Station 7**: TTS Prep (text)

---

## 🎨 UI/UX FEATURES

### Dark Theme Colors
- Background: #0a0a0a (primary), #1a1a1a (secondary)
- Text: #e0e0e0 (primary), #a0a0a0 (secondary)
- Success: #00c851 (green)
- Warning: #ffbb33 (orange)
- Danger: #ff3547 (red)
- Info: #33b5e5 (blue)

### Responsive Design
- Desktop: 4 columns
- Tablet: 3 columns
- Mobile: 1 column

### Interactions
- Hover effects on station boxes
- Click to expand station
- ESC key to close modals
- Smooth transitions

---

## 🔌 WEBSOCKET CONNECTION

The dashboard connects to:
```javascript
socket = io('http://20.170.155.53:3021')
```

Expected events:
- `stations-state`: Initial station configuration
- `station-update`: Real-time metric updates
- `connect/disconnect`: Connection status

---

## 🧪 TEST MODE

If the WebSocket connection fails, the dashboard automatically enters test mode:
- Simulates 5 active stations
- Generates random metrics
- Updates every second
- Useful for UI testing without backend

---

## 📝 NEXT STEPS

### Backend Integration
1. Update `monitoring-server.js` to support 11 stations
2. Add parameter configuration endpoints
3. Implement parameter file storage
4. Add real metric collection from STTTTSserver

### Frontend Enhancements
1. Add audio waveform visualizations
2. Implement data export functionality
3. Add historical graphs
4. Create alert notifications

### Configuration System
1. Create parameter configuration files
2. Implement threshold management
3. Add default value system
4. Create change history logging

---

## ⚠️ TROUBLESHOOTING

### Dashboard not loading
```bash
# Check if file exists
ssh azureuser@20.170.155.53 "ls -la /home/azureuser/translation-app/3333_4444__Operational/STTTTSserver/public/"

# Check monitoring server logs
ssh azureuser@20.170.155.53 "tail -f /tmp/monitoring-server.log"
```

### WebSocket not connecting
```bash
# Check if monitoring server is running
ssh azureuser@20.170.155.53 "netstat -tuln | grep 3021"

# Restart monitoring server
ssh azureuser@20.170.155.53 "pkill -f monitoring-server.js"
ssh azureuser@20.170.155.53 "cd /home/azureuser/translation-app/3333_4444__Operational/STTTTSserver && nohup node monitoring-server.js > /tmp/monitoring-server.log 2>&1 &"
```

### No data showing
- Check browser console for errors
- Verify WebSocket connection status (top right indicator)
- Dashboard will show test data if not connected

---

## ✅ VERIFICATION CHECKLIST

After deployment, verify:

- [ ] Dashboard loads at http://20.170.155.53:3021/monitoring-tree-dashboard.html
- [ ] All 11 stations are visible
- [ ] Dark theme is applied
- [ ] Click on station expands to Level 2
- [ ] 55 parameters shown in expanded view
- [ ] Click on parameter opens edit modal
- [ ] ESC key closes modals
- [ ] Connection status indicator works
- [ ] System stats update in header

---

**Document End**
**Ready for deployment to 20.170.155.53**