import { useState } from 'react'
import { SegmentedControl, type SegmentedOption } from '../ui/SegmentedControl'
import { getTheme, setTheme, type Theme } from './theme'

const OPTIONS: SegmentedOption<Theme>[] = [
  { value: 'system', label: 'Sistem' },
  { value: 'light', label: 'Açık' },
  { value: 'dark', label: 'Koyu' },
]

/** Segmented Sistem / Açık / Koyu switch. Applies and stores the choice. */
export function ThemePicker() {
  const [theme, setLocal] = useState<Theme>(getTheme)
  return (
    <SegmentedControl
      aria-label="Görünüm"
      options={OPTIONS}
      value={theme}
      onChange={(next) => {
        setTheme(next)
        setLocal(next)
      }}
    />
  )
}
