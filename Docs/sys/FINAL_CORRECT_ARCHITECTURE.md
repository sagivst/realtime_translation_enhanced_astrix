# Final Correct Architecture - Bridge 7004/7005 System

**Date:** 2025-11-01
**Status:** Final Specification
**Author:** Based on user requirements

---

## Architecture Summary

### Key Principle:
- Each user gets their own personal bridge (7004, 7005)
- Translation bridges (7000, 7001) are separate and NOT connected
- Monitor extensions (7006, 7007) are originated FROM translation bridges

---

## Complete Architecture Diagram

```
╔════════════════════════════════════════════════════════════════════╗
║                     EXTENSION 7004 (EN SPEAKER)                    ║
╚════════════════════════════════════════════════════════════════════╝

User calls Extension 7004
        ↓
Asterisk: Stasis(translation-app, 7004)
        ↓
ARI Handler
        ↓
┌────────────────────────────────────────────────────────────────────┐
│ STEP 1: Create Bridge 7004 (Personal Bridge for EN speaker)       │
└────────────────────────────────────────────────────────────────────┘
        ↓
┌────────────────────────────────────────────────────────────────────┐
│ STEP 2: Add User to Bridge 7004                                   │
│         → User can HEAR everything in Bridge 7004                  │
└────────────────────────────────────────────────────────────────────┘
        ↓
┌────────────────────────────────────────────────────────────────────┐
│ STEP 3: FROM Bridge 7004, Originate 2 Calls:                      │
│                                                                    │
│   CALL #1: Extension 7000 (Mic Capture)                           │
│   ├─→ Local/7000@from-sip-custom                                  │
│   ├─→ AudioSocket(uuid, 127.0.0.1:5050)                           │
│   ├─→ Captures user's English speech                              │
│   ├─→ Deepgram STT → "Hello, how are you?"                        │
│   ├─→ DeepL EN→FR → "Bonjour, comment allez-vous ?"               │
│   ├─→ ElevenLabs TTS → [French audio]                             │
│   ├─→ Amplify 500x                                                │
│   ├─→ WebSocket port 5053 → Bridge 7001                           │
│   └─→ Channel joins Bridge 7004                                   │
│                                                                    │
│   CALL #2: listen-7000 (Muted Listener)                           │
│   ├─→ Local/listen-7000@from-sip-custom                           │
│   ├─→ ConfBridge(7000, muted_listener)                            │
│   ├─→ MUTED connection to Bridge 7000                             │
│   ├─→ Receives translated audio FROM Bridge 7000                  │
│   ├─→ (Bridge 7000 gets FR→EN translation from Extension 7001)    │
│   └─→ Channel joins Bridge 7004                                   │
│       → User HEARS English translation!                            │
└────────────────────────────────────────────────────────────────────┘


╔════════════════════════════════════════════════════════════════════╗
║                     BRIDGE 7000 (EN Translation Target)            ║
╚════════════════════════════════════════════════════════════════════╝

Bridge 7000 receives:
  → WebSocket injections from Extension 7001 (FR→EN translation)
  → Muted listener from Bridge 7004 (listen-7000 channel)
        ↓
┌────────────────────────────────────────────────────────────────────┐
│ STEP 4: FROM Bridge 7000, Originate 1 Call:                       │
│                                                                    │
│   CALL #3: Extension 7006 (Monitor/Dashboard)                     │
│   ├─→ Local/7006@from-sip-custom                                  │
│   ├─→ AudioSocket(uuid, 127.0.0.1:5054)                           │
│   ├─→ Monitors English translated audio in Bridge 7000            │
│   ├─→ Sends to Dashboard Card 6                                   │
│   ├─→ Sends to Timing Server                                      │
│   └─→ Channel joins Bridge 7000                                   │
└────────────────────────────────────────────────────────────────────┘


╔════════════════════════════════════════════════════════════════════╗
║                     EXTENSION 7005 (FR SPEAKER)                    ║
╚════════════════════════════════════════════════════════════════════╝

User calls Extension 7005
        ↓
Asterisk: Stasis(translation-app, 7005)
        ↓
ARI Handler
        ↓
┌────────────────────────────────────────────────────────────────────┐
│ STEP 1: Create Bridge 7005 (Personal Bridge for FR speaker)       │
└────────────────────────────────────────────────────────────────────┘
        ↓
┌────────────────────────────────────────────────────────────────────┐
│ STEP 2: Add User to Bridge 7005                                   │
│         → User can HEAR everything in Bridge 7005                  │
└────────────────────────────────────────────────────────────────────┘
        ↓
┌────────────────────────────────────────────────────────────────────┐
│ STEP 3: FROM Bridge 7005, Originate 2 Calls:                      │
│                                                                    │
│   CALL #1: Extension 7001 (Mic Capture)                           │
│   ├─→ Local/7001@from-sip-custom                                  │
│   ├─→ AudioSocket(uuid, 127.0.0.1:5052)                           │
│   ├─→ Captures user's French speech                               │
│   ├─→ Deepgram STT → "Ça va bien, merci !"                        │
│   ├─→ DeepL FR→EN → "I'm fine, thank you!"                        │
│   ├─→ ElevenLabs TTS → [English audio]                            │
│   ├─→ Amplify 500x                                                │
│   ├─→ WebSocket port 5051 → Bridge 7000                           │
│   └─→ Channel joins Bridge 7005                                   │
│                                                                    │
│   CALL #2: listen-7001 (Muted Listener)                           │
│   ├─→ Local/listen-7001@from-sip-custom                           │
│   ├─→ ConfBridge(7001, muted_listener)                            │
│   ├─→ MUTED connection to Bridge 7001                             │
│   ├─→ Receives translated audio FROM Bridge 7001                  │
│   ├─→ (Bridge 7001 gets EN→FR translation from Extension 7000)    │
│   └─→ Channel joins Bridge 7005                                   │
│       → User HEARS French translation!                             │
└────────────────────────────────────────────────────────────────────┘


╔════════════════════════════════════════════════════════════════════╗
║                     BRIDGE 7001 (FR Translation Target)            ║
╚════════════════════════════════════════════════════════════════════╝

Bridge 7001 receives:
  → WebSocket injections from Extension 7000 (EN→FR translation)
  → Muted listener from Bridge 7005 (listen-7001 channel)
        ↓
┌────────────────────────────────────────────────────────────────────┐
│ STEP 4: FROM Bridge 7001, Originate 1 Call:                       │
│                                                                    │
│   CALL #3: Extension 7007 (Monitor/Dashboard)                     │
│   ├─→ Local/7007@from-sip-custom                                  │
│   ├─→ AudioSocket(uuid, 127.0.0.1:5056)                           │
│   ├─→ Monitors French translated audio in Bridge 7001             │
│   ├─→ Sends to Dashboard Card 6                                   │
│   ├─→ Sends to Timing Server                                      │
│   └─→ Channel joins Bridge 7001                                   │
└────────────────────────────────────────────────────────────────────┘
```

