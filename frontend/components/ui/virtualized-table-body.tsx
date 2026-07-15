"use client"

import { useCallback, useRef, useState, type ReactNode } from "react"

import { cn } from "@/lib/utils"

const VIRTUALIZE_THRESHOLD = 100
const DEFAULT_ROW_HEIGHT = 56
const OVERSCAN = 6

type VirtualizedTableBodyProps<T> = {
  rows: T[]
  rowKey: (row: T, index: number) => string
  renderRow: (row: T, index: number) => ReactNode
  rowHeight?: number
  maxHeight?: number
  className?: string
}

export function VirtualizedTableBody<T>({
  rows,
  rowKey,
  renderRow,
  rowHeight = DEFAULT_ROW_HEIGHT,
  maxHeight = 480,
  className,
}: VirtualizedTableBodyProps<T>) {
  const containerRef = useRef<HTMLDivElement>(null)
  const [scrollTop, setScrollTop] = useState(0)

  const onScroll = useCallback(() => {
    if (!containerRef.current) return
    setScrollTop(containerRef.current.scrollTop)
  }, [])

  if (rows.length < VIRTUALIZE_THRESHOLD) {
    return <>{rows.map((row, index) => renderRow(row, index))}</>
  }

  const totalHeight = rows.length * rowHeight
  const startIndex = Math.max(0, Math.floor(scrollTop / rowHeight) - OVERSCAN)
  const visibleCount = Math.ceil(maxHeight / rowHeight) + OVERSCAN * 2
  const endIndex = Math.min(rows.length, startIndex + visibleCount)
  const offsetY = startIndex * rowHeight

  return (
    <div
      ref={containerRef}
      onScroll={onScroll}
      className={cn("overflow-y-auto", className)}
      style={{ maxHeight }}
      role="presentation"
    >
      <div style={{ height: totalHeight, position: "relative" }}>
        <div style={{ transform: `translateY(${offsetY}px)` }}>
          {rows.slice(startIndex, endIndex).map((row, index) => (
            <div key={rowKey(row, startIndex + index)} style={{ minHeight: rowHeight }}>
              {renderRow(row, startIndex + index)}
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}
