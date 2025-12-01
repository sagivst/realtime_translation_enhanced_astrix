# Monitoring System Update Plan

## Executive Summary
Complete overhaul of the monitoring system to support modular, three-level monitoring with proper station mapping and dark professional UI.

## Station Mapping (Corrected)

### Voice Stations (7 total)
1. **STATION 1**: Asterisk (RTP Out) → Before sending to Gateway
2. **STATION 2**: Gateway (PCM Out) → Before sending to STTTTSserver
3. **STATION 3**: STTTTSserver (PCM) → Before sending to Deepgram
4. **STATION 4**: Deepgram Client → After STT processing
5. **STATION 9**: STTTTSserver (PCM) → Before sending to Gateway
6. **STATION 10**: Gateway (RTP) → Before sending back to Asterisk
7. **STATION 11**: STTTTSserver (PCM) → Before sending to Hume AI

### Text Stations (4 total - NOT voice)
- **STATION 5**: STTTTSserver → Before sending text to DeepL
- **STATION 6**: DeepL Client → After translation
- **STATION 7**: STTTTSserver → Before sending text to ElevenLabs
- **STATION 8**: ElevenLabs Client → After TTS (cannot monitor directly)

## Three-Level Architecture

### Level 1: Station Grid View
- **Display**: 11 station monitoring squares in grid layout
- **Format**: 4 columns responsive grid
- **Each Square Shows**:
  - Station name and ID
  - Online/Offline status
  - Primary metric with live value
  - Dynamic bar visualization
  - Expand icon [↗]

### Level 2: Expanded Station View
- **Trigger**: Click expand icon on Level 1 square
- **Display**: Full-screen station detail
- **Contains**:
  - All monitoring squares for station metrics
  - Live waveform for audio stations
  - 75 parameters organized by category:
    - Buffer Metrics
    - Latency Metrics
    - Packet Metrics
    - Audio Quality
    - Performance Metrics
  - Back button [←]
  - Each metric square has expand icon for Level 3

### Level 3: Metric Editor
- **Trigger**: Click expand icon on Level 2 metric
- **Display**: 2x enlarged edit view overlaying Level 2
- **Features**:
  - Current value with dynamic update
  - Legal range indicators
  - Optimal range visualization
  - Edit controls (sliders/inputs)
  - Apply/Reset/Save as Default buttons
  - Real-time validation

## Monitoring Square Module

### Structure
```javascript
class MonitoringSquare {
  constructor(config) {
    this.id = config.id;
    this.type = config.type; // 'station' | 'metric' | 'control'
    this.level = config.level; // 1 | 2 | 3
    this.data = config.data;
    this.editable = config.editable;
    this.visualType = config.visualType; // 'bar' | 'wave' | 'number' | 'status'
  }

  render() {
    // Returns HTML for square based on level and type
  }

  expand() {
    // Handles expansion to next level
  }

  update(newData) {
    // Updates visualization with new data
  }
}
```

## Parameter Management

### Parameter File Structure
```json
{
  "station_1": {
    "editable": {
      "jitter_buffer_ms": { "value": 40, "min": 20, "max": 200, "default": 40 },
      "packet_size": { "value": 160, "min": 80, "max": 320, "default": 160 }
    },
    "readonly": {
      "rtp_packets_sec": { "value": 0, "unit": "pps" },
      "codec": { "value": "ulaw" }
    }
  }
}
```

### Data Collection Module
```javascript
class MetricsCollector {
  constructor() {
    this.stations = new Map();
    this.parameters = loadParameters();
  }

  collectForStation(stationId) {
    // Collects only relevant metrics for station
    const config = this.parameters[stationId];
    return {
      editable: this.getEditableMetrics(stationId, config.editable),
      readonly: this.getReadonlyMetrics(stationId, config.readonly)
    };
  }
}
```

## UI Design Specifications

