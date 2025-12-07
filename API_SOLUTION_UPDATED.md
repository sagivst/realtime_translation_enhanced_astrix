# API Access Solutions for UI Team

## The LocalTunnel Issue:
LocalTunnel requires a password (20.170.155.53) for browser access, which makes it difficult for v0.app to use directly.

## Working Solutions:

### Solution 1: Direct API Access with Headers
For the v0.app dashboard, update the fetch to include bypass header:

```javascript
const API_URL = 'https://monitoring-api-astrix.loca.lt/api/snapshots';

fetch(API_URL, {
  headers: {
    'bypass-tunnel-reminder': 'yes',
    'User-Agent': 'MonitoringDashboard/1.0'  // Custom user agent also bypasses
  }
})
.then(res => res.json())
.then(data => console.log(data));
```

**Tunnel Password:** 20.170.155.53 (if needed for browser access)

### Solution 2: Use HTTP with Port Forwarding (Simplest for Development)
Since v0.app can't reach private IPs, you could:
1. Set up SSH port forwarding on YOUR local machine:
   ```bash
   ssh -L 8080:localhost:8080 azureuser@20.170.155.53
   ```
2. Then access: `http://localhost:8080/api/snapshots` from your local browser

### Solution 3: Request Public IP from Azure
Ask your infrastructure team to:
1. Assign a public IP to the VM
2. Open port 8080 in the Network Security Group
3. Then access directly: `http://PUBLIC_IP:8080/api/snapshots`

## Current Status:
- ✅ API is working perfectly on private network
- ✅ CORS headers are enabled
- ✅ Real Station-3 data is flowing
- ⚠️ LocalTunnel has password protection for browsers
- ⚠️ v0.app needs either bypass headers or a different solution

## For Immediate Testing:
You can test the API directly using curl with bypass header:
```bash
curl -H "bypass-tunnel-reminder: yes" \
     https://monitoring-api-astrix.loca.lt/api/snapshots
```

Or access in browser with password: **20.170.155.53**

---
**Recommendation:** For production, get a proper public IP or domain with SSL certificate. LocalTunnel/ngrok are only temporary development solutions.