---

## Bridge Contents Summary

```
┌──────────────────────────────────────────────────────────────┐
│ BRIDGE 7004 (EN Speaker's Personal Bridge)                  │
├──────────────────────────────────────────────────────────────┤
│ Channels:                                                    │
│  1. User Channel (hears everything)                          │
│  2. Extension 7000 channel (mic capture)                     │
│  3. listen-7000 channel (muted listener to Bridge 7000)      │
│                                                              │
│ User Hears:                                                  │
│  - Own voice echo from Extension 7000                        │
│  - English translation from Bridge 7000 (via listen-7000)    │
└──────────────────────────────────────────────────────────────┘

┌──────────────────────────────────────────────────────────────┐
│ BRIDGE 7005 (FR Speaker's Personal Bridge)                  │
├──────────────────────────────────────────────────────────────┤
│ Channels:                                                    │
│  1. User Channel (hears everything)                          │
│  2. Extension 7001 channel (mic capture)                     │
│  3. listen-7001 channel (muted listener to Bridge 7001)      │
│                                                              │
│ User Hears:                                                  │
│  - Own voice echo from Extension 7001                        │
│  - French translation from Bridge 7001 (via listen-7001)     │
└──────────────────────────────────────────────────────────────┘

┌──────────────────────────────────────────────────────────────┐
│ BRIDGE 7000 (EN Translation Target)                         │
├──────────────────────────────────────────────────────────────┤
│ Receives From:                                               │
│  - WebSocket port 5051 (EN translated audio from FR speech)  │
│                                                              │
│ Channels:                                                    │
│  1. listen-7000 (muted listener from Bridge 7004)            │
│  2. Extension 7006 (monitor for dashboard)                   │
│                                                              │
│ Purpose:                                                     │
│  - Holds English translated audio                            │
│  - Fed to Bridge 7004 via listen-7000                        │
│  - Monitored by Extension 7006                               │
│                                                              │
│ NOT CONNECTED TO BRIDGE 7001!                                │
└──────────────────────────────────────────────────────────────┘

┌──────────────────────────────────────────────────────────────┐
│ BRIDGE 7001 (FR Translation Target)                         │
├──────────────────────────────────────────────────────────────┤
│ Receives From:                                               │
│  - WebSocket port 5053 (FR translated audio from EN speech)  │
│                                                              │
│ Channels:                                                    │
│  1. listen-7001 (muted listener from Bridge 7005)            │
│  2. Extension 7007 (monitor for dashboard)                   │
│                                                              │
│ Purpose:                                                     │
│  - Holds French translated audio                             │
│  - Fed to Bridge 7005 via listen-7001                        │
│  - Monitored by Extension 7007                               │
│                                                              │
│ NOT CONNECTED TO BRIDGE 7000!                                │
└──────────────────────────────────────────────────────────────┘
```

