"use client"

import { useState } from "react"
import { Card } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { ChevronDown, Zap, Play, Pause, Clock, Calendar, PhoneOff } from "lucide-react"
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible"
import AiOptimizationLog from "@/components/ai-optimization-log"
import WaveformDisplay from "@/components/waveform-display"
import type { AILogEntry } from "@/types/monitoring"

interface GlobalAiPanelProps {
  onOptimizeAll: () => void
  isOptimizing: boolean
  aiLog?: AILogEntry[]
}

export default function GlobalAiPanel({ onOptimizeAll, isOptimizing, aiLog = [] }: GlobalAiPanelProps) {
  const [isOpen, setIsOpen] = useState(false)
  const [isLogOpen, setIsLogOpen] = useState(true)

  const [schedulerEnabled, setSchedulerEnabled] = useState(false)
  const [scheduleMode, setScheduleMode] = useState<"interval" | "daily" | "custom">("interval")
  const [intervalMinutes, setIntervalMinutes] = useState(30)
  const [dailyTime, setDailyTime] = useState("02:00")
  const [selectedDays, setSelectedDays] = useState<string[]>(["Mon", "Tue", "Wed", "Thu", "Fri"])
  const [pauseOnAsteriskIdle, setPauseOnAsteriskIdle] = useState(false)

  const toggleDay = (day: string) => {
    setSelectedDays((prev) => (prev.includes(day) ? prev.filter((d) => d !== day) : [...prev, day]))
  }

  return (
    <Collapsible open={isOpen} onOpenChange={setIsOpen}>
      <Card className="bg-gradient-to-r from-purple-50 to-blue-50 border-purple-200">
        <CollapsibleTrigger asChild>
          <button className="w-full flex items-center justify-between p-4 hover:bg-white/50 transition-colors">
            <div className="flex items-center gap-3">
              <Zap className="h-5 w-5 text-purple-600" />
              <h3 className="text-sm font-semibold text-slate-900">
                Global AI Optimization Panel - {schedulerEnabled ? "Scheduled Mode" : "Currently Manual Mode"}
              </h3>
              {schedulerEnabled && (
                <span className="text-xs bg-green-100 text-green-700 px-2 py-0.5 rounded-full flex items-center gap-1">
                  <Clock className="h-3 w-3" />
                  Active
                </span>
              )}
            </div>
            <ChevronDown className={`h-5 w-5 text-slate-600 transition-transform ${isOpen ? "rotate-180" : ""}`} />
          </button>
        </CollapsibleTrigger>
        <CollapsibleContent>
          <div className="px-4 pb-4 border-t border-purple-200 pt-4 space-y-4">
            <div className="bg-white rounded p-4 border border-slate-200">
              <WaveformDisplay />
            </div>

            <div className="grid grid-cols-3 gap-4">
              <div className="bg-white rounded p-3 border border-slate-200">
                <div className="text-xs text-slate-600 mb-1">Stations Active</div>
                <div className="text-xl font-semibold text-slate-900">10 / 11</div>
              </div>
              <div className="bg-white rounded p-3 border border-slate-200">
                <div className="text-xs text-slate-600 mb-1">Avg System Latency</div>
                <div className="text-xl font-semibold text-slate-900">182ms</div>
              </div>
              <div className="bg-white rounded p-3 border border-slate-200">
                <div className="text-xs text-slate-600 mb-1">Overall MOS Score</div>
                <div className="text-xl font-semibold text-green-600">4.6</div>
              </div>
            </div>

            <div className="bg-white rounded p-4 border border-slate-200">
              <div className="flex items-center justify-between mb-3">
                <h4 className="text-sm font-semibold text-slate-700 flex items-center gap-2">
                  <Calendar className="h-4 w-4" />
                  Scheduler Settings
                </h4>
                <button
                  onClick={() => setSchedulerEnabled(!schedulerEnabled)}
                  className={`relative w-12 h-6 rounded-full transition-colors ${
                    schedulerEnabled ? "bg-green-500" : "bg-slate-300"
                  }`}
                >
                  <div
                    className={`absolute top-1 w-4 h-4 bg-white rounded-full shadow transition-transform ${
                      schedulerEnabled ? "translate-x-7" : "translate-x-1"
                    }`}
                  />
                </button>
              </div>

              {schedulerEnabled && (
                <div className="space-y-3 border-t border-slate-100 pt-3">
                  <div className="flex items-center justify-between p-2 bg-amber-50 border border-amber-200 rounded">
                    <div className="flex items-center gap-2">
                      <PhoneOff className="h-4 w-4 text-amber-600" />
                      <span className="text-xs text-amber-800 font-medium">Pause on Asterisk Idle</span>
                    </div>
                    <button
                      onClick={() => setPauseOnAsteriskIdle(!pauseOnAsteriskIdle)}
                      className={`relative w-10 h-5 rounded-full transition-colors ${
                        pauseOnAsteriskIdle ? "bg-amber-500" : "bg-slate-300"
                      }`}
                    >
                      <div
                        className={`absolute top-0.5 w-4 h-4 bg-white rounded-full shadow transition-transform ${
                          pauseOnAsteriskIdle ? "translate-x-5" : "translate-x-0.5"
                        }`}
                      />
                    </button>
                  </div>
                  {pauseOnAsteriskIdle && (
                    <div className="text-xs text-amber-700 bg-amber-50/50 p-2 rounded border border-amber-100">
                      AI optimization will pause automatically when Asterisk has no active calls
                    </div>
                  )}

                  <div className="flex gap-2">
                    <button
                      onClick={() => setScheduleMode("interval")}
                      className={`px-3 py-1.5 text-xs rounded border transition-colors ${
                        scheduleMode === "interval"
                          ? "bg-purple-100 border-purple-300 text-purple-700"
                          : "bg-slate-50 border-slate-200 text-slate-600"
                      }`}
                    >
                      Interval
                    </button>
                    <button
                      onClick={() => setScheduleMode("daily")}
                      className={`px-3 py-1.5 text-xs rounded border transition-colors ${
                        scheduleMode === "daily"
                          ? "bg-purple-100 border-purple-300 text-purple-700"
                          : "bg-slate-50 border-slate-200 text-slate-600"
                      }`}
                    >
                      Daily
                    </button>
                    <button
                      onClick={() => setScheduleMode("custom")}
                      className={`px-3 py-1.5 text-xs rounded border transition-colors ${
                        scheduleMode === "custom"
                          ? "bg-purple-100 border-purple-300 text-purple-700"
                          : "bg-slate-50 border-slate-200 text-slate-600"
                      }`}
                    >
                      Custom
                    </button>
                  </div>

                  {scheduleMode === "interval" && (
                    <div className="flex items-center gap-2">
                      <span className="text-xs text-slate-600">Run every</span>
                      <select
                        value={intervalMinutes}
                        onChange={(e) => setIntervalMinutes(Number(e.target.value))}
                        className="border border-slate-200 rounded px-2 py-1 text-xs bg-white"
                      >
                        <option value={5}>5 min</option>
                        <option value={10}>10 min</option>
                        <option value={15}>15 min</option>
                        <option value={30}>30 min</option>
                        <option value={60}>1 hour</option>
                        <option value={120}>2 hours</option>
                        <option value={360}>6 hours</option>
                      </select>
                      <span className="text-xs text-slate-500">Next run: {intervalMinutes} min</span>
                    </div>
                  )}

                  {scheduleMode === "daily" && (
                    <div className="flex items-center gap-2">
                      <span className="text-xs text-slate-600">Run daily at</span>
                      <input
                        type="time"
                        value={dailyTime}
                        onChange={(e) => setDailyTime(e.target.value)}
                        className="border border-slate-200 rounded px-2 py-1 text-xs bg-white"
                      />
                    </div>
                  )}

                  {scheduleMode === "custom" && (
                    <div className="space-y-2">
                      <div className="flex items-center gap-2">
                        <span className="text-xs text-slate-600">Time:</span>
                        <input
                          type="time"
                          value={dailyTime}
                          onChange={(e) => setDailyTime(e.target.value)}
                          className="border border-slate-200 rounded px-2 py-1 text-xs bg-white"
                        />
                      </div>
                      <div className="flex items-center gap-1">
                        <span className="text-xs text-slate-600 mr-1">Days:</span>
                        {["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"].map((day) => (
                          <button
                            key={day}
                            onClick={() => toggleDay(day)}
                            className={`w-8 h-6 text-xs rounded transition-colors ${
                              selectedDays.includes(day) ? "bg-purple-500 text-white" : "bg-slate-100 text-slate-500"
                            }`}
                          >
                            {day.charAt(0)}
                          </button>
                        ))}
                      </div>
                    </div>
                  )}

                  <div className="text-xs text-slate-500 bg-slate-50 p-2 rounded">
                    {scheduleMode === "interval" &&
                      `AI optimization will run automatically every ${intervalMinutes} minutes`}
                    {scheduleMode === "daily" && `AI optimization will run daily at ${dailyTime}`}
                    {scheduleMode === "custom" &&
                      `AI optimization will run at ${dailyTime} on ${selectedDays.join(", ")}`}
                  </div>
                </div>
              )}
            </div>

            <div className="bg-white rounded p-4 border border-slate-200">
              <h4 className="text-sm font-semibold text-slate-700 mb-3">AI Optimization Options</h4>
              <div className="space-y-2 text-sm">
                <label className="flex items-center gap-2">
                  <input type="checkbox" defaultChecked className="rounded" />
                  <span className="text-slate-700">Optimize for Low Latency</span>
                </label>
                <label className="flex items-center gap-2">
                  <input type="checkbox" defaultChecked className="rounded" />
                  <span className="text-slate-700">Optimize for Audio Quality</span>
                </label>
                <label className="flex items-center gap-2">
                  <input type="checkbox" className="rounded" />
                  <span className="text-slate-700">Aggressive Tuning (May cause instability)</span>
                </label>
              </div>
            </div>

            <div className="flex gap-2">
              <Button
                onClick={onOptimizeAll}
                disabled={isOptimizing}
                className="bg-purple-600 hover:bg-purple-700 text-white flex-1 gap-2"
              >
                {isOptimizing ? (
                  <>
                    <Pause className="h-4 w-4" />
                    Optimizing All Stations...
                  </>
                ) : (
                  <>
                    <Play className="h-4 w-4" />
                    Run AI Optimization on All Stations
                  </>
                )}
              </Button>
            </div>

            <AiOptimizationLog logs={aiLog} />
          </div>
        </CollapsibleContent>
      </Card>
    </Collapsible>
  )
}
