
# PM2-Based Monitoring & Control Specification  
Version: 1.0  
Scope: Core / Monitoring / Gateway JS Services + cloudflared  
Target: Node.js services running on `asterisk-translation-vm` and related hosts

---

## 1. Purpose & Scope

This document defines how **PM2** is used as the **single source of truth and control layer** for:

- Running all core, monitoring, and gateway services
- Ensuring each service has a unique PID and controlled lifecycle
- Monitoring process health (alive/dead + basic metrics)
- Exposing a REST API to:
  - Start a component
  - Stop a component
  - Restart a component
  - Query full system health

All control operations will be executed *through* PM2, and all process-level health data will be collected from PM2 and exposed via `database-api-server.js`.

---

## 2. Components Under PM2 Management

All components listed below **must** run under PM2 and must **not** be started using raw `node` commands in production.

### 2.1 Core Services

- `sttttserver.js`  
- `ari-gstreamer.js`

### 2.2 Monitoring Layer

- `monitoring-server.js`
- `database-api-server.js`
- `monitoring-bridge.js`
- `metrics-emitter.js`
- `cloudflared` (native binary, but still managed by PM2)

### 2.3 Gateway Layer

- `gateway-3333.js`
- `gateway-4444.js`

Each of these will be tracked as a **distinct PM2 process** with a unique PID.

---

## 3. PM2 Process Model & Naming Conventions

Each component is represented as a **PM2 app** with a stable, canonical name:

| Component ID       | PM2 Name          | Script / Command                    | Layer       | Critical |
|--------------------|-------------------|-------------------------------------|------------|----------|
| `sttttserver`      | `sttttserver`     | `sttttserver.js`                    | core       | true     |
| `ari-gstreamer`    | `ari-gstreamer`   | `ari-gstreamer.js`                  | core       | true     |
| `monitoring-server`| `monitoring-server`| `monitoring-server.js`             | monitoring | true     |
| `database-api-server`| `database-api-server`| `database-api-server.js`       | monitoring | true     |
| `monitoring-bridge`| `monitoring-bridge`| `monitoring-bridge.js`            | monitoring | false    |
| `metrics-emitter`  | `metrics-emitter` | `metrics-emitter.js`                | monitoring | false    |
| `cloudflared`      | `cloudflared`     | `cloudflared` (binary in PATH)      | monitoring | false    |
| `gateway-3333`     | `gateway-3333`    | `gateway-3333.js`                   | gateways   | true     |
| `gateway-4444`     | `gateway-4444`    | `gateway-4444.js`                   | gateways   | true     |

> **Note:** Component ID = PM2 `name` = `:component` used in the API routes.

Each process will have a **unique PID**, enforced by PM2. No two components should share a PID.

---

## 4. PM2 Ecosystem Configuration

All managed services are defined in a single `ecosystem.config.js` file.

### 4.1 Example `ecosystem.config.js`

