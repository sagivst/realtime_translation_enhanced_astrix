"use client"

import { useState } from "react"
import KnobControl from "./knob-control"
import { KNOBS_CONFIG, type KnobConfig } from "@/config/knobs-config"

interface KnobsEditorProps {
  knobs: Record<string, string | number | boolean>
  stationId: string
  onUpdate?: (knobs: Record<string, string | number | boolean>) => void
}

export default function KnobsEditor({ knobs, stationId, onUpdate }: KnobsEditorProps) {
  const [editedKnobs, setEditedKnobs] = useState(knobs)

  const knobsByCategory = Object.values(KNOBS_CONFIG).reduce(
    (acc, knob) => {
      const category = knob.category || "general"
      if (!acc[category]) acc[category] = []
      acc[category].push(knob)
      return acc
    },
    {} as Record<string, KnobConfig[]>,
  )

  const handleKnobChange = (knobId: string, value: number | boolean | string) => {
    const updated = { ...editedKnobs, [knobId]: value }
    setEditedKnobs(updated)
    if (onUpdate) {
      onUpdate(updated)
    }
  }

  return (
    <div className="space-y-3">
      {Object.entries(knobsByCategory).map(([category, categoryKnobs]) => (
        <div key={category} className="space-y-2">
          <h4 className="text-xs font-semibold text-slate-700 uppercase bg-slate-100 px-3 py-2 rounded">
            {category} ({categoryKnobs.length})
          </h4>
          <div className="grid gap-2 grid-cols-4">
            {categoryKnobs.map((knob) => {
              const value = editedKnobs[knob.id] ?? knob.currentValue
              return (
                <KnobControl
                  key={knob.id}
                  knob={knob}
                  value={value}
                  onChange={(val) => handleKnobChange(knob.id, val)}
                  showEdit={true}
                  compact={false}
                />
              )
            })}
          </div>
        </div>
      ))}
    </div>
  )
}