### Color Scheme (Dark Professional)
```css
:root {
  --bg-primary: #0a0a0a;
  --bg-secondary: #1a1a1a;
  --bg-tertiary: #252525;
  --text-primary: #e0e0e0;
  --text-secondary: #a0a0a0;
  --accent-good: #00ff88;
  --accent-warning: #ffaa00;
  --accent-critical: #ff3366;
  --border: #333333;
}
```

### Typography
- Font: "IBM Plex Mono" or "JetBrains Mono"
- Headers: 14px uppercase
- Values: 24px bold
- Labels: 11px regular

### Visual Elements
- No rounded corners (border-radius: 0)
- Thin borders (1px solid)
- Minimal shadows
- High contrast for readability
- Subtle animations (opacity/scale only)

## Implementation Phases

### Phase 1: Core Infrastructure (Week 1)
1. Create monitoring square module
2. Implement 3-level navigation system
3. Build parameter file system
4. Set up WebSocket for real-time updates

### Phase 2: Station Integration (Week 2)
1. Map all 11 stations
2. Create station-specific collectors
3. Implement metric categorization
4. Add editable/readonly separation

### Phase 3: UI Implementation (Week 3)
1. Build Level 1 grid view
2. Implement Level 2 expanded view
3. Create Level 3 edit interface
4. Apply dark theme styling

### Phase 4: Real-time Features (Week 4)
1. Add live waveforms for audio stations
2. Implement dynamic bars
3. Create packet counters
4. Add flow visualizations

### Phase 5: Control Systems (Week 5)
1. Parameter editing interface
2. Save/Load defaults
3. Validation system
4. Apply changes to running system

## Critical Requirements

### Performance
- Update frequency: 100ms for critical metrics
- Max latency: 50ms for user interactions
- Memory usage: < 100MB for dashboard
- CPU usage: < 5% idle, < 15% active

### Reliability
- Automatic reconnection on WebSocket drop
- Local storage for defaults
- Graceful degradation if stations offline
- Error boundaries for each square

### Security
- Parameter validation before apply
- Rate limiting on updates
- Audit log for changes
- Role-based access (future)

## Testing Requirements

### Unit Tests
- Monitoring square module
- Parameter validation
- Metric collectors
- WebSocket handlers

### Integration Tests
- Station data flow
- Parameter application
- Multi-level navigation
- Real-time updates

### Performance Tests
- 11 stations concurrent monitoring
- 1000 updates/second handling
- Memory leak detection
- CPU profiling

## Deliverables

1. **monitoring-square.js** - Core module
2. **station-collector.js** - Data collection
3. **parameter-manager.js** - Parameter handling
4. **monitoring-dashboard-v2.html** - New UI
5. **monitoring-server-v2.js** - Backend updates
6. **parameters.json** - Configuration file
7. **monitoring.css** - Dark theme styles

## Success Criteria

- ✅ All 11 stations monitored
- ✅ Three-level navigation working
- ✅ Real-time updates < 100ms
- ✅ Parameter editing functional
- ✅ Dark professional UI
- ✅ Modular architecture
- ✅ Generic monitoring squares
- ✅ Station-specific capabilities
- ✅ Save/load defaults
- ✅ Live visualizations

## Notes

### Audio Gain Issue
The current system has gain set to 0.002 (should be 2.0). This must be fixed:
```javascript
// Current (BROKEN)
extensionGainFactors.set("3333", 0.002);
// Should be
extensionGainFactors.set("3333", 2.0);
```

### Timing Module Issue
There's a process duplication causing disconnections. Need to implement new scheduler module:
```javascript
if (timestamp === "") timestamp = Date.now();
if (timestamp !== "") {
  const latency = Date.now() - timestamp;
  sendToTimingModule(extensionId, serviceId, latency);
  timestamp = Date.now();
}
```

### Voice Quality Issue
Words missing first syllable - likely related to VAD or buffer settings. Check:
- VAD threshold
- Chunk size
- Buffer timing

## Timeline

- **Week 1**: Core infrastructure
- **Week 2**: Station integration
- **Week 3**: UI implementation
- **Week 4**: Real-time features
- **Week 5**: Control systems
- **Week 6**: Testing & refinement

Total: 6 weeks to production-ready system