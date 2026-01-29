# Asterisk and Optimizer Fixed Configurations
## Date: 2026-01-29

### Files Included:
1. **extensions.conf** - Main Asterisk dialplan configuration
2. **extensions_custom.conf** - Custom extensions (was missing, restored from backup)
3. **modules.conf** - Module loading configuration
4. **extensions.lua** - Lua dialplan (currently disabled, using pbx_config instead)
5. **optimizer-agent.js** - Fixed optimizer agent with knobs_snapshot → knobs correction

### Key Fixes Applied:

#### 1. Asterisk "Not Found" Error Fix:
- **Problem**: Extension 3333 showing "Not Found" error
- **Root Cause**: `/etc/asterisk/extensions_custom.conf` was missing
- **Solution**: Restored from backup dated 2026-01-05

#### 2. Optimizer Knob Updates Fix:
- **Problem**: AI optimizer rejecting all requests with "AI optimization disabled"
- **Root Cause**: Field name mismatch - optimizer-agent.js sending `knobs_snapshot` but AI service expecting `knobs`
- **Solution**: Changed line 118 in optimizer-agent.js from `knobs_snapshot:` to `knobs:`
- **Result**: Knob optimization now working, gain adjusting from 0 → 2 dB progressively

### Backup Location on VM:
```
/home/azureuser/asterisk_optimizer_backup_20260129-184625/
```

### System Status:
✅ Asterisk dialplan working correctly
✅ Extensions 3333/4444 routing properly
✅ Optimizer finding and processing traces
✅ AI service making optimization decisions
✅ Knobs updating in database
✅ Progressive gain adjustment active