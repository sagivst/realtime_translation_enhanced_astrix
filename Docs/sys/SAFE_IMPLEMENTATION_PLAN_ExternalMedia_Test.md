# SAFE Implementation Plan: ExternalMedia Test System (Extensions 7777/8888)

**Date**: November 5, 2025
**Strategy**: Parallel implementation - DO NOT touch working system
**Test Extensions**: 7777 and 8888 (isolated from production 7000/7001)
**Interface**: Web-based with mic/speaker controls per extension

---

## 🚨 CRITICAL: PRODUCTION VM PROTECTION 🚨

### ⛔ ABSOLUTELY FORBIDDEN - NEVER TOUCH ⛔
**Production VM IP: 4.185.84.26**
- ❌ **NEVER SSH** to 4.185.84.26
- ❌ **NEVER SCP** files to/from 4.185.84.26
- ❌ **NEVER MODIFY** anything on 4.185.84.26
- ❌ **NEVER CONNECT** to 4.185.84.26 in any way
- ❌ **NEVER ACCESS** http://4.185.84.26

### ✅ SAFE DEVELOPMENT VM (Only allowed server)
**Development/Test VM IP: 20.170.155.53**
- ✅ SSH access allowed: `ssh azureuser@20.170.155.53`
- ✅ File transfers allowed to this server only
- ✅ All testing happens here

---

## 🎯 Core Strategy: Zero Risk to Production

### What We Will NOT Touch
❌ Extensions 7000 and 7001 - **UNTOUCHED**
❌ AudioSocket orchestrators on ports 5050-5057 - **UNTOUCHED**
❌ Current conference-server.js - **UNTOUCHED**
❌ Current translation pipeline - **UNTOUCHED**
❌ Current dashboard - **UNTOUCHED**
❌ **PRODUCTION VM 4.185.84.26** - **ABSOLUTELY FORBIDDEN**

### What We Will Create (Separate & Isolated)
✅ New extensions: 7777 (test English) and 8888 (test French)
✅ New ARI-based application: `translation-test`
✅ New RTP ports: 9000-9003 (completely separate)
✅ New web interface: `test-translation.html`
✅ New Node.js server: `externalmedia-test-server.js`
✅ New Asterisk dialplan context: `[externalmedia-test]`

---

## 📋 Architecture Overview

```
┌─────────────────────────────────────────────────────────────────┐
│                    PRODUCTION SYSTEM (UNTOUCHED)                │
│  Extensions 7000/7001 → AudioSocket → Current System            │
└─────────────────────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────────────────────┐
│                    TEST SYSTEM (NEW & ISOLATED)                 │
│                                                                 │
│  ┌─────────────────────────────────────────────────────────┐   │
│  │ Browser: http://20.170.155.53:3001/test-translation.html│   │
│  │                                                          │   │
│  │  Extension 7777 Section:                                │   │
│  │    [Mic Enable] [Speaker Volume] [Call Button]          │   │
│  │    WebSocket ↕ Real-time Audio                          │   │
│  │                                                          │   │
│  │  Extension 8888 Section:                                │   │
│  │    [Mic Enable] [Speaker Volume] [Call Button]          │   │
│  │    WebSocket ↕ Real-time Audio                          │   │
│  └─────────────────────────────────────────────────────────┘   │
│                           ↕                                     │
│  ┌─────────────────────────────────────────────────────────┐   │
│  │ Node.js Test Server (Port 3001)                         │   │
│  │  - WebSocket server for browser audio                   │   │
│  │  - ARI client connected to Asterisk                     │   │
│  │  - RTP receiver/sender for each extension               │   │
│  │  - Audio bridging logic                                 │   │
│  └─────────────────────────────────────────────────────────┘   │
│                           ↕                                     │
│  ┌─────────────────────────────────────────────────────────┐   │
│  │ Asterisk (ARI + ExternalMedia)                          │   │
│  │  - Extension 7777 → Stasis(translation-test)            │   │
│  │  - Extension 8888 → Stasis(translation-test)            │   │
│  │  - ExternalMedia channels with RTP                      │   │
│  └─────────────────────────────────────────────────────────┘   │
└─────────────────────────────────────────────────────────────────┘
```

---

## 🔧 Implementation Components

### 1. Web Interface: `test-translation.html`

**Location**: `/home/azureuser/translation-app/public/test-translation.html`
**Access**: http://20.170.155.53:3001/test-translation.html

**Features**:
- Two sections: one for ext 7777, one for ext 8888
- Mic capture using WebRTC (browser getUserMedia)
- Speaker playback using Web Audio API
- WebSocket connection to Node.js server
- Visual indicators: call status, audio levels, connection state

**UI Layout**:
```html
┌──────────────────────────────────────────────────────────┐
│         Real-Time Translation Test Interface            │
├──────────────────────────────────────────────────────────┤
│                                                          │
│  Extension 7777 (Test English)                          │
│  ┌────────────────────────────────────────────────────┐ │
│  │ Status: ⚫ Disconnected                            │ │
│  │ [🎤 Enable Mic]  [🔊 Speaker: ████████░░ 80%]     │ │
│  │ [📞 Start Call]                                    │ │
│  │ Audio Level: ▮▮▮▮▮▯▯▯▯▯                           │ │
│  └────────────────────────────────────────────────────┘ │
│                                                          │
│  Extension 8888 (Test French)                           │
│  ┌────────────────────────────────────────────────────┐ │
│  │ Status: ⚫ Disconnected                            │ │
│  │ [🎤 Enable Mic]  [🔊 Speaker: ████████░░ 80%]     │ │
│  │ [📞 Start Call]                                    │ │
│  │ Audio Level: ▮▮▮▮▮▯▯▯▯▯                           │ │
│  └────────────────────────────────────────────────────┘ │
│                                                          │
│  Test Log:                                              │
│  ┌────────────────────────────────────────────────────┐ │
│  │ [12:34:56] Ext 7777 connected                      │ │
│  │ [12:35:02] Audio streaming started                 │ │
│  │ [12:35:15] Ext 8888 connected                      │ │
│  └────────────────────────────────────────────────────┘ │
└──────────────────────────────────────────────────────────┘
```

