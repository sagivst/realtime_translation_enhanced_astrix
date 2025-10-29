/**
 * Default Language Calibration Profiles
 * Provides baseline characteristics for each supported language
 * Used when users skip voice calibration
 */

const DEFAULT_PROFILES = {
    en: {
        language: 'en',
        languageName: 'English',
        tone: 'neutral',
        avgSentenceLength: 15,  // Average words per sentence
        directness: 75,  // Direct communication style (0-100%)
        ambiguityTolerance: 40,  // Tolerance for ambiguous phrases

        // Voice characteristics (generic defaults)
        voiceCharacteristics: {
            avgRMS: 0.05,  // Average speaking volume
            peakRMS: 0.15,  // Loudest volume
            quietRMS: 0.02,  // Quietest volume
            dynamicRange: 0.13,  // peakRMS - quietRMS
            optimalThreshold: 0.03,  // 60% of avgRMS
            speakingRate: 140,  // Words per minute (average English)
            pauseFrequency: 12  // Average pauses per minute
        },

        // Common filler words and speech patterns
        commonFillers: ['um', 'uh', 'like', 'you know', 'I mean'],

        // Domain-specific terms (business/technical)
        biasTerms: ['meeting', 'presentation', 'project', 'deadline', 'schedule']
    },

    es: {
        language: 'es',
        languageName: 'Spanish',
        tone: 'neutral',
        avgSentenceLength: 18,  // Spanish tends to have longer sentences
        directness: 60,  // Less direct than English
        ambiguityTolerance: 55,

        voiceCharacteristics: {
            avgRMS: 0.055,  // Slightly louder on average
            peakRMS: 0.16,
            quietRMS: 0.025,
            dynamicRange: 0.135,
            optimalThreshold: 0.033,
            speakingRate: 160,  // Spanish speakers tend to speak faster
            pauseFrequency: 10
        },

        commonFillers: ['pues', 'entonces', 'bueno', 'este', 'o sea'],
        biasTerms: ['reunión', 'presentación', 'proyecto', 'plazo', 'horario']
    },

    fr: {
        language: 'fr',
        languageName: 'French',
        tone: 'formal',
        avgSentenceLength: 20,  // French often uses longer, more complex sentences
        directness: 55,
        ambiguityTolerance: 60,

        voiceCharacteristics: {
            avgRMS: 0.048,
            peakRMS: 0.14,
            quietRMS: 0.022,
            dynamicRange: 0.118,
            optimalThreshold: 0.029,
            speakingRate: 145,
            pauseFrequency: 11
        },

        commonFillers: ['euh', 'ben', 'alors', 'donc', 'en fait'],
        biasTerms: ['réunion', 'présentation', 'projet', 'délai', 'emploi du temps']
    },

    de: {
        language: 'de',
        languageName: 'German',
        tone: 'formal',
        avgSentenceLength: 16,
        directness: 80,  // German tends to be more direct
        ambiguityTolerance: 35,

        voiceCharacteristics: {
            avgRMS: 0.052,
            peakRMS: 0.15,
            quietRMS: 0.023,
            dynamicRange: 0.127,
            optimalThreshold: 0.031,
            speakingRate: 120,  // German speakers tend to speak slower due to compound words
            pauseFrequency: 13
        },

        commonFillers: ['äh', 'also', 'ja', 'na ja', 'irgendwie'],
        biasTerms: ['Besprechung', 'Präsentation', 'Projekt', 'Frist', 'Zeitplan']
    },

    it: {
        language: 'it',
        languageName: 'Italian',
        tone: 'neutral',
        avgSentenceLength: 17,
        directness: 65,
        ambiguityTolerance: 50,

        voiceCharacteristics: {
            avgRMS: 0.056,  // Italian speakers often more expressive
            peakRMS: 0.17,
            quietRMS: 0.024,
            dynamicRange: 0.146,
            optimalThreshold: 0.034,
            speakingRate: 155,
            pauseFrequency: 11
        },

        commonFillers: ['ehm', 'allora', 'cioè', 'insomma', 'diciamo'],
        biasTerms: ['riunione', 'presentazione', 'progetto', 'scadenza', 'programma']
    },

    pt: {
        language: 'pt',
        languageName: 'Portuguese',
        tone: 'neutral',
        avgSentenceLength: 18,
        directness: 58,
        ambiguityTolerance: 52,

        voiceCharacteristics: {
            avgRMS: 0.053,
            peakRMS: 0.16,
            quietRMS: 0.024,
            dynamicRange: 0.136,
            optimalThreshold: 0.032,
            speakingRate: 150,
            pauseFrequency: 10
        },

        commonFillers: ['né', 'então', 'tipo', 'sabe', 'assim'],
        biasTerms: ['reunião', 'apresentação', 'projeto', 'prazo', 'cronograma']
    },

    ja: {
        language: 'ja',
        languageName: 'Japanese',
        tone: 'formal',
        avgSentenceLength: 12,  // Shorter sentences, but contextually rich
        directness: 40,  // Very indirect culture
        ambiguityTolerance: 70,  // High tolerance for ambiguity

        voiceCharacteristics: {
            avgRMS: 0.045,  // Generally softer speaking
            peakRMS: 0.12,
            quietRMS: 0.02,
            dynamicRange: 0.10,
            optimalThreshold: 0.027,
            speakingRate: 190,  // Fast speaking rate (mora-based)
            pauseFrequency: 15  // More frequent short pauses
        },

        commonFillers: ['あの', 'えーと', 'まあ', 'ちょっと', 'なんか'],
        biasTerms: ['会議', 'プレゼンテーション', 'プロジェクト', '締め切り', 'スケジュール']
    },

    ko: {
        language: 'ko',
        languageName: 'Korean',
        tone: 'formal',
        avgSentenceLength: 13,
        directness: 45,  // Indirect, hierarchical culture
        ambiguityTolerance: 65,

        voiceCharacteristics: {
            avgRMS: 0.048,
            peakRMS: 0.13,
            quietRMS: 0.021,
            dynamicRange: 0.109,
            optimalThreshold: 0.029,
            speakingRate: 170,
            pauseFrequency: 14
        },

        commonFillers: ['어', '음', '그', '뭐', '좀'],
        biasTerms: ['회의', '발표', '프로젝트', '마감', '일정']
    },

    zh: {
        language: 'zh',
        languageName: 'Chinese',
        tone: 'neutral',
        avgSentenceLength: 14,
        directness: 50,
        ambiguityTolerance: 60,

        voiceCharacteristics: {
            avgRMS: 0.049,
            peakRMS: 0.14,
            quietRMS: 0.022,
            dynamicRange: 0.118,
            optimalThreshold: 0.029,
            speakingRate: 165,  // Character-based speaking rate
            pauseFrequency: 12
        },

        commonFillers: ['嗯', '那个', '就是', '这个', '然后'],
        biasTerms: ['会议', '演示', '项目', '截止日期', '日程']
    },

    ru: {
        language: 'ru',
        languageName: 'Russian',
        tone: 'neutral',
        avgSentenceLength: 16,
        directness: 70,  // Direct communication style
        ambiguityTolerance: 45,

        voiceCharacteristics: {
            avgRMS: 0.051,
            peakRMS: 0.15,
            quietRMS: 0.023,
            dynamicRange: 0.127,
            optimalThreshold: 0.031,
            speakingRate: 135,
            pauseFrequency: 12
        },

        commonFillers: ['э', 'ну', 'значит', 'типа', 'как бы'],
        biasTerms: ['встреча', 'презентация', 'проект', 'срок', 'расписание']
    }
};

