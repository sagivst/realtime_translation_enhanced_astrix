"use client"

import { useEffect, useState, useCallback, useRef } from "react"

interface UseStationMetricsOptions {
  stationId: string
  interval?: number
  enabled?: boolean
}

interface StationMetrics {
  id: string
  timestamp: number
  signalStrength: number
  latency: number
  packetFlow: number
  audioQuality: number
  volume: number
  [key: string]: any
}

export function useStationMetrics({ stationId, interval = 500, enabled = true }: UseStationMetricsOptions) {
  const [metrics, setMetrics] = useState<StationMetrics | null>(null)
  const [history, setHistory] = useState<StationMetrics[]>([])
  const [loading, setLoading] = useState(true)
  const metricsHistoryRef = useRef<StationMetrics[]>([])
  const intervalRef = useRef<NodeJS.Timeout | null>(null)

  const fetchMetrics = useCallback(async () => {
    try {
      const response = await fetch("http://20.170.155.53:8080/api/snapshots")
      if (!response.ok) throw new Error("Failed to fetch metrics")

      const data = await response.json()
      const station = data.stations?.find((s: any) => s.id === stationId)

      if (station && station.metrics) {
        const newMetrics: StationMetrics = {
          id: stationId,
          timestamp: Date.now(),
          ...station.metrics,
        }

        setMetrics(newMetrics)

        // Keep last 60 entries for history
        metricsHistoryRef.current = [...metricsHistoryRef.current, newMetrics].slice(-60)

        setHistory(metricsHistoryRef.current)
      }

      setLoading(false)
    } catch (error) {
      console.error("[v0] Metrics fetch error:", error)
      setLoading(false)
    }
  }, [stationId])

  useEffect(() => {
    if (!enabled || !stationId) return

    fetchMetrics()
    intervalRef.current = setInterval(fetchMetrics, interval)

    return () => {
      if (intervalRef.current) {
        clearInterval(intervalRef.current)
      }
    }
  }, [fetchMetrics, interval, enabled, stationId])

  const getMetricTrend = useCallback(
    (metricKey: string): "up" | "down" | "stable" => {
      if (history.length < 2) return "stable"

      const current = history[history.length - 1][metricKey] || 0
      const previous = history[history.length - 2][metricKey] || 0

      if (current > previous) return "up"
      if (current < previous) return "down"
      return "stable"
    },
    [history],
  )

  return {
    metrics,
    history,
    loading,
    getMetricTrend,
  }
}
