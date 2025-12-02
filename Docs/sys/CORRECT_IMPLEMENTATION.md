# Correct Implementation: Extension 7004/7005 Bridge Architecture

**Date:** 2025-11-01
**Status:** Ready to Deploy
**Architecture:** Personal bridges with muted listeners to translation bridges

---

## Architecture Overview

```
Extension 7004 (EN Speaker)
        ↓
    Bridge 7004 (personal)
        ↓
    Originate 3 calls:
        1. Extension 7000 → AudioSocket (mic) → Translation → WebSocket → Bridge 7001
        2. Bridge 7000 (MUTED) → Receives translated audio
        3. Extension 7006 → AudioSocket (monitor) → Dashboard + Timing

    PLUS: WebSocket to Bridge 7004 (for future use)


Extension 7005 (FR Speaker)
        ↓
    Bridge 7005 (personal)
        ↓
    Originate 3 calls:
        1. Extension 7001 → AudioSocket (mic) → Translation → WebSocket → Bridge 7000
        2. Bridge 7001 (MUTED) → Receives translated audio
        3. Extension 7007 → AudioSocket (monitor) → Dashboard + Timing

    PLUS: WebSocket to Bridge 7005 (for future use)
```

### Bridge Roles:
- **Bridge 7004** = EN speaker's personal bridge (hears everything)
- **Bridge 7005** = FR speaker's personal bridge (hears everything)
- **Bridge 7000** = Target for EN translated audio (WebSocket injects here)
- **Bridge 7001** = Target for FR translated audio (WebSocket injects here)

**KEY:** Bridge 7000 and Bridge 7001 are NOT connected to each other!

---

## Step 1: Add Extensions to extensions.conf

**File:** `/etc/asterisk/extensions.conf`

Add to `[from-sip-custom]` context:

```ini
; ============================================================================
; USER ENTRY POINTS
; ============================================================================

; Extension 7004 - EN Speaker Entry
exten => 7004,1,NoOp(=== Extension 7004: EN Speaker Entry ===)
 same => n,Answer()
 same => n,Playback(beep)
 same => n,Stasis(translation-app,7004)
 same => n,Hangup()

; Extension 7005 - FR Speaker Entry
exten => 7005,1,NoOp(=== Extension 7005: FR Speaker Entry ===)
 same => n,Answer()
 same => n,Playback(beep)
 same => n,Stasis(translation-app,7005)
 same => n,Hangup()


; ============================================================================
; MUTED BRIDGE LISTENERS
; ============================================================================

; Listen to Bridge 7000 (MUTED)
exten => listen-7000,1,NoOp(=== Muted Listener to Bridge 7000 ===)
 same => n,Answer()
 same => n,ConfBridge(7000,muted_listener)
 same => n,Hangup()

; Listen to Bridge 7001 (MUTED)
exten => listen-7001,1,NoOp(=== Muted Listener to Bridge 7001 ===)
 same => n,Answer()
 same => n,ConfBridge(7001,muted_listener)
 same => n,Hangup()
```

**Deploy:**
```bash
ssh azureuser@20.170.155.53 "sudo nano /etc/asterisk/extensions.conf"
# Add the above sections
# Save and exit

ssh azureuser@20.170.155.53 "sudo asterisk -rx 'dialplan reload'"
```

---

## Step 2: Create ConfBridge Configuration

**File:** `/etc/asterisk/confbridge.conf`

```ini
[general]

[muted_listener]
type=bridge
audio_only=yes
mixing_interval=20
internal_sample_rate=8000

[default_user]
type=user
marked=no
startmuted=no
quiet=yes
announce_user_count=no
announce_only_user=no
```

**Deploy:**
```bash
ssh azureuser@20.170.155.53 "sudo tee /etc/asterisk/confbridge.conf > /dev/null" << 'EOF'
[general]

[muted_listener]
type=bridge
audio_only=yes
mixing_interval=20
internal_sample_rate=8000

[default_user]
type=user
marked=no
startmuted=no
quiet=yes
announce_user_count=no
announce_only_user=no
EOF

ssh azureuser@20.170.155.53 "sudo asterisk -rx 'module reload app_confbridge.so'"
```

