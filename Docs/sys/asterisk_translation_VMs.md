 ---
  🖥️ PRODUCTION VM (Original - DO NOT MODIFY)

  Azure Resource Details

  - Azure VM Name: asterisk-translation-vm
  - Resource Group: realtime-translation-rg
  - VM ID: 8e14316f-d585-47da-8381-1280d0ebb47c
  - Location: Germany West Central
  - VM Size: Standard_B2s (2 vCPUs, 4 GB RAM)
  - OS: Linux (Ubuntu)
  - Provisioning State: Succeeded

  Network Configuration

  - Public IP: 4.185.84.26
  - Public IP Resource: asterisk-translation-vmPublicIP
  - Network Interface: asterisk-translation-vmVMNic
  - Network Security Group: asterisk-translation-vmNSG

  Firewall Rules (NSG)

  | Priority | Name              | Port        | Protocol | Access |
  |----------|-------------------|-------------|----------|--------|
  | 1000     | default-allow-ssh | 22          | TCP      | Allow  |
  | 1001     | allow-sip         | 5060        | UDP      | Allow  |
  | 1002     | allow-ari         | 8088        | TCP      | Allow  |
  | 1003     | allow-rtp         | 10000-20000 | UDP      | Allow  |
  | 1004     | allow-logs        | 3000        | TCP      | Allow  |

  Storage

  - OS Disk Name: asterisk-translation-vm_disk1_098dedc63a9947a3ac210ffe97eaa258
  - Disk Type: Premium_LRS (SSD)
  - Disk State: Attached
  - Created: 2025-10-16

  Access

  ssh azureuser@4.185.84.26

  Dashboard

  http://4.185.84.26:3000/dashboard.html

  ---
  🧪 DEVELOPMENT VM (Clone - Safe for Testing)

  Azure Resource Details

  - Azure VM Name: asterisk-dev-vm-clone
  - Resource Group: realtime-translation-rg
  - VM ID: ec7670ef-60bc-4d04-a66f-e5520b3856cf
  - Location: Germany West Central
  - VM Size: Standard_B2s (2 vCPUs, 4 GB RAM)
  - OS: Linux (Ubuntu)
  - Provisioning State: Succeeded

  Network Configuration

  - Public IP: 20.170.155.53
  - Public IP Resource: asterisk-dev-vm-clonePublicIP
  - Network Interface: asterisk-dev-vm-cloneVMNic
  - Network Security Group: asterisk-dev-vm-cloneNSG

  Firewall Rules (NSG)

  | Priority | Name              | Port        | Protocol | Access |
  |----------|-------------------|-------------|----------|--------|
  | 1000     | default-allow-ssh | 22          | TCP      | Allow  |
  | 110      | AllowHTTP3000     | 3000        | TCP      | Allow  |
  | 120      | AllowSIP          | 5060        | UDP      | Allow  |
  | 130      | AllowRTP          | 10000-20000 | UDP      | Allow  |

  Storage

  - OS Disk Name: asterisk-dev-disk-clone
  - Disk Type: Standard_LRS (Standard HDD - Cost saving)
  - Disk State: Attached
  - Created: 2025-10-28 (Today!)

  Access

  ssh azureuser@20.170.155.53

  Dashboard

  http://20.170.155.53:3000/dashboard.html

  ---
  📊 KEY DIFFERENCES

  | Aspect     | Production       | Development         |
  |------------|------------------|---------------------|
  | Purpose    | Live production  | Testing/Development |
  | IP Address | 4.185.84.26      | 20.170.155.53       |
  | Disk Type  | Premium SSD      | Standard HDD        |
  | Cost       | Higher           | Lower               |
  | Age        | 12 days old      | Created today       |
  | Safety     | ⚠️ DO NOT MODIFY | ✅ Safe to test      |

  ---
  💰 Cost Comparison

  VM Compute: ~$30.37/month each

  - Both use same VM size (Standard_B2s)

  Storage:

  - Production: Premium SSD (~$19.71/month for 128GB)
  - Development: Standard HDD (~$1.92/month for 128GB)

  Monthly savings on Dev VM: ~$17.79 on storage alone!

  ---
  Both VMs are in the same resource group and region, making it easy to manage and keep costs consolidated. The
  development VM uses cheaper storage since performance isn't as critical for testing.
