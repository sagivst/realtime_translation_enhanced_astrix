# HOMER System-Wide Installation Plan
**TEST VM ONLY: 20.170.155.53**

**Date:** 2025-11-12
**Status:** AWAITING APPROVAL
**Risk Level:** MEDIUM (System-wide changes affect ALL Asterisk extensions)

---

## ⚠️ CRITICAL WARNINGS

1. **System-Wide Impact**: Changes affect ALL Asterisk extensions (7000, 7001, 7777, 8888)
2. **Service Restarts Required**: Asterisk will need to reload configuration
3. **No Isolation**: Cannot limit HOMER to only 7777/8888 stack
4. **Production VM**: WILL NOT TOUCH 4.185.84.26 (only 20.170.155.53)

---

## 📋 Pre-Flight Checklist

### Current System State (Already Verified)
- ✅ Asterisk 18.10.0 running
- ✅ Ubuntu 22.04.5 LTS (Jammy)
- ✅ HEPlify v1.67.1 downloaded to `/tmp/heplify`
- ✅ Ports 9060, 9080, 5432 available
- ✅ `/etc/asterisk/rtp.conf` exists

### Services Currently Running
- ✅ Gateway (PID 257879) on ports 7777/8888
- ✅ Conference Server (PID 256126) on port 3002
- ✅ Test RTP Sender (PID 260089) - **COORDINATION REQUIRED**

---

## 🔒 STEP-BY-STEP INSTALLATION PLAN

---

### **PHASE 1: Backup Everything**

#### Step 1.1: Backup Asterisk Configuration
```bash
sudo cp /etc/asterisk/rtp.conf /etc/asterisk/rtp.conf.backup-$(date +%Y%m%d-%H%M%S)
sudo cp /etc/asterisk/asterisk.conf /etc/asterisk/asterisk.conf.backup-$(date +%Y%m%d-%H%M%S)
```

**Files Modified:**
- `/etc/asterisk/rtp.conf` (will be modified)
- `/etc/asterisk/asterisk.conf` (may be modified)

**Impact:** None (backup only)

**Rollback:**
```bash
sudo cp /etc/asterisk/rtp.conf.backup-TIMESTAMP /etc/asterisk/rtp.conf
sudo asterisk -rx "module reload res_rtp_asterisk.so"
```

---

#### Step 1.2: Create System Backup Checkpoint
```bash
ssh azureuser@20.170.155.53
sudo tar czf /home/azureuser/homer-pre-install-backup-$(date +%Y%m%d-%H%M%S).tar.gz \
  /etc/asterisk/rtp.conf \
  /etc/asterisk/asterisk.conf \
  /etc/systemd/system/ 2>/dev/null || true
```

**Files Modified:** None (backup only)

**Impact:** None

---

### **PHASE 2: Install HEPlify Agent**

#### Step 2.1: Install HEPlify Binary
```bash
sudo mv /tmp/heplify /usr/local/bin/heplify
sudo chmod +x /usr/local/bin/heplify
sudo chown root:root /usr/local/bin/heplify
```

**Files Modified:**
- `/usr/local/bin/heplify` (new file)

**Impact:** None until service is started

**Rollback:**
```bash
sudo rm -f /usr/local/bin/heplify
```

---

#### Step 2.2: Create HEPlify Systemd Service
```bash
sudo tee /etc/systemd/system/heplify.service <<'EOF'
[Unit]
Description=HEPlify Packet Capture Agent
After=network.target

[Service]
Type=simple
User=root
ExecStart=/usr/local/bin/heplify -i any -hs 127.0.0.1:9060 -m SIP,RTCP -dim SIP,RTCP
Restart=always
RestartSec=5

[Install]
WantedBy=multi-user.target
EOF

sudo systemctl daemon-reload
```

**Files Modified:**
- `/etc/systemd/system/heplify.service` (new file)

**Impact:** None until service is started

**Rollback:**
```bash
sudo systemctl stop heplify
sudo systemctl disable heplify
sudo rm -f /etc/systemd/system/heplify.service
sudo systemctl daemon-reload
```

---

### **PHASE 3: Install HOMER Backend**

#### Step 3.1: Install PostgreSQL Database
```bash
sudo apt update
sudo apt install -y postgresql postgresql-contrib
sudo systemctl enable postgresql
sudo systemctl start postgresql
```

