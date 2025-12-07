"use client"

import { useState } from "react"
import { Card } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Spinner } from "@/components/ui/spinner"
import { RotateCcw, Zap } from "lucide-react"

interface OptimizationLog {
  iteration: number
  recommendation: string
  applied: boolean
  improvement: number
  timestamp: string
  suggestedChanges: Array<{ knobName: string; newValue: number }>
}

interface AiOptimizationControllerProps {
  stationId: string
  stationName: string
  currentKnobs: Array<{ id: string; name: string; value: number; unit: string }>
  metrics: Array<{
    id: string
    name: string
    value: number
    minStandard: number
    desiredMin: number
    optimalPoint: number
    desiredMax: number
    maxStandard: number
  }>
  onKnobsUpdate: (knobs: Array<{ id: string; name: string; value: number; unit: string }>) => void
  onLogsUpdate: (logs: OptimizationLog[]) => void
}

export default function AiOptimizationController({
  stationId,
  stationName,
  currentKnobs,
  metrics,
  onKnobsUpdate,
  onLogsUpdate,
}: AiOptimizationControllerProps) {
  const [isRunning, setIsRunning] = useState(false)
  const [iteration, setIteration] = useState(0)
  const [logs, setLogs] = useState<OptimizationLog[]>([])
  const [currentRecommendation, setCurrentRecommendation] = useState<string | null>(null)

  const runOptimization = async () => {
    setIsRunning(true)
    const newLogs: OptimizationLog[] = [...logs]
    const currentKnobsCopy = [...currentKnobs]
    let currentMetrics = metrics.map((m) => ({
      name: m.name,
      value: m.value,
      min: m.minStandard,
      optimal: m.optimalPoint,
      max: m.maxStandard,
    }))

    for (let i = 0; i < 3; i++) {
      try {
        setIteration(i + 1)

        // Call optimization API
        const response = await fetch("/api/optimize-station", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            stationId,
            stationName,
            currentKnobs: currentKnobsCopy,
            metrics: currentMetrics,
            iteration: i + 1,
          }),
        })

        if (!response.ok) throw new Error("Optimization failed")
        const result = await response.json()

        setCurrentRecommendation(result.recommendation)

        // Apply suggested changes
        if (result.suggestedKnobChanges && result.suggestedKnobChanges.length > 0) {
          result.suggestedKnobChanges.forEach((change: any) => {
            const knobIndex = currentKnobsCopy.findIndex((k) => k.name.toLowerCase() === change.knobName.toLowerCase())
            if (knobIndex >= 0) {
              currentKnobsCopy[knobIndex].value = change.newValue
            }
          })
          onKnobsUpdate(currentKnobsCopy)
        }

        // Simulate metric improvements
        const improvementFactor = 1 + result.expectedImprovement / 100
        currentMetrics = currentMetrics.map((m) => ({
          ...m,
          value: Math.min(m.value * improvementFactor, m.max),
        }))

        // Add to logs
        const logEntry: OptimizationLog = {
          iteration: i + 1,
          recommendation: result.recommendation,
          applied: true,
          improvement: result.expectedImprovement,
          timestamp: new Date().toISOString(),
          suggestedChanges: result.suggestedKnobChanges || [],
        }
        newLogs.push(logEntry)
        setLogs(newLogs)
        onLogsUpdate(newLogs)

        // Wait before next iteration
        await new Promise((resolve) => setTimeout(resolve, 1000))
      } catch (error) {
        console.error(`Error in optimization iteration ${i + 1}:`, error)
        break
      }
    }

    setIsRunning(false)
  }

  const totalImprovement = logs.reduce((sum, log) => sum + log.improvement, 0)

  return (
    <div className="space-y-4">
      {/* Control Panel */}
      <div className="grid grid-cols-2 gap-3">
        <Button
          onClick={runOptimization}
          disabled={isRunning}
          className="bg-purple-600 hover:bg-purple-700 text-white gap-2"
        >
          {isRunning ? (
            <>
              <Spinner className="h-4 w-4" />
              Running... {iteration}/3
            </>
          ) : (
            <>
              <Zap className="h-4 w-4" />
              Start Optimization
            </>
          )}
        </Button>
        <Button
          variant="outline"
          onClick={() => {
            setLogs([])
            setIteration(0)
            setCurrentRecommendation(null)
          }}
          className="bg-slate-700 border-slate-600 text-white hover:bg-slate-600 gap-2"
        >
          <RotateCcw className="h-4 w-4" />
          Reset
        </Button>
      </div>

      {/* Progress Summary */}
      {logs.length > 0 && (
        <Card className="bg-slate-800/50 border-slate-700 p-4">
          <div className="space-y-2">
            <div className="flex justify-between items-center">
              <span className="text-sm font-medium text-slate-300">Total Iterations</span>
              <span className="text-lg font-bold text-blue-400">{logs.length}</span>
            </div>
            <div className="flex justify-between items-center">
              <span className="text-sm font-medium text-slate-300">Cumulative Improvement</span>
              <span className="text-lg font-bold text-green-400">+{totalImprovement.toFixed(1)}%</span>
            </div>
          </div>
        </Card>
      )}

      {/* Current Recommendation */}
      {currentRecommendation && (
        <Card className="bg-purple-900/20 border-purple-700/50 p-4">
          <h4 className="text-sm font-semibold text-purple-300 mb-2">Current AI Recommendation</h4>
          <p className="text-sm text-slate-200">{currentRecommendation}</p>
        </Card>
      )}

      {/* Optimization Log */}
      {logs.length > 0 && (
        <Card className="bg-slate-800/50 border-slate-700 p-4">
          <h4 className="text-sm font-semibold text-white mb-3">Optimization History</h4>
          <div className="space-y-2 max-h-48 overflow-y-auto">
            {logs.map((log) => (
              <div key={log.iteration} className="p-2 rounded bg-slate-900/50 border border-slate-700 text-xs">
                <div className="flex justify-between items-start">
                  <span className="font-medium text-blue-400">Iteration {log.iteration}</span>
                  <span className="font-bold text-green-400">+{log.improvement.toFixed(1)}%</span>
                </div>
                <p className="text-slate-400 mt-1 line-clamp-2">{log.recommendation}</p>
              </div>
            ))}
          </div>
        </Card>
      )}
    </div>
  )
}
