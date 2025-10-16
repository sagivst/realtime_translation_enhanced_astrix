#!/usr/bin/env node
/**
 * Test ElevenLabs voice synthesis
 */

const ElevenLabsTTSService = require('./elevenlabs-tts-service');
const fs = require('fs');
require('dotenv').config();

async function testSynthesis() {
    console.log('Testing ElevenLabs TTS...\n');

    const apiKey = process.env.ELEVENLABS_API_KEY;
    if (!apiKey) {
        console.error('Error: ELEVENLABS_API_KEY not found in .env');
        process.exit(1);
    }

    const elevenlabs = new ElevenLabsTTSService(apiKey);

    // Load voice configuration
    const config = JSON.parse(fs.readFileSync('config/elevenlabs-voices.json', 'utf8'));

    // Test each voice
    const testTexts = [
        {
            text: "Hello, this is a test of the ElevenLabs voice synthesis system.",
            language: "English"
        },
        {
            text: "שלום, זה מבחן של מערכת סינתזת הקול של ElevenLabs.",
            language: "Hebrew"
        }
    ];

    for (const [userId, voiceConfig] of Object.entries(config.voices)) {
        console.log(`\nTesting voice: ${voiceConfig.name}`);
        console.log('─'.repeat(60));

        for (let i = 0; i < testTexts.length; i++) {
            const test = testTexts[i];
            console.log(`  Test ${i + 1} (${test.language}): "${test.text.substring(0, 50)}..."`);

            try {
                const startTime = Date.now();

                const result = await elevenlabs.synthesize(
                    test.text,
                    voiceConfig.voiceId,
                    voiceConfig.settings
                );

                const latency = Date.now() - startTime;

                // Save to file
                const outputFile = `output/test_${userId}_${test.language}.mp3`;
                if (!fs.existsSync('output')) {
                    fs.mkdirSync('output');
                }
                fs.writeFileSync(outputFile, result.audio);

                console.log(`    ✓ Synthesized in ${latency}ms`);
                console.log(`    Audio size: ${(result.audio.length / 1024).toFixed(1)} KB`);
                console.log(`    Saved to: ${outputFile}`);

            } catch (error) {
                console.log(`    ✗ Error: ${error.message}`);
            }
        }
    }

    // Show usage
    console.log('\n' + '='.repeat(60));
    const usage = await elevenlabs.getUsage();
    console.log('Current Usage:');
    console.log(`  Characters: ${usage.characterCount.toLocaleString()} / ${usage.characterLimit.toLocaleString()}`);
    console.log(`  Remaining: ${(usage.characterLimit - usage.characterCount).toLocaleString()}`);
    console.log('='.repeat(60));

    console.log('\n✓ Test complete! Check output/ folder for audio files.');
    console.log('\nTo play audio (macOS): afplay output/test_*.mp3');
}

testSynthesis().catch(error => {
    console.error('Test failed:', error.message);
    process.exit(1);
});
