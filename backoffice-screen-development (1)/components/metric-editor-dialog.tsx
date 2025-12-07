"use client"

import { useState, useEffect } from "react"
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"

interface MetricRange {
  min: number
  max: number
  preferred?: { min: number; max: number }
  warning?: number
  critical?: number
  target?: number
}

interface MetricEditorDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  metricName: string
  currentValue: number
  range: MetricRange
  unit: string
  onSave: (newRange: MetricRange) => void
}

export default function MetricEditorDialog({
  open,
  onOpenChange,
  metricName,
  currentValue,
  range,
  unit,
  onSave,
}: MetricEditorDialogProps) {
  const [editedRange, setEditedRange] = useState<MetricRange>(range)
  const [historicalData, setHistoricalData] = useState<number[]>([])

  useEffect(() => {
    const data = generateHistoricalData(currentValue, 60)
    setHistoricalData(data)
  }, [currentValue])

  const handleSave = () => {
    onSave(editedRange)
    onOpenChange(false)
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="bg-white border-slate-200 text-slate-900 max-w-3xl">
        <DialogHeader>
          <DialogTitle className="text-lg">Metric Editor: {metricName}</DialogTitle>
        </DialogHeader>

        <div className="space-y-6">
          {/* Current Value Display */}
          <div className="bg-slate-50 rounded p-4 border border-slate-200">
            <div className="text-sm text-slate-600 mb-1">Current Value</div>
            <div className="text-2xl font-mono text-slate-900">
              {currentValue.toFixed(2)} {unit}
            </div>
            {/* Visual indicator */}
            <div className="relative h-2 bg-slate-200 rounded mt-3 overflow-hidden">
              {editedRange.preferred && (
                <div
                  className="absolute top-0 bottom-0 bg-green-200"
                  style={{
                    left: `${((editedRange.preferred.min - editedRange.min) / (editedRange.max - editedRange.min)) * 100}%`,
                    width: `${((editedRange.preferred.max - editedRange.preferred.min) / (editedRange.max - editedRange.min)) * 100}%`,
                  }}
                />
              )}
              {editedRange.target && (
                <div
                  className="absolute top-0 bottom-0 w-px bg-blue-600"
                  style={{
                    left: `${((editedRange.target - editedRange.min) / (editedRange.max - editedRange.min)) * 100}%`,
                  }}
                />
              )}
              <div
                className="absolute top-0 bottom-0 w-1 bg-green-600"
                style={{
                  left: `${Math.min(Math.max(((currentValue - editedRange.min) / (editedRange.max - editedRange.min)) * 100, 0), 100)}%`,
                }}
              />
            </div>
          </div>

          {/* Historical Graph */}
          <div className="bg-slate-50 rounded p-4 border border-slate-200">
            <div className="text-sm text-slate-600 mb-3">Historical Graph (Last 60 seconds)</div>
            <div className="relative h-32 bg-white rounded border border-slate-200">
              <HistoricalChart
                data={historicalData}
                currentValue={currentValue}
                target={editedRange.target}
                min={editedRange.min}
                max={editedRange.max}
              />
            </div>
          </div>

          {/* Range Configuration */}
          <div className="space-y-4">
            <h3 className="text-sm font-semibold text-slate-700">Range Configuration</h3>

            {/* Legal Range */}
            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label className="text-xs text-slate-600">Legal Range: Min</Label>
                <Input
                  type="number"
                  value={editedRange.min}
                  onChange={(e) => setEditedRange({ ...editedRange, min: Number.parseFloat(e.target.value) })}
                  className="bg-white border-slate-300"
                />
              </div>
              <div>
                <Label className="text-xs text-slate-600">Legal Range: Max</Label>
                <Input
                  type="number"
                  value={editedRange.max}
                  onChange={(e) => setEditedRange({ ...editedRange, max: Number.parseFloat(e.target.value) })}
                  className="bg-white border-slate-300"
                />
              </div>
            </div>

            {/* Preferred Range */}
            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label className="text-xs text-slate-600">Preferred Range: Min</Label>
                <Input
                  type="number"
                  value={editedRange.preferred?.min ?? ""}
                  onChange={(e) =>
                    setEditedRange({
                      ...editedRange,
                      preferred: {
                        min: Number.parseFloat(e.target.value),
                        max: editedRange.preferred?.max ?? editedRange.max,
                      },
                    })
                  }
                  className="bg-white border-slate-300"
                />
              </div>
              <div>
                <Label className="text-xs text-slate-600">Preferred Range: Max</Label>
                <Input
                  type="number"
                  value={editedRange.preferred?.max ?? ""}
                  onChange={(e) =>
                    setEditedRange({
                      ...editedRange,
                      preferred: {
                        min: editedRange.preferred?.min ?? editedRange.min,
                        max: Number.parseFloat(e.target.value),
                      },
                    })
                  }
                  className="bg-white border-slate-300"
                />
              </div>
            </div>

            {/* Warning, Critical, Target */}
            <div className="grid grid-cols-3 gap-3">
              <div>
                <Label className="text-xs text-slate-600">Warning Level</Label>
                <Input
                  type="number"
                  value={editedRange.warning ?? ""}
                  onChange={(e) => setEditedRange({ ...editedRange, warning: Number.parseFloat(e.target.value) })}
                  className="bg-white border-slate-300"
                />
              </div>
              <div>
                <Label className="text-xs text-slate-600">Critical Level</Label>
                <Input
                  type="number"
                  value={editedRange.critical ?? ""}
                  onChange={(e) => setEditedRange({ ...editedRange, critical: Number.parseFloat(e.target.value) })}
                  className="bg-white border-slate-300"
                />
              </div>
              <div>
                <Label className="text-xs text-slate-600">Target Optimum</Label>
                <Input
                  type="number"
                  value={editedRange.target ?? ""}
                  onChange={(e) => setEditedRange({ ...editedRange, target: Number.parseFloat(e.target.value) })}
                  className="bg-white border-slate-300"
                />
              </div>
            </div>
          </div>

          {/* Influencing Knobs */}
          <div className="bg-blue-50 rounded p-4 border border-blue-200">
            <h4 className="text-sm font-semibold text-slate-700 mb-3">Influencing Knobs</h4>
            <div className="space-y-2 text-sm text-slate-600">
              <div className="flex items-center justify-between">
                <span>• chunk_ms (Current: 250ms)</span>
                <Button size="sm" variant="outline" className="text-xs bg-transparent">
                  Adjust →
                </Button>
              </div>
              <div className="flex items-center justify-between">
                <span>• vad_threshold (Current: 0.5)</span>
                <Button size="sm" variant="outline" className="text-xs bg-transparent">
                  Adjust →
                </Button>
              </div>
              <div className="flex items-center justify-between">
                <span>• jitter_buffer (Current: 40ms)</span>
                <Button size="sm" variant="outline" className="text-xs bg-transparent">
                  Adjust →
                </Button>
              </div>
            </div>
          </div>

          {/* Actions */}
          <div className="flex gap-2 justify-end pt-4 border-t border-slate-200">
            <Button variant="outline" onClick={() => onOpenChange(false)} className="border-slate-300">
              Cancel
            </Button>
            <Button onClick={() => setEditedRange(range)} variant="outline" className="border-slate-300">
              Reset
            </Button>
            <Button onClick={handleSave} className="bg-blue-600 hover:bg-blue-700 text-white">
              Save as Default
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  )
}