---

## Step 3: Create ARI Handler

**File:** `/home/azureuser/translation-app/ari-bridge-originate.js`

```javascript
/**
 * ARI Bridge Manager - CORRECT ARCHITECTURE
 *
 * Extension 7004 → Bridge 7004 + 3 originations:
 *   1. Extension 7000 (mic)
 *   2. listen-7000 (muted bridge listener)
 *   3. Extension 7006 (monitor)
 */

const ariClient = require('ari-client');

class ARIBridgeOriginate {
    constructor() {
        this.client = null;
        this.ari = null;
        this.activeSessions = new Map();
    }

    async connect() {
        try {
            console.log('[ARI] Connecting to Asterisk ARI...');
            this.client = await ariClient.connect(
                'http://localhost:8088',
                'dev',
                'asterisk'
            );
            this.ari = this.client;
            console.log('[ARI] ✓ Connected to Asterisk ARI');

            this.setupEventHandlers();
            this.client.start('translation-app');
            console.log('[ARI] ✓ Stasis app started');

        } catch (error) {
            console.error('[ARI] Connection failed:', error.message);
            setTimeout(() => this.connect(), 5000);
        }
    }

    setupEventHandlers() {
        this.client.on('StasisStart', async (event, channel) => {
            const extensionId = event.args[0];

            if (extensionId === '7004' || extensionId === '7005') {
                await this.handleUserEntry(channel, extensionId);
            }
        });

        this.client.on('ChannelDestroyed', (event, channel) => {
            this.cleanup(channel.id);
        });
    }

    async handleUserEntry(channel, extensionId) {
        try {
            const config = {
                '7004': {
                    personalBridge: '7004',
                    micExtension: '7000',
                    listenBridge: '7000',
                    monitorExtension: '7006',
                    language: 'EN'
                },
                '7005': {
                    personalBridge: '7005',
                    micExtension: '7001',
                    listenBridge: '7001',
                    monitorExtension: '7007',
                    language: 'FR'
                }
            }[extensionId];

            console.log(`[ARI] ════════════════════════════════════════`);
            console.log(`[ARI] ${config.language} Speaker → Extension ${extensionId}`);
            console.log(`[ARI]   Personal Bridge: ${config.personalBridge}`);
            console.log(`[ARI]   Mic Extension: ${config.micExtension}`);
            console.log(`[ARI]   Listen to Bridge: ${config.listenBridge}`);
            console.log(`[ARI]   Monitor: ${config.monitorExtension}`);
            console.log(`[ARI] ════════════════════════════════════════`);

            // Step 1: Answer
            await channel.answer();
            console.log(`[ARI] ✓ Answered`);

            // Step 2: Create personal bridge
            let personalBridge;
            try {
                personalBridge = await this.ari.bridges.get({ bridgeId: config.personalBridge });
                console.log(`[ARI] ✓ Bridge ${config.personalBridge} exists`);
            } catch (error) {
                personalBridge = await this.ari.bridges.create({
                    type: 'mixing',
                    bridgeId: config.personalBridge,
                    name: `PersonalBridge-${config.personalBridge}`
                });
                console.log(`[ARI] ✓ Created Bridge ${config.personalBridge}`);
            }

            // Step 3: Add user to bridge
            await personalBridge.addChannel({ channel: channel.id });
            console.log(`[ARI] ✓ User joined Bridge ${config.personalBridge}`);

            // Step 4: Originate Call #1 - Mic Capture
            console.log(`[ARI] Originating #1: Extension ${config.micExtension} (mic)...`);
            const micChannel = await this.ari.channels.originate({
                endpoint: `Local/${config.micExtension}@from-sip-custom`,
                app: 'translation-app',
                appArgs: `mic,${extensionId}`
            });
            console.log(`[ARI] ✓ Mic channel: ${micChannel.id}`);
            await personalBridge.addChannel({ channel: micChannel.id });
            console.log(`[ARI] ✓ Mic joined Bridge ${config.personalBridge}`);

            // Step 5: Originate Call #2 - Muted Listener to Translation Bridge
            console.log(`[ARI] Originating #2: listen-${config.listenBridge} (MUTED)...`);
            const listenChannel = await this.ari.channels.originate({
                endpoint: `Local/listen-${config.listenBridge}@from-sip-custom`,
                app: 'translation-app',
                appArgs: `listen,${extensionId}`
            });
            console.log(`[ARI] ✓ Listen channel: ${listenChannel.id}`);
            await personalBridge.addChannel({ channel: listenChannel.id });
            console.log(`[ARI] ✓ Listen joined Bridge ${config.personalBridge}`);
            console.log(`[ARI]    → Receiving audio from Bridge ${config.listenBridge}`);

            // Step 6: Originate Call #3 - Monitor
            console.log(`[ARI] Originating #3: Extension ${config.monitorExtension} (monitor)...`);
            const monitorChannel = await this.ari.channels.originate({
                endpoint: `Local/${config.monitorExtension}@from-sip-custom`,
                app: 'translation-app',
                appArgs: `monitor,${extensionId}`
            });
            console.log(`[ARI] ✓ Monitor channel: ${monitorChannel.id}`);
            await personalBridge.addChannel({ channel: monitorChannel.id });
            console.log(`[ARI] ✓ Monitor joined Bridge ${config.personalBridge}`);

            console.log(`[ARI] ════════════════════════════════════════`);
            console.log(`[ARI] ✅ SETUP COMPLETE:`);
            console.log(`[ARI]    👤 User in Bridge ${config.personalBridge}`);
            console.log(`[ARI]    🎤 Mic → Extension ${config.micExtension} → Translation`);
            console.log(`[ARI]    🔊 Hearing Bridge ${config.listenBridge} (translated audio)`);
            console.log(`[ARI]    📊 Monitor → Extension ${config.monitorExtension}`);
            console.log(`[ARI] ════════════════════════════════════════`);

            this.activeSessions.set(channel.id, {
                extensionId,
                personalBridgeId: config.personalBridge,
                micChannelId: micChannel.id,
                listenChannelId: listenChannel.id,
                monitorChannelId: monitorChannel.id
            });

        } catch (error) {
            console.error(`[ARI] ✗ Error:`, error.message);
            console.error(error.stack);
            try {
                await channel.hangup();
            } catch (e) {}
        }
    }

    cleanup(channelId) {
        const session = this.activeSessions.get(channelId);
        if (session) {
            console.log(`[ARI] Cleanup Extension ${session.extensionId}`);
            [session.micChannelId, session.listenChannelId, session.monitorChannelId].forEach(async (chId) => {
                if (chId) {
                    try {
                        await this.ari.channels.hangup({ channelId: chId });
                    } catch (e) {}
                }
            });
            this.activeSessions.delete(channelId);
        }
    }

    async stop() {
        if (this.client) {
            await this.client.stop();
            console.log('[ARI] Stopped');
        }
    }
}

