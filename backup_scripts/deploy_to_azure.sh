#!/bin/bash
# Deploy Backup System to Azure VM
# Run this script from your local machine to deploy all backup scripts

set -e

# Configuration
AZURE_VM="azureuser@20.170.155.53"
LOCAL_SCRIPTS_DIR="$(dirname $0)"
REMOTE_SCRIPTS_DIR="/home/azureuser/backup_scripts"

# Color codes
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
RED='\033[0;31m'
NC='\033[0m'

print_color() {
    local color=$1
    shift
    echo -e "${color}$@${NC}"
}

print_color ${BLUE} "======================================"
print_color ${BLUE} "Backup System Deployment Script"
print_color ${BLUE} "======================================"

# Check SSH connectivity
print_color ${YELLOW} "\nChecking SSH connectivity to Azure VM..."
if ssh -o ConnectTimeout=5 ${AZURE_VM} "echo 'SSH OK'" &>/dev/null; then
    print_color ${GREEN} "✓ SSH connection successful"
else
    print_color ${RED} "✗ Cannot connect to Azure VM at ${AZURE_VM}"
    exit 1
fi

# Create remote directory
print_color ${YELLOW} "\nCreating remote backup scripts directory..."
ssh ${AZURE_VM} "mkdir -p ${REMOTE_SCRIPTS_DIR}"

# List of scripts to deploy
SCRIPTS=(
    "setup_backup_system.sh"
    "database_backup.sh"
    "application_backup.sh"
    "monitoring_backup.sh"
    "master_backup.sh"
    "disaster_recovery.sh"
    "setup_cron.sh"
)

# Copy scripts to Azure VM
print_color ${YELLOW} "\nCopying backup scripts to Azure VM..."
for script in "${SCRIPTS[@]}"; do
    if [ -f "${LOCAL_SCRIPTS_DIR}/${script}" ]; then
        scp "${LOCAL_SCRIPTS_DIR}/${script}" ${AZURE_VM}:${REMOTE_SCRIPTS_DIR}/
        print_color ${GREEN} "✓ Copied ${script}"
    else
        print_color ${RED} "✗ Script not found: ${script}"
    fi
done

# Copy documentation
print_color ${YELLOW} "\nCopying documentation..."
scp "${LOCAL_SCRIPTS_DIR}/../Docs/sys/COMPREHENSIVE_BACKUP_PLAN.md" \
    ${AZURE_VM}:/home/azureuser/ 2>/dev/null || \
    print_color ${YELLOW} "⚠ Documentation not found (optional)"

# Make scripts executable
print_color ${YELLOW} "\nMaking scripts executable..."
ssh ${AZURE_VM} "chmod +x ${REMOTE_SCRIPTS_DIR}/*.sh"

# Run initial setup
print_color ${YELLOW} "\nRunning initial setup on Azure VM..."
ssh ${AZURE_VM} "bash ${REMOTE_SCRIPTS_DIR}/setup_backup_system.sh"

# Create initial backup directories
print_color ${YELLOW} "\nCreating backup directory structure..."
ssh ${AZURE_VM} <<'REMOTE_COMMANDS'
# Create backup directories with proper permissions
sudo mkdir -p /backup/{databases,translation-app,monitoring-audio,configs,dependencies,metrics,compliance}
sudo chown -R azureuser:azureuser /backup

# Create log directory
sudo mkdir -p /var/log/backup
sudo chown azureuser:azureuser /var/log/backup

# Create initial exclude file for rsync
cat > /home/azureuser/backup_scripts/backup_exclude.txt <<'EOF'
node_modules/
*.log
*.tmp
*.swp
.git/objects/
.npm/
.cache/
coverage/
dist/
build/
*.pid
core.*
EOF

echo "✓ Backup directories created"
REMOTE_COMMANDS

# Test database backup
print_color ${YELLOW} "\nTesting database backup script..."
ssh ${AZURE_VM} "cd ${REMOTE_SCRIPTS_DIR} && ./database_backup.sh" || \
    print_color ${YELLOW} "⚠ Database backup test failed (databases might not exist yet)"

# Display next steps
print_color ${BLUE} "\n======================================"
print_color ${BLUE} "Deployment Complete!"
print_color ${BLUE} "======================================"

print_color ${GREEN} "\nNext Steps:"
echo "1. SSH to Azure VM:"
echo "   ssh ${AZURE_VM}"
echo ""
echo "2. Review and customize backup scripts:"
echo "   cd ${REMOTE_SCRIPTS_DIR}"
echo "   ls -la"
echo ""
echo "3. Test backup scripts manually:"
echo "   ./database_backup.sh"
echo "   ./application_backup.sh"
echo "   ./monitoring_backup.sh"
echo ""
echo "4. Setup cron jobs for automation:"
echo "   ./setup_cron.sh"
echo ""
echo "5. Verify cron jobs:"
echo "   crontab -l"
echo ""
echo "6. Monitor backup logs:"
echo "   tail -f /var/log/backup/*.log"
echo ""
echo "7. Test disaster recovery:"
echo "   ./disaster_recovery.sh --verify"
echo ""

print_color ${YELLOW} "\nIMPORTANT Configuration Tasks:"
echo "• Update email recipient in master_backup.sh"
echo "• Configure webhook URL for notifications (optional)"
echo "• Adjust retention policies in scripts"
echo "• Set up remote backup destination (optional)"
echo ""

print_color ${GREEN} "Documentation available at:"
echo "/home/azureuser/COMPREHENSIVE_BACKUP_PLAN.md"

# Optional: Setup cron automatically
echo ""
read -p "Do you want to setup cron jobs now? (y/n): " -n 1 -r
echo ""
if [[ $REPLY =~ ^[Yy]$ ]]; then
    ssh -t ${AZURE_VM} "cd ${REMOTE_SCRIPTS_DIR} && ./setup_cron.sh"
fi

print_color ${GREEN} "\n✓ Backup system successfully deployed to Azure VM!"