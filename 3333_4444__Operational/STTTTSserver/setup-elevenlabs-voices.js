#!/usr/bin/env node
/**
 * Upload and clone voices to ElevenLabs
 * Run this once to create all 4 custom voices
 */

const ElevenLabsTTSService = require('./elevenlabs-tts-service');
const fs = require('fs');
const path = require('path');
require('dotenv').config();

async function setupVoices() {
    console.log('========================================');
    console.log('ElevenLabs Voice Cloning Setup');
    console.log('========================================\n');

    // Check API key
    const apiKey = process.env.ELEVENLABS_API_KEY;
    if (!apiKey) {
        console.error('✗ Error: ELEVENLABS_API_KEY not found in .env');
        console.log('\nPlease add to .env file:');
        console.log('ELEVENLABS_API_KEY=your_api_key_here');
        process.exit(1);
    }

    const elevenlabs = new ElevenLabsTTSService(apiKey);

    // Validate API key
    try {
        // Try to get usage info (may fail if API key lacks user_read permission)
        try {
            const usage = await elevenlabs.getUsage();
            console.log('✓ API Key validated');
            console.log(`  Plan: ${usage.tier}`);
            console.log(`  Usage: ${usage.characterCount.toLocaleString()} / ${usage.characterLimit.toLocaleString()} characters\n`);
        } catch (error) {
            // If usage check fails due to permissions, try listing voices instead
            if (error.message.includes('missing the permission') || error.message.includes('missing_permissions')) {
                const voices = await elevenlabs.getVoices();
                console.log('✓ API Key validated (limited permissions)');
                console.log(`  Note: API key works but lacks usage tracking permission`);
                console.log(`  Found ${voices.length} existing voices\n`);
            } else {
                throw error;
            }
        }
    } catch (error) {
        console.error('✗ Invalid API key or connection error');
        console.error('  Error:', error.message);
        process.exit(1);
    }

    // Define users and their audio samples
    const users = [
        {
            id: 'Boyan_Tiholov',
            name: 'Boyan Tiholov',
            description: 'Custom voice for Boyan Tiholov from sales call recordings',
            audioDir: 'voice-cloning-pipeline/data/processed/Boyan_Tiholov'
        },
        {
            id: 'Denitsa_Dencheva',
            name: 'Denitsa Dencheva',
            description: 'Custom voice for Denitsa Dencheva from sales call recordings',
            audioDir: 'voice-cloning-pipeline/data/processed/Denitsa_Dencheva'
        },
        {
            id: 'Miroslav_Dimitrov',
            name: 'Miroslav Dimitrov',
            description: 'Custom voice for Miroslav Dimitrov from sales call recordings',
            audioDir: 'voice-cloning-pipeline/data/processed/Miroslav_Dimitrov'
        },
        {
            id: 'Velislava_Chavdarova',
            name: 'Velislava Chavdarova',
            description: 'Custom voice for Velislava Chavdarova from sales call recordings',
            audioDir: 'voice-cloning-pipeline/data/processed/Velislava_Chavdarova'
        }
    ];

    const voiceIds = {};

    // Clone each voice
    for (const user of users) {
        console.log(`\nProcessing: ${user.name}`);
        console.log('─'.repeat(60));

        // Get audio files (ElevenLabs recommends 1-5 minutes, we'll use 3-5 files)
        // Filter by size: ElevenLabs has 11MB limit per file
        const audioFiles = fs.readdirSync(user.audioDir)
            .filter(f => f.endsWith('.wav'))
            .map(f => path.join(user.audioDir, f))
            .filter(f => {
                const stats = fs.statSync(f);
                const sizeMB = stats.size / (1024 * 1024);
                return sizeMB < 10.5; // Use 10.5MB to be safe (under 11MB limit)
            })
            .slice(0, 5); // Use first 5 files that fit

        if (audioFiles.length === 0) {
            console.log(`✗ No audio files found in ${user.audioDir}`);
            continue;
        }

        console.log(`  Found ${audioFiles.length} audio files`);
        console.log(`  Uploading and cloning voice...`);

        try {
            const voiceId = await elevenlabs.cloneVoice(
                user.name,
                user.description,
                audioFiles
            );

            voiceIds[user.id] = voiceId;
            console.log(`  ✓ Voice cloned successfully!`);
            console.log(`  Voice ID: ${voiceId}`);

        } catch (error) {
            console.log(`  ✗ Failed to clone voice: ${error.message}`);
        }
    }

    // Update configuration file
    console.log('\n========================================');
    console.log('Updating Configuration');
    console.log('========================================\n');

    const configFile = 'config/elevenlabs-voices.json';
    const config = {
        voices: {}
    };

    for (const [userId, voiceId] of Object.entries(voiceIds)) {
        const user = users.find(u => u.id === userId);
        config.voices[userId] = {
            voiceId: voiceId,
            name: user.name,
            modelId: 'eleven_multilingual_v2',
            settings: {
                stability: 0.5,
                similarityBoost: 0.75,
                style: 0,
                useSpeakerBoost: true
            }
        };
    }

    // Ensure config directory exists
    if (!fs.existsSync('config')) {
        fs.mkdirSync('config');
    }

    fs.writeFileSync(configFile, JSON.stringify(config, null, 2));
    console.log(`✓ Configuration saved to: ${configFile}\n`);

    // Summary
    console.log('========================================');
    console.log('Setup Complete!');
    console.log('========================================\n');

    console.log('Voice IDs:');
    for (const [userId, voiceId] of Object.entries(voiceIds)) {
        console.log(`  ${userId}: ${voiceId}`);
    }

    console.log('\nNext steps:');
    console.log('1. Test synthesis: node test-elevenlabs.js');
    console.log('2. Update conference server to use ElevenLabs');
    console.log('3. Restart your application\n');
}

// Run setup
setupVoices().catch(error => {
    console.error('\n✗ Setup failed:', error.message);
    process.exit(1);
});