**System Packages Installed:**
- `postgresql`
- `postgresql-contrib`

**Impact:** PostgreSQL service running on port 5432 (localhost only)

**Rollback:**
```bash
sudo systemctl stop postgresql
sudo systemctl disable postgresql
sudo apt remove -y postgresql postgresql-contrib
```

---

#### Step 3.2: Create HOMER Database
```bash
sudo -u postgres psql <<'EOF'
CREATE DATABASE homer_data;
CREATE USER homer WITH PASSWORD 'homerSecure123!';
GRANT ALL PRIVILEGES ON DATABASE homer_data TO homer;
\q
EOF
```

**Database Changes:**
- Database: `homer_data`
- User: `homer` / password: `homerSecure123!`

**Impact:** None (isolated database)

**Rollback:**
```bash
sudo -u postgres psql -c "DROP DATABASE IF EXISTS homer_data;"
sudo -u postgres psql -c "DROP USER IF EXISTS homer;"
```

---

#### Step 3.3: Install heplify-server Backend
```bash
cd /tmp
wget https://github.com/sipcapture/heplify-server/releases/download/v1.60.0/heplify-server -O heplify-server
sudo mv heplify-server /usr/local/bin/heplify-server
sudo chmod +x /usr/local/bin/heplify-server
sudo chown root:root /usr/local/bin/heplify-server
```

**Files Modified:**
- `/usr/local/bin/heplify-server` (new file)

**Impact:** None until service is started

**Rollback:**
```bash
sudo rm -f /usr/local/bin/heplify-server
```

---

#### Step 3.4: Configure heplify-server
```bash
sudo mkdir -p /etc/heplify-server
sudo tee /etc/heplify-server/config.toml <<'EOF'
[database]
  driver = "postgres"
  host = "localhost"
  port = 5432
  database = "homer_data"
  user = "homer"
  password = "homerSecure123!"

[hep]
  listen_address = "0.0.0.0:9060"

[http]
  listen_address = "0.0.0.0:9080"
EOF
```

**Files Modified:**
- `/etc/heplify-server/config.toml` (new file)

**Impact:** None until service is started

**Rollback:**
```bash
sudo rm -rf /etc/heplify-server
```

---

#### Step 3.5: Create heplify-server Systemd Service
```bash
sudo tee /etc/systemd/system/heplify-server.service <<'EOF'
[Unit]
Description=HEPlify Server Backend
After=network.target postgresql.service

[Service]
Type=simple
User=root
ExecStart=/usr/local/bin/heplify-server -config /etc/heplify-server/config.toml
Restart=always
RestartSec=5

[Install]
WantedBy=multi-user.target
EOF

sudo systemctl daemon-reload
```

**Files Modified:**
- `/etc/systemd/system/heplify-server.service` (new file)

**Impact:** None until service is started

**Rollback:**
```bash
sudo systemctl stop heplify-server
sudo systemctl disable heplify-server
sudo rm -f /etc/systemd/system/heplify-server.service
sudo systemctl daemon-reload
```

---

### **PHASE 4: Configure Asterisk for HEP**

#### Step 4.1: Read Current RTP Configuration
```bash
cat /etc/asterisk/rtp.conf
```

**Files Modified:** None (read only)

**Impact:** None

---

#### Step 4.2: Backup and Modify rtp.conf
```bash
# Already backed up in Phase 1
sudo tee -a /etc/asterisk/rtp.conf <<'EOF'

; === HOMER HEP Configuration ===
; Added: 2025-11-12 for HOMER monitoring
[general]
rtcpinterval = 500        ; Send RTCP reports every 500ms
rtcp_mux = yes            ; Enable RTCP multiplexing

; HEP Reporting (disabled by default - enable after testing)
; hep_server = 127.0.0.1
; hep_port = 9060
; enable_hep = yes
; capture_id = 2001
EOF
```

**Files Modified:**
- `/etc/asterisk/rtp.conf` ⚠️ **AFFECTS ALL EXTENSIONS**

**Impact:**
- ⚠️ RTCP interval changes from default to 500ms (ALL extensions)
- HEP disabled initially (commented out)
- May affect 7000/7001 call quality metrics