---

## Audio Flow Diagram

```
EN Speaker → Extension 7004 → Bridge 7004
                                  │
                ┌─────────────────┼─────────────────┐
                │                 │                 │
                ▼                 ▼                 ▼
          Extension 7000    listen-7000      WebSocket 5058
          (mic capture)     (muted to       (future use)
                │           Bridge 7000)
                │                 │
                ▼                 │
          AudioSocket 5050        │
          (Translation)           │
                │                 │
                ▼                 │
          Deepgram STT            │
          (EN text)               │
                │                 │
                ▼                 │
          DeepL EN→FR             │
          (FR text)               │
                │                 │
                ▼                 │
          ElevenLabs TTS          │
          (FR audio)              │
                │                 │
                ▼                 │
          Amplify 500x            │
                │                 │
                ▼                 │
          WebSocket 5053 ─────────┼──────────→ Bridge 7001
                                  │                 │
                                  │                 ▼
                                  │           Extension 7007
                                  │           (monitor)
                                  │                 │
                                  │                 ▼
                                  │           AudioSocket 5056
                                  │           → Dashboard Card 6
                                  │           → Timing Server
                                  │
                                  ▼
FR Speaker → Extension 7005 → Bridge 7005
                                  │
                ┌─────────────────┼─────────────────┐
                │                 │                 │
                ▼                 ▼                 ▼
          Extension 7001    listen-7001      WebSocket 5060
          (mic capture)     (muted to       (future use)
                │           Bridge 7001)
                │                 │
                ▼                 │
          AudioSocket 5052        │
          (Translation)           │
                │                 │
                ▼                 │
          Deepgram STT            │
          (FR text)               │
                │                 │
                ▼                 │
          DeepL FR→EN             │
          (EN text)               │
                │                 │
                ▼                 │
          ElevenLabs TTS          │
          (EN audio)              │
                │                 │
                ▼                 │
          Amplify 500x            │
                │                 │
                ▼                 │
          WebSocket 5051 ─────────┼──────────→ Bridge 7000
                                  │                 │
                                  │                 ▼
                                  │           Extension 7006
                                  │           (monitor)
                                  │                 │
                                  │                 ▼
                                  │           AudioSocket 5054
                                  │           → Dashboard Card 6
                                  │           → Timing Server
                                  │
                                  └──────────→ Feeds back to
                                              Bridge 7004 via
                                              listen-7000
```

---

## Port Mapping

### AudioSocket Ports (TCP):
```
5050 → Extension 7000 (EN mic capture)
5052 → Extension 7001 (FR mic capture)
5054 → Extension 7006 (EN monitor - from Bridge 7000)
5056 → Extension 7007 (FR monitor - from Bridge 7001)
```

### WebSocket Ports (Bridge Audio Injection):
```
5051 → Bridge 7000 (receives EN translated audio)
5053 → Bridge 7001 (receives FR translated audio)
5055 → Extension 7006 monitor WebSocket
5057 → Extension 7007 monitor WebSocket
5058 → Bridge 7004 WebSocket (future use)
5060 → Bridge 7005 WebSocket (future use)
```

---

## Implementation Requirements

### 1. Asterisk Extensions (extensions.conf)

