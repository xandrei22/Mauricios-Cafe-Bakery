"use client"

import type React from "react"
import { useState, useRef, useEffect } from "react"

interface SugarSliderProps {
  value: number
  onChange: (value: number) => void
}

export function SugarSlider({ value, onChange }: SugarSliderProps) {
  const [isDragging, setIsDragging] = useState(false)
  const sliderRef = useRef<HTMLDivElement>(null)

  const levels = [0, 25, 50, 75, 100]

  const handleMouseDown = (e: React.MouseEvent) => {
    setIsDragging(true)
    updateValue(e)
  }

  const handleMouseMove = (e: MouseEvent) => {
    if (isDragging) {
      updateValue(e)
    }
  }

  const handleMouseUp = () => {
    setIsDragging(false)
  }

  const updateValue = (e: MouseEvent | React.MouseEvent) => {
    if (!sliderRef.current) return

    const rect = sliderRef.current.getBoundingClientRect()
    const x = e.clientX - rect.left
    const percentage = Math.max(0, Math.min(100, (x / rect.width) * 100))

    // Snap to nearest level
    const nearest = levels.reduce((prev, curr) =>
      Math.abs(curr - percentage) < Math.abs(prev - percentage) ? curr : prev,
    )

    onChange(nearest)
  }

  useEffect(() => {
    if (isDragging) {
      document.addEventListener("mousemove", handleMouseMove)
      document.addEventListener("mouseup", handleMouseUp)

      return () => {
        document.removeEventListener("mousemove", handleMouseMove)
        document.removeEventListener("mouseup", handleMouseUp)
      }
    }
  }, [isDragging])

  const currentIndex = levels.indexOf(value)

  return (
    <div className="space-y-3">
      <div className="flex justify-between text-sm text-gray-600">
        <span className="font-medium">Sugar Level</span>
        <span className="font-semibold text-amber-600">{value}%</span>
      </div>

      <div
        ref={sliderRef}
        className="relative h-6 bg-gray-200 rounded-full cursor-pointer select-none"
        onMouseDown={handleMouseDown}
      >
        {/* Track fill */}
        <div
          className="absolute top-0 left-0 h-full bg-gradient-to-r from-yellow-400 to-amber-500 rounded-full transition-all duration-200"
          style={{ width: `${value}%` }}
        />

        {/* Level markers */}
        {levels.map((level, index) => (
          <div
            key={level}
            className="absolute top-1/2 transform -translate-y-1/2 -translate-x-1/2"
            style={{ left: `${level}%` }}
          >
            <div
              className={`w-3 h-3 rounded-full border-2 transition-all duration-200 ${
                index <= currentIndex ? "bg-white border-amber-500 shadow-md" : "bg-gray-300 border-gray-400"
              }`}
            />
          </div>
        ))}

        {/* Draggable thumb */}
        <div
          className="absolute top-1/2 transform -translate-y-1/2 -translate-x-1/2 transition-all duration-200"
          style={{ left: `${value}%` }}
        >
          <div
            className={`w-5 h-5 rounded-full border-3 shadow-lg transition-all duration-200 ${
              isDragging ? "bg-amber-400 border-amber-600 scale-110" : "bg-white border-amber-500 hover:scale-105"
            }`}
          />
        </div>
      </div>

      {/* Level labels */}
      <div className="flex justify-between text-xs text-gray-500">
        {levels.map((level) => (
          <span key={level} className={level === value ? "font-medium text-amber-600" : ""}>
            {level}%
          </span>
        ))}
      </div>
    </div>
  )
} 