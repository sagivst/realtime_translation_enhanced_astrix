"use client"

import { useEffect, useRef, useState } from "react"
import { Card } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Play, Pause } from "lucide-react"

interface SuperAudioMonitorProps {
  stationId: string
  trafficType?: "RTP" | "PCM"
  height?: number
}

type VisualizationType = "waveform" | "spectrum" | "spectrogram"

export default function SuperAudioMonitor({ stationId, trafficType = "RTP", height = 67 }: SuperAudioMonitorProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const [isPlaying, setIsPlaying] = useState(false)
  const [vizType, setVizType] = useState<VisualizationType>("waveform")
  const animationFrameRef = useRef<number>()
  const audioContextRef = useRef<AudioContext | null>(null)
  const spectrogramDataRef = useRef<number[][]>([])

  useEffect(() => {
    const canvas = canvasRef.current
    if (!canvas) return

    const ctx = canvas.getContext("2d")
    if (!ctx) return

    const W = canvas.width
    const H = canvas.height

    ctx.fillStyle = "#ffffff"
    ctx.fillRect(0, 0, W, H)

    if (vizType === "waveform") {
      ctx.lineWidth = 2
      ctx.strokeStyle = "#3b82f6"
      ctx.beginPath()

      const points = 400
      for (let i = 0; i < points; i++) {
        const x = (i / points) * W
        const t = i / points
        // Combine multiple sine waves for realistic audio waveform
        const y =
          H / 2 +
          Math.sin(t * Math.PI * 16) * (H * 0.15) +
          Math.sin(t * Math.PI * 8) * (H * 0.1) +
          Math.sin(t * Math.PI * 4) * (H * 0.05)

        if (i === 0) {
          ctx.moveTo(x, y)
        } else {
          ctx.lineTo(x, y)
        }
      }
      ctx.stroke()
    } else if (vizType === "spectrum") {
      const barCount = 60
      const barWidth = W / barCount
      const barGap = barWidth * 0.15

      for (let i = 0; i < barCount; i++) {
        // Simulate frequency distribution (lower frequencies have more energy)
        const freqFactor = 1 - (i / barCount) * 0.7
        const magnitude = (Math.random() * 0.4 + 0.3) * freqFactor
        const barHeight = magnitude * H
        const x = i * barWidth

        // Color gradient from blue to cyan based on magnitude
        const hue = 200 + magnitude * 40
        const saturation = 70
        const lightness = 50
        ctx.fillStyle = `hsl(${hue}, ${saturation}%, ${lightness}%)`
        ctx.fillRect(x + barGap / 2, H - barHeight, barWidth - barGap, barHeight)
      }
    } else if (vizType === "spectrogram") {
      const columns = 120
      const rows = 30
      const columnWidth = W / columns
      const rowHeight = H / rows

      for (let col = 0; col < columns; col++) {
        for (let row = 0; row < rows; row++) {
          // Simulate frequency distribution over time
          const timeFactor = col / columns
          const freqFactor = 1 - (row / rows) * 0.8
          const magnitude = (Math.random() * 0.4 + 0.3) * freqFactor * (0.7 + Math.sin(timeFactor * Math.PI * 4) * 0.3)
          const x = col * columnWidth
          const y = H - row * rowHeight

          // Blue to yellow gradient for heat map
          const hue = 240 - magnitude * 100
          const lightness = 20 + magnitude * 50

          ctx.fillStyle = `hsl(${hue}, 80%, ${lightness}%)`
          ctx.fillRect(x, y - rowHeight, columnWidth + 1, rowHeight + 1)
        }
      }
    }
  }, [vizType])

  useEffect(() => {
    if (!isPlaying) return

    const audioCtx = new (window.AudioContext || (window as any).webkitAudioContext)()
    audioContextRef.current = audioCtx

    const oscillator = audioCtx.createOscillator()
    const gainNode = audioCtx.createGain()
    const analyser = audioCtx.createAnalyser()

    analyser.fftSize = 2048
    analyser.smoothingTimeConstant = 0.8

    oscillator.connect(gainNode)
    gainNode.connect(analyser)
    gainNode.connect(audioCtx.destination)

    oscillator.frequency.value = 440 + Math.random() * 300
    gainNode.gain.setValueAtTime(0.2, audioCtx.currentTime)
    oscillator.start()

    const ctx = canvasRef.current?.getContext("2d")
    if (!ctx) return

    const bufferLength = analyser.frequencyBinCount
    const dataArray = new Uint8Array(bufferLength)

    function draw() {
      animationFrameRef.current = requestAnimationFrame(draw)

      const canvas = canvasRef.current!
      const W = canvas.width
      const H = canvas.height

      ctx.fillStyle = "#ffffff"
      ctx.fillRect(0, 0, W, H)

      if (vizType === "waveform") {
        analyser.getByteTimeDomainData(dataArray)

        ctx.lineWidth = 2
        ctx.strokeStyle = "#3b82f6"
        ctx.beginPath()

        const sliceWidth = W / bufferLength
        let x = 0

        for (let i = 0; i < bufferLength; i++) {
          const v = dataArray[i] / 255
          const y = v * H

          if (i === 0) {
            ctx.moveTo(x, y)
          } else {
            ctx.lineTo(x, y)
          }

          x += sliceWidth
        }

        ctx.stroke()
      } else if (vizType === "spectrum") {
        analyser.getByteFrequencyData(dataArray)

        const barWidth = W / bufferLength

        for (let i = 0; i < bufferLength; i++) {
          const magnitude = dataArray[i] / 255
          const barHeight = magnitude * H
          const x = i * barWidth

          ctx.fillStyle = `hsl(${200 + magnitude * 60}, 70%, 50%)`
          ctx.fillRect(x, H - barHeight, barWidth * 0.8, barHeight)
        }
      } else if (vizType === "spectrogram") {
        analyser.getByteFrequencyData(dataArray)

        const column = Array.from(dataArray).map((v) => v / 255)
        spectrogramDataRef.current.push(column)

        const maxColumns = 150
        if (spectrogramDataRef.current.length > maxColumns) {
          spectrogramDataRef.current.shift()
        }

        const columnWidth = W / spectrogramDataRef.current.length
        const binHeight = H / (bufferLength / 2)

        spectrogramDataRef.current.forEach((col, colIdx) => {
          col.slice(0, bufferLength / 2).forEach((magnitude, binIdx) => {
            const x = colIdx * columnWidth
            const y = H - binIdx * binHeight

            const hue = 240 - magnitude * 60
            const lightness = 20 + magnitude * 60

            ctx.fillStyle = `hsl(${hue}, 80%, ${lightness}%)`
            ctx.fillRect(x, y - binHeight, columnWidth + 1, binHeight + 1)
          })
        })
      }
    }

    draw()

    return () => {
      if (animationFrameRef.current) {
        cancelAnimationFrame(animationFrameRef.current)
      }
      oscillator.stop()
      audioCtx.close()
    }
  }, [isPlaying, vizType])

  const togglePlay = () => {
    setIsPlaying(!isPlaying)
    if (vizType === "spectrogram") {
      spectrogramDataRef.current = []
    }
  }

  return (
    <Card className="p-3 border border-slate-300 bg-white">
      <div className="flex items-center justify-between mb-3">
        <div>
          <h3 className="text-sm font-semibold text-slate-900">Audio Monitoring - {trafficType}</h3>
          <p className="text-xs text-slate-500">{stationId}</p>
        </div>
        <div className="flex items-center gap-2">
          <div className="flex border border-slate-300 rounded overflow-hidden">
            <button
              onClick={() => setVizType("waveform")}
              className={`px-2 py-1 text-xs ${
                vizType === "waveform" ? "bg-blue-500 text-white" : "bg-white text-slate-700 hover:bg-slate-50"
              }`}
            >
              Waveform
            </button>
            <button
              onClick={() => setVizType("spectrum")}
              className={`px-2 py-1 text-xs border-l border-slate-300 ${
                vizType === "spectrum" ? "bg-blue-500 text-white" : "bg-white text-slate-700 hover:bg-slate-50"
              }`}
            >
              Spectrum
            </button>
            <button
              onClick={() => setVizType("spectrogram")}
              className={`px-2 py-1 text-xs border-l border-slate-300 ${
                vizType === "spectrogram" ? "bg-blue-500 text-white" : "bg-white text-slate-700 hover:bg-slate-50"
              }`}
            >
              Spectrogram
            </button>
          </div>
          <Button onClick={togglePlay} size="sm" variant="outline" className="text-xs h-7 gap-1 bg-transparent">
            {isPlaying ? <Pause className="h-3 w-3" /> : <Play className="h-3 w-3" />}
            {isPlaying ? "Recording" : "Listen"}
          </Button>
        </div>
      </div>

      <canvas
        ref={canvasRef}
        width={1000}
        height={height}
        className="w-full border border-slate-200 rounded bg-white"
        style={{ height: `${height}px` }}
      />
    </Card>
  )
}
