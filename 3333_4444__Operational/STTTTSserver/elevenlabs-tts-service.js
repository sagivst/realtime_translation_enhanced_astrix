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

    /**
     * Synthesize with emotion control (Hume EVI integration)
     *
     * Maps emotion and prosody vectors to ElevenLabs voice settings:
     * - Emotion arousal → stability (high arousal = less stable/more dynamic)
     * - Emotion valence + prosody rate → style (positive = higher style value)
     * - Prosody energy → similarity_boost adjustment
     */
    async synthesizeWithEmotion(text, voiceId, emotionVector, options = {}) {
        const {
            modelId = 'eleven_multilingual_v2',
            baseLine = {
                stability: 0.5,
                similarityBoost: 0.75,
                style: 0
            }
        } = options;

        // Extract emotion and prosody
        const emotion = emotionVector.emotion || {};
        const prosody = emotionVector.prosody || {};

        // Map emotion to voice settings
        const voiceSettings = this.emotionToVoiceSettings(emotion, prosody, baseLine);

        try {
            const response = await axios.post(
                `${this.baseURL}/text-to-speech/${voiceId}`,
                {
                    text: text,
                    model_id: modelId,
                    voice_settings: voiceSettings
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

            this.emit('synthesized', {
                text,
                voiceId,
                emotion: emotion.primary || 'neutral',
                voiceSettings
            });

            return {
                audio: Buffer.from(response.data),
                format: 'mp3',
                voiceId: voiceId,
                emotion: emotion.primary || 'neutral',
                voiceSettings
            };

        } catch (error) {
            const detailedMessage = error.response?.data?.detail?.message ||
                                    JSON.stringify(error.response?.data) ||
                                    error.message;
            console.error('Error synthesizing with emotion:', detailedMessage);
            const enhancedError = new Error(detailedMessage);
            enhancedError.response = error.response;
            throw enhancedError;
        }
    }

    /**
     * Map emotion and prosody to ElevenLabs voice settings
     *
     * @param {Object} emotion - Hume EVI emotion data
     * @param {Object} prosody - Hume EVI prosody data
     * @param {Object} baseLine - Baseline voice settings
     * @returns {Object} Voice settings for ElevenLabs API
     */
    emotionToVoiceSettings(emotion, prosody, baseLine) {
        // Default values
        const arousal = emotion.arousal || 0.5;     // 0 (calm) to 1 (excited)
        const valence = emotion.valence || 0;       // -1 (negative) to 1 (positive)
        const energy = prosody.energy || 0.5;       // 0 (quiet) to 1 (loud)
        const rate = prosody.rate || 1.0;           // Speaking rate multiplier

        // STABILITY: Lower stability = more expression/variation
        // High arousal (excited) → lower stability (more dynamic)
        // Arousal 0.5 (neutral) → stability 0.5
        // Arousal 1.0 (very excited) → stability 0.2
        // Arousal 0.0 (very calm) → stability 0.8
        const stability = baseLine.stability + (0.5 - arousal) * 0.6;
        const clampedStability = Math.max(0.2, Math.min(0.9, stability));

        // SIMILARITY BOOST: Adjust based on energy level
        // Higher energy → slightly higher similarity (stay closer to voice)
        const similarityBoost = baseLine.similarityBoost + (energy - 0.5) * 0.15;
        const clampedSimilarity = Math.max(0.65, Math.min(0.95, similarityBoost));

        // STYLE: Controlled by valence and rate
        // Positive valence + faster rate → higher style value (more expressive)
        // Negative valence + slower rate → lower style value (more subdued)
        const styleAdjust = ((valence + 1) / 2) * 0.3 + (rate - 1.0) * 0.2;
        const style = baseLine.style + styleAdjust;
        const clampedStyle = Math.max(0, Math.min(1, style));

        return {
            stability: clampedStability,
            similarity_boost: clampedSimilarity,
            style: clampedStyle,
            use_speaker_boost: true
        };
    }

    /**
     * Get emotion-adjusted settings preview (for debugging)
     */
    previewEmotionSettings(emotionVector, baseLine = {}) {
        const emotion = emotionVector.emotion || {};
        const prosody = emotionVector.prosody || {};

        const settings = this.emotionToVoiceSettings(
            emotion,
            prosody,
            {
                stability: baseLine.stability || 0.5,
                similarityBoost: baseLine.similarityBoost || 0.75,
                style: baseLine.style || 0
            }
        );

        return {
            emotion: {
                primary: emotion.primary || 'neutral',
                arousal: emotion.arousal || 0.5,
                valence: emotion.valence || 0,
                energy: prosody.energy || 0.5,
                rate: prosody.rate || 1.0
            },
            voiceSettings: settings,
            description: this.describeVoiceSettings(settings, emotion.primary || 'neutral')
        };
    }

    /**
     * Describe voice settings in human-readable format
     */
    describeVoiceSettings(settings, emotionName) {
        const descriptions = [];

        if (settings.stability < 0.4) {
            descriptions.push('highly expressive and dynamic');
        } else if (settings.stability > 0.7) {
            descriptions.push('calm and consistent');
        } else {
            descriptions.push('moderately expressive');
        }

        if (settings.style > 0.5) {
            descriptions.push('enthusiastic tone');
        } else if (settings.style < -0.2) {
            descriptions.push('subdued tone');
        }

        return `${emotionName} - ${descriptions.join(', ')}`;
    }
}

module.exports = ElevenLabsTTSService;
