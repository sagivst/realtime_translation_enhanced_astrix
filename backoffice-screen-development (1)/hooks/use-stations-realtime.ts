"use client"

import { useEffect, useState, useRef, useCallback } from "react"

interface APISnapshot {
  id: string
  station_id: string
  extension: string
  timestamp: string
  call_id: string
  channel: string
  metrics: Record<string, number | string>
  knobs: Record<string, number | string | boolean>
}

interface StationData {
  id: string
  name: string
  extension: string
  status: "online" | "offline"
  timestamp: number
  callId: string
  metrics: Record<string, number | string>
  knobs: Record<string, number | string | boolean>
}

interface UseStationsRealtimeOptions {
  interval?: number
  onUpdate?: (stations: StationData[]) => void
  enabled?: boolean
}

const MOCK_STATIONS: StationData[] = [
  {
    id: "station-3-3333",
    name: "STATION_3",
    extension: "3333",
    status: "online",
    timestamp: Date.now(),
    callId: "no-call",
    metrics: {
      "dsp.agc.currentGain": 12.198,
      "dsp.agc.targetLevel": -18,
      "dsp.aec.echoLevel": -53.814,
      "dsp.noiseReduction.snrImprovement": 18.962,
      "audioQuality.mos": 4.365,
      "audioQuality.pesq": 4.5,
      "audioQuality.snr": 48.511,
      "audioQuality.speechLevel": -21.011,
      "buffer.total": 292.287,
      "buffer.jitter": 39.742,
      "buffer.underrun": 1,
      "latency.avg": 72.254,
      "latency.min": 20,
      "latency.max": 179.693,
      "latency.percentile95": 95.836,
      "packet.received": 1068,
      "packet.sent": 1008,
      "packet.lost": 4,
      "packet.loss": 0.339,
      "performance.cpu": 32.272,
      "performance.memory": 636.812,
      "performance.throughput": 48000,
      "custom.state": "active",
      "custom.successRate": 99.479,
      "custom.errorCount": 1,
    },
    knobs: {
      "agc.enabled": true,
      "agc.target_level_dbfs": -18,
      "agc.compression_ratio": 3.5,
      "aec.enabled": true,
      "aec.suppression_level_db": 25,
      "aec.nlp_mode": "moderate",
      "noise_reduction.enabled": true,
      "noise_reduction.level_db": 15,
    },
  },
  {
    id: "station-3-4444",
    name: "STATION_3",
    extension: "4444",
    status: "online",
    timestamp: Date.now(),
    callId: "no-call",
    metrics: {
      "dsp.agc.currentGain": 10.5,
      "dsp.agc.targetLevel": -18,
      "dsp.aec.echoLevel": -48.2,
      "dsp.noiseReduction.snrImprovement": 16.8,
      "audioQuality.mos": 4.1,
      "audioQuality.pesq": 4.2,
      "audioQuality.snr": 42.3,
      "audioQuality.speechLevel": -22.5,
      "buffer.total": 280.5,
      "buffer.jitter": 42.1,
      "buffer.underrun": 2,
      "latency.avg": 78.5,
      "latency.min": 22,
      "latency.max": 185.2,
      "latency.percentile95": 98.4,
      "packet.received": 1050,
      "packet.sent": 998,
      "packet.lost": 6,
      "packet.loss": 0.52,
      "performance.cpu": 35.8,
      "performance.memory": 648.2,
      "performance.throughput": 48000,
      "custom.state": "active",
      "custom.successRate": 98.9,
      "custom.errorCount": 2,
    },
    knobs: {
      "agc.enabled": true,
      "agc.target_level_dbfs": -18,
      "agc.compression_ratio": 3.2,
      "aec.enabled": true,
      "aec.suppression_level_db": 22,
      "aec.nlp_mode": "aggressive",
      "noise_reduction.enabled": true,
      "noise_reduction.level_db": 18,
    },
  },
]

function transformAPIResponse(apiData: APISnapshot[]): StationData[] {
  // Group snapshots by station_id + extension
  const stationMap = new Map<string, APISnapshot>()

  for (const snapshot of apiData) {
    const key = `${snapshot.station_id}-${snapshot.extension}`
    const existing = stationMap.get(key)

    // Keep the most recent snapshot for each station/extension combo
    if (!existing || new Date(snapshot.timestamp) > new Date(existing.timestamp)) {
      stationMap.set(key, snapshot)
    }
  }

  return Array.from(stationMap.values()).map((snapshot) => ({
    id: snapshot.id,
    name: snapshot.station_id,
    extension: snapshot.extension,
    status: snapshot.call_id !== "no-call" ? "online" : "online", // Always online if we're receiving data
    timestamp: new Date(snapshot.timestamp).getTime(),
    callId: snapshot.call_id,
    metrics: snapshot.metrics as Record<string, number | string>,
    knobs: snapshot.knobs,
  }))
}

export function useStationsRealtime(options: UseStationsRealtimeOptions = {}) {
  const { interval = 1000, onUpdate, enabled = true } = options

  const [stations, setStations] = useState<StationData[]>(MOCK_STATIONS)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [lastUpdate, setLastUpdate] = useState<number>(Date.now())
  const [isUsingMockData, setIsUsingMockData] = useState(true)
  const intervalRef = useRef<NodeJS.Timeout | null>(null)
  const previousDataRef = useRef<string>("")
  const failureCountRef = useRef(0)

  const fetchSnapshots = useCallback(async () => {
    try {
      const controller = new AbortController()
      const timeoutId = setTimeout(() => controller.abort(), 5000)

      const response = await fetch("http://20.170.155.53:8080/api/snapshots", {
        signal: controller.signal,
        mode: "cors",
        headers: {
          Accept: "application/json",
        },
      })

      clearTimeout(timeoutId)

      if (!response.ok) {
        throw new Error(`HTTP ${response.status}`)
      }

      const data: APISnapshot[] = await response.json()

      if (data && Array.isArray(data) && data.length > 0) {
        const transformedStations = transformAPIResponse(data)
        const newData = JSON.stringify(transformedStations)

        if (newData !== previousDataRef.current) {
          previousDataRef.current = newData
          setStations(transformedStations)
          setLastUpdate(Date.now())
          setError(null)
          setIsUsingMockData(false)
          failureCountRef.current = 0

          if (onUpdate) {
            onUpdate(transformedStations)
          }
        }
      }
    } catch (err) {
      failureCountRef.current++

      if (failureCountRef.current === 1) {
        console.error("[v0] Cannot connect to API at 20.170.155.53:8080 - using demo data")
      }

      setStations(MOCK_STATIONS)
      setIsUsingMockData(true)

      if (failureCountRef.current === 1) {
        setError("API unavailable - using demo mode")
      }
    } finally {
      setLoading(false)
    }
  }, [onUpdate])

  useEffect(() => {
    if (!enabled) return

    fetchSnapshots()

    intervalRef.current = setInterval(fetchSnapshots, interval)

    return () => {
      if (intervalRef.current) {
        clearInterval(intervalRef.current)
      }
    }
  }, [fetchSnapshots, interval, enabled])

  const refresh = useCallback(() => {
    failureCountRef.current = 0
    return fetchSnapshots()
  }, [fetchSnapshots])

  return {
    stations,
    loading,
    error,
    lastUpdate,
    refresh,
    isUpdating: false,
    isUsingMockData,
  }
}