module.exports = ARIBridgeOriginate;
```

**Deploy:**
```bash
# Create file locally
cat > /tmp/ari-bridge-originate.js << 'EOF'
[paste the above code]
EOF

# Copy to server
scp /tmp/ari-bridge-originate.js azureuser@20.170.155.53:/home/azureuser/translation-app/
```

---

## Step 4: Update conference-server.js

Verify it loads the correct handler:

```bash
ssh azureuser@20.170.155.53 "grep -n 'require.*ari' /home/azureuser/translation-app/conference-server.js"
```

Should show:
```javascript
const ARIBridgeOriginate = require('./ari-bridge-originate');
```

If not, fix it:
```bash
ssh azureuser@20.170.155.53 "sed -i 's/require.*ari.*bridge.*/require(\".\/ari-bridge-originate\");/' /home/azureuser/translation-app/conference-server.js"
```

---

## Step 5: Add WebSocket Support for Bridge 7004/7005

**File:** `/home/azureuser/translation-app/conference-server.js`

Add WebSocket listeners for Bridge 7004 and 7005:

```javascript
// Around line where other WebSocket servers are created
createBridgeWebSocketServer(5058, '7004'); // Bridge 7004
createBridgeWebSocketServer(5060, '7005'); // Bridge 7005
```

This allows future audio injection to personal bridges if needed.

---

## Step 6: Restart Servers

```bash
ssh azureuser@20.170.155.53 "killall -9 node && sleep 3 && cd /home/azureuser/translation-app && nohup node conference-server.js > /tmp/conference-server.log 2>&1 & nohup node bidirectional-timing-server.js > /tmp/timing-server.log 2>&1 &"

