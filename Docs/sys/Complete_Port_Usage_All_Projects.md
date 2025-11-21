# Complete Port Usage - All Projects
**Server:** 20.170.155.53 (asterisk-dev-vm-clone)
**Date:** 2025-11-21
**Status:** All three projects running in parallel

---

## 🔵 PROJECT 1: 3333_4444__Operational

### Purpose
PCM cross-patch with monitoring (baseline for translation merger)

### Components

#### conf-server-phase1.js
| Port | Protocol | Direction | Purpose |
|------|----------|-----------|---------|
| 3021 | TCP | Listen | WebSocket server + monitoring dashboard |
| 6120 | UDP | IN | Receive PCM from gateway-3333 |
| 6121 | UDP | OUT | Send PCM to gateway-3333 |
| 6122 | UDP | IN | Receive PCM from gateway-4444 |
| 6123 | UDP | OUT | Send PCM to gateway-4444 |

#### gateway-3333-udp.js (Extension 3333 - English)
| Port | Protocol | Direction | Purpose |
|------|----------|-----------|---------|
| 4020 | UDP | IN | Receive RTP from Asterisk |
| 4021 | UDP | OUT | Send RTP to Asterisk |
| 6120 | UDP | OUT | Send PCM to conf-server |
| 6121 | UDP | IN | Receive PCM from conf-server |

#### gateway-4444-buffered.js (Extension 4444 - French)
| Port | Protocol | Direction | Purpose |
|------|----------|-----------|---------|
| 4022 | UDP | IN | Receive RTP from Asterisk |
| 4023 | UDP | OUT | Send RTP to Asterisk |
| 6122 | UDP | OUT | Send PCM to conf-server |
| 6123 | UDP | IN | Receive PCM from conf-server |

#### STTTTSserver.js (Translation Server - Baseline)
| Port | Protocol | Direction | Purpose |
|------|----------|-----------|---------|
| 3010 | TCP | Listen | HTTP/Socket.IO server + dashboard (default) |
| 3020 | TCP | Listen | HTTP/Socket.IO server + dashboard (when PORT=3020 env) |
| 6211 | TCP | Listen | TCP API Dashboard metrics |

**Note:** Currently NOT running (stopped for conf-server testing). After merger, will also use UDP ports 6120-6123.

#### Monitoring Dashboard (HTTP Server)
| Port | Protocol | Direction | Purpose |
|------|----------|-----------|---------|
| 3020 | TCP | Listen | Serve monitoring-dashboard.html (temporary) |

#### ari-gstreamer-phase1.js
| Port | Protocol | Direction | Purpose |
|------|----------|-----------|---------|
| N/A | - | - | ARI client (connects to Asterisk ARI) |

### URLs
- **Monitoring Dashboard:** http://20.170.155.53:3021/
- **Monitoring Status API:** http://20.170.155.53:3021/status
- **Dashboard (temp):** http://20.170.155.53:3020/monitoring-dashboard.html

### Asterisk Extensions
- **3333** (English) - RTP: 4020/4021
- **4444** (French) - RTP: 4022/4023

---

## 🟢 PROJECT 2: 5555-6666-pcm-crossover

### Purpose
PCM cross-patch system (no translation)

### Components

#### conf-server-phase1.js
| Port | Protocol | Direction | Purpose |
|------|----------|-----------|---------|
| 6100 | UDP | IN | Receive PCM from gateway-5555 |
| 6101 | UDP | OUT | Send PCM to gateway-5555 |
| 6102 | UDP | IN | Receive PCM from gateway-6666 |
| 6103 | UDP | OUT | Send PCM to gateway-6666 |

#### gateway-5555-buffered.js (Extension 5555)
| Port | Protocol | Direction | Purpose |
|------|----------|-----------|---------|
| 4000 | UDP | IN | Receive RTP from Asterisk |
| 4001 | UDP | OUT | Send RTP to Asterisk |
| 6100 | UDP | OUT | Send PCM to conf-server |
| 6101 | UDP | IN | Receive PCM from conf-server |

#### gateway-6666-buffered.js (Extension 6666)
| Port | Protocol | Direction | Purpose |
|------|----------|-----------|---------|
| 4002 | UDP | IN | Receive RTP from Asterisk |
| 4003 | UDP | OUT | Send RTP to Asterisk |
| 6102 | UDP | OUT | Send PCM to conf-server |
| 6103 | UDP | IN | Receive PCM from conf-server |

#### ari-gstreamer-phase1.js
| Port | Protocol | Direction | Purpose |
|------|----------|-----------|---------|
| N/A | - | - | ARI client (connects to Asterisk ARI) |

### Asterisk Extensions
- **5555** - RTP: 4000/4001
- **6666** - RTP: 4002/4003

---

## 🟡 PROJECT 3: 7777-8888-stack

### Purpose
Translation system with conference server (ExternalMedia)

### Components

#### conference-server-externalmedia.js
| Port | Protocol | Direction | Purpose |
|------|----------|-----------|---------|
| 7000 | UDP | IN/OUT | Extension 7777 (English) - ExternalMedia |
| 7001 | UDP | IN/OUT | Extension 7777 translated audio |
| 7002 | UDP | IN/OUT | Extension 8888 (French) - ExternalMedia |
| 7003 | UDP | IN/OUT | Extension 8888 translated audio |

*Note: ExternalMedia uses bidirectional communication on same ports*

#### gateway-7777-8888.js (Combined Gateway)
| Port | Protocol | Direction | Purpose |
|------|----------|-----------|---------|
| N/A | - | - | Handles both 7777 and 8888 via ExternalMedia |

