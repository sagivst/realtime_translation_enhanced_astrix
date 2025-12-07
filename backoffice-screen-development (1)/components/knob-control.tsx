"use client"

import { useState } from "react"
import { Pencil, Check, X, Zap, Star, RotateCcw } from "lucide-react"
import { Input } from "@/components/ui/input"
import { Button } from "@/components/ui/button"
import IOSWheelPicker from "./ios-wheel-picker"
import { Card } from "@/components/ui/card"
import type { KnobConfig } from "@/config/knobs-config"

interface KnobControlProps {
  knob: KnobConfig
  value: number | boolean | string
  onChange?: (value: number | boolean | string) => void
  compact?: boolean
}

const formatNumber = (num: number): string => {
  return num % 1 === 0 ? num.toString() : num.toFixed(1)
}

export default function KnobControl({ knob, value, onChange, compact = false }: KnobControlProps) {
  const [isEditing, setIsEditing] = useState(false)
  const [editValue, setEditValue] = useState(value)
  const [editAiMin, setEditAiMin] = useState(0)
  const [editAiMax, setEditAiMax] = useState(0)
  const [aiEnabled, setAiEnabled] = useState(true)

  if (knob.type === "boolean") {
    const validOptions = ["OFF", "ON"]
    const recOptions = knob.recommendedValues || validOptions

    if (!validOptions || validOptions.length === 0) {
      return (
        <Card className={`border rounded border-slate-200 ${compact ? "p-1.5" : "p-1"} bg-white`}>
          <span className="text-xs text-red-500">Invalid boolean knob configuration</span>
        </Card>
      )
    }

    const boolValue = value === true || value === "true"
    const currentDisplayValue = boolValue ? "ON" : "OFF"
    const isInStandardRange = recOptions.includes(currentDisplayValue)

    const status: "optimal" | "warning" | "critical" = isInStandardRange ? "optimal" : "warning"
    const borderColor = status === "optimal" ? "border-green-700" : "border-slate-700"
    const bgColor = "bg-white"

    return (
      <Card
        className={`relative border rounded ${isEditing ? "border-blue-600" : borderColor} ${bgColor} ${compact ? "p-1.5" : "p-2"} transition-all shadow-sm`}
      >
        {aiEnabled && (
          <div className="absolute top-2 left-2 flex items-center gap-1 bg-blue-600 text-white px-2 py-1 rounded-full text-xs font-semibold z-10 shadow-sm">
            <Zap className="w-3 h-3 fill-current" />
            <span>AI</span>
          </div>
        )}

        {onChange && !isEditing && (
          <button
            onClick={() => {
              setEditValue(currentDisplayValue)
              setIsEditing(true)
            }}
            className="absolute top-2 right-2 p-1 text-slate-400 hover:text-slate-700 hover:bg-white rounded z-10"
          >
            <Pencil className="w-4 h-4" />
          </button>
        )}

        <div className="space-y-1">
          <div className="flex items-center justify-between pr-8" style={{ paddingLeft: aiEnabled ? "50px" : "0" }}>
            <span className={`${compact ? "text-xs" : "text-sm"} font-semibold text-slate-800`}>{knob.name}</span>
          </div>

          {!isEditing && (
            <div className="flex items-center justify-center py-1">
              <IOSWheelPicker
                items={validOptions}
                itemHeight={24}
                visibleCount={3}
                initialValue={currentDisplayValue}
                scaleConfig={{
                  top1: 0.25,
                  center: 1.0,
                  bottom1: 0.25,
                }}
              />
            </div>
          )}

          {isEditing && (
            <div className="relative space-y-3 p-4 bg-blue-50/30 rounded border border-blue-200">
              <button
                onClick={() => {
                  setEditValue(currentDisplayValue)
                  setIsEditing(false)
                }}
                className="absolute top-2 right-2 p-1 text-slate-400 hover:text-red-600 hover:bg-red-50 rounded z-20"
              >
                <X className="w-4 h-4" />
              </button>

              <div className="space-y-2 pr-6">
                <label className="text-xs font-medium text-slate-700">Select Value</label>
                <div className="bg-white border-2 border-slate-300 rounded-lg overflow-hidden">
                  {validOptions.map((v, idx) => (
                    <button
                      key={v}
                      onClick={() => setEditValue(v)}
                      className={`w-full px-4 py-3 text-left text-base font-medium transition-colors ${
                        editValue === v
                          ? "bg-blue-100 text-blue-700 border-l-4 border-blue-600"
                          : "bg-white text-slate-700 hover:bg-slate-50"
                      } ${idx > 0 ? "border-t border-slate-200" : ""}`}
                    >
                      {v}
                    </button>
                  ))}
                </div>
              </div>

              <div className="pt-3 border-t border-slate-300 space-y-3">
                <div className="flex items-center gap-3">
                  <span className="text-sm font-semibold text-slate-800">AI Control</span>
                  <button
                    onClick={() => setAiEnabled(!aiEnabled)}
                    className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${aiEnabled ? "bg-blue-600" : "bg-slate-300"}`}
                  >
                    <span
                      className={`inline-block h-4 w-4 transform rounded-full bg-white shadow-lg transition-transform ${aiEnabled ? "translate-x-6" : "translate-x-1"}`}
                    />
                  </button>
                  <span className={`text-xs font-medium ${aiEnabled ? "text-blue-700" : "text-slate-500"}`}>
                    {aiEnabled ? "Enabled" : "Disabled"}
                  </span>
                </div>
                <div className="flex justify-center gap-2 flex-wrap">
                  <Button
                    size="sm"
                    className="h-9 px-6 gap-2 bg-white hover:bg-slate-100 text-slate-800 border-2 border-slate-300 shadow-sm"
                    onClick={() => {
                      onChange?.(editValue === "ON")
                      setIsEditing(false)
                    }}
                  >
                    <Check className="w-4 h-4 text-green-600" />
                    Save
                  </Button>
                  <Button
                    size="sm"
                    variant="outline"
                    className="h-9 px-4 gap-2 bg-amber-50 hover:bg-amber-100 text-amber-800 border-2 border-amber-300"
                    onClick={() => {
                      onChange?.(editValue === "ON")
                      console.log("[v0] Saving as default:", editValue)
                      setIsEditing(false)
                    }}
                  >
                    <Star className="w-4 h-4" />
                    Save Default
                  </Button>
                  <Button
                    size="sm"
                    variant="outline"
                    className="h-9 px-3 gap-2 bg-slate-50 hover:bg-slate-100 text-slate-700 border-2 border-slate-300"
                    onClick={() => {
                      console.log("[v0] Restoring from defaults")
                      // Reset to default value logic here
                      setIsEditing(false)
                    }}
                  >
                    <RotateCcw className="w-3 h-3" />
                    Restore from Defaults
                  </Button>
                </div>
              </div>
            </div>
          )}

          {!compact && !isEditing && (
            <div className="space-y-0.5 pt-1 border-t border-slate-300">
              <div className="flex items-center gap-2 text-[9px]">
                <div className="flex items-center gap-1">
                  <div className="w-3 h-3 bg-green-200 border border-green-300 rounded" />
                  <span className="text-slate-600">Standard Range</span>
                </div>
                <div className="flex items-center gap-1">
                  <div className="w-3 h-3 bg-blue-300/50 border-2 border-blue-500 border-dashed rounded" />
                  <span className="text-slate-600">AI Range</span>
                </div>
              </div>
              <div className="flex items-center gap-2 text-[9px]">
                <div className="flex items-center gap-1">
                  <div className="w-1 h-3 bg-green-600 rounded" />
                  <span className="text-slate-600">Optimum</span>
                </div>
                <div className="flex items-center gap-1">
                  <div className="w-0 h-0 border-l-[4px] border-r-[4px] border-t-[6px] border-l-transparent border-r-transparent border-t-black" />
                  <span className="text-slate-600">Current Value</span>
                </div>
              </div>
            </div>
          )}
        </div>
      </Card>
    )
  }

  if (knob.type === "enum" && knob.validValues) {
    const validOptions = knob.validValues || []
    const recOptions = knob.recommendedValues || validOptions

    if (!validOptions || validOptions.length === 0) {
      return (
        <Card className={`border rounded border-slate-200 ${compact ? "p-1.5" : "p-1"} bg-white`}>
          <span className="text-xs text-red-500">Invalid enum knob configuration</span>
        </Card>
      )
    }

    const recommendedValues = knob.recommendedValues || []
    const isInStandardRange = recommendedValues.length === 0 || recommendedValues.includes(value)
    const status: "optimal" | "warning" | "critical" = isInStandardRange ? "optimal" : "warning"
    const borderColor = status === "optimal" ? "border-green-700" : "border-slate-700"
    const bgColor = "bg-white"

    return (
      <Card
        className={`relative border rounded ${isEditing ? "border-blue-600" : borderColor} ${bgColor} ${compact ? "p-1.5" : "p-2"} transition-all shadow-sm`}
      >
        {aiEnabled && (
          <div className="absolute top-2 left-2 flex items-center gap-1 bg-blue-600 text-white px-2 py-1 rounded-full text-xs font-semibold z-10 shadow-sm">
            <Zap className="w-3 h-3 fill-current" />
            <span>AI</span>
          </div>
        )}

        {onChange && !isEditing && (
          <button
            onClick={() => {
              setEditValue(value)
              setIsEditing(true)
            }}
            className="absolute top-2 right-2 p-1 text-slate-400 hover:text-slate-700 hover:bg-white rounded z-10"
          >
            <Pencil className="w-4 h-4" />
          </button>
        )}

        <div className="space-y-1">
          <div className="flex items-center justify-between pr-8" style={{ paddingLeft: aiEnabled ? "50px" : "0" }}>
            <span className={`${compact ? "text-xs" : "text-sm"} font-semibold text-slate-800`}>{knob.name}</span>
          </div>

          {!isEditing && (
            <div className="flex items-center justify-center py-1">
              <IOSWheelPicker
                items={knob.validValues}
                itemHeight={24}
                visibleCount={3}
                initialValue={value}
                scaleConfig={{
                  top1: 0.25,
                  center: 1.0,
                  bottom1: 0.25,
                }}
              />
            </div>
          )}

          {isEditing && (
            <div className="relative space-y-3 p-4 bg-blue-50/30 rounded border border-blue-200">
              <button
                onClick={() => {
                  setEditValue(value)
                  setIsEditing(false)
                }}
                className="absolute top-2 right-2 p-1 text-slate-400 hover:text-red-600 hover:bg-red-50 rounded z-20"
              >
                <X className="w-4 h-4" />
              </button>

              <div className="space-y-2 pr-6">
                <label className="text-xs font-medium text-slate-700">Select Value</label>
                <div className="bg-white border-2 border-slate-300 rounded-lg overflow-hidden max-h-48 overflow-y-auto">
                  {knob.validValues.map((v, idx) => (
                    <button
                      key={String(v)}
                      onClick={() => setEditValue(v)}
                      className={`w-full px-4 py-3 text-left text-base font-medium transition-colors ${
                        editValue === v
                          ? "bg-blue-100 text-blue-700 border-l-4 border-blue-600"
                          : "bg-white text-slate-700 hover:bg-slate-50"
                      } ${idx > 0 ? "border-t border-slate-200" : ""}`}
                    >
                      {String(v)}
                    </button>
                  ))}
                </div>
              </div>

              <div className="pt-3 border-t border-slate-300 space-y-3">
                <div className="flex items-center gap-3">
                  <span className="text-sm font-semibold text-slate-800">AI Control</span>
                  <button
                    onClick={() => setAiEnabled(!aiEnabled)}
                    className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${aiEnabled ? "bg-blue-600" : "bg-slate-300"}`}
                  >
                    <span
                      className={`inline-block h-4 w-4 transform rounded-full bg-white shadow-lg transition-transform ${aiEnabled ? "translate-x-6" : "translate-x-1"}`}
                    />
                  </button>
                  <span className={`text-xs font-medium ${aiEnabled ? "text-blue-700" : "text-slate-500"}`}>
                    {aiEnabled ? "Enabled" : "Disabled"}
                  </span>
                </div>
                <div className="flex justify-center gap-2 flex-wrap">
                  <Button
                    size="sm"
                    className="h-9 px-6 gap-2 bg-white hover:bg-slate-100 text-slate-800 border-2 border-slate-300 shadow-sm"
                    onClick={() => {
                      onChange?.(editValue)
                      setIsEditing(false)
                    }}
                  >
                    <Check className="w-4 h-4 text-green-600" />
                    Save
                  </Button>
                  <Button
                    size="sm"
                    variant="outline"
                    className="h-9 px-4 gap-2 bg-amber-50 hover:bg-amber-100 text-amber-800 border-2 border-amber-300"
                    onClick={() => {
                      onChange?.(editValue)
                      console.log("[v0] Saving as default:", editValue)
                      setIsEditing(false)
                    }}
                  >
                    <Star className="w-4 h-4" />
                    Save Default
                  </Button>
                  <Button
                    size="sm"
                    variant="outline"
                    className="h-9 px-3 gap-2 bg-slate-50 hover:bg-slate-100 text-slate-700 border-2 border-slate-300"
                    onClick={() => {
                      console.log("[v0] Restoring from defaults for enum")
                      setIsEditing(false)
                    }}
                  >
                    <RotateCcw className="w-3 h-3" />
                    Restore from Defaults
                  </Button>
                </div>
              </div>
            </div>
          )}

          {!compact && (
            <div className="grid grid-cols-5 text-[10px] text-slate-700 font-mono gap-1 pt-0.5">
              <div className="text-left font-semibold">
                {formatNumber(knob.validRange?.min != null ? knob.validRange.min : 0)}
              </div>
              <div className="text-center font-semibold">
                {formatNumber(knob.recommendedRange?.min != null ? knob.recommendedRange.min : 0)}
              </div>
              <div className="text-center font-bold text-green-700">
                {formatNumber(knob.optimum != null ? knob.optimum : 0)}
              </div>
              <div className="text-center font-semibold">
                {formatNumber(knob.recommendedRange?.max != null ? knob.recommendedRange.max : 0)}
              </div>
              <div className="text-right font-semibold">
                {formatNumber(knob.validRange?.max != null ? knob.validRange.max : 0)}
              </div>
            </div>
          )}

          {!compact && !isEditing && (
            <div className="space-y-0.5 pt-1 border-t border-slate-300">
              <div className="flex items-center gap-2 text-[9px]">
                <div className="flex items-center gap-1">
                  <div className="w-3 h-3 bg-green-200 border border-green-300 rounded" />
                  <span className="text-slate-600">Standard Range</span>
                </div>
                <div className="flex items-center gap-1">
                  <div className="w-3 h-3 bg-blue-300/50 border-2 border-blue-500 border-dashed rounded" />
                  <span className="text-slate-600">AI Range</span>
                </div>
              </div>
              <div className="flex items-center gap-2 text-[9px]">
                <div className="flex items-center gap-1">
                  <div className="w-1 h-3 bg-green-600 rounded" />
                  <span className="text-slate-600">Optimum</span>
                </div>
                <div className="flex items-center gap-1">
                  <div className="w-0 h-0 border-l-[4px] border-r-[4px] border-t-[6px] border-l-transparent border-r-transparent border-t-black" />
                  <span className="text-slate-600">Current Value</span>
                </div>
              </div>
            </div>
          )}
        </div>
      </Card>
    )
  }

  const numValue = typeof value === "number" ? value : Number.parseFloat(String(value)) || 0

  if (!knob.validRange || !knob.recommendedRange || !knob.aiAdjustmentRange) {
    return (
      <Card className={`border rounded border-slate-200 ${compact ? "p-1.5" : "p-1"} bg-white`}>
        <span className="text-xs text-red-500">Invalid knob configuration</span>
      </Card>
    )
  }

  const { min: validMin, max: validMax } = knob.validRange
  const { min: recMin, max: recMax } = knob.recommendedRange
  const { min: aiMin, max: aiMax } = knob.aiAdjustmentRange
  const optimum = knob.optimum ?? (recMin + recMax) / 2

  const isInRecommended = numValue >= recMin && numValue <= recMax
  const isInAiRange = numValue >= aiMin && numValue <= aiMax
  const deviation = Math.abs(numValue - optimum)
  const maxDeviation = Math.max(optimum - validMin, validMax - optimum)
  const deviationPercent = (deviation / maxDeviation) * 100

  let status: "optimal" | "warning" | "critical"
  if (isInRecommended && deviationPercent < 15) {
    status = "optimal"
  } else if (isInAiRange) {
    status = "warning"
  } else {
    status = "critical"
  }

  const borderColor =
    status === "optimal" ? "border-green-700" : status === "warning" ? "border-yellow-600" : "border-red-700"
  const bgColor = "bg-white"
  const valuePosition = ((numValue - validMin) / (validMax - validMin)) * 100
  const optimumPosition = ((optimum - validMin) / (validMax - validMin)) * 100

  return (
    <Card
      className={`relative border rounded ${isEditing ? "border-blue-600" : borderColor} ${bgColor} ${compact ? "p-1.5" : "p-2"} transition-all shadow-sm`}
    >
      {aiEnabled && (
        <div className="absolute top-2 left-2 flex items-center gap-1 bg-blue-600 text-white px-2 py-1 rounded-full text-xs font-semibold z-10 shadow-sm">
          <Zap className="w-3 h-3 fill-current" />
          <span>AI</span>
        </div>
      )}

      {onChange && !isEditing && (
        <button
          onClick={() => {
            setEditValue(numValue)
            setEditAiMin(aiMin)
            setEditAiMax(aiMax)
            setIsEditing(true)
          }}
          className="absolute top-2 right-2 p-1 text-slate-400 hover:text-slate-700 hover:bg-white rounded z-10"
        >
          <Pencil className="w-4 h-4" />
        </button>
      )}

      <div className="space-y-1.5">
        <div className="flex items-center justify-between pr-8" style={{ paddingLeft: aiEnabled ? "50px" : "0" }}>
          <span className={`${compact ? "text-xs" : "text-sm"} font-semibold text-slate-800`}>{knob.name}</span>
          <div className="flex flex-col items-end">
            <span
              className={`${compact ? "text-lg" : "text-2xl"} font-mono font-bold ${status === "optimal" ? "text-green-700" : status === "warning" ? "text-slate-700" : "text-red-700"}`}
            >
              {formatNumber(numValue)}
            </span>
            <span className="text-xs text-slate-500 -mt-1">{knob.unit}</span>
          </div>
        </div>

        {isEditing && (
          <div className="relative space-y-3 p-4 bg-blue-50/30 rounded border border-blue-200">
            <button
              onClick={() => {
                setEditValue(numValue)
                setEditAiMin(aiMin)
                setEditAiMax(aiMax)
                setIsEditing(false)
              }}
              className="absolute top-2 right-2 p-1 text-slate-400 hover:text-red-600 hover:bg-red-50 rounded z-20"
            >
              <X className="w-4 h-4" />
            </button>

            <div className="space-y-1 pr-6">
              <label className="text-xs font-medium text-slate-700">Manual Value</label>
              <div className="flex items-center gap-2">
                <Input
                  type="number"
                  value={editValue}
                  onChange={(e) => setEditValue(Number.parseFloat(e.target.value))}
                  min={aiMin}
                  max={aiMax}
                  step={0.1}
                  className="text-sm h-8 w-24 font-mono text-right px-2"
                />
                <span className="text-xs text-slate-500">{knob.unit}</span>
              </div>
            </div>

            <div className="space-y-1">
              <label className="text-xs font-medium text-slate-700">AI Adjustment Range</label>
              <div className="flex items-center gap-2">
                <Input
                  type="number"
                  value={editAiMin}
                  onChange={(e) => setEditAiMin(Number.parseFloat(e.target.value))}
                  min={validMin}
                  max={validMax}
                  step={0.1}
                  className="text-xs h-7 w-20 font-mono px-2"
                />
                <span className="text-xs">to</span>
                <Input
                  type="number"
                  value={editAiMax}
                  onChange={(e) => setEditAiMax(Number.parseFloat(e.target.value))}
                  min={validMin}
                  max={validMax}
                  step={0.1}
                  className="text-xs h-7 w-20 font-mono px-2"
                />
              </div>
            </div>

            <div className="pt-3 border-t border-slate-300 space-y-3">
              <div className="flex items-center gap-3">
                <span className="text-sm font-semibold text-slate-800">AI Control</span>
                <button
                  onClick={() => setAiEnabled(!aiEnabled)}
                  className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${aiEnabled ? "bg-blue-600" : "bg-slate-300"}`}
                >
                  <span
                    className={`inline-block h-4 w-4 transform rounded-full bg-white shadow-lg transition-transform ${aiEnabled ? "translate-x-6" : "translate-x-1"}`}
                  />
                </button>
                <span className={`text-xs font-medium ${aiEnabled ? "text-blue-700" : "text-slate-500"}`}>
                  {aiEnabled ? "Enabled" : "Disabled"}
                </span>
              </div>
              <div className="flex justify-center gap-2 flex-wrap">
                <Button
                  size="sm"
                  className="h-9 px-6 gap-2 bg-white hover:bg-slate-100 text-slate-800 border-2 border-slate-300 shadow-sm"
                  onClick={() => {
                    const newVal = Number(editValue)
                    if (newVal >= editAiMin && newVal <= editAiMax) {
                      onChange?.(newVal)
                      setIsEditing(false)
                    } else {
                      alert(`Value must be within AI range: ${editAiMin}-${editAiMax}`)
                    }
                  }}
                >
                  <Check className="w-4 h-4 text-green-600" />
                  Save
                </Button>
                <Button
                  size="sm"
                  variant="outline"
                  className="h-9 px-4 gap-2 bg-amber-50 hover:bg-amber-100 text-amber-800 border-2 border-amber-300"
                  onClick={() => {
                    const newVal = Number(editValue)
                    if (newVal >= editAiMin && newVal <= editAiMax) {
                      onChange?.(newVal)
                      console.log("[v0] Saving as default:", newVal)
                      setIsEditing(false)
                    } else {
                      alert(`Value must be within AI range: ${editAiMin}-${editAiMax}`)
                    }
                  }}
                >
                  <Star className="w-4 h-4" />
                  Save Default
                </Button>
                <Button
                  size="sm"
                  variant="outline"
                  className="h-9 px-3 gap-2 bg-slate-50 hover:bg-slate-100 text-slate-700 border-2 border-slate-300"
                  onClick={() => {
                    console.log("[v0] Restoring from defaults for numeric knob")
                    setIsEditing(false)
                  }}
                >
                  <RotateCcw className="w-3 h-3" />
                  Restore from Defaults
                </Button>
              </div>
            </div>
          </div>
        )}

        <div className={`relative ${compact ? "h-6" : "h-7"} bg-slate-200 rounded overflow-visible`}>
          <div
            className="absolute inset-y-0 bg-green-200"
            style={{
              left: `${((recMin - validMin) / (validMax - validMin)) * 100}%`,
              right: `${100 - ((recMax - validMin) / (validMax - validMin)) * 100}%`,
            }}
          />

          <div
            className="absolute inset-y-0 bg-blue-300/50 border-x-2 border-blue-500 border-dashed"
            style={{
              left: `${((aiMin - validMin) / (validMax - validMin)) * 100}%`,
              right: `${100 - ((aiMax - validMin) / (validMax - validMin)) * 100}%`,
            }}
          />

          <div
            className="absolute inset-y-0 w-1.5 bg-green-600 z-10"
            style={{
              left: `${optimumPosition}%`,
              transform: "translateX(-50%)",
            }}
          />

          <div
            className="absolute inset-y-0 w-0.5 bg-black z-20"
            style={{
              left: `${valuePosition}%`,
              transform: "translateX(-50%)",
            }}
          />

          <div
            className="absolute -top-2 z-30"
            style={{
              left: `${valuePosition}%`,
              transform: "translateX(-50%)",
            }}
          >
            <div className="w-0 h-0 border-l-[6px] border-r-[6px] border-t-[8px] border-l-transparent border-r-transparent border-t-black" />
          </div>
        </div>

        {!compact && (
          <div className="grid grid-cols-5 text-[10px] text-slate-700 font-mono gap-1 pt-0.5">
            <div className="text-left font-semibold">
              {formatNumber(knob.validRange?.min != null ? knob.validRange.min : 0)}
            </div>
            <div className="text-center font-semibold">
              {formatNumber(knob.recommendedRange?.min != null ? knob.recommendedRange.min : 0)}
            </div>
            <div className="text-center font-bold text-green-700">
              {formatNumber(knob.optimum != null ? knob.optimum : 0)}
            </div>
            <div className="text-center font-semibold">
              {formatNumber(knob.recommendedRange?.max != null ? knob.recommendedRange.max : 0)}
            </div>
            <div className="text-right font-semibold">
              {formatNumber(knob.validRange?.max != null ? knob.validRange.max : 0)}
            </div>
          </div>
        )}

        {!compact && !isEditing && (
          <div className="space-y-0.5 pt-1 border-t border-slate-300">
            <div className="flex items-center gap-2 text-[9px]">
              <div className="flex items-center gap-1">
                <div className="w-3 h-3 bg-green-200 border border-green-300 rounded" />
                <span className="text-slate-600">Standard Range</span>
              </div>
              <div className="flex items-center gap-1">
                <div className="w-3 h-3 bg-blue-300/50 border-2 border-blue-500 border-dashed rounded" />
                <span className="text-slate-600">AI Range</span>
              </div>
            </div>
            <div className="flex items-center gap-2 text-[9px]">
              <div className="flex items-center gap-1">
                <div className="w-1 h-3 bg-green-600 rounded" />
                <span className="text-slate-600">Optimum</span>
              </div>
              <div className="flex items-center gap-1">
                <div className="w-0 h-0 border-l-[4px] border-r-[4px] border-t-[6px] border-l-transparent border-r-transparent border-t-black" />
                <span className="text-slate-600">Current Value</span>
              </div>
            </div>
          </div>
        )}
      </div>
    </Card>
  )
}