# Wait and check
ssh azureuser@20.170.155.53 "sleep 5 && tail -30 /tmp/conference-server.log | grep ARI"
```

---

## Complete Flow Diagram

```
╔════════════════════════════════════════════════════════════════════╗
║                    EXTENSION 7004 FLOW                             ║
╚════════════════════════════════════════════════════════════════════╝

User calls Extension 7004
        ↓
Asterisk Dialplan: Stasis(translation-app,7004)
        ↓
ARI Handler receives StasisStart
        ↓
┌────────────────────────────────────────────────────────────────────┐
│ ARI Creates Bridge 7004 (personal bridge)                         │
└────────────────────────────────────────────────────────────────────┘
        ↓
┌────────────────────────────────────────────────────────────────────┐
│ ARI Adds User to Bridge 7004                                       │
│ → User can now HEAR everything in Bridge 7004                      │
└────────────────────────────────────────────────────────────────────┘
        ↓
┌────────────────────────────────────────────────────────────────────┐
│ ARI Originates 3 Calls:                                           │
│                                                                    │
│ CALL #1: Local/7000@from-sip-custom                               │
│   → Extension 7000 executes                                        │
│   → AudioSocket(uuid, 127.0.0.1:5050)                             │
│   → Captures user's microphone                                     │
│   → Deepgram STT (EN)                                              │
│   → DeepL Translation (EN→FR)                                      │
│   → ElevenLabs TTS (FR voice)                                      │
│   → Amplify 500x                                                   │
│   → WebSocket port 5053 → Bridge 7001                              │
│   → Channel joins Bridge 7004                                      │
│                                                                    │
│ CALL #2: Local/listen-7000@from-sip-custom                        │
│   → Extension listen-7000 executes                                 │
│   → ConfBridge(7000, muted_listener)                               │
│   → MUTED listener to Bridge 7000                                  │
│   → Receives translated audio FROM Bridge 7000                     │
│   → Channel joins Bridge 7004                                      │
│   → User HEARS translated audio!                                   │
│                                                                    │
│ CALL #3: Local/7006@from-sip-custom                                │
│   → Extension 7006 executes                                        │
│   → AudioSocket(uuid, 127.0.0.1:5054)                             │
│   → Monitors Bridge 7004 output                                    │
│   → Sends to Dashboard Card 6                                      │
│   → Sends to Timing Server                                         │
│   → Channel joins Bridge 7004                                      │
└────────────────────────────────────────────────────────────────────┘


╔════════════════════════════════════════════════════════════════════╗
║                 WHAT'S IN EACH BRIDGE                              ║
╚════════════════════════════════════════════════════════════════════╝