```js
module.exports = {
  apps: [
    // CORE SERVICES
    {
      name: "sttttserver",
      script: "./sttttserver.js",
      instances: 1,
      autorestart: true,
      max_memory_restart: "300M",
      env: {
        PORT: 8080
      }
    },
    {
      name: "ari-gstreamer",
      script: "./ari-gstreamer.js",
      instances: 1,
      autorestart: true
    },

    // MONITORING LAYER
    {
      name: "monitoring-server",
      script: "./monitoring-server.js",
      instances: 1,
      autorestart: true,
      env: {
        PORT: 3001
      }
    },
    {
      name: "database-api-server",
      script: "./database-api-server.js",
      instances: 1,
      autorestart: true,
      env: {
        PORT: 8083
      }
    },
    {
      name: "monitoring-bridge",
      script: "./monitoring-bridge.js",
      instances: 1,
      autorestart: true
    },
    {
      name: "metrics-emitter",
      script: "./metrics-emitter.js",
      instances: 1,
      autorestart: true
    },
    {
      name: "cloudflared",
      script: "cloudflared",
      args: "tunnel run",   // adjust arguments according to your tunnel config
      instances: 1,
      autorestart: true
    },

    // GATEWAYS
    {
      name: "gateway-3333",
      script: "./gateway-3333.js",
      instances: 1,
      autorestart: true,
      env: {
        PORT: 7777
      }
    },
    {
      name: "gateway-4444",
      script: "./gateway-4444.js",
      instances: 1,
      autorestart: true,
      env: {
        PORT: 8888
      }
    }
  ]
};

4.2 PM2 CLI Commands
	•	Start all apps:

pm2 start ecosystem.config.js


	•	View process list:

pm2 ls


	•	Monitor in real-time:

pm2 monit


	•	Persist process list:

pm2 save


	•	Enable startup on boot:

pm2 startup



⸻

5. PM2 Programmatic API (Node.js)

The monitoring/control layer will use the PM2 Node.js API (not shell commands) to:
	•	Start a component
	•	Stop a component
	•	Restart a component
	•	Query process details

This logic should live in monitoring-bridge.js, which will be called by database-api-server.js.

5.1 PM2 Node.js API Usage

const pm2 = require("pm2");

function withPM2(callback) {
  pm2.connect(err => {
    if (err) {
      console.error("PM2 connection error:", err);
      return callback(err);
    }
    callback(null, pm2);
  });
}

// Restart component
function restartComponent(componentName, cb) {
  withPM2((err, pm2) => {
    if (err) return cb(err);
    pm2.restart(componentName, (err, proc) => {
      pm2.disconnect();
      cb(err, proc);
    });
  });
}

// Stop component
function stopComponent(componentName, cb) {
  withPM2((err, pm2) => {
    if (err) return cb(err);
    pm2.stop(componentName, (err, proc) => {
      pm2.disconnect();
      cb(err, proc);
    });
  });
}

// Start component
function startComponent(componentName, cb) {
  withPM2((err, pm2) => {
    if (err) return cb(err);
    pm2.start(componentName, (err, proc) => {
      pm2.disconnect();
      cb(err, proc);
    });
  });
}

// List / describe processes
function listComponents(cb) {
  withPM2((err, pm2) => {
    if (err) return cb(err);
    pm2.list((err, processList) => {
      pm2.disconnect();
      cb(err, processList);
    });
  });
}

module.exports = {
  restartComponent,
  stopComponent,
  startComponent,
  listComponents
};


⸻

6. REST API: Control Endpoints

All external control is performed via database-api-server.js, which assigns requests to monitoring-bridge.js (PM2 API).

6.1 Endpoints

6.1.1 Restart a Component
	•	Method: POST
	•	Path: /api/control/restart/:component
	•	Path param: :component → one of the PM2 names (e.g. sttttserver, gateway-3333)

Example request:

POST /api/control/restart/gateway-3333

Example success response:

{
  "status": "OK",
  "action": "restart",
  "component": "gateway-3333",
  "pm2_id": 3,
  "message": "Component restarted successfully"
}

Error (unknown component):

{
  "status": "ERROR",
  "action": "restart",
  "component": "unknown-service",
  "message": "Component not found in PM2"
}


⸻

6.1.2 Stop a Component
	•	Method: POST
	•	Path: /api/control/stop/:component

Response example:

{
  "status": "OK",
  "action": "stop",
  "component": "sttttserver",
  "message": "Component stopped successfully"
}


⸻

6.1.3 Start a Component
	•	Method: POST
	•	Path: /api/control/start/:component

Response example:

{
  "status": "OK",
  "action": "start",
  "component": "metrics-emitter",
  "message": "Component started successfully"
}


⸻

7. REST API: System Health Endpoint
	•	Method: GET
	•	Path: /api/health/system

This endpoint returns a full health snapshot of:
	•	All 9 monitored components
	•	System-level CPU/memory/load
	•	Uptime
	•	Host info

7.1 Response Schema (Extended)

{
  "status": "HEALTHY | DEGRADED | DOWN",
  "components_live": 0,
  "components_total": 9,
  "components": {
    "<componentName>": {
      "status": "LIVE | DOWN",
      "pid": 0,
      "port": 0,
      "layer": "core | monitoring | gateways",
      "critical": true,
      "lastCheck": "ISO8601",
      "pm2_id": 0,
      "cpu_percent": 0.0,
      "memory_rss_mb": 0,
      "memory_heap_mb": 0,
      "uptime_seconds": 0,
      "restart_count": 0,
      "start_time": "ISO8601",
      "env_port": 0
    }
  },
  "cpu": {
    "loadAvg1min": 0.0,
    "loadAvg5min": 0.0,
    "loadAvg15min": 0.0,
    "cores": 2
  },
  "memory": {
    "total_mb": 0,
    "used_mb": 0,
    "free_mb": 0,
    "usage_percent": 0.0
  },
  "uptime": {
    "system_seconds": 0.0,
    "process_seconds": 0.0
  },
  "platform": "linux",
  "hostname": "asterisk-translation-vm",
  "timestamp": "ISO8601"
}

7.2 Example (based on your current JSON, extended)

{
  "status": "DEGRADED",
  "components_live": 8,
  "components_total": 9,
  "components": {
    "sttttserver": {
      "status": "LIVE",
      "pid": 123456,
      "pm2_id": 0,
      "port": 8080,
      "env_port": 8080,
      "layer": "core",
      "critical": true,
      "cpu_percent": 3.2,
      "memory_rss_mb": 72,
      "memory_heap_mb": 48,
      "uptime_seconds": 10234,
      "restart_count": 1,
      "start_time": "2025-12-11T16:00:00.000Z",
      "lastCheck": "2025-12-11T17:13:44.322Z"
    },
    "ari-gstreamer": {
      "status": "LIVE",
      "pid": 163263,
      "pm2_id": 1,
      "port": null,
      "env_port": null,
      "layer": "core",
      "critical": true,
      "cpu_percent": 5.8,
      "memory_rss_mb": 64,
      "memory_heap_mb": 33,
      "uptime_seconds": 9800,
      "restart_count": 0,
      "start_time": "2025-12-11T16:05:00.000Z",
      "lastCheck": "2025-12-11T17:13:44.333Z"
    },
    "monitoring-server": {
      "status": "LIVE",
      "pid": 1186824,
      "pm2_id": 2,
      "port": 3001,
      "env_port": 3001,
      "layer": "monitoring",
      "critical": true,
      "cpu_percent": 1.5,
      "memory_rss_mb": 50,
      "memory_heap_mb": 28,
      "uptime_seconds": 10000,
      "restart_count": 0,
      "start_time": "2025-12-11T16:10:00.000Z",
      "lastCheck": "2025-12-11T17:13:44.345Z"
    }
    // ... other components ...
  },
  "cpu": {
    "loadAvg1min": 0.42,
    "loadAvg5min": 0.53,
    "loadAvg15min": 0.57,
    "cores": 2
  },
  "memory": {
    "total_mb": 3868,
    "used_mb": 1891,
    "free_mb": 1977,
    "usage_percent": 49
  },
  "uptime": {
    "system_seconds": 72609.62,
    "process_seconds": 1035.86
  },
  "platform": "linux",
  "hostname": "asterisk-translation-vm",
  "timestamp": "2025-12-11T17:13:44.408Z"
}


⸻

8. Health Collection Logic

The health collector (likely inside monitoring-server.js or metrics-emitter.js) should:
	1.	Call PM2 programmatic API: pm2.list()
	2.	Transform each PM2 process into the component object described above
	3.	Merge with system-level metrics (os.loadavg, os.totalmem, etc.)
	4.	Store (or just serve) via database-api-server.js under /api/health/system

8.1 Collecting Process Metrics from PM2

Each PM2 process object contains fields such as:
	•	pm2_env.name
	•	pid
	•	pm_id
	•	monit.cpu
	•	monit.memory
	•	pm2_env.pm_uptime
	•	pm2_env.restart_time

Example:

const os = require("os");
const pm2 = require("pm2");

function collectHealth(callback) {
  pm2.connect(err => {
    if (err) return callback(err);

    pm2.list((err, list) => {
      pm2.disconnect();

      if (err) return callback(err);

      const components = {};

      const now = new Date().toISOString();

      list.forEach(proc => {
        const name = proc.name;

        const cpu = proc.monit.cpu;            // %
        const memBytes = proc.monit.memory;    // bytes
        const rssMb = Math.round(memBytes / 1024 / 1024);
        const uptimeSeconds = (Date.now() - proc.pm2_env.pm_uptime) / 1000;

        components[name] = {
          status: proc.pm2_env.status === "online" ? "LIVE" : "DOWN",
          pid: proc.pid,
          pm2_id: proc.pm_id,
          layer: detectLayerFromName(name),
          critical: isCritical(name),
          port: detectPortFromEnv(proc.pm2_env),
          env_port: proc.pm2_env.PORT || null,
          cpu_percent: cpu,
          memory_rss_mb: rssMb,
          memory_heap_mb: null, // optional, needs extra probes
          uptime_seconds: uptimeSeconds,
          restart_count: proc.pm2_env.restart_time,
          start_time: new Date(proc.pm2_env.pm_uptime).toISOString(),
          lastCheck: now
        };
      });

      const load = os.loadavg();
      const totalMb = os.totalmem() / 1024 / 1024;
      const freeMb = os.freemem() / 1024 / 1024;
      const usedMb = totalMb - freeMb;

      const payload = {
        status: deriveGlobalStatus(components),
        components_live: Object.values(components).filter(c => c.status === "LIVE").length,
        components_total: Object.keys(components).length,
        components,
        cpu: {
          loadAvg1min: load[0],
          loadAvg5min: load[1],
          loadAvg15min: load[2],
          cores: os.cpus().length
        },
        memory: {
          total_mb: Math.round(totalMb),
          used_mb: Math.round(usedMb),
          free_mb: Math.round(freeMb),
          usage_percent: Math.round((usedMb / totalMb) * 100)
        },
        uptime: {
          system_seconds: os.uptime(),
          process_seconds: process.uptime()
        },
        platform: os.platform(),
        hostname: os.hostname(),
        timestamp: new Date().toISOString()
      };

      callback(null, payload);
    });
  });
}

function detectLayerFromName(name) {
  if (name.startsWith("gateway-")) return "gateways";
  if (name === "sttttserver" || name === "ari-gstreamer") return "core";
  return "monitoring";
}

function isCritical(name) {
  return [
    "sttttserver",
    "ari-gstreamer",
    "monitoring-server",
    "database-api-server",
    "gateway-3333",
    "gateway-4444"
  ].includes(name);
}

function detectPortFromEnv(env) {
  return env.PORT ? Number(env.PORT) : null;
}

function deriveGlobalStatus(components) {
  const values = Object.values(components);
  const criticalDown = values.some(c => c.critical && c.status !== "LIVE");
  const anyDown = values.some(c => c.status !== "LIVE");

  if (criticalDown) return "DOWN";
  if (anyDown) return "DEGRADED";
  return "HEALTHY";
}

database-api-server.js can simply call this collectHealth function and return the JSON.

⸻

9. Error Handling & Edge Cases
	•	If PM2 is not running → return "status": "DOWN" with components_total = 0
	•	If a component is defined in config but missing in PM2 → mark as status="DOWN" with pid=null
	•	Control endpoints must:
	•	Validate :component against a whitelist of PM2 names
	•	Return clear messages on failure (e.g., PM2 not connected, process missing)
	•	Consider simple rate-limiting for control actions (no restart spam).

⸻

10. Operational Guidelines
	1.	All JS services must be started via PM2 only.
	2.	cloudflared must also be managed by PM2 for visibility and auto-restart.
	3.	pm2 save must be executed after any change to running processes.
	4.	pm2 startup must be configured on the host to restore processes on reboot.
	5.	Health checks should run at a fixed interval (e.g., every 2–5 seconds).
	6.	The UI dashboard should rely solely on /api/health/system for component state.
	7.	All automation (restart, stop, start) must use the REST API, not manual shell usage, in production.

⸻

11. Future Extensions (Optional)
	•	Add event-loop lag metric using a small probe module.
	•	Add per-component custom metrics (e.g., number of active WebSocket clients).
	•	Emit metrics to a time-series DB (InfluxDB / Prometheus) via metrics-emitter.js.
	•	Integrate alerting (Slack / email / webhook) on status=DOWN or status=DEGRADED.

⸻

End of document.


