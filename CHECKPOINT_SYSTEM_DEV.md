# 📦 Checkpoint System - Development VM

**Server**: DEV VM (20.170.155.53)  
**VM Name**: asterisk-dev-vm-clone  
**Last Updated**: 2025-10-28  
**Version**: 1.0

---

## 🎯 Overview

Automatic checkpoint and backup system for the Development VM (20.170.155.53). This system creates timestamped backups of all critical files before any server restart, allowing easy rollback to previous working states.

**⚠️ PRODUCTION VM (4.185.84.26) - DO NOT MODIFY**  
This checkpoint system is ONLY for the DEV VM. Never apply changes to production without testing first!

---

## 🔄 Automatic Checkpoint on Server Restart

The system automatically creates a checkpoint whenever:
1. The VM boots/reboots (via systemd service)
2. You run the startup script manually
3. You trigger a manual checkpoint

### Systemd Service

**Service File**: `/etc/systemd/system/translation-checkpoint.service`

**Status**:
```bash
sudo systemctl status translation-checkpoint
```

**Enable/Disable**:
```bash
# Enable (runs on boot)
sudo systemctl enable translation-checkpoint

# Disable
sudo systemctl disable translation-checkpoint
```

---

## 📋 Available Scripts

### 1. Create Checkpoint
**Location**: `/home/azureuser/translation-app/create-checkpoint.sh`

**Usage**:
```bash
bash /home/azureuser/translation-app/create-checkpoint.sh
```

**What it does**:
- Creates timestamped backup in `checkpoints/checkpoint-YYYYMMDD-HHMMSS/`
- Backs up all critical files (JS, HTML, configs)
- Creates MANIFEST.txt with git status and system info
- Keeps last 10 checkpoints (auto-cleans older ones)
- Includes Asterisk `extensions.conf`

**Files Backed Up** (16 files):
- `conference-server.js`
- `audiosocket-integration.js`
- `audiosocket-orchestrator.js`
- `asr-streaming-worker.js`
- `asterisk-ari-handler.js`
- `deepl-incremental-mt.js`
- `elevenlabs-tts-service.js`
- `hume-evi-adapter.js`
- `confbridge-manager.js`
- `frame-collector.js`
- `pacing-governor.js`
- `public/dashboard.html`
- `public/dashboard-room2.html`
- `package.json`
- `.env`
- `/etc/asterisk/extensions.conf`

---

### 2. Restore Checkpoint
**Location**: `/home/azureuser/translation-app/restore-checkpoint.sh`

**List Available Checkpoints**:
```bash
bash /home/azureuser/translation-app/restore-checkpoint.sh
```

**Restore Specific Checkpoint**:
```bash
bash /home/azureuser/translation-app/restore-checkpoint.sh checkpoint-20251028-173204
```

**What it does**:
1. Shows available checkpoints with creation date and size
2. Asks for confirmation before restoring
3. Stops running server
4. Creates a pre-restore backup (in case you need to undo)
5. Restores all files from the checkpoint
6. Asks if you want to start the server

---

### 3. Start Server with Checkpoint
**Location**: `/home/azureuser/translation-app/start-server-with-checkpoint.sh`

**Usage**:
```bash
bash /home/azureuser/translation-app/start-server-with-checkpoint.sh
```

**What it does**:
1. Creates automatic checkpoint
2. Stops any existing server
3. Starts conference-server.js
4. Verifies server started successfully
5. Shows access URLs and extension info

**Recommended**: Use this script instead of manually starting the server to ensure checkpoints are created.

---

## 📂 Directory Structure

```
/home/azureuser/translation-app/
├── checkpoints/                           # All checkpoints stored here
│   ├── checkpoint-20251028-173204/       # Example checkpoint
│   │   ├── MANIFEST.txt                  # Checkpoint metadata
│   │   ├── conference-server.js
│   │   ├── audiosocket-integration.js
│   │   ├── asterisk/
│   │   │   └── extensions.conf
│   │   ├── public/
│   │   │   ├── dashboard.html
│   │   │   └── dashboard-room2.html
│   │   └── ... (all backed up files)
│   └── checkpoint-20251028-HHMMSS/       # Next checkpoint
│
├── create-checkpoint.sh                   # Create new checkpoint
├── restore-checkpoint.sh                  # Restore from checkpoint
└── start-server-with-checkpoint.sh        # Start server with auto-checkpoint
```

---

## 🚀 Common Workflows

### Start Server Safely (Recommended)
```bash
cd /home/azureuser/translation-app
bash start-server-with-checkpoint.sh
```

### Before Making Changes
```bash
# Create checkpoint before experimenting
bash /home/azureuser/translation-app/create-checkpoint.sh

# Make your changes...
nano conference-server.js

# Restart server (automatically creates another checkpoint)
bash start-server-with-checkpoint.sh
```

