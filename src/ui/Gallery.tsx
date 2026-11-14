import { useState } from 'react'
import { MemoryRouter } from 'react-router-dom'
import {
  Button,
  CalendarIcon,
  Card,
  CheckCircle,
  CheckCircleIcon,
  DayDots,
  GridIcon,
  HeatGrid,
  PageHeader,
  ProgressRing,
  SegmentedControl,
  Sheet,
  Sidebar,
  SlidersIcon,
  Switch,
  TabBar,
  type CellState,
} from './index'

const NAV = [
  { to: '/', label: 'Bugün', icon: <CheckCircleIcon /> },
  { to: '/progress', label: 'İlerleme', icon: <GridIcon /> },
  { to: '/weekly', label: 'Haftalık', icon: <CalendarIcon /> },
  { to: '/settings', label: 'Ayarlar', icon: <SlidersIcon /> },
]

const STATES: CellState[] = ['full', 'min', 'pending', 'empty']
const HEAT: CellState[] = Array.from({ length: 84 }, (_, i) => STATES[(i * 7 + (i % 5)) % 4])

/** Visual check of every shared component. Not routed. */
export function Gallery() {
  const [state, setState] = useState<'full' | 'min' | 'pending'>('pending')
  const [anchor, setAnchor] = useState('fixed')
  const [on, setOn] = useState(true)
  const [open, setOpen] = useState(false)

  return (
    <MemoryRouter>
      <div className="flex min-h-full flex-col bg-bg text-text min-[900px]:flex-row">
        <Sidebar items={NAV} />
        <div className="flex min-w-0 flex-1 flex-col">
          <PageHeader eyebrow="Cumartesi, 14 Kasım" title="Galeri" right={<Button variant="ghost">Uyandım</Button>} />
          <div className="flex flex-col gap-3 px-4 pb-4">
            <Card className="flex items-center gap-4">
              <ProgressRing value={0.25} size={68} thickness={8} aria-label="8 rutinden 2 tanesi tamamlandı">
                2/8
              </ProgressRing>
              <div className="flex-1">
                <p className="m-0 text-footnote text-muted">Sıradaki · 14:00</p>
                <p className="m-0 text-headline font-bold">Ders çalışma</p>
              </div>
              <Button>Başla</Button>
            </Card>
            <Card className="flex items-center gap-3">
              <CheckCircle
                state={state}
                color="violet"
                label={`Ders çalışma: ${state}`}
                onPress={() => setState(state === 'pending' ? 'full' : state === 'full' ? 'min' : 'pending')}
              />
              <span className="flex-1">Ders çalışma</span>
              <DayDots cells={['full', 'min', 'empty', 'full', 'full', 'min', 'pending']} color="violet" />
            </Card>
            <Card className="flex flex-col gap-3">
              <SegmentedControl
                aria-label="Ne zaman"
                options={[
                  { value: 'wake', label: 'Uyanınca' },
                  { value: 'fixed', label: 'Sabit saat' },
                  { value: 'bed', label: 'Yatmadan önce' },
                ]}
                value={anchor}
                onChange={setAnchor}
              />
              <div className="flex items-center justify-between">
                <span>Takvim alarmı</span>
                <Switch checked={on} onChange={setOn} label="Takvim alarmı" />
              </div>
              <div className="flex gap-2">
                <Button onClick={() => setOpen(true)}>Sayfayı aç</Button>
                <Button variant="ghost">Vazgeç</Button>
                <Button variant="danger">Rutini arşivle</Button>
              </div>
            </Card>
            <Card className="max-w-[240px]">
              <p className="m-0 mb-2 text-footnote font-semibold text-accent">6 gün seri</p>
              <HeatGrid cells={HEAT} color="coral" />
            </Card>
          </div>
          <Sheet open={open} onClose={() => setOpen(false)} title="Rutini düzenle">
            <Button className="w-full" onClick={() => setOpen(false)}>
              Kaydet
            </Button>
          </Sheet>
          <TabBar items={NAV} />
        </div>
      </div>
    </MemoryRouter>
  )
}
