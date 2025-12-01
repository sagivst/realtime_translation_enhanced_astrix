// ═══════════════════════════════════════════════════════════════
// ENHANCED UDP-to-Translation Handler with Per-Service Timing
// Tracks: Deepgram ASR, DeepL MT, ElevenLabs TTS latencies
// Calculates: Total latency per extension
// Applies: Buffer synchronization to faster extension
// ═══════════════════════════════════════════════════════════════

async function processUdpPcmAudio(sourceExtension, pcmBuffer, sourceLang) {
  try {
    udpPcmStats.translationRequests++;

    const targetExtension = sourceExtension === '3333' ? '4444' : '3333';
    const targetLang = sourceLang === 'en' ? 'fr' : 'en';

    console.log(`[UDP-${sourceExtension}] Starting translation: ${sourceLang} → ${targetLang}`);

    // Initialize timing object
    const timing = {
      start: Date.now(),
      asr: 0,
      mt: 0,
      tts: 0,
      total: 0
    };

    // ═══════════════════════════════════════════════════════════════
    // STAGE 1: ASR (Deepgram Speech Recognition)
    // ═══════════════════════════════════════════════════════════════
    const t1_start = Date.now();

    const gainFactor = extensionGainFactors.get(sourceExtension) || 2.0;
    const amplifiedAudio = amplifyAudio(pcmBuffer, gainFactor);
    const wavAudio = addWavHeader(amplifiedAudio);
    const transcriptionResult = await transcribeAudio(wavAudio, sourceLang);

    timing.asr = Date.now() - t1_start;

    if (!transcriptionResult || !transcriptionResult.text || transcriptionResult.text.trim() === '') {
      console.log(`[UDP-${sourceExtension}] No speech detected`);
      return;
    }

    console.log(`[UDP-${sourceExtension}] ✓ ASR: ${timing.asr}ms - "${transcriptionResult.text}" (confidence: ${transcriptionResult.confidence})`);

    // Emit transcription to dashboard
    global.io.emit("transcriptionFinal", {
      extension: sourceExtension,
      text: transcriptionResult.text,
      language: sourceLang,
      confidence: transcriptionResult.confidence,
      timestamp: Date.now()
    });

    // ═══════════════════════════════════════════════════════════════
    // STAGE 2: MT (DeepL Machine Translation)
    // ═══════════════════════════════════════════════════════════════
    const t2_start = Date.now();

    const translatedText = await translateText(transcriptionResult.text, sourceLang, targetLang);

    timing.mt = Date.now() - t2_start;

    console.log(`[UDP-${sourceExtension}] ✓ MT: ${timing.mt}ms - "${translatedText}"`);

    // Emit translation to dashboard
    global.io.emit("translationComplete", {
      extension: sourceExtension,
      original: transcriptionResult.text,
      translation: translatedText,
      sourceLang: sourceLang,
      targetLang: targetLang,
      timestamp: Date.now()
    });

    // ═══════════════════════════════════════════════════════════════
    // STAGE 3: TTS (ElevenLabs Text-to-Speech)
    // ═══════════════════════════════════════════════════════════════
    const t3_start = Date.now();

    const mp3Buffer = await synthesizeSpeech(translatedText, targetLang);

    timing.tts = Date.now() - t3_start;

    console.log(`[UDP-${sourceExtension}] ✓ TTS: ${timing.tts}ms - ${mp3Buffer.length} bytes MP3`);

    // Emit translatedAudio event for dashboard Card #4 (ElevenLabs TTS)
    global.io.emit("translatedAudio", {
      extension: sourceExtension,
      translation: translatedText,
      original: transcriptionResult.text,
      audio: mp3Buffer.toString("base64"),  // Base64-encoded MP3
      sampleRate: 24000,  // ElevenLabs default sample rate
      duration: Math.round(mp3Buffer.length / (24000 * 2)),  // Rough estimate
      timestamp: Date.now()
    });
    console.log(`[Card #4] translatedAudio emitted for extension ${sourceExtension}: "${translatedText.substring(0, 30)}..."`);

    // ═══════════════════════════════════════════════════════════════
    // CALCULATE TOTAL LATENCY
    // ═══════════════════════════════════════════════════════════════
    timing.total = timing.asr + timing.mt + timing.tts;

    console.log(`[UDP-${sourceExtension}] ✓ TOTAL LATENCY: ${timing.total}ms (ASR:${timing.asr}ms + MT:${timing.mt}ms + TTS:${timing.tts}ms)`);

    // ═══════════════════════════════════════════════════════════════
    // UPDATE LATENCY TRACKER
    // ═══════════════════════════════════════════════════════════════
    const direction = `${sourceExtension}→${targetExtension}`;
    latencyTracker.updateLatency(direction, timing.total);

    // Update individual service latencies
    latencyTracker.updateStageLatency(sourceExtension, 'asr', timing.asr);
    latencyTracker.updateStageLatency(sourceExtension, 'mt', timing.mt);
    latencyTracker.updateStageLatency(sourceExtension, 'tts', timing.tts);

    // ═══════════════════════════════════════════════════════════════
    // CALCULATE LATENCY DIFFERENCE FOR SYNCHRONIZATION
    // ═══════════════════════════════════════════════════════════════
    const pairedExtension = pairManager.getPairedExtension(sourceExtension);
    const latencyDifference = latencyTracker.getCurrentLatencyDifference(sourceExtension, pairedExtension);

    let bufferDelayMs = 0;
    let bufferReason = 'no_sync';

    if (pairedExtension && latencyDifference !== null) {
      console.log(`[Latency] ${sourceExtension}→${pairedExtension}: ${Math.round(latencyTracker.getLatestLatency(direction))}ms, Δ=${Math.round(latencyDifference)}ms`);

      // Get buffer settings for this extension
      const settings = extensionBufferSettings.get(sourceExtension) || { autoSync: false, manualLatencyMs: 0 };
      const autoSync = settings.autoSync;
      const manualLatencyMs = settings.manualLatencyMs;

      // Apply auto-sync buffer if this extension is FASTER
      if (autoSync && latencyDifference < 0) {
        bufferDelayMs = Math.abs(latencyDifference);
        bufferReason = `sync_to_${pairedExtension}`;
        console.log(`[Buffer] Extension ${sourceExtension} is FASTER by ${bufferDelayMs}ms - adding sync buffer`);
      } else if (latencyDifference >= 0) {
        console.log(`[Buffer] Extension ${sourceExtension} is SLOWER - no buffer needed`);
      }

      // Add manual buffer if configured
      if (manualLatencyMs > 0) {
        bufferDelayMs += manualLatencyMs;
        bufferReason = bufferReason === 'no_sync' ? 'manual_only' : `${bufferReason}_and_manual`;
        console.log(`[Buffer] Adding manual buffer: +${manualLatencyMs}ms`);
      }

      console.log(`[Buffer] TOTAL BUFFER: ${bufferDelayMs}ms (${bufferReason})`);
    }

    // ═══════════════════════════════════════════════════════════════
    // EMIT DASHBOARD LATENCY UPDATE
    // ═══════════════════════════════════════════════════════════════
    const dashboardData = {
      extension: sourceExtension,
      latencies: {
        asr: {
          current: timing.asr,
          avg: latencyTracker.getAverageStageLatency(sourceExtension, 'asr') || timing.asr
        },
        mt: {
          current: timing.mt,
          avg: latencyTracker.getAverageStageLatency(sourceExtension, 'mt') || timing.mt
        },
        tts: {
          current: timing.tts,
          avg: latencyTracker.getAverageStageLatency(sourceExtension, 'tts') || timing.tts
        },
        e2e: {
          current: timing.total,
          avg: latencyTracker.getAverageLatency(direction) || timing.total
        }
      },
      buffer: {
        adjustment: Math.round(bufferDelayMs),
        reason: bufferReason,
        pairedExtension: pairedExtension || 'none'
      },
      timestamp: Date.now()
    };

    global.io.emit('latencyUpdate', dashboardData);
    dashboardTCPAPI.broadcastLatencyUpdate(dashboardData);

    console.log(`[Dashboard] Emitted latency update for ${sourceExtension} (Total: ${timing.total}ms, Buffer: ${bufferDelayMs}ms)`);

    // Also emit paired extension update for consistency
    if (pairedExtension && latencyDifference !== null) {
      const pairedData = {
        extension: pairedExtension,
        buffer: {
          adjustment: Math.round(-latencyDifference),  // Inverted for paired extension
          reason: bufferReason === `sync_to_${pairedExtension}` ? 'paired_slower' : 'paired_faster',
          pairedExtension: sourceExtension
        },
        timestamp: Date.now()
      };
      global.io.emit('latencyUpdate', pairedData);
      console.log(`[Dashboard] Emitted paired latency update for ${pairedExtension} (Δ: ${Math.round(-latencyDifference)}ms)`);
    }

    // ═══════════════════════════════════════════════════════════════
    // CONVERT AUDIO AND APPLY BUFFER
    // ═══════════════════════════════════════════════════════════════
    const translatedPcm = await convertMp3ToPcm16(mp3Buffer);
    console.log(`[UDP-${sourceExtension}→${targetExtension}] Converted to ${translatedPcm.length} bytes PCM`);

    // Apply buffer delay using AudioBufferManager
    if (bufferDelayMs > 0) {
      console.log(`[Buffer] Buffering ${translatedPcm.length} bytes for ${bufferDelayMs}ms before sending to ${targetExtension}`);

      audioBufferManager.bufferAndSend(
        targetExtension,
        translatedPcm,
        bufferDelayMs,
        async (ext, delayedAudio) => {
          await sendUdpPcmAudio(ext, delayedAudio);
          console.log(`[Buffer] ✓ Sent buffered audio to ${ext} after ${bufferDelayMs}ms delay`);
        }
      );
    } else {
      // Send immediately if no buffer needed
      await sendUdpPcmAudio(targetExtension, translatedPcm);
    }

    udpPcmStats.translationSuccesses++;
    console.log(`[UDP-${sourceExtension}→${targetExtension}] ✓ Translation complete (buffered: ${bufferDelayMs}ms)`);

  } catch (error) {
    console.error(`[UDP-${sourceExtension}] Translation error:`, error.message);
    udpPcmStats.translationErrors++;
  }
}