### Rollback After Problem
```bash
# List available checkpoints
bash /home/azureuser/translation-app/restore-checkpoint.sh

# Restore the last working checkpoint
bash /home/azureuser/translation-app/restore-checkpoint.sh checkpoint-20251028-173204
```

### Manual Checkpoint (No Server Restart)
```bash
# Just create checkpoint without touching server
bash /home/azureuser/translation-app/create-checkpoint.sh
```

---

## 📊 Checkpoint Manifest

Each checkpoint includes a `MANIFEST.txt` file with:

```
Checkpoint: checkpoint-20251028-173204
Created: Tue Oct 28 05:32:05 PM UTC 2025
Server: DEV VM (20.170.155.53)
VM Name: asterisk-dev-vm-clone
Files Backed Up: 16

Git Status:
 M conference-server.js
 M create-checkpoint.sh
?? checkpoints/

Git Branch:
* (HEAD detached from origin/working-oct23-clean)

Last Commit:
a7f1c8e Implement dual-orchestrator architecture

Process Status:
azureuser 2261 node conference-server.js
```

---

## 🧹 Automatic Cleanup

The system automatically:
- Keeps the **last 10 checkpoints**
- Deletes older checkpoints to save disk space
- Runs cleanup every time a new checkpoint is created

**To keep more/fewer**:
Edit `create-checkpoint.sh` line:
```bash
ls -dt checkpoint-* | tail -n +11  # Change 11 to keep more (e.g., 21 for 20 checkpoints)
```

---

## 🔍 Troubleshooting

### Checkpoint Not Created on Boot
```bash
# Check service status
sudo systemctl status translation-checkpoint

# View logs
sudo journalctl -u translation-checkpoint -n 50

# Manually trigger
sudo systemctl start translation-checkpoint
```

### Can't Restore Asterisk Config
```bash
# Restore manually with sudo
sudo cp checkpoints/checkpoint-YYYYMMDD-HHMMSS/asterisk/extensions.conf /etc/asterisk/
sudo asterisk -rx "dialplan reload"
```

### Disk Space Issues
```bash
# Check checkpoint sizes
du -sh checkpoints/*

# Delete old checkpoints manually
rm -rf checkpoints/checkpoint-20251027-*

# Or reduce retention (edit create-checkpoint.sh)
```

---

## ⚙️ Configuration

### Change Retention Policy
Edit `/home/azureuser/translation-app/create-checkpoint.sh`:
```bash
# Line ~75: Keep last N checkpoints
ls -dt checkpoint-* | tail -n +11  # Change 11 to (N+1)
```

### Add More Files to Backup
Edit `/home/azureuser/translation-app/create-checkpoint.sh`:
```bash
# Line ~20: Add file to array
FILES_TO_BACKUP=(
    "conference-server.js"
    "your-new-file.js"  # Add here
    ...
)
```

### Disable Auto-Checkpoint on Boot
```bash
sudo systemctl disable translation-checkpoint
```

---

## 📝 Best Practices

1. **Always use `start-server-with-checkpoint.sh`** instead of manually starting the server
2. **Create manual checkpoints** before making risky changes
3. **Test on DEV VM** (20.170.155.53) before applying to production (4.185.84.26)
4. **Check MANIFEST.txt** to verify checkpoint contents
5. **Keep git commits** in sync with major checkpoints
6. **Document changes** in checkpoint names if needed

---

## 🆚 Production vs Development

| Aspect | Production (4.185.84.26) | Development (20.170.155.53) |
|--------|--------------------------|------------------------------|
| Purpose | Live users | Testing/experimentation |
| Checkpoint System | Manual only | **Automatic + Manual** |
| Git Backups | Yes | Yes |
| Safe to modify | ❌ NO | ✅ YES |
| Auto-checkpoint on boot | No | **Yes** (systemd) |

---

## 📚 Related Documentation

- Original checkpoint system: `/Users/sagivstavinsky/realtime-translation-enhanced_astrix/Docs/sys/CHECKPOINT_SYSTEM.md`
- Production VM docs: Azure server (4.185.84.26)
- Local docs: `/Users/sagivstavinsky/realtime-translation-enhanced_astrix/Docs/sys/`

---

## ✅ Quick Reference

```bash
# Create checkpoint
bash /home/azureuser/translation-app/create-checkpoint.sh

# List checkpoints
bash /home/azureuser/translation-app/restore-checkpoint.sh

# Restore checkpoint
bash /home/azureuser/translation-app/restore-checkpoint.sh checkpoint-NAME

# Start server with checkpoint
bash /home/azureuser/translation-app/start-server-with-checkpoint.sh

# Check systemd service
sudo systemctl status translation-checkpoint

# View service logs
sudo journalctl -u translation-checkpoint -n 50
```

---

**End of DEV VM Checkpoint System Documentation**

For questions or issues, refer to the production checkpoint system documentation or create a new checkpoint before experimenting!
