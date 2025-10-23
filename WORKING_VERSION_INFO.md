# Working Version - October 23, 2025

## Azure VM Location
- **VM Name:** asterisk-translation-vm
- **Public IP:** 4.185.84.26
- **Resource Group:** REALTIME-TRANSLATION-RG
- **Directory:** /home/azureuser/translation-app/
- **URL:** http://4.185.84.26:3000

## Working Version Files
- **conference-server.js:** Version from 10:56 AM (Oct 23, 2025)
  - MD5: 36f207e6f1f90d35250a2d39df6171e4
  - File: `/home/azureuser/translation-app/conference-server.js`
  
- **dashboard.html:** Version from 10:31 AM (Oct 23, 2025)  
  - MD5: ae7ea9699f117193ead775e12eecfb98
  - File: `/home/azureuser/translation-app/public/dashboard.html`
  - Backup: `dashboard.html.backup-hume-20251023-103119`

## Version Description
This is the verified working version with:
- HumeAI integration
- Conference server at 10:56 AM
- Dashboard HTML at 10:31 AM

## To Download These Files from Azure VM
```bash
az vm run-command invoke --name asterisk-translation-vm \
  --resource-group REALTIME-TRANSLATION-RG \
  --command-id RunShellScript \
  --scripts "cd /home/azureuser/translation-app && tar czf /tmp/working-version.tar.gz conference-server.js public/dashboard.html package.json"
```
