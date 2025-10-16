/**
 * ElevenLabs TTS Service
 * High-quality voice cloning and synthesis
 */

const axios = require('axios');
const EventEmitter = require('events');

class ElevenLabsTTSService extends EventEmitter {
    constructor(apiKey) {
        super();
        this.apiKey = apiKey;
        this.baseURL = 'https://api.elevenlabs.io/v1';
        this.voiceCache = new Map();
    }

    /**
     * Get all available voices
     */
    async getVoices() {
        try {
            const response = await axios.get(`${this.baseURL}/voices`, {
                headers: {
                    'xi-api-key': this.apiKey
                }
            });

            return response.data.voices;
        } catch (error) {
            console.error('Error fetching voices:', error.message);
            throw error;
        }
    }

    /**
     * Clone a voice from audio samples
     */
    async cloneVoice(name, description, audioFiles) {
        try {
            const FormData = require('form-data');
            const fs = require('fs');
            const form = new FormData();

            form.append('name', name);
            form.append('description', description);

            // Add audio files
            for (const audioFile of audioFiles) {
                form.append('files', fs.createReadStream(audioFile));
            }

            const response = await axios.post(
                `${this.baseURL}/voices/add`,
                form,
                {
                    headers: {
                        'xi-api-key': this.apiKey,
                        ...form.getHeaders()
                    }
                }
            );

            console.log(`✓ Voice cloned: ${name} (ID: ${response.data.voice_id})`);
            return response.data.voice_id;

        } catch (error) {
            // Include detailed error message from API response
            const detailedMessage = error.response?.data?.detail?.message ||
                                    JSON.stringify(error.response?.data) ||
                                    error.message;
            console.error('Error cloning voice:', detailedMessage);
            const enhancedError = new Error(detailedMessage);
            enhancedError.response = error.response;
            throw enhancedError;
        }
    }

    /**
     * Synthesize text to speech
     */
    async synthesize(text, voiceId, options = {}) {
        const {
            modelId = 'eleven_multilingual_v2', // Supports 29 languages
            stability = 0.5,
            similarityBoost = 0.75,
            style = 0,
            useSpeakerBoost = true
        } = options;

        try {
            const response = await axios.post(
                `${this.baseURL}/text-to-speech/${voiceId}`,
                {
                    text: text,
                    model_id: modelId,
                    voice_settings: {
                        stability: stability,
                        similarity_boost: similarityBoost,
                        style: style,
                        use_speaker_boost: useSpeakerBoost
                    }
                },
                {
                    headers: {
                        'xi-api-key': this.apiKey,
                        'Content-Type': 'application/json',
                        'Accept': 'audio/mpeg'
                    },
                    responseType: 'arraybuffer'
                }
            );

            return {
                audio: Buffer.from(response.data),
                format: 'mp3',
                voiceId: voiceId
            };

        } catch (error) {
            // Include detailed error message from API response
            const detailedMessage = error.response?.data?.detail?.message ||
                                    JSON.stringify(error.response?.data) ||
                                    error.message;
            console.error('Error synthesizing speech:', detailedMessage);
            const enhancedError = new Error(detailedMessage);
            enhancedError.response = error.response;
            throw enhancedError;
        }
    }

    /**
     * Synthesize with streaming (for lower latency)
     */
    async synthesizeStreaming(text, voiceId, options = {}) {
        const {
            modelId = 'eleven_multilingual_v2',
            stability = 0.5,
            similarityBoost = 0.75,
            optimizeStreamingLatency = 3 // 0-4, higher = faster
        } = options;

        try {
            const response = await axios.post(
                `${this.baseURL}/text-to-speech/${voiceId}/stream`,
                {
                    text: text,
                    model_id: modelId,
                    voice_settings: {
                        stability: stability,
                        similarity_boost: similarityBoost
                    },
                    optimize_streaming_latency: optimizeStreamingLatency
                },
                {
                    headers: {
                        'xi-api-key': this.apiKey,
                        'Content-Type': 'application/json',
                        'Accept': 'audio/mpeg'
                    },
                    responseType: 'stream'
                }
            );

            return response.data; // Stream

        } catch (error) {
            console.error('Error in streaming synthesis:', error.message);
            throw error;
        }
    }

    /**
     * Get voice details
     */
    async getVoice(voiceId) {
        try {
            const response = await axios.get(
                `${this.baseURL}/voices/${voiceId}`,
                {
                    headers: {
                        'xi-api-key': this.apiKey
                    }
                }
            );

            return response.data;
        } catch (error) {
            console.error('Error fetching voice:', error.message);
            throw error;
        }
    }

    /**
     * Delete a voice
     */
    async deleteVoice(voiceId) {
        try {
            await axios.delete(
                `${this.baseURL}/voices/${voiceId}`,
                {
                    headers: {
                        'xi-api-key': this.apiKey
                    }
                }
            );

            console.log(`✓ Voice deleted: ${voiceId}`);
        } catch (error) {
            console.error('Error deleting voice:', error.message);
            throw error;
        }
    }

    /**
     * Get usage/quota information
     */
    async getUsage() {
        try {
            const response = await axios.get(
                `${this.baseURL}/user/subscription`,
                {
                    headers: {
                        'xi-api-key': this.apiKey
                    }
                }
            );

            return {
                characterCount: response.data.character_count,
                characterLimit: response.data.character_limit,
                canExtendCharacterLimit: response.data.can_extend_character_limit,
                tier: response.data.tier
            };
        } catch (error) {
            // Include detailed error message from API response
            const detailedMessage = error.response?.data?.detail?.message || error.message;
            console.error('Error fetching usage:', detailedMessage);
            const enhancedError = new Error(detailedMessage);
            enhancedError.response = error.response;
            throw enhancedError;
        }
    }
}

module.exports = ElevenLabsTTSService;
