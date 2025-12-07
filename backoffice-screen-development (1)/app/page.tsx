"use client"

import { useState } from "react"
import { Button } from "@/components/ui/button"
import StationMonitoringGrid from "@/components/station-monitoring-grid"
import StationDetailView from "@/components/station-detail-view"
import SystemMenu from "@/components/system-menu"
import GlobalAiPanel from "@/components/global-ai-panel"
import SettingsPage from "@/components/settings-page"
import SuperAudioMonitor from "@/components/super-audio-monitor"
import { useMonitoringSnapshots, useOptimizer } from "@/hooks/use-monitoring-api"

export default function Home() {
  const [selectedStationId, setSelectedStationId] = useState<string | null>(null)
  const [detailLevel, setDetailLevel] = useState<1 | 2 | 3>(2)
  const [showSettings, setShowSettings] = useState(false)
  const { snapshots, mode } = useMonitoringSnapshots()
  const { optimize, isOptimizing } = useOptimizer()

  const selectedStation = snapshots.find(
    (s) => selectedStationId && `${s.station_id}_${s.extension}` === selectedStationId,
  )

  const totalStations = snapshots.length
  const onlineStations = snapshots.filter((s) => s.status === "online").length
  const avgLatency = snapshots.reduce((sum, s) => sum + (s.metrics["latency.avg"] || 0), 0) / snapshots.length || 0
  const avgMOS = snapshots.reduce((sum, s) => sum + (s.metrics.mos || 0), 0) / snapshots.length || 0

  const handleOptimizeAll = async () => {
    for (const snapshot of snapshots) {
      if (snapshot.status === "online") {
        await optimize(`${snapshot.station_id}_${snapshot.extension}`, snapshot, "balanced")
      }
    }
  }

  return (
    <div className="min-h-screen bg-slate-100">
      <header className="border-b border-slate-200 bg-white">
        <div className="px-6 py-4">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-xl font-semibold text-slate-900">Real-Time Translation Pipeline Monitor</h1>
              <p className="text-sm text-slate-500 mt-1">12-Station Voice Processing System</p>
            </div>
            <div className="flex items-center gap-4">
              <div className="text-right">
                <div className="text-xs text-slate-500">System Health</div>
                <div className="text-sm font-semibold text-green-600">● ONLINE</div>
              </div>
              <div className="h-8 w-px bg-slate-200" />
              <div className="text-right">
                <div className="text-xs text-slate-500">Stations</div>
                <div className="text-sm font-semibold text-slate-900">
                  {onlineStations} / {totalStations}
                </div>
              </div>
              <div className="h-8 w-px bg-slate-200" />
              <div className="text-right">
                <div className="text-xs text-slate-500">Avg Latency</div>
                <div className="text-sm font-semibold text-slate-900">{avgLatency.toFixed(0)}ms</div>
              </div>
              <div className="h-8 w-px bg-slate-200" />
              <div className="text-right">
                <div className="text-xs text-slate-500">Avg MOS</div>
                <div className="text-sm font-semibold text-green-600">{avgMOS.toFixed(1)}</div>
              </div>
              <div className="h-8 w-px bg-slate-200" />
              <SystemMenu snapshots={snapshots} onOpenSettings={() => setShowSettings(true)} />
            </div>
          </div>
        </div>
      </header>

      <main className="p-6 space-y-4 bg-slate-100">
        {showSettings ? (
          <div>
            <Button
              variant="ghost"
              onClick={() => setShowSettings(false)}
              className="mb-4 text-slate-600 hover:text-slate-900"
            >
              ← Back to Dashboard
            </Button>
            <SettingsPage />
          </div>
        ) : (
          <>
            {!selectedStationId && <GlobalAiPanel onOptimizeAll={handleOptimizeAll} isOptimizing={isOptimizing} />}
            {!selectedStationId && (
              <SuperAudioMonitor
                stationId="System Overview"
                trafficType="RTP"
                height={150}
                waveformColor="#00c8ff"
                fftColor="#00ffaa"
                spectrogramColors="inferno"
              />
            )}
            {mode === "demo" && (
              <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-3">
                <p className="text-sm text-yellow-800">
                  Using demo data. Connect to API at 20.170.155.53:8080 for real-time monitoring.
                </p>
              </div>
            )}
            {selectedStationId && selectedStation ? (
              <div>
                <Button
                  variant="ghost"
                  onClick={() => setSelectedStationId(null)}
                  className="mb-4 text-slate-600 hover:text-slate-900"
                >
                  ← Back to Grid
                </Button>
                <StationDetailView
                  snapshot={selectedStation}
                  detailLevel={detailLevel}
                  onDetailLevelChange={setDetailLevel}
                  onBack={() => setSelectedStationId(null)}
                />
              </div>
            ) : (
              <StationMonitoringGrid snapshots={snapshots} onStationSelect={setSelectedStationId} />
            )}
          </>
        )}
      </main>
    </div>
  )
}