function HistoricalChart({
  data,
  currentValue,
  target,
  min,
  max,
}: {
  data: number[]
  currentValue: number
  target?: number
  min: number
  max: number
}) {
  if (data.length === 0) return null

  const width = 100
  const height = 100
  const padding = 10

  const points = data
    .map((value, index) => {
      const x = (index / (data.length - 1)) * (width - 2 * padding) + padding
      const y = height - ((value - min) / (max - min)) * (height - 2 * padding) - padding
      return `${x},${y}`
    })
    .join(" ")

  const currentY = height - ((currentValue - min) / (max - min)) * (height - 2 * padding) - padding
  const targetY = target ? height - ((target - min) / (max - min)) * (height - 2 * padding) - padding : null

  return (
    <svg width="100%" height="100%" viewBox={`0 0 ${width} ${height}`} className="absolute inset-0">
      {/* Target line */}
      {targetY && (
        <>
          <line x1={padding} y1={targetY} x2={width - padding} y2={targetY} stroke="#94a3b8" strokeDasharray="2,2" />
          <text x={width - padding - 30} y={targetY - 2} fontSize="3" fill="#64748b">
            target
          </text>
        </>
      )}

      {/* Current line */}
      <line x1={padding} y1={currentY} x2={width - padding} y2={currentY} stroke="#3b82f6" strokeWidth="0.5" />
      <text x={width - padding - 30} y={currentY - 2} fontSize="3" fill="#3b82f6">
        current
      </text>

      {/* Data line */}
      <polyline points={points} fill="none" stroke="#10b981" strokeWidth="1" />
    </svg>
  )
}

function generateHistoricalData(currentValue: number, count: number): number[] {
  const data: number[] = []
  let value = currentValue

  for (let i = 0; i < count; i++) {
    value += (Math.random() - 0.5) * (currentValue * 0.1)
    data.push(value)
  }

  return data
}
