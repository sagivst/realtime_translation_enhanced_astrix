/**
 * HMLCP Default Profiles
 * Provides default linguistic patterns for each language
 */

const defaultProfiles = {
  en: {
    patterns: [],
    vocabulary: []
  },
  es: {
    patterns: [],
    vocabulary: []
  },
  fr: {
    patterns: [],
    vocabulary: []
  },
  de: {
    patterns: [],
    vocabulary: []
  },
  it: {
    patterns: [],
    vocabulary: []
  },
  pt: {
    patterns: [],
    vocabulary: []
  },
  ru: {
    patterns: [],
    vocabulary: []
  },
  zh: {
    patterns: [],
    vocabulary: []
  },
  ja: {
    patterns: [],
    vocabulary: []
  },
  ko: {
    patterns: [],
    vocabulary: []
  },
  ar: {
    patterns: [],
    vocabulary: []
  },
  hi: {
    patterns: [],
    vocabulary: []
  }
};

function applyDefaultProfile(profile, language) {
  const defaultProfile = defaultProfiles[language] || defaultProfiles.en;

  // Apply default patterns
  if (defaultProfile.patterns) {
    profile.patterns = [...defaultProfile.patterns];
  }

  // Apply default vocabulary
  if (defaultProfile.vocabulary) {
    profile.vocabulary = [...defaultProfile.vocabulary];
  }

  console.log(`[HMLCP] Applied default ${language} profile to user ${profile.userId}`);
}

module.exports = {
  applyDefaultProfile,
  defaultProfiles
};
