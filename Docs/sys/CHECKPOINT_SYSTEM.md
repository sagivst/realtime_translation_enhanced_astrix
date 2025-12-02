# 📦 Checkpoint System Overview

**Last Updated**: 2025-11-20 10:10 UTC
**Version**: 9.0 (EXCLUSION-BASED BACKUP - No more backup of backups!)
**Status**: ✅ ACTIVE - Automatic backups every 60 minutes

---

## ⚠️ NEW SYSTEM - Version 9.0 (2025-11-20)

### Key Changes
- **Schedule**: Every 60 minutes (at :00 of each hour)
- **Script**: `/home/azureuser/auto-checkpoint.sh` (new location)
- **Format**: `auto_checkpoint_YYYYMMDD_HHMMSS.tar.gz`
- **Retention**: Last 5 checkpoints kept (auto-cleanup)
- **Exclusion-based**: Properly excludes all backup/checkpoint files

### Exclusion Patterns (CRITICAL)
These patterns are **EXCLUDED** from all backups:

**Keyword Exclusions** (including misspellings):
- `*backup*` - Any file/directory containing "backup"
- `*checkpoint*` - Any file/directory containing "checkpoint"
- `*chekpoint*` - Misspelling variant
- `*checkpint*` - Misspelling variant
- `*bkp*` - Abbreviation variant

**Directory/File Exclusions**:
- `node_modules` - NPM dependencies (regenerate with npm install)
- `*.tar.gz` - Archive files (prevents backup of backups)
- `.git` - Git repository data
- `asterisk-build` - Asterisk source/build files (~2300+ files)

### Cron Configuration
```bash
# Current crontab (crontab -l)
0 * * * * /home/azureuser/auto-checkpoint.sh >> /home/azureuser/checkpoint.log 2>&1
```

### File Locations
| Type | Path |
|------|------|
| **Backup Script** | `/home/azureuser/auto-checkpoint.sh` |
| **Log File** | `/home/azureuser/checkpoint.log` |
| **Checkpoints** | `/home/azureuser/auto_checkpoint_*.tar.gz` |

### Manual Checkpoint Command
```bash
ssh azureuser@20.170.155.53 "/home/azureuser/auto-checkpoint.sh"
```

### Monitoring Commands
```bash
# Check log
ssh azureuser@20.170.155.53 "tail -50 /home/azureuser/checkpoint.log"

# List checkpoints
ssh azureuser@20.170.155.53 "ls -lh /home/azureuser/*.tar.gz"

# Verify cron
ssh azureuser@20.170.155.53 "crontab -l"

### Directoris to Backup

# 4444_3333_Operational
# 7777-8888-stack
# 5555-6666-pcm-crossover

```

