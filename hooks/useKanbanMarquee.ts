'use client'

import { useEffect, useRef, useState } from 'react'

interface MarqueeRect {
  left: number
  top: number
  width: number
  height: number
}

interface UseKanbanMarqueeOptions {
  containerRef: React.RefObject<HTMLElement | null>
  cardSelector?: string
  onSelectionChange: (selectedIds: string[], append: boolean) => void
  disabled?: boolean
}

export function useKanbanMarquee({
  containerRef,
  cardSelector = '[data-kanban-card-id]',
  onSelectionChange,
  disabled = false,
}: UseKanbanMarqueeOptions) {
  const [marqueeRect, setMarqueeRect] = useState<MarqueeRect | null>(null)
  const isDraggingRef = useRef(false)
  const startPosRef = useRef<{ x: number; y: number }>({ x: 0, y: 0 })
  const isAppendRef = useRef(false)

  useEffect(() => {
    const container = containerRef.current
    if (!container || disabled) return

    function handleMouseDown(e: MouseEvent) {
      // Hanya tangani klik kiri
      if (e.button !== 0) return

      const target = e.target as HTMLElement | null
      if (!target) return

      // Abaikan jika target klik ada di dalam kartu kanban, input, button, atau dialog/drawer
      if (
        target.closest(cardSelector) ||
        target.closest('button') ||
        target.closest('input') ||
        target.closest('textarea') ||
        target.closest('a') ||
        target.closest('[role="dialog"]') ||
        target.closest('[data-kanban-ignore-marquee]')
      ) {
        return
      }

      // Mulai inisiasi marquee
      isDraggingRef.current = true
      startPosRef.current = { x: e.clientX, y: e.clientY }
      isAppendRef.current = e.shiftKey || e.ctrlKey || e.metaKey

      setMarqueeRect({
        left: e.clientX,
        top: e.clientY,
        width: 0,
        height: 0,
      })
    }

    function handleMouseMove(e: MouseEvent) {
      if (!isDraggingRef.current) return

      const startX = startPosRef.current.x
      const startY = startPosRef.current.y
      const currentX = e.clientX
      const currentY = e.clientY

      const left = Math.min(startX, currentX)
      const top = Math.min(startY, currentY)
      const width = Math.abs(currentX - startX)
      const height = Math.abs(currentY - startY)

      setMarqueeRect({ left, top, width, height })

      // Hit-test cards jika dimensi marquee > 5px (hindari seleksi saat sekadar klik biasa)
      if (width > 5 || height > 5) {
        const cards = container?.querySelectorAll<HTMLElement>(cardSelector)
        if (!cards) return

        const hitIds: string[] = []
        const selLeft = left
        const selRight = left + width
        const selTop = top
        const selBottom = top + height

        cards.forEach((card) => {
          const rect = card.getBoundingClientRect()
          // Check AABB intersection
          const intersects = !(
            rect.right < selLeft ||
            rect.left > selRight ||
            rect.bottom < selTop ||
            rect.top > selBottom
          )
          if (intersects) {
            const id = card.getAttribute('data-kanban-card-id')
            if (id) hitIds.push(id)
          }
        })

        onSelectionChange(hitIds, isAppendRef.current)
      }
    }

    function handleMouseUp() {
      if (isDraggingRef.current) {
        isDraggingRef.current = false
        setMarqueeRect(null)
      }
    }

    window.addEventListener('mousedown', handleMouseDown)
    window.addEventListener('mousemove', handleMouseMove)
    window.addEventListener('mouseup', handleMouseUp)

    return () => {
      window.removeEventListener('mousedown', handleMouseDown)
      window.removeEventListener('mousemove', handleMouseMove)
      window.removeEventListener('mouseup', handleMouseUp)
    }
  }, [containerRef, cardSelector, onSelectionChange, disabled])

  return { marqueeRect }
}
