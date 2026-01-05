# Backup System Scripts

This directory contains a comprehensive backup system for the Translation & Monitoring application.

## 📁 Scripts Overview

| Script | Purpose | Schedule |
|--------|---------|----------|
| `setup_backup_system.sh` | Initial setup - creates directories and configs | One-time |
| `database_backup.sh` | Backs up PostgreSQL databases (monitoring_v2, airtable_cache, asterisk) | Every 6 hours |
| `application_backup.sh` | Backs up application code, configs, and dependencies | Every 4 hours |
| `monitoring_backup.sh` | Backs up audio files and exports metrics data | Twice daily |
| `master_backup.sh` | Orchestrates all backups and generates reports | Daily at 3 AM |
| `disaster_recovery.sh` | Restores system from backups | As needed |
| `setup_cron.sh` | Configures automated backup schedule | One-time |
| `deploy_to_azure.sh` | Deploys all scripts to Azure VM | One-time |

## 🚀 Quick Start

### 1. Deploy to Azure VM

From your local machine, run:

```bash
cd /Users/sagivstavinsky/realtime-translation-enhanced_astrix/backup_scripts
./deploy_to_azure.sh
```

This will:
- Copy all scripts to the Azure VM
- Create backup directories
- Set up initial configuration
- Optionally configure cron jobs

### 2. Manual Testing (on Azure VM)

SSH to the VM and test individual scripts:

```bash
ssh azureuser@20.170.155.53
cd /home/azureuser/backup_scripts

# Test database backup
./database_backup.sh

# Test application backup
./application_backup.sh

# Test monitoring backup
./monitoring_backup.sh

# Run master orchestration
./master_backup.sh
```

### 3. Setup Automation (on Azure VM)

Configure cron jobs for automatic backups:

```bash
./setup_cron.sh
```

Verify cron jobs:

```bash
crontab -l
```

## 📊 Monitoring

### Check Backup Status

```bash
# View recent backup logs
tail -f /var/log/backup/master_backup.log

# Check backup sizes
du -sh /backup/*

# Verify last backup times
ls -lt /backup/databases/*.dump | head -5
```

### Health Checks

```bash
# Run health check
./master_backup.sh --check

# Generate status report
./master_backup.sh --report
```

## 🔧 Configuration

### Important Settings to Update

1. **Email Notifications** (in `master_backup.sh`):
   ```bash
   EMAIL_RECIPIENT="your-email@example.com"
   ```

2. **Webhook Notifications** (optional, in `master_backup.sh`):
   ```bash
   WEBHOOK_URL="https://hooks.slack.com/services/YOUR_WEBHOOK"
   ```

3. **Retention Policies**:
   - Database backups: 30 days (in `database_backup.sh`)
   - Audio archives: 30 days (in `monitoring_backup.sh`)
   - Metrics exports: 90 days (in `monitoring_backup.sh`)

## 🆘 Disaster Recovery

### Quick Recovery (Database + Configs)

```bash
./disaster_recovery.sh --quick
```

### Full System Recovery

```bash
./disaster_recovery.sh --full
```

### Interactive Recovery Menu

```bash
./disaster_recovery.sh
```

### Verify System Status

```bash
./disaster_recovery.sh --verify
```

## 📁 Backup Directory Structure

```
/backup/
├── databases/           # PostgreSQL dumps
│   ├── monitoring_v2_*.dump
│   ├── airtable_cache_*.dump
│   └── asterisk_*.dump
├── translation-app/     # Application code
│   ├── current/        # Latest mirror
│   └── incremental/    # Change archives
├── monitoring-audio/    # Audio recordings
│   ├── current/        # Recent WAV files
│   └── archive/        # Compressed old files
├── configs/            # Configuration backups
├── metrics/            # Exported metrics data
└── compliance/         # Reports and audits
```

## 📈 Backup Schedule

| Time | Task |
|------|------|
| Every 30 min | Quick incremental (optional) |
| Every hour | Health check |
| Every 4 hours | Application backup |
| Every 6 hours | Database backup |
| 02:00, 14:00 | Monitoring data backup |
| 03:00 | Master orchestration |
| 04:00 | Log cleanup |
| Sunday 00:00 | Weekly report |

## ⚠️ Important Notes

1. **First Run**: The first backup might take longer as it creates full copies
2. **Disk Space**: Ensure at least 50GB free space on /backup partition
3. **Credentials**: Database backups use postgres user (passwordless local)
4. **Permissions**: Scripts run as azureuser, ensure proper file permissions
5. **Testing**: Always test disaster recovery procedures regularly

## 📝 Documentation

Full documentation available at:
- `/Users/sagivstavinsky/realtime-translation-enhanced_astrix/Docs/sys/COMPREHENSIVE_BACKUP_PLAN.md`

## 🐛 Troubleshooting

### Backup Fails

```bash
# Check logs
cat /var/log/backup/master_backup.log

# Verify disk space
df -h /backup

# Check service status
systemctl status postgresql
pm2 status
```

### Permission Issues

```bash
# Fix backup directory permissions
sudo chown -R azureuser:azureuser /backup
sudo chmod 755 /backup

# Fix log permissions
sudo chown azureuser:azureuser /var/log/backup
```

### Database Connection Issues

```bash
# Check PostgreSQL
sudo systemctl status postgresql
sudo -u postgres psql -l
```

## 📞 Support

For issues or questions:
1. Check the comprehensive backup plan documentation
2. Review backup logs in `/var/log/backup/`
3. Run health checks with `./master_backup.sh --check`