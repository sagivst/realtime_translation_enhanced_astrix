"use client"

import { useState } from "react"
import { Button } from "@/components/ui/button"
import { AlertCircle, CheckCircle2 } from "lucide-react"

interface Metric {
  id: string
  name: string
  currentValue: number
  minStandard: number
  desiredMin: number
  optimalPoint: number
  desiredMax: number
  maxStandard: number
  unit: string
}

interface MetricEditorProps {
  metrics: Metric[]
}

export default function MetricEditor({ metrics }: MetricEditorProps) {
  const [editingMetrics, setEditingMetrics] = useState<Metric[]>(
    metrics.length > 0
      ? metrics
      : [
          {
            id: "1",
            name: "Signal Strength",
            currentValue: 85,
            minStandard: 0,
            desiredMin: 60,
            optimalPoint: 85,
            desiredMax: 95,
            maxStandard: 100,
            unit: "%",
          },
          {
            id: "2",
            name: "Latency",
            currentValue: 45,
            minStandard: 0,
            desiredMin: 20,
            optimalPoint: 30,
            desiredMax: 40,
            maxStandard: 500,
            unit: "ms",
          },
          {
            id: "3",
            name: "Packet Loss",
            currentValue: 0.5,
            minStandard: 0,
            desiredMin: 0,
            optimalPoint: 0.1,
            desiredMax: 1,
            maxStandard: 10,
            unit: "%",
          },
          {
            id: "4",
            name: "Audio Quality",
            currentValue: 92,
            minStandard: 0,
            desiredMin: 85,
            optimalPoint: 95,
            desiredMax: 100,
            maxStandard: 100,
            unit: "%",
          },
        ],
  )

  const handleMetricChange = (id: string, field: keyof Metric, value: number) => {
    const updated = editingMetrics.map((m) => (m.id === id ? { ...m, [field]: value } : m))
    setEditingMetrics(updated)
  }

  const isMetricOptimal = (metric: Metric): boolean => {
    return metric.currentValue >= metric.desiredMin && metric.currentValue <= metric.desiredMax
  }

  return (
    <div className="space-y-6">
      {editingMetrics.map((metric) => {
        const isOptimal = isMetricOptimal(metric)
        const progress = ((metric.currentValue - metric.minStandard) / (metric.maxStandard - metric.minStandard)) * 100

        return (
          <div key={metric.id} className="space-y-4 p-4 bg-slate-900/30 rounded-lg border border-slate-700">
            {/* Header */}
            <div className="flex items-start justify-between">
              <div>
                <h4 className="font-semibold text-white flex items-center gap-2">
                  {metric.name}
                  {isOptimal ? (
                    <CheckCircle2 className="h-4 w-4 text-green-400" />
                  ) : (
                    <AlertCircle className="h-4 w-4 text-yellow-400" />
                  )}
                </h4>
                <p className="text-xs text-slate-400 mt-1">
                  Current:{" "}
                  <span className="text-blue-400 font-mono">
                    {metric.currentValue.toFixed(2)}
                    {metric.unit}
                  </span>
                </p>
              </div>
            </div>

            {/* Visual Range Indicator */}
            <div className="space-y-2">
              <div className="relative h-2 bg-slate-700 rounded-full overflow-hidden">
                {/* Standard range background */}
                <div className="absolute inset-0 bg-gradient-to-r from-red-900/30 via-yellow-900/30 to-red-900/30" />

                {/* Desired range highlight */}
                <div
                  className="absolute h-full bg-green-500/40"
                  style={{
                    left: `${((metric.desiredMin - metric.minStandard) / (metric.maxStandard - metric.minStandard)) * 100}%`,
                    right: `${100 - ((metric.desiredMax - metric.minStandard) / (metric.maxStandard - metric.minStandard)) * 100}%`,
                  }}
                />

                {/* Current value marker */}
                <div
                  className="absolute h-full w-1 bg-blue-400 top-0"
                  style={{
                    left: `${progress}%`,
                  }}
                />
              </div>

              {/* Range labels */}
              <div className="flex justify-between text-xs text-slate-500 font-mono">
                <span>
                  {metric.minStandard}
                  {metric.unit}
                </span>
                <span>
                  Min: {metric.desiredMin}
                  {metric.unit}
                </span>
                <span>
                  Opt: {metric.optimalPoint}
                  {metric.unit}
                </span>
                <span>
                  Max: {metric.desiredMax}
                  {metric.unit}
                </span>
                <span>
                  {metric.maxStandard}
                  {metric.unit}
                </span>
              </div>
            </div>

            {/* Editable Fields */}
            <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
              <EditorField
                label="Min Standard"
                value={metric.minStandard}
                unit={metric.unit}
                onChange={(val) => handleMetricChange(metric.id, "minStandard", val)}
              />
              <EditorField
                label="Desired Min"
                value={metric.desiredMin}
                unit={metric.unit}
                onChange={(val) => handleMetricChange(metric.id, "desiredMin", val)}
                highlight
              />
              <EditorField
                label="Optimal"
                value={metric.optimalPoint}
                unit={metric.unit}
                onChange={(val) => handleMetricChange(metric.id, "optimalPoint", val)}
                highlight
              />
              <EditorField
                label="Desired Max"
                value={metric.desiredMax}
                unit={metric.unit}
                onChange={(val) => handleMetricChange(metric.id, "desiredMax", val)}
                highlight
              />
              <EditorField
                label="Max Standard"
                value={metric.maxStandard}
                unit={metric.unit}
                onChange={(val) => handleMetricChange(metric.id, "maxStandard", val)}
              />
              <EditorField
                label="Current Value"
                value={metric.currentValue}
                unit={metric.unit}
                onChange={(val) => handleMetricChange(metric.id, "currentValue", val)}
                readOnly
              />
            </div>
          </div>
        )
      })}

      {/* Save Button */}
      <Button className="w-full bg-blue-600 hover:bg-blue-700 text-white">Save Metric Configuration</Button>
    </div>
  )
}

function EditorField({
  label,
  value,
  unit,
  onChange,
  highlight = false,
  readOnly = false,
}: {
  label: string
  value: number
  unit: string
  onChange: (val: number) => void
  highlight?: boolean
  readOnly?: boolean
}) {
  return (
    <div
      className={`space-y-1 p-2 rounded-lg ${highlight ? "bg-blue-500/10 border border-blue-500/30" : "bg-slate-800/50"}`}
    >
      <label className="text-xs font-medium text-slate-400">{label}</label>
      <div className="flex items-center gap-1">
        <input
          type="number"
          value={value.toFixed(2)}
          onChange={(e) => onChange(Number.parseFloat(e.target.value) || 0)}
          readOnly={readOnly}
          className={`w-full px-2 py-1 text-sm rounded bg-slate-700 border border-slate-600 text-white font-mono ${
            readOnly ? "cursor-not-allowed opacity-60" : ""
          }`}
        />
        <span className="text-xs text-slate-400 font-mono">{unit}</span>
      </div>
    </div>
  )
}
