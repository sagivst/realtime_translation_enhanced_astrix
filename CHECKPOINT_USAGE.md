# 🔄 Automatic Checkpoint System - DEV VM Usage Guide

**Last Updated**: 2025-10-29
**DEV VM**: 20.170.155.53

---

## ✅ System Status: FULLY AUTOMATED

The checkpoint system is now **fully automatic** on the DEV VM. Every server restart creates a checkpoint backup automatically.

---

## 🚀 Automatic Checkpoint Triggers

### 1. ✅ VM Boot/Restart
When the VM restarts, a checkpoint is created automatically via systemd.

### 2. ✅ Server Restart (PRIMARY USE)
**Every time you restart the translation server, a checkpoint is created FIRST.**

```bash
# Restart server (creates checkpoint automatically)
sudo systemctl restart translation-server

# Stop server (no checkpoint needed)
sudo systemctl stop translation-server

# Start server (creates checkpoint automatically)
sudo systemctl start translation-server

# Check server status
sudo systemctl status translation-server
```

### 3. ✅ Manual Checkpoint (Optional)
Create a checkpoint without restarting the server:

```bash
# Create manual checkpoint
bash ~/translation-app/create-checkpoint.sh
```

---

## 📦 What Gets Backed Up (76 Files)

### Core Application
- All .js server files (26 files)
- HMLCP module (5 files)
- Test & utility scripts (7 files)

### Public Files
- All HTML pages (14 files)
- All JS/CSS assets (9 files)

### Configuration
- package.json, package-lock.json
- .env file
- Asterisk configs (3 files)

### Documentation
- README.md, LATENCY_MANAGEMENT.md, etc. (5 files)

### Scripts
- All checkpoint scripts (3 files)

**Total**: ~1.7MB per checkpoint

---

## 🔍 Managing Checkpoints

### List All Checkpoints
```bash
ls -lt ~/translation-app/checkpoints/
```

### View Checkpoint Details
```bash
bash ~/translation-app/restore-checkpoint.sh
```

### Restore a Checkpoint
```bash
# Interactive mode (shows list)
bash ~/translation-app/restore-checkpoint.sh

# Direct restore
bash ~/translation-app/restore-checkpoint.sh checkpoint-20251029-140605
```

---

## 🛠️ Server Management Commands

### Standard Operations
```bash
# View server logs (live)
sudo journalctl -u translation-server -f

# View recent logs
sudo journalctl -u translation-server -n 50

# Check if server is running
sudo systemctl status translation-server

# View checkpoint service status
sudo systemctl status translation-checkpoint
```

### Checkpoint + Server Operations
```bash
# Restart with automatic checkpoint
sudo systemctl restart translation-server

# View logs to see checkpoint creation
sudo journalctl -u translation-server -n 100 | grep checkpoint
```

---

## 🎯 Quick Reference

| Action | Command | Creates Checkpoint? |
|--------|---------|-------------------|
| Restart server | `sudo systemctl restart translation-server` | ✅ Yes (automatic) |
| Start server | `sudo systemctl start translation-server` | ✅ Yes (automatic) |
| Stop server | `sudo systemctl stop translation-server` | ❌ No |
| Manual checkpoint | `bash create-checkpoint.sh` | ✅ Yes |
| Restore checkpoint | `bash restore-checkpoint.sh` | ❌ No |
| VM reboot | `sudo reboot` | ✅ Yes (on boot) |

---

## 📊 Checkpoint Retention

The system automatically keeps the **last 10 checkpoints** and removes older ones to save disk space.

**Current checkpoints**: Check with `ls ~/translation-app/checkpoints/`

---

## 🔒 Safety Features

1. **Automatic Backups**: No manual intervention needed
2. **Pre-restart Checkpoints**: Always creates backup BEFORE changes
3. **Quick Rollback**: Restore any checkpoint in seconds
4. **No Production Impact**: Only runs on DEV VM (20.170.155.53)
5. **Service Monitoring**: Systemd manages and monitors the server
6. **Auto-restart on Crash**: Server restarts automatically if it crashes

---

## 💡 Best Practices

### Before Testing Changes
```bash
# The checkpoint is created automatically on restart, but you can create one manually:
bash ~/translation-app/create-checkpoint.sh

# Make your changes to files
vim ~/translation-app/conference-server.js

# Restart (creates another checkpoint automatically)
sudo systemctl restart translation-server
```

### If Something Breaks
```bash
# Stop the server
sudo systemctl stop translation-server

# Restore previous checkpoint
bash ~/translation-app/restore-checkpoint.sh

# Start the server (creates new checkpoint)
sudo systemctl start translation-server
```

---

## 📍 Important Paths

| Item | Path |
|------|------|
| App Directory | `/home/azureuser/translation-app/` |
| Checkpoints | `/home/azureuser/translation-app/checkpoints/` |
| Server Service | `/etc/systemd/system/translation-server.service` |
| Checkpoint Service | `/etc/systemd/system/translation-checkpoint.service` |
| Server Logs | `sudo journalctl -u translation-server` |

---

## 🆘 Troubleshooting

### Server Won't Start
```bash
# Check service status
sudo systemctl status translation-server

# View detailed logs
sudo journalctl -u translation-server -n 100

# Check if port 3000 is already in use
sudo lsof -i :3000

# Restart the service
sudo systemctl restart translation-server
```

### Checkpoint Failed
```bash
# View checkpoint logs
sudo journalctl -u translation-checkpoint -n 50

# Manually create checkpoint to see errors
bash ~/translation-app/create-checkpoint.sh
```

### Restore Failed
```bash
# Check available checkpoints
ls -la ~/translation-app/checkpoints/

# Run restore script in debug mode
bash -x ~/translation-app/restore-checkpoint.sh
```

---

## ✨ System Advantages

✅ **Zero Manual Work**: Checkpoints happen automatically
✅ **Safe Testing**: Always have rollback option
✅ **Production-like**: Professional systemd service management
✅ **Monitored**: Full logging via journalctl
✅ **Reliable**: Auto-restart on failure
✅ **Comprehensive**: 76 files backed up (100% coverage)

---

## 🎉 You're All Set!

The checkpoint system is now fully automated. Just use:

```bash
sudo systemctl restart translation-server
```

And a checkpoint will be created automatically every time! 🚀

---

**Questions?** Check the logs:
```bash
sudo journalctl -u translation-server -f
```
