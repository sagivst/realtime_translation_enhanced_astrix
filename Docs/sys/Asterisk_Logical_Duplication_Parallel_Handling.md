Dynamic Extension Pair Assignment and Logical Session Duplication in Asterisk

⸻

1. Objective

This document defines a clear, single-path implementation strategy for managing dynamic extension pairing and logical dialplan instancing in Asterisk. The goal is to ensure that each new session automatically receives a unique virtual pair of extensions (e.g., 7000–7001, 7002–7003, etc.), forming an isolated logical environment for bi-directional media routing, transcription, and translation processes.

Each pair acts as an autonomous duplex communication circuit, ensuring no variable collisions, shared state, or media interference between concurrent sessions.

⸻

2. Conceptual Flow Overview

flowchart TD
    A[Incoming Call Detected] --> B[Allocate Next Free Extension Pair]
    B --> C[Register Pair in Session Table: {PAIR_ID, EXT_A, EXT_B}]
    C --> D[Launch Dialplan Instance for EXT_A]
    D --> E[Launch Dialplan Instance for EXT_B]
    E --> F[Associate Both with Shared PAIR_ID Context]
    F --> G[Execute Mirrored Media Routing / Translation Logic]
    G --> H[On Hangup → Release Pair Back to Pool]

Each step is atomic and state-driven, ensuring deterministic lifecycle control over extension pairs.

⸻

3. Implementation Architecture

3.1 Dynamic Extension Pooling

A small runtime service (local Python or Node.js daemon) maintains a rotating pool of extension pairs. It exposes an internal API (via Unix socket or localhost HTTP) to provide the next available pair.

Example Table (in Redis or memory):

Pair ID	EXT_A	EXT_B	State	Assigned Timestamp
pair_001	7000	7001	free	-
pair_002	7002	7003	busy	2025-10-29T13:45:00Z
pair_003	7004	7005	free	-

3.2 Allocation Function (Node.js Example)

function allocatePair(pool) {
  const pair = pool.find(p => p.state === 'free');
  if (!pair) throw new Error('No free extension pairs available');
  pair.state = 'busy';
  pair.assigned = new Date().toISOString();
  return pair;
}

function releasePair(pool, pairId) {
  const pair = pool.find(p => p.pairId === pairId);
  if (pair) {
    pair.state = 'free';
    pair.assigned = null;
  }
}

3.3 Integration with Asterisk (ARI Entry Point)

When a new call hits the Asterisk entry context (e.g., extension 1000):
	1.	Asterisk calls the local API (GET /allocate-pair).
	2.	Receives {PAIR_ID, EXT_A, EXT_B}.
	3.	Launches a Stasis app with those parameters:

exten => 1000,1,NoOp(New incoming call)
 same => n,Stasis(pair_session,${CALLERID(num)})

The ARI application then uses allocatePair() and spawns:
	•	Channel A → EXT_A → Bridge_A
	•	Channel B → EXT_B → Bridge_B
	•	All actions are tagged by the same PAIR_ID.

⸻

4. Logical Dialplan Duplication Model

Every call executes the same dialplan logic, isolated via its PAIR_ID. All per-session state, variables, and bridges are named dynamically based on this ID.

Example Naming Convention

Entity	Format	Example
Bridge A	brg_${PAIR_ID}_A	brg_pair_002_A
Bridge B	brg_${PAIR_ID}_B	brg_pair_002_B
Channel A	chan_${PAIR_ID}_A	chan_pair_002_A
Channel B	chan_${PAIR_ID}_B	chan_pair_002_B


⸻

5. Execution Sequence (Simplified)

sequenceDiagram
    participant Caller as Incoming Call
    participant Allocator as Pair Allocator Service
    participant ARI as Asterisk ARI App
    participant BridgeA as Bridge_A
    participant BridgeB as Bridge_B

    Caller->>Allocator: Request next free pair
    Allocator-->>Caller: Returns {PAIR_ID, EXT_A, EXT_B}
    Caller->>ARI: Stasis(pair_session, PAIR_ID, EXT_A, EXT_B)
    ARI->>BridgeA: Create bridge for EXT_A (mute in)
    ARI->>BridgeB: Create bridge for EXT_B (mute in)
    ARI->>BridgeA: Start external media capture (mic A)
    ARI->>BridgeB: Start external media capture (mic B)
    ARI->>BridgeA: Inject translated B→A stream
    ARI->>BridgeB: Inject translated A→B stream
    ARI-->>Allocator: Release pair on session end


⸻

6. Sample ARI Logic (Node.js)

client.on('StasisStart', async (event, channel) => {
  const caller = event.channel;
  const pair = await get('/allocate-pair'); // { pairId, extA, extB }

  const brgA = client.Bridge();
  const brgB = client.Bridge();
  await Promise.all([
    brgA.create({ type: 'mixing', name: `brg_${pair.pairId}_A` }),
    brgB.create({ type: 'mixing', name: `brg_${pair.pairId}_B` })
  ]);

  const chB = client.Channel();
  await chB.originate({
    endpoint: `PJSIP/${pair.extB}`,
    app: 'pair_session',
    appArgs: `${pair.pairId},${pair.extA},${pair.extB}`
  });

  await brgA.addChannel({ channel: caller.id });
  await brgB.addChannel({ channel: chB.id });
  await Promise.all([
    caller.mute({ direction: 'in' }),
    chB.mute({ direction: 'in' })
  ]);

  await startTranslationPipelines(pair, brgA, brgB);
});


⸻

7. Automatic Pair Recycling

When either leg disconnects:

client.on('ChannelHangupRequest', async (evt) => {
  const { pairId } = evt.args;
  await releasePair(pool, pairId);
  await cleanupResources(pairId);
});

All bridges, external media, and sockets associated with that PAIR_ID are terminated cleanly.

⸻

8. Summary of Core Rules

Principle	Description
One Pair per Session	Each logical session receives a unique pair of extensions and bridges.
Isolated Variables	No globals or shared state. Use ${PAIR_ID} as root context.
Deterministic Lifecycle	Allocate → Run → Release. No overlap allowed.
Metadata Integrity	Each external connection carries {PAIR_ID, SRC_EXT} headers.
Optimized Execution	Use ARI with static dialplan and dynamic pair allocation only.


⸻

System Outcome
	•	Each new call spawns a fully isolated logical universe consisting of 2 extensions, 2 bridges, and a unified PAIR_ID.
	•	Dynamic pair assignment guarantees clean concurrency across hundreds of simultaneous sessions without risk of variable collision.
	•	Downstream services (transcription, translation, analytics) can reliably associate all data flows using PAIR_ID.

