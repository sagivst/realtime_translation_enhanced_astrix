"use client"
import { Card } from "@/components/ui/card"
import type { StationSnapshot } from "@/types/monitoring"
import { STATION_DEFINITIONS } from "@/types/monitoring"
import MetricBar from "./metric-bar"

interface StationMonitoringGridProps {
  snapshots: StationSnapshot[]
  onStationSelect: (stationId: string) => void
}

export default function StationMonitoringGrid({ snapshots, onStationSelect }: StationMonitoringGridProps) {
  return (
    <div className="grid gap-2 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 2xl:grid-cols-5">
      {snapshots.map((snapshot) => (
        <StationCard
          key={`${snapshot.station_id}_${snapshot.extension}`}
          snapshot={snapshot}
          onSelect={() => onStationSelect(`${snapshot.station_id}_${snapshot.extension}`)}
        />
      ))}
    </div>
  )
}

function StationCard({ snapshot, onSelect }: { snapshot: StationSnapshot; onSelect: () => void }) {
  const stationDef = STATION_DEFINITIONS.find((s) => s.id === snapshot.station_id)
  const stationName = stationDef?.name || snapshot.station_id
  const stationDesc = stationDef?.description || ""
  const extensionLabel = stationDef?.extensionLabels?.[snapshot.extension as keyof typeof stationDef.extensionLabels]
  const displayName = extensionLabel ? `${stationName} / ${extensionLabel}` : `${stationName} / ${snapshot.extension}`

  const isOnline = snapshot.status === "online"
  const metrics = snapshot.metrics

  const mosScore = metrics["audioQuality.mos"] || metrics["mos"] || 0
  const latencyAvg = metrics["latency.avg"] || metrics["latency_avg"] || 0
  const packetLoss = metrics["packet.loss"] || metrics["packet_loss"] || 0

  const mosStatus = mosScore >= 4 ? "text-green-600" : mosScore >= 3 ? "text-yellow-600" : "text-red-600"

  return (
    <Card
      className="p-2 border border-slate-200 bg-white hover:border-slate-300 hover:shadow-sm transition-all cursor-pointer"
      onClick={onSelect}
    >
      <div className="flex items-center justify-between mb-2">
        <div className="flex-1">
          <h3 className="text-xs font-medium text-slate-900">{displayName}</h3>
          {stationDesc && <p className="text-xs text-slate-500 mt-0.5 line-clamp-1">{stationDesc}</p>}
          <span className={`text-xs font-semibold ${mosStatus}`}>
            MOS: {typeof mosScore === "number" ? mosScore.toFixed(2) : "—"}
          </span>
        </div>
        <div className={`h-2 w-2 rounded-full ${isOnline ? "bg-green-500" : "bg-slate-300"}`} />
      </div>

      <div className="space-y-1.5">
        <MetricBar
          name="MOS"
          value={typeof mosScore === "number" ? mosScore : 0}
          range={{ min: 1, max: 5, preferred: { min: 3.5, max: 5 }, target: 4.2 }}
          unit=""
          compact
        />
        <MetricBar
          name="Latency"
          value={typeof latencyAvg === "number" ? latencyAvg : 0}
          range={{ min: 0, max: 500, preferred: { min: 20, max: 150 }, target: 80 }}
          unit="ms"
          compact
        />
        <MetricBar
          name="Packet Loss"
          value={typeof packetLoss === "number" ? packetLoss : 0}
          range={{ min: 0, max: 5, preferred: { min: 0, max: 1 }, target: 0 }}
          unit="%"
          compact
        />
      </div>
    </Card>
  )
}