┌─────────────────────────────────────────────────────────┐
│ Bridge 7004 (EN Speaker's Personal Bridge)             │
│                                                         │
│  Channels:                                              │
│   1. User Channel (can hear everything)                 │
│   2. Extension 7000 (mic capture)                       │
│   3. listen-7000 (muted listener to Bridge 7000)        │
│   4. Extension 7006 (monitor)                           │
│                                                         │
│  User hears:                                            │
│   - Their own voice (via mic channel)                   │
│   - Translated audio FROM Bridge 7000                   │
└─────────────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────────────┐
│ Bridge 7005 (FR Speaker's Personal Bridge)             │
│                                                         │
│  Channels:                                              │
│   1. User Channel (can hear everything)                 │
│   2. Extension 7001 (mic capture)                       │
│   3. listen-7001 (muted listener to Bridge 7001)        │
│   4. Extension 7007 (monitor)                           │
│                                                         │
│  User hears:                                            │
│   - Their own voice (via mic channel)                   │
│   - Translated audio FROM Bridge 7001                   │
└─────────────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────────────┐
│ Bridge 7000 (EN Translation Target)                    │
│                                                         │
│  Receives:                                              │
│   - WebSocket injections from Extension 7001 (FR→EN)    │
│                                                         │
│  Listeners:                                             │
│   - listen-7000 channel (from Bridge 7004)              │
│                                                         │
│  NO CONNECTION TO BRIDGE 7001!                          │
└─────────────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────────────┐
│ Bridge 7001 (FR Translation Target)                    │
│                                                         │
│  Receives:                                              │
│   - WebSocket injections from Extension 7000 (EN→FR)    │
│                                                         │
│  Listeners:                                             │
│   - listen-7001 channel (from Bridge 7005)              │
│                                                         │
│  NO CONNECTION TO BRIDGE 7000!                          │
└─────────────────────────────────────────────────────────┘
```

---

## Port Summary

```
AudioSocket Ports:
  5050: Extension 7000 mic (EN)
  5052: Extension 7001 mic (FR)
  5054: Extension 7006 monitor (EN)
  5056: Extension 7007 monitor (FR)

WebSocket Ports (Bridge Audio Injection):
  5051: Bridge 7000 (receives EN translated audio from FR speaker)
  5053: Bridge 7001 (receives FR translated audio from EN speaker)
  5055: Extension 7006 monitor WebSocket
  5057: Extension 7007 monitor WebSocket
  5058: Bridge 7004 WebSocket (future use)
  5060: Bridge 7005 WebSocket (future use)
```

---

## Testing

### Test 1: Call Extension 7004
```bash
ssh azureuser@20.170.155.53 "sudo asterisk -rx 'channel originate Local/7004@from-sip-custom application Playback demo-congrats'"
```

**Expected ARI Output:**
```
[ARI] EN Speaker → Extension 7004
[ARI]   Personal Bridge: 7004
[ARI]   Mic Extension: 7000
[ARI]   Listen to Bridge: 7000
[ARI]   Monitor: 7006
[ARI] ✓ Answered
[ARI] ✓ Created Bridge 7004
[ARI] ✓ User joined Bridge 7004
[ARI] ✓ Mic channel: Local/7000@...
[ARI] ✓ Mic joined Bridge 7004
[ARI] ✓ Listen channel: Local/listen-7000@...
[ARI] ✓ Listen joined Bridge 7004
[ARI]    → Receiving audio from Bridge 7000
[ARI] ✓ Monitor channel: Local/7006@...
[ARI] ✓ Monitor joined Bridge 7004
[ARI] ✅ SETUP COMPLETE
```

### Test 2: Verify Bridges
```bash
ssh azureuser@20.170.155.53 "sudo asterisk -rx 'bridge show all'"
```

**Expected:**
```
Bridge: 7004
Type: mixing
Channels: 4
  - Local/7004@...
  - Local/7000@...
  - Local/listen-7000@...
  - Local/7006@...

Bridge: 7000
Type: confbridge
Channels: 1
  - Local/listen-7000@... (muted listener)
```

---

## Success Criteria

✅ System works when:

1. Extension 7004 creates Bridge 7004
2. ARI originates 3 channels successfully
3. All 4 channels in Bridge 7004 (user + mic + listen + monitor)
4. Bridge 7000 has 1 muted listener
5. Speaking shows activity on dashboard
6. Translation pipeline works (EN → FR → Bridge 7001)
7. Extension 7005 can call and creates Bridge 7005
8. No connection between Bridge 7000 and Bridge 7001

---

**End of Document**