#### Dashboard HTTP Server
| Port | Protocol | Direction | Purpose |
|------|----------|-----------|---------|
| 8081 | TCP | Listen | Serve dashboard (monitoring) |

### URLs
- **Dashboard:** http://20.170.155.53:8081/

### Asterisk Extensions
- **7777** (English) - ExternalMedia: 7000/7001
- **8888** (French) - ExternalMedia: 7002/7003

---

## 📊 Port Range Summary

### Asterisk RTP Ports (4000-4999)
| Range | Project | Extensions |
|-------|---------|------------|
| 4000-4003 | 5555-6666-pcm-crossover | 5555 (4000/4001), 6666 (4002/4003) |
| 4020-4023 | 3333_4444__Operational | 3333 (4020/4021), 4444 (4022/4023) |

### PCM UDP Ports (6000-6999)
| Range | Project | Purpose |
|-------|---------|---------|
| 6100-6103 | 5555-6666-pcm-crossover | Cross-patch PCM (5555/6666) |
| 6120-6123 | 3333_4444__Operational | Cross-patch PCM (3333/4444) |

### ExternalMedia UDP Ports (7000-7999)
| Range | Project | Purpose |
|-------|---------|---------|
| 7000-7003 | 7777-8888-stack | ExternalMedia translation (7777/8888) |

### HTTP/WebSocket Ports (3000-9999)
| Port | Project | Purpose |
|------|---------|---------|
| 3020 | 3333_4444__Operational | HTTP server (monitoring-dashboard.html) |
| 3021 | 3333_4444__Operational | conf-server WebSocket + monitoring |
| 8081 | 7777-8888-stack | Dashboard HTTP server |

---

## 🔒 Port Isolation & Conflict Prevention

### No Conflicts Between Projects
✅ Each project uses **completely separate port ranges**
✅ All three projects can run **simultaneously**
✅ No interference between systems

### Port Allocation Strategy
1. **Asterisk RTP**: 4000s range, grouped by project (4000-4003, 4020-4023)
2. **PCM UDP**: 6000s range, grouped by project (6100-6103, 6120-6123)
3. **ExternalMedia**: 7000s range (7000-7003)
4. **HTTP/WebSocket**: 3000s and 8000s (3020, 3021, 8081)

---

## 🔍 Verification Commands

### Check All Projects Running
```bash
ssh azureuser@20.170.155.53 << 'EOF'
echo "=== 3333/4444 ==="
pgrep -af "3333_4444__Operational" | grep -E "gateway|conf-server"

echo -e "\n=== 5555/6666 ==="
pgrep -af "5555-6666-pcm-crossover" | grep -E "gateway|conf-server"

echo -e "\n=== 7777/8888 ==="
pgrep -af "7777-8888-stack" | grep -E "gateway|conference"
EOF
```

### Check All UDP Ports
```bash
ss -ulnp | grep -E '(400[0-3]|402[0-3]|610[0-3]|612[0-3]|700[0-3])'
```

### Check All HTTP Ports
```bash
ss -tlnp | grep -E '(3020|3021|8081)'
```

### Test Dashboards
```bash
curl -I http://20.170.155.53:3020/monitoring-dashboard.html
curl -I http://20.170.155.53:3021/
curl -I http://20.170.155.53:8081/
```

---

## 🎯 Merger Impact Analysis

### Before Merger (Current State)
- **3333/4444**: Uses conf-server-phase1.js (cross-patch only, no translation)
- **Ports used**: 3021 (WS), 6120-6123 (UDP), 4020-4023 (RTP)

### After Merger (Target State)
- **3333/4444**: Will use STTTTSserver.js with merged UDP PCM code
- **Ports will remain**: 3020 (HTTP/Socket.IO), 6120-6123 (UDP), 4020-4023 (RTP)
- **Port 3021**: Will be freed (conf-server WebSocket not merged)
- **No impact on**: 5555/6666 or 7777/8888 systems

### Merger Port Changes
| Component | Before | After |
|-----------|--------|-------|
| HTTP/Socket.IO | 3020 (STTTTSserver) | 3020 (STTTTSserver - unchanged) |
| WebSocket Monitoring | 3021 (conf-server) | ❌ Not merged (removed) |
| UDP PCM | 6120-6123 (conf-server) | 6120-6123 (STTTTSserver) |
| Asterisk RTP | 4020-4023 (gateways) | 4020-4023 (gateways - unchanged) |

---

## 📝 Notes

1. **Port 3020** currently serves monitoring-dashboard.html via Python HTTP server (temporary for testing)
2. **Port 3021** serves conf-server WebSocket and monitoring (will be removed after merger)
3. **Port 8081** serves 7777-8888 dashboard
4. All **UDP ports are bidirectional** (IN/OUT on same port for ExternalMedia)
5. **No port conflicts** - each project isolated
6. **Firewall rules** (Azure NSG):
   - Port 3020: Open ✅
   - Port 3021: Open ✅ (just added)
   - Port 8081: Check if open

---

## 🚀 Ready for Merger

**Current Status:**
- ✅ All three projects running
- ✅ conf-server-phase1.js verified working (3333/4444)
- ✅ Ports documented and isolated
- ✅ No conflicts between systems
- ✅ Ready to merge PCM sockets into STTTTSserver.js

**Next Step:**
Proceed with merger plan execution (PHASE 1-6)

---

**END OF PORT USAGE DOCUMENT**