### 2. Node.js Test Server: `externalmedia-test-server.js`

**Location**: `/home/azureuser/translation-app/externalmedia-test-server.js`

**Responsibilities**:
1. **HTTP Server** (port 3001): Serve web interface
2. **WebSocket Server**: Handle browser audio streams
3. **ARI Client**: Control Asterisk channels
4. **RTP Handler**: Send/receive audio to/from Asterisk
5. **Audio Bridging**: Route audio between extensions

**Key Modules**:

```javascript
// Server structure
const express = require('express');
const WebSocket = require('ws');
const ariClient = require('ari-client');
const RtpUdpServer = require('./lib/rtp-udp-server');
const RtpUdpSender = require('./lib/rtp-udp-sender');

class ExternalMediaTestServer {
  constructor() {
    this.httpServer = express(); // Port 3001
    this.wssServer = null;       // WebSocket for browser
    this.ariClient = null;       // Asterisk ARI

    // Extension 7777 handlers
    this.ext7777 = {
      webSocket: null,           // Browser WebSocket
      rtpReceiver: null,         // RTP from Asterisk (port 9000)
      rtpSender: null,           // RTP to Asterisk (dynamic)
      externalMediaChannel: null // ARI channel
    };

    // Extension 8888 handlers
    this.ext8888 = {
      webSocket: null,           // Browser WebSocket
      rtpReceiver: null,         // RTP from Asterisk (port 9001)
      rtpSender: null,           // RTP to Asterisk (dynamic)
      externalMediaChannel: null // ARI channel
    };
  }
}
```

**Audio Flow**:
```
Browser Mic (7777)
  → WebSocket
  → Convert to PCM 16kHz
  → RTP Sender
  → Asterisk ExternalMedia (7777)
  → Asterisk Bridge
  → Asterisk ExternalMedia (8888)
  → RTP Receiver (port 9001)
  → Convert to WebSocket format
  → WebSocket
  → Browser Speaker (8888)
```

### 3. RTP Modules

#### A. RTP Receiver: `lib/rtp-udp-server.js`
**Source**: Copy from asterisk-external-media repository
**Purpose**: Receive audio FROM Asterisk

```javascript
// Already implemented in reference code
// Key features:
// - Strips 12-byte RTP header
// - Swaps byte order (big-endian → little-endian)
// - Emits 'data' events with raw PCM
```

#### B. RTP Sender: `lib/rtp-udp-sender.js`
**Purpose**: Send audio TO Asterisk
**NEW - We need to implement this**

```javascript
class RtpUdpSender {
  constructor(host, port) {
    this.host = host;
    this.port = port;
    this.sequenceNumber = 0;
    this.timestamp = 0;
    this.ssrc = Math.floor(Math.random() * 0xFFFFFFFF);
  }

  sendPCM(pcmBuffer) {
    // 1. Swap to big-endian
    const swapped = Buffer.from(pcmBuffer);
    swapped.swap16();

    // 2. Create RTP header (12 bytes)
    const header = this.createRtpHeader();

    // 3. Combine and send
    const packet = Buffer.concat([header, swapped]);
    this.socket.send(packet, this.port, this.host);

    // 4. Update sequence and timestamp
    this.sequenceNumber++;
    this.timestamp += 160; // 20ms @ 16kHz
  }

  createRtpHeader() {
    const header = Buffer.alloc(12);
    header[0] = 0x80; // Version 2
    header[1] = 11;   // Payload type: L16 mono
    header.writeUInt16BE(this.sequenceNumber, 2);
    header.writeUInt32BE(this.timestamp, 4);
    header.writeUInt32BE(this.ssrc, 8);
    return header;
  }
}
```

### 4. ARI Controller: `lib/test-ari-controller.js`

**Purpose**: Manage Asterisk channels via ARI

**Key Functions**:

```javascript
class TestAriController {
  async createExternalMediaChannel(extension, rtpPort) {
    // Create ExternalMedia channel
    const channel = this.ari.Channel();

    await channel.externalMedia({
      app: 'translation-test',
      external_host: `127.0.0.1:${rtpPort}`, // Our RTP receiver
      format: 'slin16' // 16kHz PCM
    });

    // Get Asterisk's RTP endpoint for sending
    const vars = await channel.getChannelVar({variable: 'UNICASTRTP_LOCAL_ADDRESS'});
    const asteriskHost = vars.value;

    const port = await channel.getChannelVar({variable: 'UNICASTRTP_LOCAL_PORT'});
    const asteriskPort = port.value;

    return {
      channel,
      asteriskHost,
      asteriskPort
    };
  }

  async createBridge() {
    const bridge = this.ari.Bridge();
    await bridge.create({type: 'mixing'});
    return bridge;
  }

  async addChannelToBridge(channel, bridge) {
    await bridge.addChannel({channel: channel.id});
  }
}
```

---

## 📝 Asterisk Configuration (Additions Only)

### File: `/etc/asterisk/extensions.conf`

**Add new context** (keep existing ones intact):

```ini
; ============================================
; TEST CONTEXT FOR EXTERNALMEDIA (DO NOT TOUCH PRODUCTION)
; ============================================
[externalmedia-test]

exten => 7777,1,NoOp(ExternalMedia Test - English)
 same => n,Answer()
 same => n,Stasis(translation-test,ext7777)
 same => n,Hangup()

exten => 8888,1,NoOp(ExternalMedia Test - French)
 same => n,Answer()
 same => n,Stasis(translation-test,ext8888)
 same => n,Hangup()
```

### File: `/etc/asterisk/ari.conf`

**Verify or add**:

```ini
[general]
enabled = yes
pretty = no

[asterisk]
type = user
read_only = no
password = asterisk
```

