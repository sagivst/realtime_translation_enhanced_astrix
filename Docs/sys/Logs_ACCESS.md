BACKUP LOGS ACCESS GUIDE

  1. User Profile Auto-Backups (HMLCP System)

  Location: /home/azureuser/translation-app/hmlcp/profiles/

  Access commands:
  # List all user profiles
  ssh azureuser@20.170.155.53 "ls -lah /home/azureuser/translation-app/hmlcp/profiles/"

  # View specific user profile (e.g., sagiv)
  ssh azureuser@20.170.155.53 "cat /home/azureuser/translation-app/hmlcp/profiles/sagiv_en.json"

  # Monitor profiles in real-time (auto-saved every 5 minutes)
  ssh azureuser@20.170.155.53 "watch -n 10 'ls -lh
  /home/azureuser/translation-app/hmlcp/profiles/'"

  2. System Checkpoint Backups

  Location: /home/azureuser/translation-app/checkpoints/

  Access commands:
  # List all checkpoints (18+ automated checkpoints created today)
  ssh azureuser@20.170.155.53 "ls -lah /home/azureuser/translation-app/checkpoints/"

  # View latest checkpoint
  ssh azureuser@20.170.155.53 "ls -t /home/azureuser/translation-app/checkpoints/ | head -1"

  # View checkpoint contents
  ssh azureuser@20.170.155.53 "ls -lah
  /home/azureuser/translation-app/checkpoints/checkpoint-20251103-095913/"

  3. Code Backup Files

  Location: /home/azureuser/translation-app/*.backup*

  Access commands:
  # List all backup files
  ssh azureuser@20.170.155.53 "find /home/azureuser/translation-app -maxdepth 1 -name '*.backup*'
   -type f"

  # View specific backup (e.g., audiosocket-integration)
  ssh azureuser@20.170.155.53 "cat
  /home/azureuser/translation-app/audiosocket-integration.js.backup-20251103-105618"

  4. Conference Server Logs

  # Current running log
  ssh azureuser@20.170.155.53 "tail -f /tmp/conference-server.log"

  # Historical logs
  ssh azureuser@20.170.155.53 "tail -100 /tmp/conference-final.log"
  ssh azureuser@20.170.155.53 "tail -100 /tmp/conf-test.log"

  5. Timing Server Logs

  ssh azureuser@20.170.155.53 "tail -f /tmp/timing-server.log"

