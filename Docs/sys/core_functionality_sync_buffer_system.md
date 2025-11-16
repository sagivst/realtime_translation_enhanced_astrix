Complete System Analysis & Implementation Plan

  Current Architecture Overview

  Audio Flow Pipeline

  Asterisk (Extensions 7777/8888)
      ↓ RTP (UDP ports 5000/5001)
  Gateway (gateway-7777-8888.js)
      ↓ Socket.IO 'audioStream' event (PCM16, 16kHz)
  Conference Server (conference-server-externalmedia.js)
      ↓ Processing Pipeline:
      1. ASR (Deepgram) → Transcription
      2. MT (OpenAI) → Translation
      3. TTS (ElevenLabs) → MP3 Audio
      ↓ [BUFFER INSERTION POINT - Step 4] ← We are here
      ↓ Socket.IO 'translatedAudio' event (MISSING - Step 4)
  Gateway
      ↓ RTP (UDP)
  Asterisk (Opposite Extension)

  Key Components

  Gateway Ports & Channels:
  - Extension 7777: UDP 5000 (RTP in), UDP 6000 (monitor)
  - Extension 8888: UDP 5001 (RTP in), UDP 6001 (monitor)
  - Socket.IO: Port 3002 (Conference Server connection)
  - Audio Format: PCM16, 16kHz, mono

  Conference Server:
  - Port 3002: Socket.IO server
  - Port 6001: TCP API for timing dashboard
  - Extension Pairing: 7777 ↔ 8888 (bidirectional)

  Current State (PID Status):
  - Gateway: PID 213948 ✓ Running
  - Conference Server: PID 215291 ✓ Running (Step 3 deployed)

  ---
  Completed Steps (Steps 1-3)

  ✅ Step 1: Socket.IO Event Handlers (Logging Only)

  Location: conference-server-externalmedia.js:2069-2111

  What Was Added:
  socket.on('setAutoSync', (data) => {
    // Logs event and sends acknowledgment
  });

  socket.on('setManualLatency', (data) => {
    // Logs event and sends acknowledgment
  });

  socket.on('requestAudioMonitor', (data) => {
    // Logs event (Step 5 implementation)
  });

  Result: Dashboard controls communicate with server, events logged.

  ---
  ✅ Step 2: Latency Broadcasting to Dashboard

  Location: conference-server-externalmedia.js:1450-1452, 1568-1582

  What Was Added:
  1. Signed latency difference broadcast:
  // Line 1450: Emit latency update with SIGNED difference
  global.io.emit('latencyUpdate', {
    extension: extension,
    buffer: {
      adjustment: Math.round(latencyDifference)  // Signed: +/- indicates faster/slower
    }
  });

  2. Paired extension synchronization:
  // Line 1452: Emit inverted value to paired extension
  emitLatencyUpdateToPairedExtension(pairedExtension, -latencyDifference);

  // Lines 1568-1582: Helper function
  function emitLatencyUpdateToPairedExtension(pairedExtension, invertedLatencyDifference) {
    const data = {
      extension: pairedExtension,
      buffer: {
        adjustment: Math.round(invertedLatencyDifference)
      }
    };
    global.io.emit('latencyUpdate', data);
  }

  Result: Both extensions show mathematically consistent mirror latency values.

  ---
  ✅ Step 2.5: Audio Flow Architecture Analysis

  What Was Discovered:

  CRITICAL FINDING: Conference Server → Gateway audio return path is MISSING

  Current Flow (Incoming):
  Gateway line 279-286: Emits 'audioStream' → Conference Server ✓

  Missing Flow (Outgoing):
  Conference Server: NO 'translatedAudio' emit ✗
  Gateway line 214-218: Listening for 'translatedAudio' (never receives)

  Conclusion: Step 4 must implement the complete return path.

  ---
  ✅ Step 3: Store Buffer Settings Per Extension

  Location: conference-server-externalmedia.js:577-586, 2082-2104

  What Was Added:

  1. Buffer settings storage (lines 577-586):
  // STEP 3: Extension buffer settings storage
  const extensionBufferSettings = new Map();

  // Initialize with defaults (autoSync: true per user request)
  extensionBufferSettings.set('7777', { autoSync: true, manualLatencyMs: 0 });
  extensionBufferSettings.set('8888', { autoSync: true, manualLatencyMs: 0 });

  2. Updated setAutoSync handler (lines 2082-2086):
  // STEP 3: Store the setting
  const settings = extensionBufferSettings.get(extension) || { autoSync: false, manualLatencyMs: 0 };
  settings.autoSync = enabled;
  extensionBufferSettings.set(extension, settings);
  console.log(`[Buffer Settings] Extension ${extension} autoSync set to ${enabled}`);

  3. Updated setManualLatency handler (lines 2100-2104):
  // STEP 3: Store the setting
  const settings = extensionBufferSettings.get(extension) || { autoSync: false, manualLatencyMs: 0 };
  settings.manualLatencyMs = latencyMs;
  extensionBufferSettings.set(extension, settings);
  console.log(`[Buffer Settings] Extension ${extension} manualLatencyMs set to ${latencyMs}ms`);

  Result: Dashboard settings are stored per extension, ready for Step 4 to use.

  ---
  Pending Steps (Steps 4-5)

  🔲 Step 4: Implement Actual Audio Buffer Delay (MAIN TASK)

  Purpose: Apply calculated buffer delay and send audio to opposite extension via Gateway.

  Implementation Location: After ElevenLabs TTS completion (~line 1330)

  Detailed Plan:

  4A. Get Buffer Settings

  // Retrieve stored settings for this extension
  const settings = extensionBufferSettings.get(extension) || { autoSync: false, manualLatencyMs: 0 };
  const autoSync = settings.autoSync;
  const manualLatencyMs = settings.manualLatencyMs;

  4B. Calculate Total Buffer

  // Get current latency difference
  const pairedExtension = pairManager.getPairedExtension(extension);
  const latencyDifference = latencyTracker.getCurrentLatencyDifference(extension, pairedExtension);

  // Calculate total buffer
  let totalBufferMs = manualLatencyMs; // Always add manual adjustment

  if (autoSync && latencyDifference !== null && latencyDifference < 0) {
    // This extension is FASTER (negative latency diff)
    // Buffer by the absolute difference to sync with slower extension
    totalBufferMs += Math.abs(latencyDifference);
  }

  console.log(`[Buffer Apply] Extension ${extension}: autoSync=${autoSync}, manual=${manualLatencyMs}ms, latencyDiff=${latencyDifference}ms,
  total=${totalBufferMs}ms`);

  4C. Convert MP3 to PCM16 (if needed)

  // ElevenLabs returns MP3, Gateway expects PCM16
  // Option 1: Use ffmpeg (if available)
  // Option 2: Use fluent-ffmpeg npm package
  // Option 3: Send MP3 and let Gateway handle conversion

  // For now, we'll need to add conversion logic here
  // This is a placeholder - actual implementation depends on available libraries

  4D. Apply Buffer & Send to Gateway

  // Use audioBufferManager to apply delay
  audioBufferManager.bufferAndSend(
    pairedExtension,  // Send to OPPOSITE extension (7777 → 8888, 8888 → 7777)
    pcmAudioBuffer,   // PCM16 audio data
    totalBufferMs,    // Total delay in milliseconds
    (ext, audioData) => {
      // This callback executes after the buffer delay

      // Emit to Gateway via Socket.IO
      global.io.emit('translatedAudio', {
        extension: ext,
        audio: audioData,
        format: 'pcm16',
        sampleRate: 16000,
        timestamp: Date.now()
      });

      console.log(`[Audio Forward] Sent ${audioData.length} bytes to extension ${ext} after ${totalBufferMs}ms delay`);
    }
  );

  Files to Modify:
  - conference-server-externalmedia.js (~line 1330, after TTS completion)

  Critical Points:
  - ✓ AudioBufferManager class already exists (lines 304-356)
  - ✓ Buffer calculation logic exists but not applied (lines 1415-1443)
  - ✓ Settings storage ready (Step 3)
  - ✗ Audio format conversion MP3→PCM16 (NEW - needs implementation)
  - ✗ Socket.IO 'translatedAudio' emit (NEW - needs implementation)
  - ✓ Gateway listener ready (gateway-7777-8888.js:214-218)

  ---
  🔲 Step 5: Audio Monitoring Stream (Optional)

  Purpose: Stream audio to browser for real-time monitoring via speaker volume slider.

  Implementation:
  1. Tap into audio pipeline after TTS
  2. Stream chunks via Socket.IO to dashboard
  3. Use Web Audio API in browser to play audio
  4. Control volume via gainNode

  Files to Modify:
  - conference-server-externalmedia.js (add audio streaming)
  - dashboard-latency-sync.html (Web Audio API implementation)

  Status: Lower priority, implement after Step 4 is tested.

  ---
  Buffer Calculation Logic (Reference)

  Latency Sign Convention

  Extension 7777 E2E: 500ms
  Extension 8888 E2E: 700ms

  From 7777's perspective:
    latencyDifference = 500 - 700 = -200ms (FASTER, needs +200ms buffer)

  From 8888's perspective:
    latencyDifference = 700 - 500 = +200ms (SLOWER, needs 0ms buffer)

  Buffer Formula

  if (latencyDifference < 0) {
    // This extension is FASTER
    targetBuffer = abs(latencyDifference)  // Delay to match slower extension
  } else {
    // This extension is SLOWER
    targetBuffer = 0  // No delay needed
  }

  totalBuffer = (autoSync ? targetBuffer : 0) + manualLatencyMs

  Audio Routing

  Extension 7777 audio → Buffer → Send to Extension 8888
  Extension 8888 audio → Buffer → Send to Extension 7777

  ---
  Testing Dashboards

  Split View (Both Extensions):
  http://20.170.155.53:3002/dashboard-latency-split.html

  Individual Dashboards:
  http://20.170.155.53:3002/dashboard-latency-sync.html?ext=7777
  http://20.170.155.53:3002/dashboard-latency-sync.html?ext=8888

  Test Controls:
  1. Auto Sync Toggle → Should log: [Buffer Settings] Extension XXXX autoSync set to true/false
  2. Manual Latency Slider (0-500ms) → Should log: [Buffer Settings] Extension XXXX manualLatencyMs set to XXXms
  3. Monitor Speaker Volume → No effect yet (Step 5)

  ---
  Next Action: Implement Step 4

  Ready to proceed? I can implement Step 4 now, which will:
  1. Retrieve buffer settings from Step 3
  2. Calculate total buffer (autoSync + manual)
  3. Handle audio format conversion (MP3 → PCM16)
  4. Apply buffer delay using audioBufferManager
  5. Emit 'translatedAudio' to Gateway for opposite extension

  This is the core functionality that makes the sync buffer system work!