### File: `/etc/asterisk/http.conf`

**Verify or add**:

```ini
[general]
enabled=yes
bindaddr=0.0.0.0
bindport=8088
```

---

## 🚀 Implementation Steps

### Step 1: Create Test Directory on Azure VM

**SSH to Development VM** (ONLY allowed server):

```bash
# Connect to DEV VM (NOT 4.185.84.26!)
ssh azureuser@20.170.155.53

# Create test directory structure
cd /home/azureuser
mkdir -p test-externalmedia/{lib,public}
cd test-externalmedia

# Initialize npm project
npm init -y
```

### Step 2: Install Dependencies

**On Azure VM 20.170.155.53**:

```bash
cd /home/azureuser/test-externalmedia

# Install required packages
npm install express ws ari-client

# Verify installation
npm list
```

### Step 3: Copy RTP Receiver from Reference

**On Azure VM 20.170.155.53**:

```bash
# We'll need to download the reference implementation
cd /home/azureuser
git clone https://github.com/asterisk/asterisk-external-media.git

# Copy the RTP receiver to our test project
cp asterisk-external-media/lib/rtp-udp-server.js \
   test-externalmedia/lib/

# Verify
ls -la test-externalmedia/lib/
```

### Step 4: Create RTP Sender Module

**On Azure VM 20.170.155.53**:

**File**: `/home/azureuser/test-externalmedia/lib/rtp-udp-sender.js`

Create this file using nano or vi:

```javascript
const dgram = require('dgram');

class RtpUdpSender {
  constructor(host, port, payloadType = 11, sampleRate = 16000) {
    this.socket = dgram.createSocket('udp4');
    this.host = host;
    this.port = port;
    this.payloadType = payloadType; // 11 = L16 mono
    this.sampleRate = sampleRate;
    this.sequenceNumber = Math.floor(Math.random() * 65535);
    this.timestamp = Math.floor(Math.random() * 0xFFFFFFFF);
    this.ssrc = Math.floor(Math.random() * 0xFFFFFFFF);

    // Samples per frame: 20ms * sampleRate / 1000
    this.samplesPerFrame = Math.floor(sampleRate * 20 / 1000);

    console.log(`[RTP Sender] Created: ${host}:${port}, PT=${payloadType}, Rate=${sampleRate}Hz`);
  }

  createRtpHeader() {
    const header = Buffer.alloc(12);

    // Byte 0: V(2) P(0) X(0) CC(0)
    header[0] = 0x80; // Version 2

    // Byte 1: M(0) PT
    header[1] = this.payloadType & 0x7F;

    // Bytes 2-3: Sequence number
    header.writeUInt16BE(this.sequenceNumber, 2);

    // Bytes 4-7: Timestamp
    header.writeUInt32BE(this.timestamp, 4);

    // Bytes 8-11: SSRC
    header.writeUInt32BE(this.ssrc, 8);

    return header;
  }

  send(pcmBuffer) {
    if (!pcmBuffer || pcmBuffer.length === 0) {
      return;
    }

    // Swap to big-endian (RTP expects network byte order)
    const swapped = Buffer.from(pcmBuffer);
    swapped.swap16();

    // Create RTP packet
    const header = this.createRtpHeader();
    const packet = Buffer.concat([header, swapped]);

    // Send UDP packet
    this.socket.send(packet, 0, packet.length, this.port, this.host, (err) => {
      if (err) {
        console.error(`[RTP Sender] Error sending to ${this.host}:${this.port}:`, err.message);
      }
    });

    // Update for next packet
    this.sequenceNumber = (this.sequenceNumber + 1) % 65536;
    this.timestamp = (this.timestamp + this.samplesPerFrame) % 0x100000000;
  }

  close() {
    console.log('[RTP Sender] Closing socket');
    this.socket.close();
  }
}

module.exports.RtpUdpSender = RtpUdpSender;
```

### Step 5: Create ARI Controller

**On Azure VM 20.170.155.53**:

**File**: `/home/azureuser/test-externalmedia/lib/test-ari-controller.js`

Create this file using nano or vi:

```javascript
const client = require('ari-client');

class TestAriController {
  constructor(ariUrl, ariUser, ariPassword) {
    this.ariUrl = ariUrl;
    this.ariUser = ariUser;
    this.ariPassword = ariPassword;
    this.ari = null;
    this.bridges = {};
    this.channels = {};
  }

  async connect() {
    console.log('[ARI] Connecting to Asterisk...');
    this.ari = await client.connect(this.ariUrl, this.ariUser, this.ariPassword);
    await this.ari.start('translation-test');
    console.log('[ARI] Connected and started application: translation-test');
  }

  async createBridge(bridgeId) {
    console.log(`[ARI] Creating bridge: ${bridgeId}`);
    const bridge = this.ari.Bridge();
    await bridge.create({ type: 'mixing', bridgeId });
    this.bridges[bridgeId] = bridge;

    bridge.on('BridgeDestroyed', () => {
      console.log(`[ARI] Bridge destroyed: ${bridgeId}`);
      delete this.bridges[bridgeId];
    });

    return bridge;
  }

  async createExternalMediaChannel(channelId, rtpListenHost, rtpListenPort) {
    console.log(`[ARI] Creating ExternalMedia channel: ${channelId}`);
    console.log(`[ARI] RTP will be received at: ${rtpListenHost}:${rtpListenPort}`);

    const channel = this.ari.Channel();

    await channel.externalMedia({
      app: 'translation-test',
      external_host: `${rtpListenHost}:${rtpListenPort}`,
      format: 'slin16',
      channelId: channelId
    });

    // Get Asterisk's RTP endpoint (where we send TO)
    const addressVar = await channel.getChannelVar({
      variable: 'UNICASTRTP_LOCAL_ADDRESS'
    });
    const portVar = await channel.getChannelVar({
      variable: 'UNICASTRTP_LOCAL_PORT'
    });

    const asteriskRtpHost = addressVar.value;
    const asteriskRtpPort = parseInt(portVar.value);

    console.log(`[ARI] Asterisk RTP endpoint: ${asteriskRtpHost}:${asteriskRtpPort}`);

    this.channels[channelId] = {
      channel,
      asteriskRtpHost,
      asteriskRtpPort
    };

    channel.on('StasisEnd', () => {
      console.log(`[ARI] Channel ended: ${channelId}`);
      delete this.channels[channelId];
    });

    return {
      channel,
      asteriskRtpHost,
      asteriskRtpPort
    };
  }

  async addChannelToBridge(channelId, bridgeId) {
    const channel = this.channels[channelId]?.channel;
    const bridge = this.bridges[bridgeId];

    if (!channel || !bridge) {
      throw new Error(`Channel ${channelId} or Bridge ${bridgeId} not found`);
    }

    console.log(`[ARI] Adding channel ${channelId} to bridge ${bridgeId}`);
    await bridge.addChannel({ channel: channel.id });
  }

  async hangupChannel(channelId) {
    const channelInfo = this.channels[channelId];
    if (channelInfo) {
      console.log(`[ARI] Hanging up channel: ${channelId}`);
      try {
        await channelInfo.channel.hangup();
      } catch (err) {
        console.error(`[ARI] Error hanging up ${channelId}:`, err.message);
      }
    }
  }

  async destroyBridge(bridgeId) {
    const bridge = this.bridges[bridgeId];
    if (bridge) {
      console.log(`[ARI] Destroying bridge: ${bridgeId}`);
      try {
        await bridge.destroy();
      } catch (err) {
        console.error(`[ARI] Error destroying ${bridgeId}:`, err.message);
      }
    }
  }

  async close() {
    console.log('[ARI] Closing all channels and bridges...');

    for (let channelId in this.channels) {
      await this.hangupChannel(channelId);
    }

    for (let bridgeId in this.bridges) {
      await this.destroyBridge(bridgeId);
    }

    if (this.ari) {
      await this.ari.stop();
    }

    console.log('[ARI] Closed');
  }
}

module.exports.TestAriController = TestAriController;
```

### Step 6: Create Main Test Server

**On Azure VM 20.170.155.53**:

**File**: `/home/azureuser/test-externalmedia/externalmedia-test-server.js`

Create this file using nano or vi:

```javascript
const express = require('express');
const http = require('http');
const WebSocket = require('ws');
const path = require('path');
const { RtpUdpServerSocket } = require('./lib/rtp-udp-server');
const { RtpUdpSender } = require('./lib/rtp-udp-sender');
const { TestAriController } = require('./lib/test-ari-controller');

class ExternalMediaTestServer {
  constructor() {
    // HTTP server
    this.app = express();
    this.httpServer = http.createServer(this.app);

    // WebSocket server
    this.wss = new WebSocket.Server({ server: this.httpServer });

    // ARI controller
    this.ari = new TestAriController(
      'http://127.0.0.1:8088',
      'asterisk',
      'asterisk'
    );

    // Extension handlers
    this.ext7777 = {
      ws: null,              // WebSocket to browser
      rtpReceiver: null,     // Receives FROM Asterisk
      rtpSender: null,       // Sends TO Asterisk
      channelId: 'ext7777-channel'
    };

    this.ext8888 = {
      ws: null,              // WebSocket to browser
      rtpReceiver: null,     // Receives FROM Asterisk
      rtpSender: null,       // Sends TO Asterisk
      channelId: 'ext8888-channel'
    };

    this.bridgeId = 'test-translation-bridge';
  }

  async start() {
    // Serve static files
    this.app.use(express.static(path.join(__dirname, 'public')));

    // Setup WebSocket handling
    this.setupWebSocket();

    // Connect to ARI
    await this.ari.connect();

    // Start HTTP server
    this.httpServer.listen(3001, '0.0.0.0', () => {
      console.log('═══════════════════════════════════════════════════');
      console.log('  ExternalMedia Test Server Started');
      console.log('═══════════════════════════════════════════════════');
      console.log('  URL: http://20.170.155.53:3001/test-translation.html');
      console.log('  ARI: Connected');
      console.log('  Extensions: 7777, 8888');
      console.log('═══════════════════════════════════════════════════');
    });
  }

  setupWebSocket() {
    this.wss.on('connection', (ws, req) => {
      console.log('[WebSocket] New connection from:', req.socket.remoteAddress);

      ws.on('message', async (message) => {
        try {
          const data = JSON.parse(message);
          await this.handleWebSocketMessage(ws, data);
        } catch (err) {
          console.error('[WebSocket] Error:', err.message);
          ws.send(JSON.stringify({ type: 'error', message: err.message }));
        }
      });

      ws.on('close', () => {
        console.log('[WebSocket] Connection closed');
        // Clean up if this was an active extension
        if (this.ext7777.ws === ws) this.ext7777.ws = null;
        if (this.ext8888.ws === ws) this.ext8888.ws = null;
      });
    });
  }

  async handleWebSocketMessage(ws, data) {
    console.log('[WebSocket] Message:', data.type, data.extension);

    switch (data.type) {
      case 'register':
        await this.handleRegister(ws, data.extension);
        break;

      case 'start_call':
        await this.handleStartCall(data.extension);
        break;

      case 'stop_call':
        await this.handleStopCall(data.extension);
        break;

      case 'audio':
        this.handleAudioFromBrowser(data.extension, data.audio);
        break;

      default:
        console.warn('[WebSocket] Unknown message type:', data.type);
    }
  }

  async handleRegister(ws, extension) {
    console.log(`[Register] Extension ${extension}`);

    if (extension === '7777') {
      this.ext7777.ws = ws;
    } else if (extension === '8888') {
      this.ext8888.ws = ws;
    }

    ws.send(JSON.stringify({
      type: 'registered',
      extension: extension,
      status: 'ready'
    }));
  }

  async handleStartCall(extension) {
    console.log(`[Start Call] Extension ${extension}`);

    const ext = extension === '7777' ? this.ext7777 : this.ext8888;
    const rtpPort = extension === '7777' ? 9000 : 9001;

    // Create RTP receiver for this extension
    ext.rtpReceiver = new RtpUdpServerSocket(
      `0.0.0.0:${rtpPort}`,
      true, // swap16 for slin16
      false // no file output
    );

    // Handle incoming audio from Asterisk
    ext.rtpReceiver.server.on('data', (pcmBuffer) => {
      this.handleAudioFromAsterisk(extension, pcmBuffer);
    });

    // Create ExternalMedia channel via ARI
    const { asteriskRtpHost, asteriskRtpPort } = await this.ari.createExternalMediaChannel(
      ext.channelId,
      '127.0.0.1',
      rtpPort
    );

    // Create RTP sender to Asterisk
    ext.rtpSender = new RtpUdpSender(asteriskRtpHost, asteriskRtpPort);

    // Create or get bridge
    if (!this.ari.bridges[this.bridgeId]) {
      await this.ari.createBridge(this.bridgeId);
    }

    // Add channel to bridge
    await this.ari.addChannelToBridge(ext.channelId, this.bridgeId);

    // Notify browser
    if (ext.ws) {
      ext.ws.send(JSON.stringify({
        type: 'call_started',
        extension: extension
      }));
    }

    console.log(`[Start Call] Extension ${extension} - READY`);
  }

  async handleStopCall(extension) {
    console.log(`[Stop Call] Extension ${extension}`);

    const ext = extension === '7777' ? this.ext7777 : this.ext8888;

    // Close RTP
    if (ext.rtpReceiver) {
      ext.rtpReceiver.server.close();
      ext.rtpReceiver = null;
    }

    if (ext.rtpSender) {
      ext.rtpSender.close();
      ext.rtpSender = null;
    }

    // Hangup ARI channel
    await this.ari.hangupChannel(ext.channelId);

    // Notify browser
    if (ext.ws) {
      ext.ws.send(JSON.stringify({
        type: 'call_stopped',
        extension: extension
      }));
    }
  }

  handleAudioFromBrowser(extension, audioDataBase64) {
    const ext = extension === '7777' ? this.ext7777 : this.ext8888;

    if (!ext.rtpSender) {
      return; // Not in call
    }

    // Decode base64 to PCM buffer
    const pcmBuffer = Buffer.from(audioDataBase64, 'base64');

    // Send to Asterisk via RTP
    ext.rtpSender.send(pcmBuffer);
  }

  handleAudioFromAsterisk(extension, pcmBuffer) {
    const ext = extension === '7777' ? this.ext7777 : this.ext8888;

    if (!ext.ws || ext.ws.readyState !== WebSocket.OPEN) {
      return; // No browser connected
    }

    // Send to browser as base64
    const audioDataBase64 = pcmBuffer.toString('base64');

    ext.ws.send(JSON.stringify({
      type: 'audio',
      extension: extension,
      audio: audioDataBase64
    }));
  }

  async stop() {
    console.log('[Server] Shutting down...');
    await this.ari.close();
    this.httpServer.close();
    console.log('[Server] Stopped');
  }
}

// Start server
const server = new ExternalMediaTestServer();

server.start().catch(err => {
  console.error('[FATAL]', err);
  process.exit(1);
});

// Graceful shutdown
process.on('SIGINT', async () => {
  await server.stop();
  process.exit(0);
});
```

