/**
 * UDP Gateway Input Module for VTT-TTV-SERVER
 * Receives PCM audio from gateways and routes to AI pipeline
 * 
 * Port Configuration:
 * - FROM gateway-5555: UDP 6100 (English audio IN)
 * - TO gateway-5555: UDP 6101 (Translated English OUT)
 * - FROM gateway-6666: UDP 6102 (French audio IN)
 * - TO gateway-6666: UDP 6103 (Translated French OUT)
 */

const dgram = require('dgram');

class UDPGatewayInput {
  constructor(options = {}) {
    this.config = {
      port5555In: options.port5555In || 6100,
      port5555Out: options.port5555Out || 6101,
      port6666In: options.port6666In || 6102,
      port6666Out: options.port6666Out || 6103,
      gatewayHost: options.gatewayHost || '127.0.0.1',
      sampleRate: 16000,
      frameSizeBytes: 640  // 20ms at 16kHz
    };

    // Audio handlers (set by server)
    this.onAudioFrom5555 = null;
    this.onAudioFrom6666 = null;

    // Buffers for accumulating frames (gateway sends 160 bytes, Deepgram needs 640)
    this.buffer5555 = Buffer.alloc(0);
    this.buffer6666 = Buffer.alloc(0);

    // Statistics
    this.stats = {
      from5555Packets: 0,
      to5555Packets: 0,
      from6666Packets: 0,
      to6666Packets: 0,
      frames5555Sent: 0,
      frames6666Sent: 0
    };

    // Create UDP sockets
    this.socket5555In = dgram.createSocket('udp4');
    this.socket5555Out = dgram.createSocket('udp4');
    this.socket6666In = dgram.createSocket('udp4');
    this.socket6666Out = dgram.createSocket('udp4');

    this._setupListeners();
  }

  _setupListeners() {
    // Receive from gateway-5555 (English speaker)
    this.socket5555In.on('message', (msg, rinfo) => {
      this.stats.from5555Packets++;
      
      if (this.stats.from5555Packets <= 3) {
        console.log(`[UDP-Gateway] Received from 5555: ${msg.length} bytes (packet #${this.stats.from5555Packets})`);
      }

      // Buffer the audio
      this.buffer5555 = Buffer.concat([this.buffer5555, msg]);
      
      // Send 640-byte frames to handler
      while (this.buffer5555.length >= this.config.frameSizeBytes) {
        const frame = this.buffer5555.slice(0, this.config.frameSizeBytes);
        this.buffer5555 = this.buffer5555.slice(this.config.frameSizeBytes);
        
        if (this.onAudioFrom5555) {
          this.stats.frames5555Sent++;
          if (this.stats.frames5555Sent <= 3) {
            console.log(`[UDP-Gateway] Sending 640-byte frame #${this.stats.frames5555Sent} to ASR for 5555`);
          }
          this.onAudioFrom5555(frame, '5555');
        }
      }
    });

    this.socket5555In.on('listening', () => {
      console.log(`[UDP-Gateway] ✓ Listening for gateway-5555 on port ${this.config.port5555In}`);
    });

    this.socket5555In.on('error', (err) => {
      console.error(`[UDP-Gateway] ERROR socket5555In: ${err.message}`);
    });

    // Receive from gateway-6666 (French speaker)
    this.socket6666In.on('message', (msg, rinfo) => {
      this.stats.from6666Packets++;
      
      if (this.stats.from6666Packets <= 3) {
        console.log(`[UDP-Gateway] Received from 6666: ${msg.length} bytes (packet #${this.stats.from6666Packets})`);
      }

      // Buffer the audio
      this.buffer6666 = Buffer.concat([this.buffer6666, msg]);
      
      // Send 640-byte frames to handler
      while (this.buffer6666.length >= this.config.frameSizeBytes) {
        const frame = this.buffer6666.slice(0, this.config.frameSizeBytes);
        this.buffer6666 = this.buffer6666.slice(this.config.frameSizeBytes);
        
        if (this.onAudioFrom6666) {
          this.stats.frames6666Sent++;
          if (this.stats.frames6666Sent <= 3) {
            console.log(`[UDP-Gateway] Sending 640-byte frame #${this.stats.frames6666Sent} to ASR for 6666`);
          }
          this.onAudioFrom6666(frame, '6666');
        }
      }
    });

    this.socket6666In.on('listening', () => {
      console.log(`[UDP-Gateway] ✓ Listening for gateway-6666 on port ${this.config.port6666In}`);
    });

    this.socket6666In.on('error', (err) => {
      console.error(`[UDP-Gateway] ERROR socket6666In: ${err.message}`);
    });
  }

  start() {
    console.log('[UDP-Gateway] Starting UDP gateway input...');
    this.socket5555In.bind(this.config.port5555In);
    this.socket6666In.bind(this.config.port6666In);
    console.log('[UDP-Gateway] ✓ UDP gateway input started');
  }

  // Send translated audio TO gateway-5555 (for 5555 to hear)
  sendTo5555(audioBuffer) {
    this.socket5555Out.send(audioBuffer, this.config.port5555Out, this.config.gatewayHost, (err) => {
      if (err) {
        console.error(`[UDP-Gateway] ERROR sending to 5555: ${err.message}`);
      } else {
        this.stats.to5555Packets++;
      }
    });
  }

  // Send translated audio TO gateway-6666 (for 6666 to hear)
  sendTo6666(audioBuffer) {
    this.socket6666Out.send(audioBuffer, this.config.port6666Out, this.config.gatewayHost, (err) => {
      if (err) {
        console.error(`[UDP-Gateway] ERROR sending to 6666: ${err.message}`);
      } else {
        this.stats.to6666Packets++;
      }
    });
  }

  getStats() {
    return this.stats;
  }

  close() {
    this.socket5555In.close();
    this.socket5555Out.close();
    this.socket6666In.close();
    this.socket6666Out.close();
    console.log('[UDP-Gateway] Sockets closed');
  }
}

module.exports = UDPGatewayInput;