/**
 * Get default profile for a language
 * @param {string} language - Language code (e.g., 'en', 'es')
 * @returns {object} Default profile characteristics
 */
function getDefaultProfile(language) {
    const profile = DEFAULT_PROFILES[language];

    if (!profile) {
        console.warn(`No default profile found for language: ${language}, using English defaults`);
        return DEFAULT_PROFILES['en'];
    }

    // Return a deep copy to prevent mutations
    return JSON.parse(JSON.stringify(profile));
}

/**
 * Apply default profile to a UserProfile instance
 * @param {UserProfile} userProfile - User profile instance
 * @param {string} language - Language code
 */
function applyDefaultProfile(userProfile, language) {
    const defaults = getDefaultProfile(language);

    // Apply linguistic characteristics
    userProfile.tone = defaults.tone;
    userProfile.avgSentenceLength = defaults.avgSentenceLength;
    userProfile.directness = defaults.directness;
    userProfile.ambiguityTolerance = defaults.ambiguityTolerance;

    // Apply voice characteristics
    if (!userProfile.voiceCharacteristics) {
        userProfile.voiceCharacteristics = {};
    }
    Object.assign(userProfile.voiceCharacteristics, defaults.voiceCharacteristics);

    // Apply bias terms (common vocabulary)
    userProfile.biasTerms = [...defaults.biasTerms];

    // Mark as default profile
    userProfile.isDefaultProfile = true;
    userProfile.defaultsApplied = new Date().toISOString();

    console.log(`✓ Applied default ${defaults.languageName} profile to user ${userProfile.userId}`);

    return userProfile;
}

/**
 * Get list of all supported languages with their names
 * @returns {Array} Array of {code, name} objects
 */
function getSupportedLanguages() {
    return Object.keys(DEFAULT_PROFILES).map(code => ({
        code,
        name: DEFAULT_PROFILES[code].languageName
    }));
}

module.exports = {
    DEFAULT_PROFILES,
    getDefaultProfile,
    applyDefaultProfile,
    getSupportedLanguages
};