### Step 7: Create Web Interface

**On Azure VM 20.170.155.53**:

**File**: `/home/azureuser/test-externalmedia/public/test-translation.html`

Create this file using nano or vi:

```html
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>ExternalMedia Translation Test</title>
  <style>
    * {
      margin: 0;
      padding: 0;
      box-sizing: border-box;
    }

    body {
      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif;
      background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
      min-height: 100vh;
      padding: 20px;
    }

    .container {
      max-width: 1200px;
      margin: 0 auto;
    }

    h1 {
      text-align: center;
      color: white;
      margin-bottom: 30px;
      font-size: 2.5em;
      text-shadow: 2px 2px 4px rgba(0,0,0,0.2);
    }

    .extensions-grid {
      display: grid;
      grid-template-columns: repeat(auto-fit, minmax(400px, 1fr));
      gap: 20px;
      margin-bottom: 20px;
    }

    .extension-card {
      background: white;
      border-radius: 15px;
      padding: 25px;
      box-shadow: 0 10px 30px rgba(0,0,0,0.2);
    }

    .extension-card h2 {
      margin-bottom: 20px;
      color: #333;
      border-bottom: 3px solid #667eea;
      padding-bottom: 10px;
    }

    .status {
      display: flex;
      align-items: center;
      margin-bottom: 20px;
      font-size: 1.1em;
    }

    .status-indicator {
      width: 15px;
      height: 15px;
      border-radius: 50%;
      margin-right: 10px;
    }

    .status-indicator.disconnected {
      background-color: #e74c3c;
    }

    .status-indicator.connected {
      background-color: #2ecc71;
      animation: pulse 2s infinite;
    }

    @keyframes pulse {
      0%, 100% { opacity: 1; }
      50% { opacity: 0.5; }
    }

    .controls {
      display: flex;
      flex-direction: column;
      gap: 15px;
    }

    .control-row {
      display: flex;
      align-items: center;
      gap: 10px;
    }

    button {
      padding: 12px 24px;
      font-size: 1em;
      border: none;
      border-radius: 8px;
      cursor: pointer;
      transition: all 0.3s;
      font-weight: 600;
    }

    button:hover {
      transform: translateY(-2px);
      box-shadow: 0 5px 15px rgba(0,0,0,0.2);
    }

    button:disabled {
      opacity: 0.5;
      cursor: not-allowed;
      transform: none;
    }

    .btn-primary {
      background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
      color: white;
    }

    .btn-success {
      background: linear-gradient(135deg, #2ecc71 0%, #27ae60 100%);
      color: white;
    }

    .btn-danger {
      background: linear-gradient(135deg, #e74c3c 0%, #c0392b 100%);
      color: white;
    }

    .volume-control {
      flex: 1;
    }

    .volume-control input[type="range"] {
      width: 100%;
    }

    .audio-level {
      height: 30px;
      background: #ecf0f1;
      border-radius: 5px;
      overflow: hidden;
      margin-top: 10px;
    }

    .audio-level-bar {
      height: 100%;
      background: linear-gradient(90deg, #2ecc71 0%, #f39c12 70%, #e74c3c 100%);
      width: 0%;
      transition: width 0.1s;
    }

    .log-container {
      background: white;
      border-radius: 15px;
      padding: 25px;
      box-shadow: 0 10px 30px rgba(0,0,0,0.2);
    }

    .log-container h3 {
      margin-bottom: 15px;
      color: #333;
    }

    #log {
      background: #2c3e50;
      color: #2ecc71;
      font-family: 'Courier New', monospace;
      padding: 15px;
      border-radius: 8px;
      height: 200px;
      overflow-y: auto;
      font-size: 0.9em;
    }

    .log-entry {
      margin-bottom: 5px;
    }

    .log-timestamp {
      color: #95a5a6;
    }
  </style>
</head>
<body>
  <div class="container">
    <h1>🎧 ExternalMedia Translation Test</h1>

    <div class="extensions-grid">
      <!-- Extension 7777 -->
      <div class="extension-card">
        <h2>Extension 7777 (Test English)</h2>

        <div class="status">
          <div class="status-indicator disconnected" id="status-7777"></div>
          <span id="status-text-7777">Disconnected</span>
        </div>

        <div class="controls">
          <div class="control-row">
            <button class="btn-primary" id="mic-btn-7777" onclick="toggleMic('7777')">
              🎤 Enable Mic
            </button>
          </div>

          <div class="control-row">
            <span>🔊 Speaker:</span>
            <div class="volume-control">
              <input type="range" id="volume-7777" min="0" max="100" value="80"
                     oninput="setVolume('7777', this.value)">
            </div>
            <span id="volume-value-7777">80%</span>
          </div>

          <div class="control-row">
            <button class="btn-success" id="call-btn-7777" onclick="startCall('7777')" disabled>
              📞 Start Call
            </button>
            <button class="btn-danger" id="hangup-btn-7777" onclick="stopCall('7777')" disabled>
              📵 Hang Up
            </button>
          </div>

          <div>
            <label>Audio Level:</label>
            <div class="audio-level">
              <div class="audio-level-bar" id="audio-level-7777"></div>
            </div>
          </div>
        </div>
      </div>

      <!-- Extension 8888 -->
      <div class="extension-card">
        <h2>Extension 8888 (Test French)</h2>

        <div class="status">
          <div class="status-indicator disconnected" id="status-8888"></div>
          <span id="status-text-8888">Disconnected</span>
        </div>

        <div class="controls">
          <div class="control-row">
            <button class="btn-primary" id="mic-btn-8888" onclick="toggleMic('8888')">
              🎤 Enable Mic
            </button>
          </div>

          <div class="control-row">
            <span>🔊 Speaker:</span>
            <div class="volume-control">
              <input type="range" id="volume-8888" min="0" max="100" value="80"
                     oninput="setVolume('8888', this.value)">
            </div>
            <span id="volume-value-8888">80%</span>
          </div>

          <div class="control-row">
            <button class="btn-success" id="call-btn-8888" onclick="startCall('8888')" disabled>
              📞 Start Call
            </button>
            <button class="btn-danger" id="hangup-btn-8888" onclick="stopCall('8888')" disabled>
              📵 Hang Up
            </button>
          </div>

          <div>
            <label>Audio Level:</label>
            <div class="audio-level">
              <div class="audio-level-bar" id="audio-level-8888"></div>
            </div>
          </div>
        </div>
      </div>
    </div>

    <div class="log-container">
      <h3>Test Log</h3>
      <div id="log"></div>
    </div>
  </div>

  <script>
    // Global state
    const state = {
      '7777': {
        ws: null,
        micStream: null,
        audioContext: null,
        processor: null,
        micEnabled: false,
        inCall: false,
        volume: 0.8
      },
      '8888': {
        ws: null,
        micStream: null,
        audioContext: null,
        processor: null,
        micEnabled: false,
        inCall: false,
        volume: 0.8
      }
    };

    // Connect to WebSocket
    function connectWebSocket() {
      const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
      const wsUrl = `${protocol}//${window.location.host}`;

      log('Connecting to server...');

      ['7777', '8888'].forEach(ext => {
        const ws = new WebSocket(wsUrl);
        state[ext].ws = ws;

        ws.onopen = () => {
          log(`Extension ${ext}: Connected to server`);
          updateStatus(ext, 'connected', 'Ready');

          // Register this extension
          ws.send(JSON.stringify({
            type: 'register',
            extension: ext
          }));

          document.getElementById(`call-btn-${ext}`).disabled = false;
        };

        ws.onmessage = (event) => {
          const data = JSON.parse(event.data);
          handleServerMessage(ext, data);
        };

        ws.onclose = () => {
          log(`Extension ${ext}: Disconnected from server`);
          updateStatus(ext, 'disconnected', 'Disconnected');
          document.getElementById(`call-btn-${ext}`).disabled = true;
        };

        ws.onerror = (error) => {
          log(`Extension ${ext}: WebSocket error`);
          console.error(error);
        };
      });
    }

    // Handle messages from server
    function handleServerMessage(ext, data) {
      console.log(`[${ext}] Server message:`, data.type);

      switch(data.type) {
        case 'registered':
          log(`Extension ${ext}: Registered`);
          break;

        case 'call_started':
          log(`Extension ${ext}: Call started`);
          state[ext].inCall = true;
          document.getElementById(`call-btn-${ext}`).disabled = true;
          document.getElementById(`hangup-btn-${ext}`).disabled = false;
          updateStatus(ext, 'connected', 'In Call');
          break;

        case 'call_stopped':
          log(`Extension ${ext}: Call stopped`);
          state[ext].inCall = false;
          document.getElementById(`call-btn-${ext}`).disabled = false;
          document.getElementById(`hangup-btn-${ext}`).disabled = true;
          updateStatus(ext, 'connected', 'Ready');
          break;

        case 'audio':
          playAudio(ext, data.audio);
          break;

        case 'error':
          log(`Extension ${ext}: ERROR - ${data.message}`);
          break;
      }
    }

    // Toggle microphone
    async function toggleMic(ext) {
      const btn = document.getElementById(`mic-btn-${ext}`);

      if (!state[ext].micEnabled) {
        try {
          // Request microphone access
          const stream = await navigator.mediaDevices.getUserMedia({
            audio: {
              sampleRate: 16000,
              channelCount: 1,
              echoCancellation: true,
              noiseSuppression: true
            }
          });

          state[ext].micStream = stream;
          state[ext].audioContext = new (window.AudioContext || window.webkitAudioContext)({ sampleRate: 16000 });

          const source = state[ext].audioContext.createMediaStreamSource(stream);
          const processor = state[ext].audioContext.createScriptProcessor(4096, 1, 1);

          processor.onaudioprocess = (e) => {
            if (state[ext].inCall) {
              const inputData = e.inputBuffer.getChannelData(0);
              const pcm16 = convertFloat32ToPCM16(inputData);
              sendAudio(ext, pcm16);
              updateAudioLevel(ext, inputData);
            }
          };

          source.connect(processor);
          processor.connect(state[ext].audioContext.destination);

          state[ext].processor = processor;
          state[ext].micEnabled = true;

          btn.textContent = '🎤 Mic ON';
          btn.classList.remove('btn-primary');
          btn.classList.add('btn-danger');

          log(`Extension ${ext}: Microphone enabled`);
        } catch (err) {
          log(`Extension ${ext}: Failed to access microphone - ${err.message}`);
          alert('Microphone access denied');
        }
      } else {
        // Disable mic
        if (state[ext].micStream) {
          state[ext].micStream.getTracks().forEach(track => track.stop());
        }
        if (state[ext].processor) {
          state[ext].processor.disconnect();
        }
        if (state[ext].audioContext) {
          state[ext].audioContext.close();
        }

        state[ext].micEnabled = false;
        btn.textContent = '🎤 Enable Mic';
        btn.classList.remove('btn-danger');
        btn.classList.add('btn-primary');

        log(`Extension ${ext}: Microphone disabled`);
      }
    }

    // Convert Float32 to PCM16
    function convertFloat32ToPCM16(float32Array) {
      const pcm16 = new Int16Array(float32Array.length);
      for (let i = 0; i < float32Array.length; i++) {
        const s = Math.max(-1, Math.min(1, float32Array[i]));
        pcm16[i] = s < 0 ? s * 0x8000 : s * 0x7FFF;
      }
      return pcm16;
    }

    // Send audio to server
    function sendAudio(ext, pcm16Array) {
      if (!state[ext].ws || state[ext].ws.readyState !== WebSocket.OPEN) {
        return;
      }

      const buffer = Buffer.from(pcm16Array.buffer);
      const base64 = buffer.toString('base64');

      state[ext].ws.send(JSON.stringify({
        type: 'audio',
        extension: ext,
        audio: base64
      }));
    }

    // Play received audio
    function playAudio(ext, base64Audio) {
      // TODO: Implement audio playback using Web Audio API
      // This would decode the PCM and play it through speakers
    }

    // Start call
    function startCall(ext) {
      if (!state[ext].micEnabled) {
        alert('Please enable microphone first');
        return;
      }

      log(`Extension ${ext}: Starting call...`);

      state[ext].ws.send(JSON.stringify({
        type: 'start_call',
        extension: ext
      }));
    }

    // Stop call
    function stopCall(ext) {
      log(`Extension ${ext}: Stopping call...`);

      state[ext].ws.send(JSON.stringify({
        type: 'stop_call',
        extension: ext
      }));
    }

    // Set volume
    function setVolume(ext, value) {
      state[ext].volume = value / 100;
      document.getElementById(`volume-value-${ext}`).textContent = `${value}%`;
    }

    // Update status indicator
    function updateStatus(ext, status, text) {
      const indicator = document.getElementById(`status-${ext}`);
      const textEl = document.getElementById(`status-text-${ext}`);

      indicator.className = `status-indicator ${status}`;
      textEl.textContent = text;
    }

    // Update audio level visualization
    function updateAudioLevel(ext, audioData) {
      let sum = 0;
      for (let i = 0; i < audioData.length; i++) {
        sum += Math.abs(audioData[i]);
      }
      const average = sum / audioData.length;
      const percentage = Math.min(100, average * 500); // Scale up for visibility

      document.getElementById(`audio-level-${ext}`).style.width = `${percentage}%`;
    }

    // Logging
    function log(message) {
      const logDiv = document.getElementById('log');
      const timestamp = new Date().toLocaleTimeString();
      const entry = document.createElement('div');
      entry.className = 'log-entry';
      entry.innerHTML = `<span class="log-timestamp">[${timestamp}]</span> ${message}`;
      logDiv.appendChild(entry);
      logDiv.scrollTop = logDiv.scrollHeight;
    }

    // Initialize on page load
    window.onload = () => {
      log('Page loaded - initializing...');
      connectWebSocket();
    };

    // Add Buffer polyfill for browser
    const Buffer = {
      from: (arr) => {
        const bytes = new Uint8Array(arr);
        let binary = '';
        for (let i = 0; i < bytes.length; i++) {
          binary += String.fromCharCode(bytes[i]);
        }
        return {
          toString: (encoding) => {
            if (encoding === 'base64') {
              return btoa(binary);
            }
            return binary;
          }
        };
      }
    };
  </script>
