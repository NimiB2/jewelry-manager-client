import { useEffect, useRef, useState } from 'react'

type SaveStatus = 'idle' | 'saving' | 'saved' | 'error'

// Shared debounce-then-PATCH-then-undo logic used by every autosaving
// settings section (materials, packaging, number fields, prep stages).
export function useAutosaveSection<T>(
  initial: T,
  save: (value: T) => Promise<Response>,
  isValid: (value: T) => boolean = () => true,
) {
  const savedSnapshot = useRef<T>(initial)
  const [value, setValue] = useState<T>(initial)
  const [status, setStatus] = useState<SaveStatus>('idle')
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  const valueRef = useRef(value)
  valueRef.current = value
  const isMountedRef = useRef(true)

  async function doSave(v: T) {
    if (isMountedRef.current) setStatus('saving')
    try {
      const res = await save(v)
      if (!res.ok) throw new Error(`HTTP ${res.status}`)
      savedSnapshot.current = v
      if (isMountedRef.current) setStatus('saved')
    } catch {
      if (isMountedRef.current) setStatus('error')
    }
  }

  useEffect(() => {
    if (debounceRef.current) clearTimeout(debounceRef.current)
    if (!isValid(value)) return
    if (JSON.stringify(value) === JSON.stringify(savedSnapshot.current)) return

    debounceRef.current = setTimeout(() => {
      debounceRef.current = null
      doSave(value)
    }, 800)
    return () => {
      if (debounceRef.current) clearTimeout(debounceRef.current)
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [value])

  // Switching settings tabs (or navigating away) unmounts this section
  // immediately — a pending debounce timer would otherwise just be canceled,
  // silently dropping whatever the user just typed. Flush it instead.
  useEffect(() => {
    isMountedRef.current = true
    return () => {
      isMountedRef.current = false
      if (debounceRef.current) {
        clearTimeout(debounceRef.current)
        debounceRef.current = null
        if (isValid(valueRef.current) && JSON.stringify(valueRef.current) !== JSON.stringify(savedSnapshot.current)) {
          doSave(valueRef.current)
        }
      }
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  function undo() {
    if (debounceRef.current) clearTimeout(debounceRef.current)
    setValue(initial)
    doSave(initial)
  }

  const hasChanges = JSON.stringify(value) !== JSON.stringify(initial)
  const valid = isValid(value)

  return { value, setValue, status, hasChanges, valid, undo }
}