// Send Function - Fixed for 5ms frame timing (UNCHANGED)
async function sendUdpPcmAudio(targetExtension, pcmBuffer) {
  const socket = targetExtension === '3333' ? socket3333Out : socket4444Out;
  const port = targetExtension === '3333' ? UDP_PCM_CONFIG.port3333Out : UDP_PCM_CONFIG.port4444Out;

  const frameSize = UDP_PCM_CONFIG.frameSizeBytes;
  const totalFrames = Math.floor(pcmBuffer.length / frameSize);

  console.log(`[UDP-${targetExtension}] Sending ${pcmBuffer.length} bytes (${totalFrames} frames)`);

  for (let i = 0; i < totalFrames; i++) {
    const frame = pcmBuffer.slice(i * frameSize, (i + 1) * frameSize);

    await new Promise((resolve, reject) => {
      socket.send(frame, port, UDP_PCM_CONFIG.gatewayHost, (err) => {
        if (err) {
          reject(err);
        } else {
          if (targetExtension === '3333') {
            udpPcmStats.to3333Packets++;
          } else {
            udpPcmStats.to4444Packets++;
          }
          resolve();
        }
      });
    });

    // Use correct frame timing: 5ms per frame (160 bytes = 5ms at 16kHz)
    await new Promise(resolve => setTimeout(resolve, UDP_PCM_CONFIG.frameSizeMs));
  }

  console.log(`[UDP-${targetExtension}] ✓ Sent ${totalFrames} frames`);
}