</body>
</html>
```

### Step 8: Update Package.json

**On Azure VM 20.170.155.53**:

**File**: `/home/azureuser/test-externalmedia/package.json`

Edit to add start script:

```json
{
  "name": "externalmedia-test-server",
  "version": "1.0.0",
  "description": "Test server for Asterisk ExternalMedia bidirectional audio",
  "main": "externalmedia-test-server.js",
  "scripts": {
    "start": "node externalmedia-test-server.js"
  },
  "dependencies": {
    "express": "^4.18.2",
    "ws": "^8.14.0",
    "ari-client": "^2.2.0"
  },
  "engines": {
    "node": ">=14"
  }
}
```

---

## 🚢 Final Configuration on Azure VM

### Step 9: Configure Asterisk

**On Azure VM 20.170.155.53**:

```bash
# Verify Asterisk ARI is enabled
sudo asterisk -rx "ari show status"
sudo asterisk -rx "http show status"

# If not enabled, enable it
sudo nano /etc/asterisk/ari.conf
# Ensure [asterisk] user exists with password

sudo nano /etc/asterisk/http.conf
# Ensure enabled=yes, bindport=8088

# Add test extensions to dialplan
sudo nano /etc/asterisk/extensions.conf
# Add the [externalmedia-test] context (see below)

