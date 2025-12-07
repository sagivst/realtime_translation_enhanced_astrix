"use client"

interface MetricRange {
  min: number
  max: number
  preferred?: { min: number; max: number }
  target: number
  actionSpace?: { min: number; max: number }
}

interface MetricBarProps {
  name: string
  value: number
  range: MetricRange
  unit: string
  onEdit?: () => void
  showEdit?: boolean
  compact?: boolean
  enableAI?: boolean
}

export default function MetricBar({
  name,
  value,
  range,
  unit,
  onEdit,
  showEdit = false,
  compact = false,
  enableAI = true,
}: MetricBarProps) {
  const { min, max, target, actionSpace } = range

  const valuePercent = ((value - min) / (max - min)) * 100
  const targetPercent = ((target - min) / (max - min)) * 100

  const actionSpaceMinPercent = actionSpace ? ((actionSpace.min - min) / (max - min)) * 100 : targetPercent - 10
  const actionSpaceMaxPercent = actionSpace ? ((actionSpace.max - min) / (max - min)) * 100 : targetPercent + 10

  const deviation = Math.abs(value - target)
  const maxDeviation = Math.max(target - min, max - target)
  const deviationPercent = (deviation / maxDeviation) * 100

  let boxStatus: "optimal" | "warning" | "critical"
  if (deviationPercent < 10) {
    boxStatus = "optimal"
  } else if (deviationPercent < 30) {
    boxStatus = "warning"
  } else {
    boxStatus = "critical"
  }

  const boxBorderColor =
    boxStatus === "optimal" ? "border-green-500" : boxStatus === "warning" ? "border-yellow-500" : "border-red-500"

  return (
    <div className={`border rounded ${boxBorderColor} ${compact ? "p-1" : "p-2"} bg-white shadow-sm`}>
      <div className="space-y-1">
        {/* Header */}
        <div className="flex items-center justify-between">
          <span className={compact ? "text-[10px] font-medium text-slate-700" : "text-xs font-medium text-slate-900"}>
            {name}
          </span>
          <div className="flex items-center gap-1">
            <span className={compact ? "text-[10px] font-mono text-slate-900" : "text-xs font-mono text-slate-900"}>
              {value.toFixed(1)} {unit}
            </span>
            {showEdit && onEdit && (
              <button
                onClick={onEdit}
                className="text-[10px] px-1 py-0.5 bg-slate-200 hover:bg-slate-300 rounded text-slate-700"
              >
                Edit
              </button>
            )}
          </div>
        </div>

        {/* Visual Bar */}
        <div className={`relative ${compact ? "h-3" : "h-4"} bg-slate-100 rounded overflow-hidden`}>
          {/* Red zone - left side */}
          <div
            className="absolute top-0 bottom-0 bg-red-50"
            style={{
              left: "0%",
              width: `${targetPercent}%`,
            }}
          />

          {/* Red zone - right side */}
          <div
            className="absolute top-0 bottom-0 bg-red-50"
            style={{
              left: `${targetPercent}%`,
              width: `${100 - targetPercent}%`,
            }}
          />

          {/* AI Action Space */}
          {enableAI && actionSpace && (
            <div
              className="absolute top-0 bottom-0 bg-blue-50/50 border-l border-r border-blue-200 border-dashed"
              style={{
                left: `${actionSpaceMinPercent}%`,
                width: `${actionSpaceMaxPercent - actionSpaceMinPercent}%`,
              }}
            />
          )}

          {/* Green zone around optimum */}
          <div
            className="absolute top-0 bottom-0 bg-green-50"
            style={{
              left: `${Math.max(0, targetPercent - 5)}%`,
              width: "10%",
            }}
          />

          {/* Optimum line (target) */}
          <div className="absolute top-0 bottom-0 w-px bg-green-600 z-10" style={{ left: `${targetPercent}%` }}>
            {!compact && (
              <>
                <div className="absolute -top-0.5 left-1/2 -translate-x-1/2 w-1 h-1 bg-green-600 rounded-full" />
                <div className="absolute -bottom-0.5 left-1/2 -translate-x-1/2 w-1 h-1 bg-green-600 rounded-full" />
              </>
            )}
          </div>

          {/* Current value indicator */}
          <div
            className="absolute top-0 bottom-0 w-px bg-slate-900 z-20 transition-all"
            style={{ left: `${Math.min(Math.max(valuePercent, 0), 100)}%` }}
          >
            <div
              className={`absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 ${compact ? "w-1.5 h-1.5" : "w-2 h-2"} bg-slate-900 rotate-45`}
            />
          </div>
        </div>

        {/* Labels */}
        {!compact && (
          <div className="flex justify-between text-[9px] text-slate-500 font-mono">
            <span>{min}</span>
            <span className="font-semibold text-green-600">Target: {target}</span>
            <span>{max}</span>
          </div>
        )}
      </div>
    </div>
  )
}
