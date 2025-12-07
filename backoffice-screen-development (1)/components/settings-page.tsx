"use client"

import { useState } from "react"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { ScrollArea } from "@/components/ui/scroll-area"
import { Button } from "@/components/ui/button"
import { Save, Star, RotateCcw } from "lucide-react"
import { KNOBS_CONFIG } from "@/config/knobs-config"
import { METRIC_DEFINITIONS } from "@/types/monitoring"
import { STATION_DEFINITIONS } from "@/types/monitoring"
import { Switch } from "@/components/ui/switch"

export default function SettingsPage() {
  const [activeTab, setActiveTab] = useState("knobs")
  const [selectedStation, setSelectedStation] = useState<string | null>(null)
  const [knobEdits, setKnobEdits] = useState<Record<string, any>>({})
  const [metricEdits, setMetricEdits] = useState<Record<string, any>>({})
  const [saving, setSaving] = useState(false)

  const handleSaveKnob = async (knobId: string, stationId: string, extension: string) => {
    setSaving(true)
    try {
      const response = await fetch(`/api/config/knobs/${stationId}/${extension}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          knobId,
          ...knobEdits[knobId],
        }),
      })

      if (!response.ok) throw new Error("Failed to save")

      const newEdits = { ...knobEdits }
      delete newEdits[knobId]
      setKnobEdits(newEdits)

      alert("Knob configuration saved successfully!")
    } catch (error) {
      console.error("Failed to save knob:", error)
      alert("Failed to save knob configuration")
    } finally {
      setSaving(false)
    }
  }

  const handleSaveKnobDefault = async (knobId: string) => {
    setSaving(true)
    try {
      const response = await fetch("/api/config/knobs/defaults", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          knobId,
          ...knobEdits[knobId],
        }),
      })

      if (!response.ok) throw new Error("Failed to save default")

      alert("Default configuration saved successfully!")
    } catch (error) {
      console.error("Failed to save default:", error)
      alert("Failed to save default configuration")
    } finally {
      setSaving(false)
    }
  }

  const handleRestoreKnobDefault = async (knobId: string, stationId: string, extension: string) => {
    setSaving(true)
    try {
      const response = await fetch("/api/config/knobs/defaults")

      if (!response.ok) throw new Error("Failed to fetch defaults")

      const defaults = await response.json()

      await fetch(`/api/config/knobs/${stationId}/${extension}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          knobId,
          ...defaults[knobId],
        }),
      })

      alert("Default configuration restored successfully!")
      window.location.reload()
    } catch (error) {
      console.error("Failed to restore defaults:", error)
      alert("Failed to restore default configuration")
    } finally {
      setSaving(false)
    }
  }

  const handleSaveMetric = async (metricId: string) => {
    setSaving(true)
    try {
      const response = await fetch("/api/config/metrics", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          metricId,
          ...metricEdits[metricId],
        }),
      })

      if (!response.ok) throw new Error("Failed to save")

      const newEdits = { ...metricEdits }
      delete newEdits[metricId]
      setMetricEdits(newEdits)

      alert("Metric configuration saved successfully!")
    } catch (error) {
      console.error("Failed to save metric:", error)
      alert("Failed to save metric configuration")
    } finally {
      setSaving(false)
    }
  }

  const handleSaveMetricDefault = async (metricId: string) => {
    setSaving(true)
    try {
      const response = await fetch("/api/config/metrics/defaults", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          metricId,
          ...metricEdits[metricId],
        }),
      })

      if (!response.ok) throw new Error("Failed to save default")

      alert("Default metric configuration saved successfully!")
    } catch (error) {
      console.error("Failed to save default:", error)
      alert("Failed to save default configuration")
    } finally {
      setSaving(false)
    }
  }

  const handleRestoreMetricDefault = async (metricId: string) => {
    setSaving(true)
    try {
      const response = await fetch("/api/config/metrics/defaults")

      if (!response.ok) throw new Error("Failed to fetch defaults")

      const defaults = await response.json()

      await fetch("/api/config/metrics", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          metricId,
          ...defaults[metricId],
        }),
      })

      alert("Default metric configuration restored successfully!")
      window.location.reload()
    } catch (error) {
      console.error("Failed to restore defaults:", error)
      alert("Failed to restore default configuration")
    } finally {
      setSaving(false)
    }
  }

  const knobsByCategory = Object.values(KNOBS_CONFIG).reduce(
    (acc, knob) => {
      const category = knob.category
      if (!acc[category]) {
        acc[category] = []
      }
      acc[category].push(knob)
      return acc
    },
    {} as Record<string, (typeof KNOBS_CONFIG)[keyof typeof KNOBS_CONFIG][]>,
  )

  const metricsByCategory = Object.values(METRIC_DEFINITIONS).reduce(
    (acc, metric) => {
      const category = metric.category
      if (!acc[category]) {
        acc[category] = []
      }
      acc[category].push(metric)
      return acc
    },
    {} as Record<string, (typeof METRIC_DEFINITIONS)[keyof typeof METRIC_DEFINITIONS][]>,
  )

  return (
    <div className="bg-slate-50 border border-slate-200 rounded-lg">
      <div className="border-b border-slate-200 px-6 py-4 bg-white">
        <h2 className="text-xl font-semibold text-slate-900">System Configuration</h2>
        <p className="text-sm text-slate-500 mt-1">Configure system knobs and metrics thresholds</p>
      </div>

      <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
        <div className="border-b border-slate-200 px-6">
          <TabsList className="grid w-full max-w-2xl grid-cols-2 bg-slate-100">
            <TabsTrigger value="knobs">
              Knobs Display Configuration ({Object.keys(KNOBS_CONFIG).length} × 16 sets)
            </TabsTrigger>
            <TabsTrigger value="metrics">Metrics Configuration ({Object.keys(METRIC_DEFINITIONS).length})</TabsTrigger>
          </TabsList>
        </div>

        <TabsContent value="knobs" className="px-6 py-4">
          <ScrollArea className="h-[calc(100vh-300px)]">
            <div className="space-y-6 pr-4">
              {!selectedStation ? (
                <>
                  <div className="text-sm text-slate-600 mb-4">
                    Select a monitoring station to configure its knobs for both extensions (3333 and 4444). Each station
                    has {Object.keys(KNOBS_CONFIG).length} knobs across multiple categories.
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    {STATION_DEFINITIONS.map((station) => (
                      <button
                        key={station.id}
                        onClick={() => setSelectedStation(station.id)}
                        className="border-2 border-slate-300 rounded-lg bg-white hover:border-blue-500 hover:shadow-lg transition-all p-4 text-left"
                      >
                        <div className="font-bold text-slate-900 text-base mb-1">{station.name}</div>
                        <div className="text-xs text-slate-500 mb-2">{station.id}</div>
                        <div className="text-sm text-slate-600">{station.description}</div>
                        <div className="text-xs text-blue-600 mt-3 font-semibold">
                          Extensions: {station.extensions.join(", ")}
                        </div>
                      </button>
                    ))}
                  </div>
                </>
              ) : (
                <>
                  <div className="mb-4">
                    <button
                      onClick={() => setSelectedStation(null)}
                      className="text-sm text-blue-600 hover:text-blue-800 font-medium"
                    >
                      ← Back to Station Selection
                    </button>
                  </div>

                  {(() => {
                    const station = STATION_DEFINITIONS.find((s) => s.id === selectedStation)
                    if (!station) return null

                    return (
                      <>
                        <div className="text-sm text-slate-600 mb-4">
                          Configuring knobs for <strong>{station.name}</strong> ({station.description}). Configure valid
                          ranges and recommended ranges for all knobs across both extensions (3333 and 4444).
                        </div>

                        {station.extensions.map((extension) => (
                          <div
                            key={`${station.id}-${extension}`}
                            className="border-2 border-blue-400 rounded-lg bg-blue-50 shadow-md"
                          >
                            <div className="bg-blue-600 px-4 py-3 rounded-t-lg border-b-2 border-blue-700">
                              <h2 className="text-base font-bold text-white">
                                {station.name} / Extension {extension}
                                {station.extensionLabels?.[extension] && ` - ${station.extensionLabels[extension]}`} (
                                {Object.keys(KNOBS_CONFIG).length} knobs)
                              </h2>
                            </div>

                            <div className="p-4 space-y-4">
                              {Object.entries(knobsByCategory).map(([category, knobs]) => (
                                <div key={category} className="border border-slate-300 rounded-lg bg-white">
                                  <div className="bg-slate-200 px-4 py-2 rounded-t-lg border-b border-slate-300">
                                    <h3 className="text-sm font-bold text-slate-900 uppercase">
                                      {category} ({knobs.length} knobs)
                                    </h3>
                                  </div>
                                  <div className="p-4 space-y-3">
                                    {knobs.map((knob) => (
                                      <div
                                        key={`${station.id}-${extension}-${knob.id}`}
                                        className="bg-white border border-slate-200 rounded p-3 hover:border-slate-300 transition-colors"
                                      >
                                        <div className="flex items-start justify-between mb-2">
                                          <div>
                                            <div className="font-semibold text-slate-900 text-sm">{knob.name}</div>
                                            <div className="text-xs text-slate-500">{knob.id}</div>
                                          </div>
                                          <div className="text-xs text-slate-600 bg-slate-100 px-2 py-1 rounded">
                                            {knob.unit}
                                          </div>
                                        </div>

                                        {knob.type === "numeric" ? (
                                          <div className="grid grid-cols-2 gap-3 mt-3">
                                            <div>
                                              <Label className="text-xs font-medium text-slate-700 mb-1 block">
                                                Valid Range
                                              </Label>
                                              <div className="flex gap-1">
                                                <Input
                                                  type="number"
                                                  defaultValue={knob.validRange?.min}
                                                  className="h-8 text-xs"
                                                  placeholder="Min"
                                                  onChange={(e) =>
                                                    setKnobEdits({
                                                      ...knobEdits,
                                                      [knob.id]: {
                                                        ...knobEdits[knob.id],
                                                        validRange: {
                                                          ...knobEdits[knob.id]?.validRange,
                                                          min: e.target.value,
                                                        },
                                                      },
                                                    })
                                                  }
                                                />
                                                <Input
                                                  type="number"
                                                  defaultValue={knob.validRange?.max}
                                                  className="h-8 text-xs"
                                                  placeholder="Max"
                                                  onChange={(e) =>
                                                    setKnobEdits({
                                                      ...knobEdits,
                                                      [knob.id]: {
                                                        ...knobEdits[knob.id],
                                                        validRange: {
                                                          ...knobEdits[knob.id]?.validRange,
                                                          max: e.target.value,
                                                        },
                                                      },
                                                    })
                                                  }
                                                />
                                              </div>
                                            </div>
                                            <div>
                                              <Label className="text-xs font-medium text-slate-700 mb-1 block">
                                                Recommended Range
                                              </Label>
                                              <div className="flex gap-1">
                                                <Input
                                                  type="number"
                                                  defaultValue={knob.recommendedRange?.min}
                                                  className="h-8 text-xs"
                                                  placeholder="Min"
                                                  onChange={(e) =>
                                                    setKnobEdits({
                                                      ...knobEdits,
                                                      [knob.id]: {
                                                        ...knobEdits[knob.id],
                                                        recommendedRange: {
                                                          ...knobEdits[knob.id]?.recommendedRange,
                                                          min: e.target.value,
                                                        },
                                                      },
                                                    })
                                                  }
                                                />
                                                <Input
                                                  type="number"
                                                  defaultValue={knob.recommendedRange?.max}
                                                  className="h-8 text-xs"
                                                  placeholder="Max"
                                                  onChange={(e) =>
                                                    setKnobEdits({
                                                      ...knobEdits,
                                                      [knob.id]: {
                                                        ...knobEdits[knob.id],
                                                        recommendedRange: {
                                                          ...knobEdits[knob.id]?.recommendedRange,
                                                          max: e.target.value,
                                                        },
                                                      },
                                                    })
                                                  }
                                                />
                                              </div>
                                            </div>
                                          </div>
                                        ) : (
                                          <div className="mt-3 grid grid-cols-2 gap-3">
                                            <div>
                                              <Label className="text-xs font-medium text-slate-700 mb-1 block">
                                                Valid Values
                                              </Label>
                                              <div className="text-xs text-slate-600 bg-slate-50 p-2 rounded border border-slate-200">
                                                {JSON.stringify(knob.validValues)}
                                              </div>
                                            </div>
                                            <div>
                                              <Label className="text-xs font-medium text-slate-700 mb-1 block">
                                                Recommended Values
                                              </Label>
                                              <div className="text-xs text-slate-600 bg-slate-50 p-2 rounded border border-slate-200">
                                                {JSON.stringify((knob as any).recommendedValues)}
                                              </div>
                                            </div>
                                          </div>
                                        )}
                                        <div className="mt-3">
                                          <div className="bg-white p-2 rounded border border-slate-200">
                                            <div className="flex items-center justify-between">
                                              <Label className="text-xs font-medium text-slate-700">Applicable</Label>
                                              <div className="flex items-center gap-2">
                                                <span className="text-[10px] text-slate-500">OFF</span>
                                                <Switch defaultChecked={true} />
                                                <span className="text-[10px] text-slate-500">ON</span>
                                              </div>
                                            </div>
                                            <div className="text-[10px] text-slate-500 mt-1">
                                              Toggle whether this knob applies to the selected station/extension
                                            </div>
                                          </div>
                                        </div>
                                        <div className="flex gap-1 mt-3">
                                          <Button
                                            size="sm"
                                            className="h-6 text-xs px-2 bg-blue-600 hover:bg-blue-700"
                                            disabled={saving}
                                            onClick={() => handleSaveKnob(knob.id, selectedStation, extension)}
                                          >
                                            <Save className="w-3 h-3 mr-1" />
                                            Save
                                          </Button>
                                          <Button
                                            size="sm"
                                            className="h-6 text-xs px-2 bg-amber-600 hover:bg-amber-700"
                                            disabled={saving}
                                            onClick={() => handleSaveKnobDefault(knob.id)}
                                          >
                                            <Star className="w-3 h-3 mr-1" />
                                            Save Default
                                          </Button>
                                          <Button
                                            size="sm"
                                            className="h-6 text-xs px-2 bg-slate-600 hover:bg-slate-700"
                                            disabled={saving}
                                            onClick={() =>
                                              handleRestoreKnobDefault(knob.id, selectedStation, extension)
                                            }
                                          >
                                            <RotateCcw className="w-3 h-3 mr-1" />
                                            Restore
                                          </Button>
                                        </div>
                                      </div>
                                    ))}
                                  </div>
                                </div>
                              ))}
                            </div>
                          </div>
                        ))}
                      </>
                    )
                  })()}
                </>
              )}
            </div>
          </ScrollArea>
        </TabsContent>

        <TabsContent value="metrics" className="px-6 py-4">
          <ScrollArea className="h-[calc(100vh-300px)]">
            <div className="space-y-6 pr-4">
              <div className="text-sm text-slate-600 mb-4">
                Configure thresholds, warning levels, and critical limits for all{" "}
                {Object.keys(METRIC_DEFINITIONS).length} monitoring parameters.
              </div>

              {Object.entries(metricsByCategory).map(([category, metrics]) => (
                <div key={category} className="border border-slate-300 rounded-lg bg-slate-50">
                  <div className="bg-slate-200 px-4 py-2 rounded-t-lg border-b border-slate-300">
                    <h3 className="text-sm font-bold text-slate-900 uppercase">
                      {category} ({metrics.length} metrics)
                    </h3>
                  </div>
                  <div className="p-4 space-y-3">
                    {metrics.map((metric) => (
                      <div
                        key={metric.id}
                        className="bg-white border border-slate-200 rounded p-3 hover:border-slate-300 transition-colors"
                      >
                        <div className="flex items-start justify-between mb-2">
                          <div>
                            <div className="font-semibold text-slate-900 text-sm">{metric.name}</div>
                            <div className="text-xs text-slate-500">{metric.id}</div>
                          </div>
                          <div className="text-xs text-slate-600 bg-slate-100 px-2 py-1 rounded">{metric.unit}</div>
                        </div>

                        <div className="grid grid-cols-7 gap-3 mt-3">
                          <div>
                            <Label className="text-xs font-medium text-slate-700 mb-1 block">Range Min</Label>
                            <Input
                              type="number"
                              defaultValue={metric.range.min}
                              className="h-8 text-xs"
                              placeholder="Min"
                              onChange={(e) =>
                                setMetricEdits({
                                  ...metricEdits,
                                  [metric.id]: {
                                    ...metricEdits[metric.id],
                                    range: {
                                      ...metricEdits[metric.id]?.range,
                                      min: e.target.value,
                                    },
                                  },
                                })
                              }
                            />
                          </div>
                          <div>
                            <Label className="text-xs font-medium text-slate-700 mb-1 block">Range Max</Label>
                            <Input
                              type="number"
                              defaultValue={metric.range.max}
                              className="h-8 text-xs"
                              placeholder="Max"
                              onChange={(e) =>
                                setMetricEdits({
                                  ...metricEdits,
                                  [metric.id]: {
                                    ...metricEdits[metric.id],
                                    range: {
                                      ...metricEdits[metric.id]?.range,
                                      max: e.target.value,
                                    },
                                  },
                                })
                              }
                            />
                          </div>
                          <div>
                            <Label className="text-xs font-medium text-slate-700 mb-1 block">Warning Low</Label>
                            <Input
                              type="number"
                              defaultValue={metric.thresholds.warningLow ?? ""}
                              className="h-8 text-xs"
                              placeholder="N/A"
                              onChange={(e) =>
                                setMetricEdits({
                                  ...metricEdits,
                                  [metric.id]: {
                                    ...metricEdits[metric.id],
                                    thresholds: {
                                      ...metricEdits[metric.id]?.thresholds,
                                      warningLow: e.target.value,
                                    },
                                  },
                                })
                              }
                            />
                          </div>
                          <div>
                            <Label className="text-xs font-medium text-slate-700 mb-1 block">Warning High</Label>
                            <Input
                              type="number"
                              defaultValue={metric.thresholds.warningHigh ?? ""}
                              className="h-8 text-xs"
                              placeholder="N/A"
                              onChange={(e) =>
                                setMetricEdits({
                                  ...metricEdits,
                                  [metric.id]: {
                                    ...metricEdits[metric.id],
                                    thresholds: {
                                      ...metricEdits[metric.id]?.thresholds,
                                      warningHigh: e.target.value,
                                    },
                                  },
                                })
                              }
                            />
                          </div>
                          <div>
                            <Label className="text-xs font-medium text-slate-700 mb-1 block">Critical Low</Label>
                            <Input
                              type="number"
                              defaultValue={metric.thresholds.criticalLow ?? ""}
                              className="h-8 text-xs bg-red-50"
                              placeholder="N/A"
                              onChange={(e) =>
                                setMetricEdits({
                                  ...metricEdits,
                                  [metric.id]: {
                                    ...metricEdits[metric.id],
                                    thresholds: {
                                      ...metricEdits[metric.id]?.thresholds,
                                      criticalLow: e.target.value,
                                    },
                                  },
                                })
                              }
                            />
                          </div>
                          <div>
                            <Label className="text-xs font-medium text-slate-700 mb-1 block">Critical High</Label>
                            <Input
                              type="number"
                              defaultValue={metric.thresholds.criticalHigh ?? ""}
                              className="h-8 text-xs bg-red-50"
                              placeholder="N/A"
                              onChange={(e) =>
                                setMetricEdits({
                                  ...metricEdits,
                                  [metric.id]: {
                                    ...metricEdits[metric.id],
                                    thresholds: {
                                      ...metricEdits[metric.id]?.thresholds,
                                      criticalHigh: e.target.value,
                                    },
                                  },
                                })
                              }
                            />
                          </div>
                          <div>
                            <Label className="text-xs font-medium text-slate-700 mb-1 block">Optimum</Label>
                            <Input
                              type="number"
                              defaultValue={metric.thresholds.optimum}
                              className="h-8 text-xs bg-green-50 font-semibold"
                              onChange={(e) =>
                                setMetricEdits({
                                  ...metricEdits,
                                  [metric.id]: {
                                    ...metricEdits[metric.id],
                                    thresholds: {
                                      ...metricEdits[metric.id]?.thresholds,
                                      optimum: e.target.value,
                                    },
                                  },
                                })
                              }
                            />
                          </div>
                        </div>

                        <div className="flex gap-1 mt-3">
                          <Button
                            size="sm"
                            className="h-6 text-xs px-2 bg-blue-600 hover:bg-blue-700"
                            disabled={saving}
                            onClick={() => handleSaveMetric(metric.id)}
                          >
                            <Save className="w-3 h-3 mr-1" />
                            Save
                          </Button>
                          <Button
                            size="sm"
                            className="h-6 text-xs px-2 bg-amber-600 hover:bg-amber-700"
                            disabled={saving}
                            onClick={() => handleSaveMetricDefault(metric.id)}
                          >
                            <Star className="w-3 h-3 mr-1" />
                            Save Default
                          </Button>
                          <Button
                            size="sm"
                            className="h-6 text-xs px-2 bg-slate-600 hover:bg-slate-700"
                            disabled={saving}
                            onClick={() => handleRestoreMetricDefault(metric.id)}
                          >
                            <RotateCcw className="w-3 h-3 mr-1" />
                            Restore
                          </Button>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          </ScrollArea>
        </TabsContent>
      </Tabs>
    </div>
  )
}
