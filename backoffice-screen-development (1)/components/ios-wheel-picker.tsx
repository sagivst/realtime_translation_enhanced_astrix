"use client"

import { useRef, useState, useEffect } from "react"
import "./ios-wheel-picker.css"

interface IOSWheelPickerProps {
  items: (string | number)[]
  itemHeight?: number
  visibleCount?: number
  onChange?: (value: string | number) => void
  initialValue?: string | number
  scaleConfig?: {
    top2: number
    top1: number
    center: number
    bottom1: number
    bottom2: number
  }
}

export default function IOSWheelPicker({
  items = [],
  itemHeight = 40,
  visibleCount = 5,
  onChange,
  initialValue,
  scaleConfig = {
    top2: 0.08,
    top1: 0.25,
    center: 1.0,
    bottom1: 0.25,
    bottom2: 0.08,
  },
}: IOSWheelPickerProps) {
  const ref = useRef<HTMLDivElement>(null)
  const [centerIndex, setCenterIndex] = useState(() => {
    if (initialValue !== undefined) {
      const index = items.findIndex((item) => item === initialValue)
      return index >= 0 ? index : 0
    }
    return 0
  })

  const padding = Math.floor(visibleCount / 2)
  const totalHeight = visibleCount * itemHeight

  useEffect(() => {
    if (ref.current && initialValue !== undefined) {
      const index = items.findIndex((item) => item === initialValue)
      if (index >= 0) {
        ref.current.scrollTop = index * itemHeight
        setCenterIndex(index)
      }
    }
  }, [initialValue, items, itemHeight])

  const handleScroll = () => {
    if (!ref.current) return
    const scrollPosition = ref.current.scrollTop
    const index = Math.round(scrollPosition / itemHeight)
    setCenterIndex(index)
    onChange?.(items[index])
  }

  const isInteractive = !!onChange

  return (
    <div className="ios-wheel-mask" style={{ height: totalHeight }}>
      <div
        className={`ios-wheel-list ${!isInteractive ? "ios-wheel-disabled pointer-events-none" : ""}`}
        style={{
          paddingTop: padding * itemHeight,
          paddingBottom: padding * itemHeight,
          overflowY: isInteractive ? "auto" : "hidden",
        }}
        ref={ref}
        onScroll={isInteractive ? handleScroll : undefined}
      >
        {items.map((item, i) => {
          const diff = i - centerIndex

          const scaleY =
            diff === -2
              ? scaleConfig.top2
              : diff === -1
                ? scaleConfig.top1
                : diff === 0
                  ? scaleConfig.center
                  : diff === 1
                    ? scaleConfig.bottom1
                    : diff === 2
                      ? scaleConfig.bottom2
                      : 0.03

          const opacity = diff === 0 ? 1 : diff === -1 || diff === 1 ? 0.55 : 0.25

          return (
            <div
              key={i}
              className="ios-wheel-item"
              style={{
                height: itemHeight,
                transform: `scaleY(${scaleY})`,
                opacity,
              }}
            >
              {item}
            </div>
          )
        })}
      </div>
    </div>
  )
}
