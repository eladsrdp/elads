// Hook קטן שעוטף viewMode.ts עם state של React ומתמיד ל-localStorage.
import { useState } from 'react'
import { readViewMode, writeViewMode, type ViewMode } from '../lib/viewMode'

export function useViewMode() {
  const [mode, setModeState] = useState<ViewMode>(() => readViewMode(localStorage))

  const setMode = (next: ViewMode) => {
    writeViewMode(localStorage, next)
    setModeState(next)
  }

  return [mode, setMode] as const
}
