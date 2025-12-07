"use client"

import { Menu, Settings, Download, FileJson, FileText, BarChart3, Clock, Wrench } from "lucide-react"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
  DropdownMenuSeparator,
  DropdownMenuLabel,
} from "@/components/ui/dropdown-menu"
import { Button } from "@/components/ui/button"
import { useState } from "react"
import ExportDialog from "./export-dialog"
// import SettingsDialog from "./settings-dialog" // Removed SettingsDialog import

interface SystemMenuProps {
  snapshots: any[]
  // Added onOpenSettings prop to trigger Settings page
  onOpenSettings: () => void
}

export default function SystemMenu({ snapshots, onOpenSettings }: SystemMenuProps) {
  const [showExportDialog, setShowExportDialog] = useState(false)
  // Removed showSettingsDialog state

  const handleExportJson = () => {
    const dataStr = JSON.stringify(snapshots, null, 2)
    const dataBlob = new Blob([dataStr], { type: "application/json" })
    downloadFile(dataBlob, `stations-${new Date().toISOString().split("T")[0]}.json`)
  }

  const handleExportXml = () => {
    const xmlStr = generateXml(snapshots)
    const dataBlob = new Blob([xmlStr], { type: "application/xml" })
    downloadFile(dataBlob, `stations-${new Date().toISOString().split("T")[0]}.xml`)
  }

  const handleExportCsv = () => {
    const csvStr = generateCsv(snapshots)
    const dataBlob = new Blob([csvStr], { type: "text/csv" })
    downloadFile(dataBlob, `stations-${new Date().toISOString().split("T")[0]}.csv`)
  }

  const downloadFile = (blob: Blob, filename: string) => {
    const url = window.URL.createObjectURL(blob)
    const a = document.createElement("a")
    a.href = url
    a.download = filename
    document.body.appendChild(a)
    a.click()
    window.URL.revokeObjectURL(url)
    document.body.removeChild(a)
  }

  return (
    <>
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button variant="outline" size="sm" className="bg-white border-slate-300 hover:bg-slate-50">
            <Menu className="h-4 w-4" />
            <span className="ml-2">Menu</span>
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end" className="bg-white border-slate-200 w-56">
          {/* System */}
          <DropdownMenuLabel className="text-slate-700">System</DropdownMenuLabel>
          <DropdownMenuItem onClick={onOpenSettings} className="text-slate-900 focus:bg-slate-100 cursor-pointer">
            <Settings className="h-4 w-4 mr-2" />
            <span>Configuration</span>
          </DropdownMenuItem>
          <DropdownMenuItem className="text-slate-900 focus:bg-slate-100 cursor-pointer">
            <Wrench className="h-4 w-4 mr-2" />
            <span>Metrics Matrix</span>
          </DropdownMenuItem>
          <DropdownMenuItem className="text-slate-900 focus:bg-slate-100 cursor-pointer">
            <Clock className="h-4 w-4 mr-2" />
            <span>Schedule Optimization</span>
          </DropdownMenuItem>

          <DropdownMenuSeparator className="bg-slate-200" />

          {/* Export Options */}
          <DropdownMenuLabel className="text-slate-700">Export</DropdownMenuLabel>
          <DropdownMenuItem onClick={handleExportJson} className="text-slate-900 focus:bg-slate-100 cursor-pointer">
            <FileJson className="h-4 w-4 mr-2" />
            <span>Export as JSON</span>
          </DropdownMenuItem>
          <DropdownMenuItem onClick={handleExportXml} className="text-slate-900 focus:bg-slate-100 cursor-pointer">
            <FileText className="h-4 w-4 mr-2" />
            <span>Export as XML</span>
          </DropdownMenuItem>
          <DropdownMenuItem onClick={handleExportCsv} className="text-slate-900 focus:bg-slate-100 cursor-pointer">
            <BarChart3 className="h-4 w-4 mr-2" />
            <span>Export as CSV</span>
          </DropdownMenuItem>
          <DropdownMenuItem
            onClick={() => setShowExportDialog(true)}
            className="text-slate-900 focus:bg-slate-100 cursor-pointer"
          >
            <Download className="h-4 w-4 mr-2" />
            <span>Advanced Export</span>
          </DropdownMenuItem>

          <DropdownMenuSeparator className="bg-slate-200" />

          {/* Info */}
          <DropdownMenuLabel className="text-slate-700">Help</DropdownMenuLabel>
          <DropdownMenuItem className="text-slate-900 focus:bg-slate-100 cursor-pointer">
            Documentation
          </DropdownMenuItem>
          <DropdownMenuItem className="text-slate-900 focus:bg-slate-100 cursor-pointer">About v2.1.0</DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>

      <ExportDialog open={showExportDialog} onOpenChange={setShowExportDialog} stations={snapshots} />
      {/* Removed SettingsDialog from here */}
    </>
  )
}

function generateXml(stations: any[]): string {
  let xml = '<?xml version="1.0" encoding="UTF-8"?>\n'
  xml += "<stations>\n"

  stations.forEach((station) => {
    xml += `  <station id="${station.station}">\n`
    xml += `    <status>${station.status}</status>\n`
    xml += `    <metrics>\n`

    if (station.metrics) {
      Object.entries(station.metrics).forEach(([key, value]) => {
        xml += `      <${key}>${value}</${key}>\n`
      })
    }

    xml += `    </metrics>\n`
    xml += `  </station>\n`
  })

  xml += "</stations>"
  return xml
}

function generateCsv(stations: any[]): string {
  const headers = ["Station", "Status", "Latency Avg", "Latency P95", "MOS", "Packet Loss"]
  let csv = headers.join(",") + "\n"

  stations.forEach((station) => {
    const row = [
      station.station,
      station.status,
      station.metrics?.["latency.avg"] || 0,
      station.metrics?.["latency.p95"] || 0,
      station.metrics?.mos || 0,
      station.metrics?.["packet.loss"] || 0,
    ]
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
