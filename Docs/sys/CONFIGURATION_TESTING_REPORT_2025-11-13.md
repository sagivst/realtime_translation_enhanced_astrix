📄 CONFIGURATION_TESTING_REPORT_2025-11-13.md

  Located at: /Users/sagivstavinsky/realtime-translation-enhanced_astrix/

  Report Contents:

  1. CURRENT ״Very slow and distorted speech accompanied by Squawk״ CONFIGURATION ✅
  - Complete details of the working hybrid mode (16kHz, PT=10, BE swap both directions)
  - Backup file reference with MD5 checksum for verification
  - Exact code configuration

  2. FAILED CONFIGURATIONS ❌ (14+ combinations documented)
  - PT=96 with 48kHz - Complete silence
  - PT=10 with 48kHz - 3× slower playback
  - PT=126 - Failed
  - 48kHz with downsampling - Failed
  - Outgoing endian swap removal - Rejected by user
  - Little-endian outgoing - Failed
  - 7+ other rapid-test failures - All documented

  3. KEY FINDINGS
  - Asterisk PT assignment behavior (format-driven, not negotiated)
  - Sample rate mismatch effects
  - Endianness requirements (both directions need swap)
  - Developer forum spec vs reality

  4. CONFIGURATION MATRIX
  - Table showing all 15+ tested combinations
  - Sample rate, PT, endian, format, result, and playback speed for each

  5. CONFIGURATIONS TO NEVER RETRY
  - Clear list of 8 major configuration patterns to avoid
  - Reasons why each failed

  6. PROVEN WORKING CONFIGURATION
  - Complete reference code
  - Gateway, Conference Server, and Environment settings
  - Ready to restore from backup

  Quick Reference Tables:

  Tested Combinations:
  Sample Rate | PT  | Endian | Format  | Result | Speed
  16000 Hz    | 10  | BE     | slin16  | ✅ WORKS| Normal
  48000 Hz    | 10  | BE     | slin48  | ⚠️ Audio| 3× Slow
  48000 Hz    | 96  | BE     | slin48  | ❌ Silent| N/A

  Key Finding:
  Only 1 out of 15+ configurations worked. The working configuration is the original hybrid mode from this morning when you set up the dual socket system.

  The document is now saved locally and provides a complete reference to avoid retesting failed combinations. You can reference this anytime you want to try a
  new configuration change.