install a 48kHz-based Socket

Stage 1: Add Configuration Infrastructure (No behavior change)

  What changes:
  - Add AUDIO_SAMPLE_RATE to .env.externalmedia (default: 16000)
  - Add config reading to both servers
  - Log the detected sample rate on startup

  Files to modify:

  1. /home/azureuser/translation-app/7777-8888-stack/.env.externalmedia
  # Add this line at the end
  AUDIO_SAMPLE_RATE=16000  # Options: 16000, 48000

  2. conference-server-externalmedia.js (around line 20, after other imports)
  const AUDIO_SAMPLE_RATE = parseInt(process.env.AUDIO_SAMPLE_RATE || '16000');
  console.log(`[Config] Audio Sample Rate: ${AUDIO_SAMPLE_RATE} Hz`);

  3. gateway-7777-8888.js (around line 10, after imports)
  const AUDIO_SAMPLE_RATE = parseInt(process.env.AUDIO_SAMPLE_RATE || '16000');
  console.log(`[Config] Audio Sample Rate: ${AUDIO_SAMPLE_RATE} Hz`);

  Test after Stage 1:
  - Restart both servers
  - Check logs show: [Config] Audio Sample Rate: 16000 Hz
  - Make test call 7777→8888
  - ✅ Should work exactly as before (slow playback)

  Rollback: Remove added lines

  ---
  Stage 2: Add RTP Configuration Object (No behavior change)

  What changes:
  - Add RTP config lookup table
  - Current code still uses 16kHz values

  File to modify: gateway-7777-8888.js

  Around line 15 (after config reading):
  // RTP Configuration for different sample rates
  const RTP_CONFIG = {
    16000: {
      chunkSize: 640,           // 20ms @ 16kHz = 320 samples * 2 bytes
      timestampIncrement: 320,   // samples per packet
      payloadType: 10,           // L16 (will be interpreted by Asterisk based on format)
      label: '16kHz (current)'
    },
    48000: {
      chunkSize: 1920,          // 20ms @ 48kHz = 960 samples * 2 bytes
      timestampIncrement: 960,   // samples per packet
      payloadType: 10,           // L16 (Asterisk ignores PT, uses format config)
      label: '48kHz (new)'
    }
  };

  const rtpConfig = RTP_CONFIG[AUDIO_SAMPLE_RATE];
  console.log(`[RTP Config] Using ${rtpConfig.label}:`);
  console.log(`  - Chunk size: ${rtpConfig.chunkSize} bytes`);
  console.log(`  - Timestamp increment: ${rtpConfig.timestampIncrement}`);
  console.log(`  - Payload type: ${rtpConfig.payloadType}`);

  Test after Stage 2:
  - Restart Gateway only
  - Check logs show RTP config with 16kHz values
  - Make test call 7777→8888
  - ✅ Should work exactly as before (slow playback)

  Rollback: Remove RTP_CONFIG object

  ---
  Stage 3: Update Gateway to Use RTP Config (No behavior change yet)

  What changes:
  - Replace hardcoded values with rtpConfig.*
  - Still uses 16kHz because AUDIO_SAMPLE_RATE=16000

  File to modify: gateway-7777-8888.js

  Find the buildRTPPacket function (around line 345-386):

  Current code:
  function buildRTPPacket(pcmPayload, state) {
    const rtpHeader = Buffer.alloc(12);

    rtpHeader[0] = 0x80;
    rtpHeader[1] = 11; // PT
    rtpHeader.writeUInt16BE(state.sequenceNumber, 2);
    rtpHeader.writeUInt32BE(state.timestamp, 4);
    rtpHeader.writeUInt32BE(state.ssrc, 8);

    // ... byte swapping ...

    state.sequenceNumber = (state.sequenceNumber + 1) & 0xFFFF;
    state.timestamp += 320; // hardcoded

    return Buffer.concat([rtpHeader, bigEndianPayload]);
  }

  Change to:
  function buildRTPPacket(pcmPayload, state) {
    const rtpHeader = Buffer.alloc(12);

    rtpHeader[0] = 0x80;
    rtpHeader[1] = rtpConfig.payloadType; // From config
    rtpHeader.writeUInt16BE(state.sequenceNumber, 2);
    rtpHeader.writeUInt32BE(state.timestamp, 4);
    rtpHeader.writeUInt32BE(state.ssrc, 8);

    // ... byte swapping code unchanged ...

    state.sequenceNumber = (state.sequenceNumber + 1) & 0xFFFF;
    state.timestamp += rtpConfig.timestampIncrement; // From config

    return Buffer.concat([rtpHeader, bigEndianPayload]);
  }

  Test after Stage 3:
  - Restart Gateway only
  - Make test call 7777→8888
  - ✅ Should work exactly as before (slow playback)
  - Gateway using PT=10, timestamp +320 (same as before)

  Rollback: Restore hardcoded values (11, 320)

  ---
  Stage 4: Add Sample Rate to Conference Server Config (No behavior change)

  What changes:
  - Add sampleRate to Deepgram/ElevenLabs config objects
  - Still uses 16kHz values

  File to modify: conference-server-externalmedia.js

  Find Deepgram connection setup (search for createClient):

  Current:
  const deepgram = createClient(DEEPGRAM_API_KEY);
  const connection = deepgram.listen.live({
    encoding: 'linear16',
    sample_rate: 16000,  // hardcoded
    // ...
  });

  Change to:
  console.log(`[Deepgram] Connecting with sample rate: ${AUDIO_SAMPLE_RATE} Hz`);
  const deepgram = createClient(DEEPGRAM_API_KEY);
  const connection = deepgram.listen.live({
    encoding: 'linear16',
    sample_rate: AUDIO_SAMPLE_RATE,  // From config
    // ...
  });

  Find ElevenLabs TTS call (search for text-to-speech):

  Current:
  const response = await axios.post(
    `https://api.elevenlabs.io/v1/text-to-speech/${voiceId}`,
    {
      text: translatedText,
      model_id: 'eleven_turbo_v2_5',
      output_format: 'pcm_16000',  // hardcoded
      // ...
    }
  );

  Change to:
  const outputFormat = `pcm_${AUDIO_SAMPLE_RATE}`;
  console.log(`[ElevenLabs] Using output format: ${outputFormat}`);

  const response = await axios.post(
    `https://api.elevenlabs.io/v1/text-to-speech/${voiceId}`,
    {
      text: translatedText,
      model_id: 'eleven_turbo_v2_5',
      output_format: outputFormat,  // From config
      // ...
    }
  );

  Test after Stage 4:
  - Restart conference server only
  - Check logs show: [Deepgram] Connecting with sample rate: 16000 Hz
  - Make test call 7777→8888
  - ✅ Should work exactly as before (slow playback)

  Rollback: Restore hardcoded values (16000, pcm_16000)

  ---
  Stage 5: Add Asterisk slin48 Support (Disabled)

  What changes:
  - Add commented-out 48kHz dialplan entries
  - Active dialplan unchanged

  File to modify: /etc/asterisk/extensions.conf

  Find the [from-internal] context with 7777/8888 definitions:

  Add these lines (commented out) after existing entries:
  [from-internal]

  ; === ACTIVE: 16kHz Configuration ===
  exten => 7777,1,NoOp(Translation Test - Extension 7777 @ 16kHz)
    same => n,Stasis(translation-test,7777)
    same => n,Set(CHANNEL(format)=slin16)
    same => n,Answer()
    same => n,Hangup()

  exten => 8888,1,NoOp(Translation Test - Extension 8888 @ 16kHz)
    same => n,Stasis(translation-test,8888)
    same => n,Set(CHANNEL(format)=slin16)
    same => n,Answer()
    same => n,Hangup()

  ; === DISABLED: 48kHz Configuration ===
  ; To enable 48kHz: Comment out 16kHz sections above, uncomment below
  ;exten => 7777,1,NoOp(Translation Test - Extension 7777 @ 48kHz)
  ;  same => n,Stasis(translation-test,7777)
  ;  same => n,Set(CHANNEL(format)=slin48)
  ;  same => n,Answer()
  ;  same => n,Hangup()

  ;exten => 8888,1,NoOp(Translation Test - Extension 8888 @ 48kHz)
  ;  same => n,Stasis(translation-test,8888)
  ;  same => n,Set(CHANNEL(format)=slin48)
  ;  same => n,Answer()
  ;  same => n,Hangup()

  Reload Asterisk:
  sudo asterisk -rx 'dialplan reload'

  Test after Stage 5:
  - Reload dialplan only (no restart needed)
  - Make test call 7777→8888
  - ✅ Should work exactly as before (slow playback)
  - Still using slin16

  Rollback: N/A (changes are comments)

  ---
  Stage 6: Test Summary - Verify Everything Still Works

  Full regression test before enabling 48kHz:

  1. Check all services running:
  ps aux | grep -E "gateway|conference" | grep -v grep

  2. Check logs show 16kHz config:
  tail -20 /tmp/gw-*.log | grep "16000"

  3. Make test call 7777→8888
    - Should hear slow playback (expected with current 16kHz/PT=10 mismatch)
    - Translation should work
    - Dashboard should show activity
  4. Check dashboard: http://20.170.155.53:3002/dashboard.html

  ✅ If all tests pass: System is ready for 48kHz activation

  ❌ If any test fails: Review stages 1-5, fix before proceeding

  ---
  Stage 7A: Enable 48kHz - Asterisk Only (Test output first)

  What changes:
  - Change Asterisk to slin48
  - Gateway/Conference still at 16kHz (with resampling)
  - Tests if Asterisk correctly handles 48kHz RTP

  File to modify: /etc/asterisk/extensions.conf

  Comment out 16kHz, uncomment 48kHz sections:
  ; === DISABLED: 16kHz Configuration ===
  ;exten => 7777,1,NoOp(Translation Test - Extension 7777 @ 16kHz)
  ;  same => n,Stasis(translation-test,7777)
  ;  same => n,Set(CHANNEL(format)=slin16)
  ;  ...

  ; === ACTIVE: 48kHz Configuration ===
  exten => 7777,1,NoOp(Translation Test - Extension 7777 @ 48kHz)
    same => n,Stasis(translation-test,7777)
    same => n,Set(CHANNEL(format)=slin48)
    same => n,Answer()
    same => n,Hangup()

  exten => 8888,1,NoOp(Translation Test - Extension 8888 @ 48kHz)
    same => n,Stasis(translation-test,8888)
    same => n,Set(CHANNEL(format)=slin48)
    same => n,Answer()
    same => n,Hangup()

  Reload:
  sudo asterisk -rx 'dialplan reload'

  Test after Stage 7A:
  - Make test call 7777→8888
  - ✅ If you hear garbled/distorted audio: Expected (sample rate mismatch in services)
  - ✅ If you hear slow audio: Asterisk not yet using slin48
  - Check Asterisk is accepting slin48:
  sudo asterisk -rx 'core show channels verbose' | grep -A5 '7777\|8888'

  Rollback: Re-comment 48kHz, uncomment 16kHz, reload dialplan

  ---
  Stage 7B: Enable 48kHz - Full Pipeline

  What changes:
  - Change AUDIO_SAMPLE_RATE=48000 in .env
  - Restart both servers
  - Full 48kHz end-to-end

  File to modify: .env.externalmedia

  # Change from:
  AUDIO_SAMPLE_RATE=16000

  # To:
  AUDIO_SAMPLE_RATE=48000

  Restart servers:
  # Kill current servers
  pkill -f "conference-server"
  pkill -f "gateway-7777"

  # Restart
  cd /home/azureuser/translation-app/7777-8888-stack
  node conference-server-externalmedia.js > /tmp/conf-48k.log 2>&1 &
  sleep 2
  node gateway-7777-8888.js > /tmp/gw-48k.log 2>&1 &

  Verify logs:
  grep "48000" /tmp/conf-48k.log
  grep "48000" /tmp/gw-48k.log

  Test after Stage 7B:
  - Make test call 7777→8888
  - ✅ Audio should play at NORMAL speed
  - ✅ Translation should work
  - ✅ Dashboard should show activity

  Success criteria:
  - Hear translated audio at normal speed (not slow motion)
  - ASR correctly transcribes speech
  - TTS audio is clear and intelligible

  Rollback if issues:
  # Change .env back to:
  AUDIO_SAMPLE_RATE=16000

  # Restart servers
  pkill -f "conference-server"
  pkill -f "gateway-7777"
  cd /home/azureuser/translation-app/7777-8888-stack
  node conference-server-externalmedia.js > /tmp/conf-rollback.log 2>&1 &
  sleep 2
  node gateway-7777-8888.js > /tmp/gw-rollback.log 2>&1 &

  # Restore Asterisk
  sudo asterisk -rx 'dialplan reload'  # After uncommenting 16kHz sections

  ---
  Testing Checklist Between Stages

  After each stage, verify:

  - Servers start without errors
  - Logs show expected configuration
  - Can make call from 7777 to 8888
  - Dashboard accessible
  - No crashes or exceptions

  If any checkbox fails, STOP and fix before proceeding.

  ---
  Quick Rollback Command Summary

  # Emergency rollback to working state:
  cd /home/azureuser/translation-app/7777-8888-stack

  # 1. Restore .env
  sed -i 's/AUDIO_SAMPLE_RATE=48000/AUDIO_SAMPLE_RATE=16000/' .env.externalmedia

  # 2. Restore Asterisk (re-enable 16kHz sections manually)
  sudo asterisk -rx 'dialplan reload'

  # 3. Restart servers
  pkill -f "conference-server|gateway-7777"
  sleep 2
  node conference-server-externalmedia.js > /tmp/conf.log 2>&1 &
  sleep 2
  node gateway-7777-8888.js > /tmp/gw.log 2>&1 &
