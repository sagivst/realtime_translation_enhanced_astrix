"use client"

import { CheckCircle2, ArrowRight } from "lucide-react"
import type { AILogEntry } from "@/types/monitoring"

const MOCK_LOGS: AILogEntry[] = [
  {
    timestamp: new Date(Date.now() - 120000).toISOString(),
    station: "Station-001",
    changes: [
      { knob: "AGC Target Level", before: -18, after: -20 },
      { knob: "NR Suppression", before: 12, after: 15 },
    ],
    metricImpact: [
      { metric: "Audio Clarity", before: 82, after: 89 },
      { metric: "SNR", before: 24, after: 28 },
    ],
  },
  {
    timestamp: new Date(Date.now() - 300000).toISOString(),
    station: "Station-003",
    changes: [{ knob: "AEC Tail Length", before: 128, after: 150 }],
    metricImpact: [{ metric: "Echo Return Loss", before: 35, after: 42 }],
  },
  {
    timestamp: new Date(Date.now() - 600000).toISOString(),
    station: "Station-002",
    changes: [
      { knob: "Jitter Buffer Size", before: 60, after: 80 },
      { knob: "DTX Mode", before: "OFF", after: "ON" },
    ],
    metricImpact: [
      { metric: "Packet Loss", before: 2.1, after: 0.8 },
      { metric: "Latency", before: 145, after: 125 },
    ],
  },
]

interface AiOptimizationLogProps {
  logs: AILogEntry[]
  stationId?: string
}

export default function AiOptimizationLog({ logs, stationId }: AiOptimizationLogProps) {
  const displayLogs = logs.length > 0 ? logs : MOCK_LOGS

  return (
    <div className="space-y-2 max-h-96 overflow-y-auto">
      {displayLogs.map((log, index) => {
        const totalImprovement = log.metricImpact.reduce((sum, impact) => {
          const before = Number(impact.before) || 0
          const after = Number(impact.after) || 0
          if (before === 0) return sum
          return sum + ((before - after) / before) * 100
        }, 0)
        const avgImprovement = log.metricImpact.length > 0 ? totalImprovement / log.metricImpact.length : 0

        return (
          <div key={log.timestamp + index} className="p-3 rounded-lg bg-white border border-slate-200 shadow-sm">
            <div className="flex items-start justify-between gap-2 mb-2">
              <div className="flex items-center gap-2">
                <CheckCircle2 className="h-5 w-5 text-green-500 flex-shrink-0" />
                <div>
                  <p className="text-sm font-medium text-slate-800">Station {log.station}</p>
                  <p className="text-xs text-slate-500">{new Date(log.timestamp).toLocaleTimeString()}</p>
                </div>
              </div>
              {avgImprovement !== 0 && (
                <span
                  className={`text-xs font-semibold whitespace-nowrap ${avgImprovement > 0 ? "text-green-600" : "text-red-600"}`}
                >
                  {avgImprovement > 0 ? "+" : ""}
                  {avgImprovement.toFixed(1)}% avg
                </span>
              )}
            </div>

            {log.changes.length > 0 && (
              <div className="mt-2 pt-2 border-t border-slate-100">
                <p className="text-xs font-medium text-slate-600 mb-1">Knob Changes:</p>
                <div className="space-y-1">
                  {log.changes.map((change, i) => (
                    <div key={i} className="flex items-center gap-2 text-xs text-slate-600">
                      <span className="font-mono">{change.knob}</span>
                      <span className="text-slate-400">{String(change.before)}</span>
                      <ArrowRight className="h-3 w-3 text-slate-400" />
                      <span className="text-green-600 font-medium">{String(change.after)}</span>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {log.metricImpact.length > 0 && (
              <div className="mt-2 pt-2 border-t border-slate-100">
                <p className="text-xs font-medium text-slate-600 mb-1">Metric Impact:</p>
                <div className="space-y-1">
                  {log.metricImpact.map((impact, i) => (
                    <div key={i} className="flex items-center gap-2 text-xs text-slate-600">
                      <span className="font-mono">{impact.metric}</span>
                      <span className="text-slate-400">{Number(impact.before).toFixed(1)}</span>
                      <ArrowRight className="h-3 w-3 text-slate-400" />
                      <span className="text-green-600 font-medium">{Number(impact.after).toFixed(1)}</span>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        )
      })}
    </div>
  )
}
