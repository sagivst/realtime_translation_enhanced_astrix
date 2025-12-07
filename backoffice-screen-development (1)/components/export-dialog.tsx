"use client"

import { useState } from "react"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { Checkbox } from "@/components/ui/checkbox"
import { Card } from "@/components/ui/card"

interface ExportDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  stations: any[]
}

export default function ExportDialog({ open, onOpenChange, stations }: ExportDialogProps) {
  const [format, setFormat] = useState<"json" | "xml" | "csv">("json")
  const [includeMetrics, setIncludeMetrics] = useState(true)
  const [includeKnobs, setIncludeKnobs] = useState(true)
  const [includeHistory, setIncludeHistory] = useState(false)

  const handleExport = () => {
    const data = stations.map((s) => ({
      id: s.id,
      name: s.name,
      status: s.status,
      ...(includeMetrics && { metrics: s.metrics }),
      ...(includeKnobs && { knobs: s.knobs }),
      ...(includeHistory && { optimizationLogs: s.optimizationLogs }),
    }))

    let content = ""
    let filename = ""

    if (format === "json") {
      content = JSON.stringify(data, null, 2)
      filename = `export-${new Date().toISOString().split("T")[0]}.json`
    } else if (format === "xml") {
      content = generateXml(data)
      filename = `export-${new Date().toISOString().split("T")[0]}.xml`
    } else if (format === "csv") {
      content = generateCsv(data)
      filename = `export-${new Date().toISOString().split("T")[0]}.csv`
    }

    const blob = new Blob([content], { type: "application/octet-stream" })
    const url = window.URL.createObjectURL(blob)
    const a = document.createElement("a")
    a.href = url
    a.download = filename
    document.body.appendChild(a)
    a.click()
    window.URL.revokeObjectURL(url)
    document.body.removeChild(a)

    onOpenChange(false)
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="bg-slate-800 border-slate-700 text-white max-w-md">
        <DialogHeader>
          <DialogTitle>Advanced Export</DialogTitle>
          <DialogDescription className="text-slate-400">
            Configure export options and download snapshot data
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          {/* Format Selection */}
          <Card className="bg-slate-900/50 border-slate-700 p-4">
            <h4 className="text-sm font-semibold text-white mb-3">Export Format</h4>
            <div className="space-y-2">
              {(["json", "xml", "csv"] as const).map((fmt) => (
                <label key={fmt} className="flex items-center gap-2 cursor-pointer">
                  <input
                    type="radio"
                    name="format"
                    value={fmt}
                    checked={format === fmt}
                    onChange={() => setFormat(fmt)}
                    className="rounded"
                  />
                  <span className="text-sm text-slate-200 capitalize">{fmt.toUpperCase()}</span>
                </label>
              ))}
            </div>
          </Card>

          {/* Data Selection */}
          <Card className="bg-slate-900/50 border-slate-700 p-4">
            <h4 className="text-sm font-semibold text-white mb-3">Include Data</h4>
            <div className="space-y-2">
              <label className="flex items-center gap-2 cursor-pointer">
                <Checkbox
                  checked={includeMetrics}
                  onCheckedChange={(checked) => setIncludeMetrics(checked as boolean)}
                />
                <span className="text-sm text-slate-200">Metrics</span>
              </label>
              <label className="flex items-center gap-2 cursor-pointer">
                <Checkbox checked={includeKnobs} onCheckedChange={(checked) => setIncludeKnobs(checked as boolean)} />
                <span className="text-sm text-slate-200">Knobs Configuration</span>
              </label>
              <label className="flex items-center gap-2 cursor-pointer">
                <Checkbox
                  checked={includeHistory}
                  onCheckedChange={(checked) => setIncludeHistory(checked as boolean)}
                />
                <span className="text-sm text-slate-200">Optimization History</span>
              </label>
            </div>
          </Card>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)} className="bg-slate-700 border-slate-600">
            Cancel
          </Button>
          <Button onClick={handleExport} className="bg-blue-600 hover:bg-blue-700">
            Export
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}

function generateXml(data: any[]): string {
  let xml = '<?xml version="1.0" encoding="UTF-8"?>\n'
  xml += "<export>\n"
  xml += `  <timestamp>${new Date().toISOString()}</timestamp>\n`
  xml += "  <stations>\n"

  data.forEach((station) => {
    xml += `    <station id="${station.id}">\n`
    xml += `      <name>${escapeXml(station.name)}</name>\n`
    xml += `      <status>${station.status}</status>\n`

    if (station.metrics) {
      xml += "      <metrics>\n"
      Object.entries(station.metrics).forEach(([key, value]) => {
        xml += `        <${key}>${value}</${key}>\n`
      })
      xml += "      </metrics>\n"
    }

    if (station.knobs && Array.isArray(station.knobs)) {
      xml += "      <knobs>\n"
      station.knobs.forEach((knob: any) => {
        xml += `        <knob name="${escapeXml(knob.name)}">${knob.value}</knob>\n`
      })
      xml += "      </knobs>\n"
    }

    xml += "    </station>\n"
  })

  xml += "  </stations>\n"
  xml += "</export>"
  return xml
}

function generateCsv(data: any[]): string {
  const headers = ["ID", "Name", "Status"]
  let csv = headers.join(",") + "\n"

  data.forEach((station) => {
    const row = [station.id, `"${station.name}"`, station.status]
    csv += row.join(",") + "\n"
  })

  return csv
}

function escapeXml(str: string): string {
  return str.replace(/[<>&'"]/g, (c) => {
    switch (c) {
      case "<":
        return "&lt;"
      case ">":
        return "&gt;"
      case "&":
        return "&amp;"
      case "'":
        return "&apos;"
      case '"':
        return "&quot;"
      default:
        return c
    }
  })
}
