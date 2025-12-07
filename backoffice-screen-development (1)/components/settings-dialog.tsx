"use client"

import { useState } from "react"
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Label } from "@/components/ui/label"
import { KNOBS_CONFIG } from "@/config/knobs-config"
import { ScrollArea } from "@/components/ui/scroll-area"

interface SettingsDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
}

export function SettingsDialog({ open, onOpenChange }: SettingsDialogProps) {
  const [activeTab, setActiveTab] = useState("knobs")

  const knobsByCategory = Object.values(KNOBS_CONFIG).reduce(
    (acc, knob) => {
      const cat = knob.category || "general"
      if (!acc[cat]) acc[cat] = []
      acc[cat].push(knob)
      return acc
    },
    {} as Record<string, (typeof KNOBS_CONFIG)[keyof typeof KNOBS_CONFIG][]>,
  )

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="w-[95vw] max-w-none h-[90vh] overflow-hidden flex flex-col bg-white">
        <DialogHeader>
          <DialogTitle className="text-xl font-semibold">System Configuration</DialogTitle>
        </DialogHeader>

        <Tabs value={activeTab} onValueChange={setActiveTab} className="flex-1 flex flex-col overflow-hidden">
          <TabsList className="grid w-full grid-cols-2 bg-slate-100">
            <TabsTrigger value="knobs">Knobs Configuration ({Object.keys(KNOBS_CONFIG).length})</TabsTrigger>
            <TabsTrigger value="metrics">Metrics Configuration (75)</TabsTrigger>
          </TabsList>

          <TabsContent value="knobs" className="flex-1 overflow-hidden mt-2">
            <ScrollArea className="h-[calc(90vh-200px)]">
              <div className="p-4 space-y-6">
                <div className="text-sm text-slate-600 mb-4 sticky top-0 bg-white z-10 pb-2">
                  Configure valid ranges, recommended ranges, and AI adjustment limits for all{" "}
                  {Object.keys(KNOBS_CONFIG).length} system knobs.
                </div>

                {Object.entries(knobsByCategory).map(([category, knobs]) => (
                  <div key={category} className="border border-slate-300 rounded-lg bg-slate-50">
                    <div className="bg-slate-200 px-4 py-2 rounded-t-lg border-b border-slate-300">
                      <h3 className="text-sm font-bold text-slate-900 uppercase">
                        {category} ({knobs.length} knobs)
                      </h3>
                    </div>
                    <div className="p-4 space-y-3">
                      {knobs.map((knob) => (
                        <div
                          key={knob.id}
                          className="bg-white border border-slate-200 rounded p-3 hover:border-slate-300 transition-colors"
                        >
                          <div className="flex items-start justify-between mb-2">
                            <div>
                              <div className="font-semibold text-slate-900 text-sm">{knob.name}</div>
                              <div className="text-xs text-slate-500">{knob.id}</div>
                            </div>
                            <div className="text-xs text-slate-600 bg-slate-100 px-2 py-1 rounded">{knob.unit}</div>
                          </div>

                          {knob.type === "numeric" ? (
                            <div className="grid grid-cols-5 gap-3 mt-3">
                              <div>
                                <Label className="text-xs font-medium text-slate-700 mb-1 block">Valid Range</Label>
                                <div className="flex gap-1">
                                  <Input
                                    type="number"
                                    defaultValue={knob.validRange?.min}
                                    className="h-8 text-xs"
                                    placeholder="Min"
                                  />
                                  <Input
                                    type="number"
                                    defaultValue={knob.validRange?.max}
                                    className="h-8 text-xs"
                                    placeholder="Max"
                                  />
                                </div>
                              </div>
                              <div>
                                <Label className="text-xs font-medium text-slate-700 mb-1 block">Recommended</Label>
                                <div className="flex gap-1">
                                  <Input
                                    type="number"
                                    defaultValue={knob.recommendedRange?.min}
                                    className="h-8 text-xs"
                                    placeholder="Min"
                                  />
                                  <Input
                                    type="number"
                                    defaultValue={knob.recommendedRange?.max}
                                    className="h-8 text-xs"
                                    placeholder="Max"
                                  />
                                </div>
                              </div>
                              <div>
                                <Label className="text-xs font-medium text-slate-700 mb-1 block">AI Adjustment</Label>
                                <div className="flex gap-1">
                                  <Input
                                    type="number"
                                    defaultValue={knob.aiAdjustmentRange?.min}
                                    className="h-8 text-xs"
                                    placeholder="Min"
                                  />
                                  <Input
                                    type="number"
                                    defaultValue={knob.aiAdjustmentRange?.max}
                                    className="h-8 text-xs"
                                    placeholder="Max"
                                  />
                                </div>
                              </div>
                              <div>
                                <Label className="text-xs font-medium text-slate-700 mb-1 block">Optimum</Label>
                                <Input type="number" defaultValue={knob.optimum} className="h-8 text-xs" />
                              </div>
                              <div>
                                <Label className="text-xs font-medium text-slate-700 mb-1 block">Current Value</Label>
                                <Input
                                  type="number"
                                  defaultValue={knob.currentValue as number}
                                  className="h-8 text-xs font-semibold bg-blue-50"
                                />
                              </div>
                            </div>
                          ) : (
                            <div className="mt-3 grid grid-cols-3 gap-3">
                              <div>
                                <Label className="text-xs font-medium text-slate-700 mb-1 block">Valid Values</Label>
                                <div className="text-xs text-slate-600 bg-slate-50 p-2 rounded border border-slate-200">
                                  {JSON.stringify(knob.validValues)}
                                </div>
                              </div>
                              <div>
                                <Label className="text-xs font-medium text-slate-700 mb-1 block">Recommended</Label>
                                <div className="text-xs text-slate-600 bg-slate-50 p-2 rounded border border-slate-200">
                                  {JSON.stringify((knob as any).recommendedValues)}
                                </div>
                              </div>
                              <div>
                                <Label className="text-xs font-medium text-slate-700 mb-1 block">Current Value</Label>
                                <Input
                                  type="text"
                                  defaultValue={JSON.stringify(knob.currentValue)}
                                  className="h-8 text-xs font-semibold bg-blue-50"
                                />
                              </div>
                            </div>
                          )}
                        </div>
                      ))}
                    </div>
                  </div>
                ))}
              </div>
            </ScrollArea>
          </TabsContent>

          <TabsContent value="metrics" className="flex-1 overflow-hidden mt-2">
            <ScrollArea className="h-[calc(90vh-200px)]">
              <div className="p-4 space-y-4">
                <div className="text-sm text-slate-600 mb-4">
                  Configure thresholds, warning levels, and critical limits for all 75 monitoring parameters.
                </div>

                {[
                  {
                    category: "Buffer Parameters",
                    count: 10,
                    metrics: [
                      {
                        id: "buffer.total",
                        name: "Total Buffer Utilization",
                        unit: "%",
                        warningHigh: 80,
                        criticalHigh: 95,
                        warningLow: 20,
                        criticalLow: 10,
                      },
                      {
                        id: "buffer.input",
                        name: "Input Buffer",
                        unit: "%",
                        warningHigh: 85,
                        criticalHigh: 95,
                        warningLow: 15,
                        criticalLow: 5,
                      },
                      {
                        id: "buffer.output",
                        name: "Output Buffer",
                        unit: "%",
                        warningHigh: 85,
                        criticalHigh: 95,
                        warningLow: 15,
                        criticalLow: 5,
                      },
                      {
                        id: "buffer.jitter",
                        name: "Jitter Buffer",
                        unit: "ms",
                        warningHigh: 150,
                        criticalHigh: 300,
                        warningLow: 20,
                        criticalLow: 10,
                      },
                      {
                        id: "buffer.underrun",
                        name: "Buffer Underruns",
                        unit: "count/s",
                        warningHigh: 5,
                        criticalHigh: 10,
                      },
                      {
                        id: "buffer.overrun",
                        name: "Buffer Overruns",
                        unit: "count/s",
                        warningHigh: 5,
                        criticalHigh: 10,
                      },
                      {
                        id: "buffer.playback",
                        name: "Playback Buffer",
                        unit: "ms",
                        warningHigh: 200,
                        criticalHigh: 400,
                        warningLow: 30,
                        criticalLow: 10,
                      },
                      {
                        id: "buffer.record",
                        name: "Recording Buffer",
                        unit: "ms",
                        warningHigh: 200,
                        criticalHigh: 400,
                        warningLow: 30,
                        criticalLow: 10,
                      },
                      {
                        id: "buffer.network",
                        name: "Network Buffer",
                        unit: "KB",
                        warningHigh: 512,
                        criticalHigh: 896,
                        warningLow: 64,
                        criticalLow: 32,
                      },
                      {
                        id: "buffer.processing",
                        name: "Processing Buffer",
                        unit: "ms",
                        warningHigh: 200,
                        criticalHigh: 500,
                      },
                    ],
                  },
                  {
                    category: "Latency Parameters",
                    count: 8,
                    metrics: [
                      { id: "latency.avg", name: "Average Latency", unit: "ms", warningHigh: 500, criticalHigh: 1000 },
                      { id: "latency.min", name: "Minimum Latency", unit: "ms" },
                      { id: "latency.max", name: "Maximum Latency", unit: "ms", warningHigh: 1500, criticalHigh: 3000 },
                      { id: "latency.jitter", name: "Latency Jitter", unit: "ms", warningHigh: 50, criticalHigh: 100 },
                      {
                        id: "latency.variance",
                        name: "Latency Variance",
                        unit: "ms²",
                        warningHigh: 2500,
                        criticalHigh: 5000,
                      },
                      {
                        id: "latency.percentile95",
                        name: "95th Percentile Latency",
                        unit: "ms",
                        warningHigh: 800,
                        criticalHigh: 1500,
                      },
                      {
                        id: "latency.network",
                        name: "Network Latency",
                        unit: "ms",
                        warningHigh: 100,
                        criticalHigh: 250,
                      },
                      {
                        id: "latency.processing",
                        name: "Processing Latency",
                        unit: "ms",
                        warningHigh: 300,
                        criticalHigh: 1000,
                      },
                    ],
                  },
                  {
                    category: "Packet Parameters",
                    count: 12,
                    metrics: [
                      { id: "packet.loss", name: "Packet Loss Rate", unit: "%", warningHigh: 1.0, criticalHigh: 3.0 },
                      {
                        id: "packet.received",
                        name: "Packets Received",
                        unit: "packets/s",
                        warningLow: 10,
                        criticalLow: 0,
                      },
                      { id: "packet.sent", name: "Packets Sent", unit: "packets/s", warningLow: 10, criticalLow: 0 },
                      {
                        id: "packet.dropped",
                        name: "Packets Dropped",
                        unit: "packets/s",
                        warningHigh: 5,
                        criticalHigh: 20,
                      },
                      {
                        id: "packet.outOfOrder",
                        name: "Out-of-Order Packets",
                        unit: "packets/s",
                        warningHigh: 10,
                        criticalHigh: 50,
                      },
                      {
                        id: "packet.duplicate",
                        name: "Duplicate Packets",
                        unit: "packets/s",
                        warningHigh: 5,
                        criticalHigh: 20,
                      },
                      {
                        id: "packet.retransmit",
                        name: "Retransmitted Packets",
                        unit: "packets/s",
                        warningHigh: 10,
                        criticalHigh: 50,
                      },
                      {
                        id: "packet.corruption",
                        name: "Corrupted Packets",
                        unit: "packets/s",
                        warningHigh: 1,
                        criticalHigh: 5,
                      },
                      {
                        id: "packet.fragmentation",
                        name: "Fragmented Packets",
                        unit: "%",
                        warningHigh: 20,
                        criticalHigh: 50,
                      },
                      {
                        id: "packet.reassembly",
                        name: "Reassembly Failures",
                        unit: "count/s",
                        warningHigh: 1,
                        criticalHigh: 5,
                      },
                      {
                        id: "packet.throughput",
                        name: "Packet Throughput",
                        unit: "packets/s",
                        warningLow: 20,
                        criticalLow: 10,
                      },
                      {
                        id: "packet.bandwidth",
                        name: "Bandwidth Usage",
                        unit: "Mbps",
                        warningHigh: 50,
                        criticalHigh: 100,
                      },
                    ],
                  },
                  {
                    category: "Audio Quality Parameters",
                    count: 10,
                    metrics: [
                      {
                        id: "audioQuality.snr",
                        name: "Signal-to-Noise Ratio",
                        unit: "dB",
                        warningLow: 20,
                        criticalLow: 15,
                      },
                      {
                        id: "audioQuality.mos",
                        name: "Mean Opinion Score",
                        unit: "score",
                        warningLow: 3.5,
                        criticalLow: 2.5,
                      },
                      { id: "audioQuality.pesq", name: "PESQ Score", unit: "score", warningLow: 3.0, criticalLow: 2.0 },
                      {
                        id: "audioQuality.polqa",
                        name: "POLQA Score",
                        unit: "score",
                        warningLow: 3.5,
                        criticalLow: 2.5,
                      },
                      {
                        id: "audioQuality.thd",
                        name: "Total Harmonic Distortion",
                        unit: "%",
                        warningHigh: 1.0,
                        criticalHigh: 5.0,
                      },
                      {
                        id: "audioQuality.speechLevel",
                        name: "Speech Level",
                        unit: "dBFS",
                        warningHigh: -6,
                        criticalHigh: -3,
                        warningLow: -40,
                        criticalLow: -60,
                      },
                      {
                        id: "audioQuality.clipping",
                        name: "Clipping Detected",
                        unit: "%",
                        warningHigh: 0.1,
                        criticalHigh: 1.0,
                      },
                      {
                        id: "audioQuality.noise",
                        name: "Background Noise Level",
                        unit: "dBFS",
                        warningHigh: -40,
                        criticalHigh: -30,
                      },
                      {
                        id: "audioQuality.echo",
                        name: "Echo Level",
                        unit: "dBFS",
                        warningHigh: -30,
                        criticalHigh: -20,
                      },
                      {
                        id: "audioQuality.distortion",
                        name: "Audio Distortion",
                        unit: "%",
                        warningHigh: 2.0,
                        criticalHigh: 10.0,
                      },
                    ],
                  },
                  {
                    category: "Performance Parameters",
                    count: 8,
                    metrics: [
                      { id: "performance.cpu", name: "CPU Usage", unit: "%", warningHigh: 70, criticalHigh: 90 },
                      { id: "performance.memory", name: "Memory Usage", unit: "%", warningHigh: 75, criticalHigh: 90 },
                      {
                        id: "performance.bandwidth",
                        name: "Network Bandwidth",
                        unit: "Mbps",
                        warningHigh: 50,
                        criticalHigh: 100,
                      },
                      {
                        id: "performance.throughput",
                        name: "Data Throughput",
                        unit: "KB/s",
                        warningLow: 50,
                        criticalLow: 10,
                      },
                      {
                        id: "performance.threads",
                        name: "Active Threads",
                        unit: "count",
                        warningHigh: 100,
                        criticalHigh: 500,
                      },
                      {
                        id: "performance.queue",
                        name: "Queue Depth",
                        unit: "items",
                        warningHigh: 100,
                        criticalHigh: 500,
                      },
                      { id: "performance.cache", name: "Cache Hit Rate", unit: "%", warningLow: 70, criticalLow: 50 },
                      { id: "performance.io", name: "I/O Wait Time", unit: "%", warningHigh: 30, criticalHigh: 50 },
                    ],
                  },
                  {
                    category: "DSP Parameters",
                    count: 20,
                    metrics: [
                      {
                        id: "dsp.agc.currentGain",
                        name: "AGC Current Gain",
                        unit: "dB",
                        warningHigh: 30,
                        criticalHigh: 38,
                      },
                      { id: "dsp.agc.targetLevel", name: "AGC Target Level", unit: "dBFS" },
                      { id: "dsp.agc.attackTime", name: "AGC Attack Time", unit: "ms" },
                      { id: "dsp.agc.releaseTime", name: "AGC Release Time", unit: "ms" },
                      { id: "dsp.agc.maxGain", name: "AGC Maximum Gain", unit: "dB" },
                      {
                        id: "dsp.aec.echoLevel",
                        name: "Echo Level",
                        unit: "dBFS",
                        warningHigh: -30,
                        criticalHigh: -20,
                      },
                      { id: "dsp.aec.suppression", name: "Echo Suppression", unit: "dB" },
                      { id: "dsp.aec.tailLength", name: "AEC Tail Length", unit: "ms" },
                      { id: "dsp.aec.convergenceTime", name: "AEC Convergence Time", unit: "ms" },
                      {
                        id: "dsp.noiseReduction.noiseLevel",
                        name: "Detected Noise Level",
                        unit: "dBFS",
                        warningHigh: -40,
                        criticalHigh: -30,
                      },
                      { id: "dsp.noiseReduction.suppression", name: "Noise Suppression", unit: "dB" },
                      { id: "dsp.noiseReduction.snrImprovement", name: "SNR Improvement", unit: "dB" },
                      {
                        id: "dsp.compressor.reduction",
                        name: "Compressor Gain Reduction",
                        unit: "dB",
                        warningHigh: 20,
                        criticalHigh: 35,
                      },
                      { id: "dsp.compressor.threshold", name: "Compressor Threshold", unit: "dBFS" },
                      { id: "dsp.compressor.ratio", name: "Compression Ratio", unit: "ratio" },
                      {
                        id: "dsp.limiter.reduction",
                        name: "Limiter Gain Reduction",
                        unit: "dB",
                        warningHigh: 3,
                        criticalHigh: 10,
                      },
                      { id: "dsp.limiter.threshold", name: "Limiter Threshold", unit: "dBFS" },
                      { id: "dsp.equalizer.response", name: "EQ Frequency Response", unit: "dB" },
                      { id: "dsp.equalizer.preset", name: "EQ Preset", unit: "text" },
                      { id: "dsp.gate.attenuation", name: "Gate Attenuation", unit: "dB" },
                    ],
                  },
                  {
                    category: "Custom Parameters",
                    count: 7,
                    metrics: [
                      { id: "custom.state", name: "System State", unit: "text" },
                      { id: "custom.codec", name: "Audio Codec", unit: "text" },
                      { id: "custom.sampleRate", name: "Sample Rate", unit: "Hz" },
                      { id: "custom.channels", name: "Audio Channels", unit: "count" },
                      { id: "custom.protocol", name: "Network Protocol", unit: "text" },
                      { id: "custom.connectionTime", name: "Connection Uptime", unit: "seconds" },
                      { id: "custom.errorCount", name: "Error Count", unit: "count" },
                    ],
                  },
                ].map((categoryGroup) => (
                  <div key={categoryGroup.category} className="border border-slate-200 rounded-lg p-4 bg-white">
                    <h3 className="text-sm font-semibold text-slate-900 mb-3 uppercase">
                      {categoryGroup.category} ({categoryGroup.count} metrics)
                    </h3>
                    <div className="space-y-2">
                      {categoryGroup.metrics.map((metric) => (
                        <div
                          key={metric.id}
                          className="grid grid-cols-7 gap-2 items-center py-2 border-b border-slate-100 last:border-0 text-xs"
                        >
                          <div className="col-span-2">
                            <div className="font-medium text-slate-700">{metric.name}</div>
                            <div className="text-[10px] text-slate-500">{metric.id}</div>
                            <div className="text-[10px] text-slate-400">{metric.unit}</div>
                          </div>

                          <div className="col-span-1">
                            <Label className="text-[10px] text-slate-600">Warning Low</Label>
                            <Input
                              type="number"
                              defaultValue={metric.warningLow}
                              className="h-7 text-xs"
                              placeholder="-"
                            />
                          </div>
                          <div className="col-span-1">
                            <Label className="text-[10px] text-slate-600">Critical Low</Label>
                            <Input
                              type="number"
                              defaultValue={metric.criticalLow}
                              className="h-7 text-xs"
                              placeholder="-"
                            />
                          </div>
                          <div className="col-span-1">
                            <Label className="text-[10px] text-slate-600">Warning High</Label>
                            <Input
                              type="number"
                              defaultValue={metric.warningHigh}
                              className="h-7 text-xs"
                              placeholder="-"
                            />
                          </div>
                          <div className="col-span-1">
                            <Label className="text-[10px] text-slate-600">Critical High</Label>
                            <Input
                              type="number"
                              defaultValue={metric.criticalHigh}
                              className="h-7 text-xs"
                              placeholder="-"
                            />
                          </div>
                          <div className="col-span-1">
                            <Label className="text-[10px] text-slate-600">AI Range</Label>
                            <Input type="text" placeholder="±10%" className="h-7 text-xs" />
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

        <div className="flex justify-end gap-2 pt-4 border-t border-slate-200">
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <Button onClick={() => onOpenChange(false)}>Save Changes</Button>
        </div>
      </DialogContent>
    </Dialog>
  )
}

export default SettingsDialog
