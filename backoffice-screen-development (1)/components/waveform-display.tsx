"use client"

import { useEffect, useRef } from "react"

interface WaveformDisplayProps {
  audioData?: number[]
}

export default function WaveformDisplay({ audioData = [] }: WaveformDisplayProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null)

  useEffect(() => {
    const canvas = canvasRef.current
    if (!canvas) return

    const ctx = canvas.getContext("2d")
    if (!ctx) return

    ctx.fillStyle = "#f8fafc"
    ctx.fillRect(0, 0, canvas.width, canvas.height)

    const data = audioData.length > 0 ? audioData : generateSampleWave()
    const width = canvas.width
    const height = canvas.height
    const center = height / 2

    // Draw waveform
    ctx.strokeStyle = "#3b82f6"
    ctx.lineWidth = 1.5
    ctx.beginPath()

    const samples = Math.min(data.length, width)
    const step = data.length / samples

    for (let i = 0; i < samples; i++) {
      const index = Math.floor(i * step)
      const value = (data[index] || 0) * (height / 2)
      const x = i
      const y = center - value

      if (i === 0) ctx.moveTo(x, y)
      else ctx.lineTo(x, y)
    }

    ctx.stroke()

    // Draw center line
    ctx.strokeStyle = "#cbd5e1"
    ctx.lineWidth = 1
    ctx.setLineDash([4, 4])
    ctx.beginPath()
    ctx.moveTo(0, center)
    ctx.lineTo(width, center)
    ctx.stroke()
    ctx.setLineDash([])
  }, [audioData])

  const generateSampleWave = () => {
    return Array.from({ length: 1000 }, (_, i) => {
      return Math.sin((i / 100) * Math.PI) * 0.6 + Math.sin((i / 50) * Math.PI * 2) * 0.2
    })
  }

  return (
    <canvas
      ref={canvasRef}
      width={800}
      height={80}
      className="w-full h-20 border border-slate-200 rounded bg-slate-50"
    />
  )
}
