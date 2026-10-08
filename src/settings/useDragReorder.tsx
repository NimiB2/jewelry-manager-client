import { useRef, useState, type CSSProperties, type Dispatch, type PointerEvent, type SetStateAction } from 'react'

type DragState = { index: number; startY: number; deltaY: number }

// Drag-to-reorder for the settings lists: hold the handle of a row and move it up or down.
// The rows swap as the dragged one crosses the middle of its neighbour.
export function useDragReorder<T>(setItems: Dispatch<SetStateAction<T[]>>) {
  const [drag, setDrag] = useState<DragState | null>(null)
  const rowRefs = useRef<(HTMLElement | null)[]>([])

  function handleProps(index: number) {
    return {
      onPointerDown: (e: PointerEvent<HTMLButtonElement>) => {
        e.currentTarget.setPointerCapture(e.pointerId)
        setDrag({ index, startY: e.clientY, deltaY: 0 })
      },
      onPointerMove: (e: PointerEvent<HTMLButtonElement>) => {
        if (!drag) return
        const deltaY = e.clientY - drag.startY
        const currentRect = rowRefs.current[drag.index]?.getBoundingClientRect()
        if (!currentRect) return
        const currentMid = currentRect.top + currentRect.height / 2 + deltaY

        for (let i = 0; i < rowRefs.current.length; i++) {
          if (i === drag.index) continue
          const rect = rowRefs.current[i]?.getBoundingClientRect()
          if (!rect) continue
          const mid = rect.top + rect.height / 2
          const crossedDown = i > drag.index && currentMid > mid
          const crossedUp = i < drag.index && currentMid < mid
          if (crossedDown || crossedUp) {
            setItems((prev) => {
              const next = [...prev]
              ;[next[drag.index], next[i]] = [next[i], next[drag.index]]
              return next
            })
            setDrag({ index: i, startY: e.clientY, deltaY: 0 })
            return
          }
        }

        setDrag({ ...drag, deltaY })
      },
      onPointerUp: (e: PointerEvent<HTMLButtonElement>) => {
        e.currentTarget.releasePointerCapture(e.pointerId)
        setDrag(null)
      },
    }
  }

  return {
    // Put on each row so the hook can measure it.
    rowRef: (index: number) => (el: HTMLElement | null) => {
      rowRefs.current[index] = el
    },
    handleProps,
    // The row being dragged follows the finger and sits above the others.
    rowStyle: (index: number): CSSProperties => ({
      position: 'relative',
      background: 'var(--surface)',
      zIndex: drag?.index === index ? 10 : 'auto',
      transform: drag?.index === index ? `translateY(${drag.deltaY}px)` : undefined,
    }),
  }
}

type DragHandleProps = ReturnType<ReturnType<typeof useDragReorder>['handleProps']>

export function DragHandle(props: DragHandleProps) {
  return (
    <button type="button" aria-label="גרירה לשינוי סדר" style={dragHandleStyle} {...props}>
      ⠿
    </button>
  )
}

const dragHandleStyle: CSSProperties = {
  width: 28,
  height: 36,
  border: 'none',
  background: 'transparent',
  color: 'var(--chevron)',
  fontSize: 18,
  cursor: 'grab',
  touchAction: 'none',
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'center',
}
