"use client"

import { useState } from "react"
import { Card } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible"
import SuperAudioMonitor from "./super-audio-monitor"
import KnobsEditor from "./knobs-editor"
import MetricBar from "./metric-bar"
import MetricEditorDialog from "./metric-editor-dialog"
import AiOptimizationLog from "./ai-optimization-log"
import { type StationSnapshot, STATION_DEFINITIONS, METRIC_CATEGORIES } from "@/types/monitoring"
import { useOptimizer } from "@/hooks/use-monitoring-api"
import { ChevronDown, Zap } from "lucide-react"

interface StationDetailViewProps {
  snapshot: StationSnapshot
  detailLevel: 1 | 2 | 3
  onDetailLevelChange: (level: 1 | 2 | 3) => void
  onBack: () => void
}

export default function StationDetailView({
  snapshot,
  detailLevel,
  onDetailLevelChange,
  onBack,
}: StationDetailViewProps) {
  const [isPlaying, setIsPlaying] = useState(false)
  const [showKnobs, setShowKnobs] = useState(true)
  const [showAiLog, setShowAiLog] = useState(true)
  const [showMetrics, setShowMetrics] = useState(true)
  const [editingMetric, setEditingMetric] = useState<{ name: string; value: number; range: any } | null>(null)

  const { optimize, isOptimizing, aiLog } = useOptimizer()

  const stationDef = STATION_DEFINITIONS.find((s) => s.id === snapshot.station_id)
  const stationName = stationDef?.name || snapshot.station_id
  const stationDesc = stationDef?.description || ""
  const extensionLabel = stationDef?.extensionLabels?.[snapshot.extension as keyof typeof stationDef.extensionLabels]
  const isOnline = snapshot.status === "online"

  const handlePlayAudio = async () => {
    if (isPlaying) {
      setIsPlaying(false)
    } else {
      try {
        const audioContext = new (window.AudioContext || (window as any).webkitAudioContext)()
        const oscillator = audioContext.createOscillator()
        const gainNode = audioContext.createGain()

        oscillator.connect(gainNode)
        gainNode.connect(audioContext.destination)

        oscillator.frequency.value = 440
        gainNode.gain.setValueAtTime(0.3, audioContext.currentTime)

        oscillator.start(audioContext.currentTime)
        oscillator.stop(audioContext.currentTime + 1)

        setIsPlaying(true)
        setTimeout(() => setIsPlaying(false), 1000)
      } catch (error) {
        console.error("[v0] Error playing audio:", error)
      }
    }
  }

  const handleOptimize = async () => {
    await optimize(`${snapshot.station_id}_${snapshot.extension}`, snapshot, "balanced")
  }

  return (
    <div className="space-y-3 bg-white p-4 rounded-lg">
      <Card className="p-4 border border-slate-200 bg-white">
        <div className="flex items-center justify-between">
          <div>
            <div className="flex items-center gap-2 mb-1">
              <h2 className="text-base font-semibold text-slate-900">{stationName}</h2>
              <span className="text-xs text-slate-600 px-2 py-0.5 bg-slate-100 rounded">
                {extensionLabel || `Ext ${snapshot.extension}`}
              </span>
              <div className={`h-1.5 w-1.5 rounded-full ${isOnline ? "bg-green-500" : "bg-slate-300"}`} />
            </div>
            <p className="text-xs text-slate-600">
              {snapshot.station_id} • {snapshot.extension}
              {snapshot.call_id && snapshot.call_id !== "no-call" && (
                <span className="ml-2 text-purple-600">📞 {snapshot.call_id}</span>
              )}
            </p>
            {stationDesc && <p className="text-xs text-slate-500 mt-1">{stationDesc}</p>}
          </div>
          <Button onClick={onBack} size="sm" variant="outline" className="text-xs h-7 bg-transparent">
            Back
          </Button>
        </div>
      </Card>

      {detailLevel >= 1 && (
        <SuperAudioMonitor
          stationId={`${snapshot.station_id}_${snapshot.extension}`}
          trafficType={snapshot.station_id.includes("RTP") ? "RTP" : "PCM"}
          height={150} // Reduced from 450 to 150 (1/3 height)
          waveformColor="#00c8ff"
          fftColor="#00ffaa"
          spectrogramColors="inferno"
        />
      )}

      {detailLevel >= 2 && (
        <>
          <Collapsible open={showMetrics} onOpenChange={setShowMetrics}>
            <Card className="border border-slate-200 bg-white">
              <CollapsibleTrigger asChild>
                <button className="w-full flex items-center justify-between p-3 bg-slate-100 hover:bg-slate-50 transition-colors">
                  <h3 className="text-sm font-semibold text-slate-900">
                    ▼ MONITORING METRICS ({Object.values(METRIC_CATEGORIES).flat().length} Active)
                  </h3>
                  <ChevronDown
                    className={`h-4 w-4 text-slate-400 transition-transform ${showMetrics ? "rotate-180" : ""}`}
                  />
                </button>
              </CollapsibleTrigger>
              <CollapsibleContent>
                <div className="px-3 pb-3 border-t border-slate-200 pt-3 space-y-3 bg-slate-100">
                  {Object.entries(METRIC_CATEGORIES).map(([category, metricNames]) => (
                    <div key={category} className="space-y-2">
                      <h4 className="text-xs font-semibold text-slate-700 capitalize bg-slate-100 p-2 rounded">
                        {category}
                      </h4>
                      <div className="grid gap-2 grid-cols-4">
                        {metricNames.map((metricName) => {
                          const value = snapshot.metrics[metricName] || 0
                          const range = getMetricRange(metricName)

                          return (
                            <MetricBar
                              key={metricName}
                              name={metricName}
                              value={value}
                              range={range}
                              unit={getMetricUnit(metricName)}
                              showEdit={detailLevel >= 3}
                              onEdit={() => setEditingMetric({ name: metricName, value, range })}
                            />
                          )
                        })}
                      </div>
                    </div>
                  ))}
                </div>
              </CollapsibleContent>
            </Card>
          </Collapsible>

          <Collapsible open={showKnobs} onOpenChange={setShowKnobs}>
            <Card className="border border-slate-200 bg-white">
              <CollapsibleTrigger asChild>
                <button className="w-full flex items-center justify-between p-3 bg-slate-100 hover:bg-slate-50 transition-colors">
                  <h3 className="text-sm font-semibold text-slate-900">▼ KNOBS & CONTROLS</h3>
                  <ChevronDown
                    className={`h-4 w-4 text-slate-400 transition-transform ${showKnobs ? "rotate-180" : ""}`}
                  />
                </button>
              </CollapsibleTrigger>
              <CollapsibleContent>
                <div className="px-3 pb-3 border-t border-slate-200 pt-3 bg-slate-100">
                  <KnobsEditor knobs={snapshot.knobs} stationId={snapshot.station_id} />
                </div>
              </CollapsibleContent>
            </Card>
          </Collapsible>

          <Collapsible open={showAiLog} onOpenChange={setShowAiLog}>
            <Card className="border border-slate-200 bg-white">
              <div className="w-full flex items-center justify-between p-3 bg-slate-100">
                <CollapsibleTrigger asChild>
                  <button className="flex items-center gap-2 hover:bg-slate-50 transition-colors flex-1">
                    <Zap className="h-4 w-4 text-purple-600" />
                    <h3 className="text-sm font-semibold text-slate-900">▼ AI Optimization Log</h3>
                    <ChevronDown
                      className={`h-4 w-4 text-slate-400 transition-transform ml-auto ${showAiLog ? "rotate-180" : ""}`}
                    />
                  </button>
                </CollapsibleTrigger>
                <Button
                  onClick={handleOptimize}
                  disabled={isOptimizing}
                  size="sm"
                  variant="outline"
                  className="text-xs h-7 ml-2 bg-transparent"
                >
                  {isOptimizing ? "Optimizing..." : "Run AI"}
                </Button>
              </div>
              <CollapsibleContent>
                <div className="px-3 pb-3 border-t border-slate-200 pt-3 bg-slate-100">
                  <AiOptimizationLog logs={aiLog} stationId={`${snapshot.station_id}_${snapshot.extension}`} />
                </div>
              </CollapsibleContent>
            </Card>
          </Collapsible>
        </>
      )}

      {editingMetric && (
        <MetricEditorDialog
          open={!!editingMetric}
          onOpenChange={(open) => !open && setEditingMetric(null)}
          metricName={editingMetric.name}
          currentValue={editingMetric.value}
          range={editingMetric.range}
          unit={getMetricUnit(editingMetric.name)}
          onSave={(newRange) => {
            console.log("[v0] Saved new range for", editingMetric.name, newRange)
            setEditingMetric(null)
          }}
        />
      )}
    </div>
  )
}

function getMetricRange(metricName: string) {
  if (metricName.includes("latency")) {
    return { min: 0, max: 1000, preferred: { min: 80, max: 250 }, target: 150 }
  }
  if (metricName.includes("buffer")) {
    return { min: 0, max: 100, preferred: { min: 30, max: 70 }, target: 50 }
  }
  if (metricName.includes("packet.loss")) {
    return { min: 0, max: 10, preferred: { min: 0, max: 1 }, target: 0.5 }
  }
  if (metricName.includes("packet.rate")) {
    return { min: 0, max: 10000, preferred: { min: 3000, max: 8000 }, target: 5000 }
  }
  return { min: 0, max: 100, preferred: { min: 20, max: 80 }, target: 50 }
}

function getMetricUnit(metricName: string): string {
  if (metricName.includes("latency")) return "ms"
  if (metricName.includes("buffer")) return "%"
  if (metricName.includes("packet.loss")) return "%"
  if (metricName.includes("packet.rate")) return "pkt/s"
  if (metricName.includes("jitter")) return "ms"
  return ""
}