**Rollback:**
```bash
sudo cp /etc/asterisk/rtp.conf.backup-TIMESTAMP /etc/asterisk/rtp.conf
sudo asterisk -rx "module reload res_rtp_asterisk.so"
```

---

#### Step 4.3: Reload Asterisk RTP Module
```bash
sudo asterisk -rx "module reload res_rtp_asterisk.so"
```

**Services Restarted:**
- Asterisk RTP module (affects ALL active calls)

**Impact:**
- ⚠️ **ACTIVE CALLS MAY EXPERIENCE BRIEF AUDIO INTERRUPTION**
- New RTCP interval applies to all extensions

**Rollback:**
```bash
sudo cp /etc/asterisk/rtp.conf.backup-TIMESTAMP /etc/asterisk/rtp.conf
sudo asterisk -rx "module reload res_rtp_asterisk.so"
```

---

### **PHASE 5: Start Services**

#### Step 5.1: Start heplify-server Backend
```bash
sudo systemctl enable heplify-server
sudo systemctl start heplify-server
sudo systemctl status heplify-server
```

**Services Started:**
- `heplify-server` (port 9060 listener, 9080 web UI)

**Impact:** Services running, no monitoring active yet

**Rollback:**
```bash
sudo systemctl stop heplify-server
sudo systemctl disable heplify-server
```

---

#### Step 5.2: Verify PostgreSQL Connection
```bash
sudo -u postgres psql homer_data -c "SELECT version();"
```

**Files Modified:** None (verification only)

**Impact:** None

---

#### Step 5.3: Start HEPlify Agent
```bash
sudo systemctl enable heplify
sudo systemctl start heplify
sudo systemctl status heplify
```

**Services Started:**
- `heplify` (packet capture on all interfaces)

**Impact:** Passive monitoring begins (no audio impact)

**Rollback:**
```bash
sudo systemctl stop heplify
sudo systemctl disable heplify
```

---

### **PHASE 6: Enable HEP in Asterisk (OPTIONAL)**

#### Step 6.1: Uncomment HEP Configuration
```bash
sudo sed -i 's/^; hep_server/hep_server/' /etc/asterisk/rtp.conf
sudo sed -i 's/^; hep_port/hep_port/' /etc/asterisk/rtp.conf
sudo sed -i 's/^; enable_hep/enable_hep/' /etc/asterisk/rtp.conf
sudo sed -i 's/^; capture_id/capture_id/' /etc/asterisk/rtp.conf
```

**Files Modified:**
- `/etc/asterisk/rtp.conf` ⚠️ **AFFECTS ALL EXTENSIONS**

**Impact:**
- ⚠️ Asterisk sends HEP packets to HOMER (ALL extensions)
- Additional network traffic (minimal overhead)

**Rollback:**
```bash
sudo sed -i 's/^hep_server/; hep_server/' /etc/asterisk/rtp.conf
sudo sed -i 's/^hep_port/; hep_port/' /etc/asterisk/rtp.conf
sudo sed -i 's/^enable_hep/; enable_hep/' /etc/asterisk/rtp.conf
sudo sed -i 's/^capture_id/; capture_id/' /etc/asterisk/rtp.conf
sudo asterisk -rx "module reload res_rtp_asterisk.so"
```

---

#### Step 6.2: Reload Asterisk RTP Module
```bash
sudo asterisk -rx "module reload res_rtp_asterisk.so"
```

**Services Restarted:**
- Asterisk RTP module (affects ALL active calls)

**Impact:**
- ⚠️ **ACTIVE CALLS MAY EXPERIENCE BRIEF AUDIO INTERRUPTION**

**Rollback:** See Step 6.1 rollback

---

### **PHASE 7: Verification**

#### Step 7.1: Verify HEP Packet Flow
```bash
sudo tcpdump -i lo -n udp port 9060 -c 10
```

**Files Modified:** None (monitoring only)

**Impact:** None

---

#### Step 7.2: Check Service Status
```bash
sudo systemctl status heplify
sudo systemctl status heplify-server
sudo systemctl status postgresql
```

**Files Modified:** None (monitoring only)

**Impact:** None

---

#### Step 7.3: Access HOMER Dashboard
```bash
# Open in browser or check if accessible
curl -I http://localhost:9080
```

**Expected Result:** HTTP 200 OK or HOMER UI

**Impact:** None

---

