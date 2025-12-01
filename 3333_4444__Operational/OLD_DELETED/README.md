# OLD_DELETED Directory

This directory contains files that were moved from the active system directories based on the v2.0 installation guide.
These files are no longer needed for the 3333/4444 operational system.

## Cleanup Date
2025-12-01 12:24:54

## Summary
- **Total files moved from STTTTSserver**: 51 files
- **Space freed**: ~924KB
- **Files remaining in active STTTTSserver**: 31 files

## Categories of Moved Files

### 1. Test Files
- All test-*.js files (testing/development scripts)

### 2. Duplicate/Backup Files  
- monitoring-server*.js (duplicates - real one is in /home/azureuser/translation-app/)
- gateway*.js files (duplicates of root gateway files)
- All backup files with timestamps

### 3. Legacy/Unused Components
- ari-externalmedia-handler.js (old ARI handler)
- asr-streaming-worker*.js (unused ASR components)
- audiosocket-*.js (legacy audio socket handlers)
- conference-server.js (replaced by current implementation)
- hume-*.js (Hume integration files - not used in current setup)

### 4. Unused HTML Dashboards
- audio-monitor*.html
- monitoring-*.html  
- unified-monitor.html

### 5. Unused Orchestrators
- externalmedia-orchestrator.js
- translation-orchestrator.js
- audio-playback-handler.js

## Active System Status
After cleanup, all critical services remain operational:
- STTTTSserver.js ✓
- monitoring-server.js ✓ (in /home/azureuser/translation-app/)
- simplified-database-server.js ✓ (in /home/azureuser/translation-app/)

## Note
These files can be permanently deleted after confirming system stability.
They are kept here temporarily as a safety measure.