# Reload Asterisk modules
sudo asterisk -rx "module reload res_ari.so"
sudo asterisk -rx "module reload res_http_websocket.so"
sudo asterisk -rx "dialplan reload"

# Verify
sudo asterisk -rx "dialplan show externalmedia-test"
```

### Step 10: Start Test Server

**On Azure VM 20.170.155.53**:

```bash
cd /home/azureuser/test-externalmedia

# Start the server
node externalmedia-test-server.js

# Or run in background
nohup node externalmedia-test-server.js > /tmp/test-externalmedia.log 2>&1 &

# Monitor log
tail -f /tmp/test-externalmedia.log
```

---

## 🧪 Testing Steps

### Test 1: Server Startup
```bash
node externalmedia-test-server.js
```
**Expected**: Server starts, ARI connects, port 3001 listening

### Test 2: Web Interface Access
Open browser: http://20.170.155.53:3001/test-translation.html
**Expected**: Page loads, WebSocket connects, status shows "Ready"

### Test 3: Microphone Access
Click "Enable Mic" for ext 7777
**Expected**: Browser asks permission, button turns red "Mic ON"

### Test 4: Start Call
Click "Start Call" for ext 7777
**Expected**:
- Log shows "Creating ExternalMedia channel"
- RTP receiver starts
- Status changes to "In Call"

### Test 5: Bidirectional Audio
1. Start call on ext 7777
2. Start call on ext 8888
3. Speak into mic on ext 7777

**Expected**: Audio heard on ext 8888 speaker

### Test 6: Production System Verification
While test running, check production:
```bash
ssh azureuser@20.170.155.53
pgrep -af node
```
**Expected**: Both servers running independently

---

## 📊 Port Usage Summary

| Port | Service | Protocol | Production/Test |
|------|---------|----------|-----------------|
| 3000 | Production dashboard | HTTP | PRODUCTION |
| 3001 | Test web interface | HTTP | TEST |
| 5050-5057 | AudioSocket (prod) | TCP | PRODUCTION |
| 8088 | Asterisk ARI | HTTP | SHARED |
| 9000 | Ext 7777 RTP receive | UDP | TEST |
| 9001 | Ext 8888 RTP receive | UDP | TEST |
| 10000-20000 | Asterisk RTP pool | UDP | SHARED |

---

## ✅ Success Criteria

- [ ] Test server starts without errors
- [ ] Web interface accessible
- [ ] WebSocket connects successfully
- [ ] Microphone access granted
- [ ] Extension 7777 call starts
- [ ] Extension 8888 call starts
- [ ] Audio flows 7777 → 8888
- [ ] Audio flows 8888 → 7777
- [ ] Latency under 2 seconds
- [ ] **Production system 7000/7001 STILL WORKS** ← CRITICAL

---

## 🔄 Next Phase: Integration with Translation

**Only proceed if all tests pass**

Once bidirectional audio works on 7777/8888:

1. Add Deepgram STT to test server
2. Add DeepL translation
3. Add ElevenLabs TTS
4. Test translated audio flow
5. If successful, adapt for production 7000/7001
6. Create checkpoint before production changes
7. Migrate production to ExternalMedia

---

## 🆘 Rollback Plan

If anything goes wrong:

```bash
# Stop test server
pkill -f externalmedia-test-server

# Production should be unaffected
# Verify:
curl http://20.170.155.53:3000
tail -f /tmp/conf-checkpoint-restored.log
```

---

## 📝 File Checklist

**All files created directly on Azure VM 20.170.155.53** (`/home/azureuser/test-externalmedia/`):
- [ ] Directory structure created
- [ ] `package.json` initialized
- [ ] Dependencies installed (express, ws, ari-client)
- [ ] `lib/rtp-udp-server.js` (copied from asterisk-external-media)
- [ ] `lib/rtp-udp-sender.js` (new implementation)
- [ ] `lib/test-ari-controller.js` (new implementation)
- [ ] `externalmedia-test-server.js` (main server)
- [ ] `public/test-translation.html` (web interface)
- [ ] Asterisk `/etc/asterisk/extensions.conf` updated with [externalmedia-test] context
- [ ] Asterisk ARI enabled and verified
- [ ] Server started and running

---

## 🎯 Summary

This plan ensures:
✅ **Zero risk** to production system
✅ **Isolated testing** environment
✅ **Full bidirectional** audio capability
✅ **Web-based interface** for easy testing
✅ **Clear migration path** to production
✅ **Complete rollback** capability

**Ready to implement when you approve!**