```ini
[from-sip-custom]

; Entry Points
exten => 7004,1,NoOp(EN Speaker Entry)
 same => n,Answer()
 same => n,Stasis(translation-app,7004)
 same => n,Hangup()

exten => 7005,1,NoOp(FR Speaker Entry)
 same => n,Answer()
 same => n,Stasis(translation-app,7005)
 same => n,Hangup()

; Muted Listeners
exten => listen-7000,1,NoOp(Listen to Bridge 7000 MUTED)
 same => n,Answer()
 same => n,ConfBridge(7000,muted_listener)
 same => n,Hangup()

exten => listen-7001,1,NoOp(Listen to Bridge 7001 MUTED)
 same => n,Answer()
 same => n,ConfBridge(7001,muted_listener)
 same => n,Hangup()
```

### 2. ConfBridge Configuration (confbridge.conf)

```ini
[general]

[muted_listener]
type=bridge
audio_only=yes
mixing_interval=20
internal_sample_rate=8000
```

### 3. ARI Handler Logic

**When Extension 7004 is called:**
1. Create Bridge 7004
2. Add user to Bridge 7004
3. Originate Extension 7000 → add to Bridge 7004
4. Originate listen-7000 → add to Bridge 7004

**When Bridge 7000 receives audio (WebSocket injection):**
1. If Extension 7006 not yet originated:
   - Originate Extension 7006 → add to Bridge 7000

**When Extension 7005 is called:**
1. Create Bridge 7005
2. Add user to Bridge 7005
3. Originate Extension 7001 → add to Bridge 7005
4. Originate listen-7001 → add to Bridge 7005

**When Bridge 7001 receives audio (WebSocket injection):**
1. If Extension 7007 not yet originated:
   - Originate Extension 7007 → add to Bridge 7001

---

## Bidirectional Conversation Flow

### Timeline Example:

**T0:** Both speakers call in
- EN Speaker in Bridge 7004 (with Extension 7000, listen-7000)
- FR Speaker in Bridge 7005 (with Extension 7001, listen-7001)

**T1:** EN Speaker says "Hello"
1. Bridge 7004 → Extension 7000 → AudioSocket 5050
2. Translation: "Hello" → "Bonjour"
3. WebSocket 5053 → Bridge 7001
4. Extension 7007 monitors Bridge 7001
5. Bridge 7001 → listen-7001 → Bridge 7005
6. FR Speaker HEARS: "Bonjour"

**T2:** FR Speaker responds "Ça va bien"
1. Bridge 7005 → Extension 7001 → AudioSocket 5052
2. Translation: "Ça va bien" → "I'm fine"
3. WebSocket 5051 → Bridge 7000
4. Extension 7006 monitors Bridge 7000
5. Bridge 7000 → listen-7000 → Bridge 7004
6. EN Speaker HEARS: "I'm fine"

---

## Critical Architecture Rules

✅ **DO:**
- Create personal bridges (7004, 7005) for each user
- Originate mic capture FROM personal bridges
- Originate muted listeners FROM personal bridges
- Originate monitors FROM translation bridges (7000, 7001)
- Keep Bridge 7000 and Bridge 7001 completely separate

❌ **DON'T:**
- Connect Bridge 7000 to Bridge 7001
- Add users directly to Bridge 7000 or 7001
- Originate monitors from personal bridges
- Mix audio streams inappropriately

---

## Success Criteria

System is working correctly when:

1. ✅ Extension 7004 creates Bridge 7004
2. ✅ User joins Bridge 7004
3. ✅ Extension 7000 and listen-7000 join Bridge 7004
4. ✅ Bridge 7000 has listen-7000 and Extension 7006
5. ✅ Speaking English produces translation
6. ✅ English translation injected to Bridge 7000
7. ✅ Extension 7006 monitors Bridge 7000
8. ✅ Bridge 7004 receives audio via listen-7000
9. ✅ EN Speaker hears translated audio
10. ✅ Same flow works for Extension 7005 (FR)
11. ✅ No connection between Bridge 7000 and Bridge 7001
12. ✅ Bidirectional conversation works

---

## Next Steps

1. Implement ARI handler with 2-phase origination:
   - Phase 1: User entry → personal bridge + 2 channels
   - Phase 2: WebSocket injection → monitor channel
2. Update extensions.conf with entry points and listeners
3. Create confbridge.conf with muted listener profile
4. Deploy and test Extension 7004
5. Verify all 4 bridges created correctly
6. Test bidirectional conversation

---

**End of Document**