### **PHASE 8: Testing**

#### Step 8.1: Make Test Call on 7000→7001
```bash
# User makes test call
# Verify audio quality unchanged
```

**Impact:** Verifies 7000/7001 still work correctly

---

#### Step 8.2: Make Test Call on 7777→8888
```bash
# User makes test call
# Verify HOMER captures RTP metrics
```

**Impact:** Verifies HOMER monitoring works

---

#### Step 8.3: Check HOMER Dashboard for Call Data
```bash
# User accesses http://20.170.155.53:9080
# Verify call appears in HOMER UI
```

**Impact:** None

---

## 🔥 COMPLETE ROLLBACK PROCEDURE

If ANYTHING goes wrong, execute this complete rollback:

```bash
# 1. Stop all HOMER services
sudo systemctl stop heplify
sudo systemctl stop heplify-server
sudo systemctl disable heplify
sudo systemctl disable heplify-server

# 2. Restore Asterisk configuration
sudo cp /etc/asterisk/rtp.conf.backup-TIMESTAMP /etc/asterisk/rtp.conf
sudo asterisk -rx "module reload res_rtp_asterisk.so"

# 3. Remove HOMER components
sudo rm -f /usr/local/bin/heplify
sudo rm -f /usr/local/bin/heplify-server
sudo rm -f /etc/systemd/system/heplify.service
sudo rm -f /etc/systemd/system/heplify-server.service
sudo rm -rf /etc/heplify-server
sudo systemctl daemon-reload

# 4. Remove PostgreSQL (OPTIONAL - only if causing issues)
sudo systemctl stop postgresql
sudo systemctl disable postgresql
sudo apt remove -y postgresql postgresql-contrib
sudo rm -rf /var/lib/postgresql

# 5. Verify Asterisk is working
sudo asterisk -rx "core show channels"
```

---

## 📊 Risk Assessment

| Phase | Risk Level | Impact on 7000/7001 | Impact on 7777/8888 | Reversible |
|-------|------------|---------------------|---------------------|------------|
| Phase 1: Backup | LOW | None | None | N/A |
| Phase 2: Install HEPlify | LOW | None | None | ✅ Yes |
| Phase 3: Install Backend | LOW | None | None | ✅ Yes |
| Phase 4: Asterisk Config | **MEDIUM** | ⚠️ RTCP interval change | ⚠️ RTCP interval change | ✅ Yes |
| Phase 5: Start Services | LOW | None (passive monitoring) | None (passive monitoring) | ✅ Yes |
| Phase 6: Enable HEP | **MEDIUM** | ⚠️ HEP packet overhead | ⚠️ HEP packet overhead | ✅ Yes |
| Phase 7-8: Verification | LOW | None | None | N/A |

---

## 🤝 Coordination with Other Terminal

**IMPORTANT:** Before Phase 4 (Asterisk RTP reload), coordinate with parallel terminal:

1. Check if test-rtp-sender is still running:
   ```bash
   ssh azureuser@20.170.155.53 "ps aux | grep test-rtp-sender | grep -v grep"
   ```

2. If PID 260089 is active, either:
   - Wait for testing to complete
   - OR coordinate with other terminal to pause testing during Asterisk reload

---

## ✅ APPROVAL CHECKLIST

Please confirm you understand and approve:

- [ ] I understand this modifies **system-wide** Asterisk configuration
- [ ] I understand 7000/7001 extensions **will be affected** by RTCP changes
- [ ] I approve modifying `/etc/asterisk/rtp.conf`
- [ ] I approve installing PostgreSQL, HEPlify, heplify-server
- [ ] I approve creating systemd services for HOMER
- [ ] I understand Asterisk RTP module reload may briefly interrupt active calls
- [ ] I have reviewed the complete rollback procedure
- [ ] I am ready to proceed with installation

---

## 📝 Notes

- All changes are on **TEST VM ONLY** (20.170.155.53)
- **PRODUCTION VM** (4.185.84.26) will NOT be touched
- HOMER monitoring is **passive** and should not degrade audio quality
- Full rollback available at any step
- Coordination with parallel RTP debugging terminal is required before Asterisk reload

---

**Status:** ⏸️ AWAITING YOUR APPROVAL TO PROCEED

Type **"APPROVED"** to begin installation, or ask questions if you need clarification.
