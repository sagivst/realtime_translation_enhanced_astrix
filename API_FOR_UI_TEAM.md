# API Ready for UI Team ✅

## API Endpoint
**Base URL:** `http://20.170.155.53:8080`

## CORS Configuration ✅
The API now has full CORS support:
- `Access-Control-Allow-Origin: *` (allows all origins)
- `Access-Control-Allow-Methods: GET, POST, PUT, DELETE, OPTIONS`
- `Access-Control-Allow-Headers: Content-Type, Authorization`
- Handles preflight OPTIONS requests

## Available Endpoints

### 1. Get All Station Snapshots
**GET** `/api/snapshots`
- Returns array of monitoring records
- Contains real Station-3 data (hardware)
- Contains simulated Station-4 data
- Each record includes:
  - `station_id`: "Station-3" or "Station-4"
  - `extension`: "3333" or "4444"
  - `timestamp`: ISO timestamp
  - `metrics`: Object with 75 real-time metrics
  - `knobs`: Object with 113 configuration parameters

### 2. Get Station Configurations
**GET** `/api/stations`
- Returns station configurations

### 3. Post Monitoring Data
**POST** `/api/monitoring-data`
- Store new monitoring data
- Body: JSON with station metrics

### 4. Health Check
**GET** `/health`
- Returns API health status

## Example Response Structure
```json
[
  {
    "id": "1765144965938-p0egpcxz1",
    "station_id": "Station-3",
    "extension": "3333",
    "timestamp": "2024-12-07T22:02:45.936Z",
    "call_id": "continuous-monitoring",
    "channel": "3333",
    "metrics": {
      "dsp.agc.currentGain": 11.936,
      "audioQuality.mos": 4.349,
      "latency.avg": 54.857,
      "packet.loss": 0.096,
      // ... 71 more metrics
    },
    "knobs": {
      "agc.enabled": true,
      "aec.suppression_level_db": 25,
      "buffer.size_ms": 200,
      // ... 110 more knobs
    }
  },
  // ... more records
]
```

## Testing from Browser Console
```javascript
// Test CORS
fetch('http://20.170.155.53:8080/api/snapshots')
  .then(res => res.json())
  .then(data => console.log('Station data:', data))
  .catch(err => console.error('Error:', err));
```

## Important Notes
1. **Station-3** = Real hardware data (live metrics)
2. **Station-4** = Simulated data (for testing)
3. Database keeps last 100 records
4. New data arrives every 2 seconds
5. No authentication required (for development)

## Status: READY FOR UI INTEGRATION ✅
The API is fully operational with CORS enabled. The UI team can now connect from any domain including v0.app.

---
Last Updated: December 7, 2024 22:19 UTC