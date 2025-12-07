"use client"

import useSWR from "swr"
import { useState, useCallback } from "react"
import type { StationSnapshot, AILogEntry } from "@/types/monitoring"
import { METRIC_DEFINITIONS } from "@/types/monitoring"

const API_BASE_URL = "/api/proxy-snapshots"

interface APISnapshot {
  id: string
  station_id: string
  extension: string
  timestamp: string
  call_id: string
  channel: string
  metrics: Record<string, number | string>
  knobs: Record<string, number | string | boolean>
  config?: any
}

function transformAPISnapshot(apiSnapshot: APISnapshot): StationSnapshot {
  return {
    station: `${apiSnapshot.station_id}_${apiSnapshot.extension}`,
    timestamp: new Date(apiSnapshot.timestamp).getTime(),
    status: "online",
    metrics: apiSnapshot.metrics as Record<string, number>,
    knobs: apiSnapshot.knobs,
    config: (apiSnapshot as any).config,
  }
}

function groupSnapshots(apiSnapshots: APISnapshot[]): StationSnapshot[] {
  const stationMap = new Map<string, APISnapshot>()

  for (const snapshot of apiSnapshots) {
    const key = `${snapshot.station_id}_${snapshot.extension}`
    const existing = stationMap.get(key)

    if (!existing || new Date(snapshot.timestamp) > new Date(existing.timestamp)) {
      stationMap.set(key, snapshot)
    }
  }

  return Array.from(stationMap.values()).map(transformAPISnapshot)
}

function generateMockSnapshot(stationId: string, extension: string): StationSnapshot {
  const metrics: Record<string, number> = {}

  Object.values(METRIC_DEFINITIONS).forEach((metricDef) => {
    if (metricDef.stations.includes(stationId)) {
      const { range, thresholds } = metricDef
      const optimum = thresholds.optimum || (range.min + range.max) / 2
      const variation = (range.max - range.min) * 0.2
      metrics[metricDef.id] = optimum + (Math.random() - 0.5) * variation
    }
  })

  return {
    id: `${Date.now()}-${stationId}-${extension}`,
    station_id: stationId,
    extension: extension,
    timestamp: new Date().toISOString(),
    call_id: Math.random() > 0.7 ? `call-${Math.floor(Math.random() * 10000)}` : "no-call",
    channel: extension,
    status: stationId === "STATION_11" ? "offline" : Math.random() > 0.05 ? "online" : "offline",
    metrics,
    knobs: {
      "agc.enabled": true,
      "agc.target_level_dbfs": -18,
      "aec.enabled": true,
      "aec.nlp_mode": "moderate",
      "noise_reduction.enabled": true,
      "noise_reduction.level_db": 15,
      codec_type: ["OPUS", "G711", "G729"][Math.floor(Math.random() * 3)],
      chunk_ms: Math.floor(Math.random() * 200) + 200,
      vad_level: ["low", "medium", "high"][Math.floor(Math.random() * 3)],
      concurrency_limit: Math.floor(Math.random() * 16) + 8,
      jitter_buffer_ms: Math.floor(Math.random() * 100) + 50,
    },
  }
}

export function useMonitoringSnapshots() {
  const [mode, setMode] = useState<"demo" | "live">("live")

  const { data, error, isLoading, mutate } = useSWR<StationSnapshot[]>(
    API_BASE_URL,
    async (url: string) => {
      console.log("[v0] Attempting to fetch from API:", url)
      try {
        const response = await fetch(url, {
          headers: { Accept: "application/json" },
        })

        console.log("[v0] API Response status:", response.status, response.statusText)

        if (!response.ok) {
          throw new Error(`HTTP ${response.status}`)
        }

        const apiData: StationSnapshot[] = await response.json()

        if (!apiData || !Array.isArray(apiData)) {
          console.log("[v0] API returned invalid data, falling back to demo data")
          throw new Error("API returned invalid data")
        }

        console.log("[v0] API Data received:", apiData.length, "snapshots")

        if (apiData.length > 0) {
          setMode("live")
          return apiData
        }

        throw new Error("No data received")
      } catch (err) {
        console.log("[v0] API Connection failed:", err)
        setMode("demo")
        throw err
      }
    },
    {
      refreshInterval: 150, // 150ms refresh rate as specified
      revalidateOnFocus: false,
      onError: (err) => {
        console.log("[v0] SWR Error - falling back to demo data:", err.message)
        setMode("demo")
      },
      onErrorRetry: (error, key, config, revalidate, { retryCount }) => {
        if (retryCount >= 2) {
          setMode("demo")
          return
        }
        setTimeout(() => revalidate({ retryCount }), 3000)
      },
    },
  )

  const demoData: StationSnapshot[] = []
  for (let i = 1; i <= 12; i++) {
    const stationId = `STATION_${i}`
    demoData.push(generateMockSnapshot(stationId, "3333"))
    demoData.push(generateMockSnapshot(stationId, "4444"))
  }

  return {
    snapshots: mode === "live" && data ? data : demoData,
    isLoading: isLoading,
    error: mode === "live" ? error : null,
    mode,
    setMode,
    refresh: mutate,
  }
}

export function useOptimizer() {
  const [isOptimizing, setIsOptimizing] = useState(false)
  const [aiLog, setAiLog] = useState<AILogEntry[]>([])

  const optimize = useCallback(
    async (station: string, snapshot: StationSnapshot, goal: "latency" | "quality" | "balanced" = "balanced") => {
      setIsOptimizing(true)

      try {
        await new Promise((resolve) => setTimeout(resolve, 2000))

        const mockLog: AILogEntry = {
          timestamp: Date.now(),
          station,
          changes: [
            { knob: "chunk_ms", before: 300, after: 250 },
            { knob: "vad_level", before: "high", after: "medium" },
          ],
          metricImpact: [
            { metric: "latency.avg", before: 210, after: 180 },
            { metric: "latency.p95", before: 400, after: 260 },
          ],
        }

        setAiLog((prev) => [mockLog, ...prev])

        return mockLog
      } finally {
        setIsOptimizing(false)
      }
    },
    [],
  )

  return {
    optimize,
    isOptimizing,
    aiLog,
    clearLog: () => setAiLog([]),
  }
}

export function useGlobalOptimizer() {
  const [isOptimizing, setIsOptimizing] = useState(false)
  const [progress, setProgress] = useState(0)

  const optimizeAll = useCallback(async (snapshots: StationSnapshot[]) => {
    setIsOptimizing(true)
    setProgress(0)

    const onlineStations = snapshots.filter((s) => s.status === "online")

    for (let i = 0; i < onlineStations.length; i++) {
      await new Promise((resolve) => setTimeout(resolve, 1000))
      setProgress(((i + 1) / onlineStations.length) * 100)
    }

    setIsOptimizing(false)
    setProgress(0)
  }, [])

  return {
    optimizeAll,
    isOptimizing,
    progress,
  }
}
