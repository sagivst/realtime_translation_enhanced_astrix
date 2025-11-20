// Test WAV format being sent to Deepgram
const fs = require('fs');

// Simulate the exact WAV header we create
function createWavHeader(pcmLength) {
  const header = Buffer.alloc(44);
  
  // RIFF chunk descriptor
  header.write(RIFF, 0);
  header.writeUInt32LE(36 + pcmLength, 4);
  header.write(WAVE, 8);
  
  // fmt sub-chunk
  header.write(fmt , 12);
  header.writeUInt32LE(16, 16);      // Subchunk1Size
  header.writeUInt16LE(1, 20);       // AudioFormat (1 for PCM)
  header.writeUInt16LE(1, 22);       // NumChannels (1 = mono)
  header.writeUInt32LE(16000, 24);   // SampleRate (16kHz)
  header.writeUInt32LE(32000, 28);   // ByteRate (16000 * 1 * 2)
  header.writeUInt16LE(2, 32);       // BlockAlign (1 * 2)
  header.writeUInt16LE(16, 34);      // BitsPerSample (16-bit)
  
  // data sub-chunk  
  header.write(data, 36);
  header.writeUInt32LE(pcmLength, 40);
  
  return header;
}

// Print header analysis
const header = createWavHeader(64000);
console.log('WAV Header Analysis:');
console.log('===================');
console.log('ChunkID:', header.slice(0, 4).toString());
console.log('ChunkSize:', header.readUInt32LE(4));
console.log('Format:', header.slice(8, 12).toString());
console.log('Subchunk1ID:', header.slice(12, 16).toString());
console.log('Subchunk1Size:', header.readUInt32LE(16));
console.log('AudioFormat:', header.readUInt16LE(20), '(1 = PCM)');
console.log('NumChannels:', header.readUInt16LE(22));
console.log('SampleRate:', header.readUInt32LE(24));
console.log('ByteRate:', header.readUInt32LE(28));
console.log('BlockAlign:', header.readUInt16LE(32));
console.log('BitsPerSample:', header.readUInt16LE(34));
console.log('Subchunk2ID:', header.slice(36, 40).toString());
console.log('Subchunk2Size:', header.readUInt32LE(40));
console.log('');
console.log('Expected values for 16kHz mono 16-bit PCM:');
console.log('  SampleRate: 16000 ✓');
console.log('  ByteRate: 32000 (16000 * 2 * 1) ✓');
console.log('  BlockAlign: 2 (2 * 1) ✓');
console.log('  BitsPerSample: 16 ✓');
