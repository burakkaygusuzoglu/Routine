import { useState, type FormEvent } from 'react'
import { Button, Sheet } from '../../ui'
import { ArrowDownGlyph, ArrowUpGlyph, PencilGlyph, TrashGlyph } from './glyphs'
import { MAX_SUBJECTS, MAX_SUBJECT_LENGTH, addSubject, moveSubject, removeSubject, subjectError } from './subjects'
import { SubjectLabel } from './SubjectLabel'

export interface SubjectsSheetProps {
  open: boolean
  subjects: string[]
  onClose: () => void
  onSave: (list: string[]) => void
  /** Rename in the list and on every existing note. */
  onRename: (from: string, to: string) => void
}

const inputClass =
  'w-full min-h-[var(--tap)] rounded-control border border-field-line bg-bg px-3 text-body text-text placeholder:text-muted focus:border-accent focus:outline-none'

const iconBtn =
  'flex size-[var(--tap)] shrink-0 cursor-pointer items-center justify-center rounded-full border-0 bg-transparent text-muted disabled:cursor-not-allowed disabled:opacity-30 focus-visible:outline-2 focus-visible:outline-accent'

/** "Konular": add, rename, reorder and remove study subjects. */
export function SubjectsSheet({ open, ...rest }: SubjectsSheetProps) {
  return (
    <Sheet open={open} onClose={rest.onClose} title="Konular">
      {open ? <SubjectsForm {...rest} /> : null}
    </Sheet>
  )
}

function SubjectsForm({ subjects, onSave, onRename, onClose }: Omit<SubjectsSheetProps, 'open'>) {
  const [draft, setDraft] = useState('')
  const [editing, setEditing] = useState<string | null>(null)
  const [editText, setEditText] = useState('')
  const [removing, setRemoving] = useState<string | null>(null)

  const addError = draft.trim() ? subjectError(subjects, draft) : null
  const editError = editing !== null ? subjectError(subjects, editText, editing) : null

  function add(e: FormEvent) {
    e.preventDefault()
    if (subjectError(subjects, draft)) return
    onSave(addSubject(subjects, draft))
    setDraft('')
  }

  function commitRename(e: FormEvent) {
    e.preventDefault()
    if (editing === null || editError) return
    if (editText.trim() !== editing) onRename(editing, editText.trim())
    setEditing(null)
  }

  return (
    <div className="flex flex-col gap-3">
      <p className="m-0 text-footnote text-muted">
        Notlara etiket olarak eklenir. Adı değiştirirsen eski notlar da güncellenir.
      </p>

      {subjects.length === 0 ? (
        <p className="m-0 text-footnote text-muted">Henüz konu yok. Aşağıdan ekleyebilirsin.</p>
      ) : (
        <ul aria-label="Konular" className="m-0 flex list-none flex-col gap-1 p-0">
          {subjects.map((name, i) => (
            <li key={name} className="rounded-row bg-raised py-1 pr-1 pl-3">
              {editing === name ? (
                <form onSubmit={commitRename} className="flex flex-col gap-2 py-2 pr-2">
                  <label htmlFor="subject-rename" className="text-footnote text-muted">
                    Yeni ad
                  </label>
                  <input
                    id="subject-rename"
                    autoFocus
                    value={editText}
                    maxLength={MAX_SUBJECT_LENGTH}
                    autoComplete="off"
                    onChange={(e) => setEditText(e.target.value)}
                    className={inputClass}
                  />
                  <p aria-live="polite" className="m-0 min-h-4 text-footnote text-danger">
                    {editError ?? ''}
                  </p>
                  <div className="flex gap-2">
                    <Button type="submit" className="flex-1" disabled={!!editError}>
                      Kaydet
                    </Button>
                    <Button variant="ghost" onClick={() => setEditing(null)}>
                      İptal
                    </Button>
                  </div>
                </form>
              ) : removing === name ? (
                <div className="flex flex-col gap-2 py-2 pr-2">
                  <p className="m-0 text-body">“{name}” konusu silinsin mi? Eski notların etiketi olduğu gibi kalır.</p>
                  <div className="flex gap-2">
                    <Button
                      variant="danger"
                      className="flex-1 bg-surface"
                      onClick={() => {
                        onSave(removeSubject(subjects, name))
                        setRemoving(null)
                      }}
                    >
                      Sil
                    </Button>
                    <Button variant="ghost" className="bg-surface" onClick={() => setRemoving(null)}>
                      Vazgeç
                    </Button>
                  </div>
                </div>
              ) : (
                <div className="flex items-center">
                  <span className="min-w-0 flex-1">
                    <SubjectLabel subjects={subjects} name={name} />
                  </span>
                  <button
                    type="button"
                    aria-label={`${name} konusunu yukarı taşı`}
                    disabled={i === 0}
                    onClick={() => onSave(moveSubject(subjects, name, -1))}
                    className={iconBtn}
                  >
                    <ArrowUpGlyph />
                  </button>
                  <button
                    type="button"
                    aria-label={`${name} konusunu aşağı taşı`}
                    disabled={i === subjects.length - 1}
                    onClick={() => onSave(moveSubject(subjects, name, 1))}
                    className={iconBtn}
                  >
                    <ArrowDownGlyph />
                  </button>
                  <button
                    type="button"
                    aria-label={`${name} konusunun adını değiştir`}
                    onClick={() => {
                      setEditing(name)
                      setEditText(name)
                      setRemoving(null)
                    }}
                    className={iconBtn}
                  >
                    <PencilGlyph />
                  </button>
                  <button
                    type="button"
                    aria-label={`${name} konusunu sil`}
                    onClick={() => {
                      setRemoving(name)
                      setEditing(null)
                    }}
                    className={iconBtn}
                  >
                    <TrashGlyph />
                  </button>
                </div>
              )}
            </li>
          ))}
        </ul>
      )}

      <form onSubmit={add} className="flex flex-col gap-2">
        <label htmlFor="subject-new" className="text-footnote text-muted">
          Yeni konu ({subjects.length}/{MAX_SUBJECTS})
        </label>
        <div className="flex gap-2">
          <input
            id="subject-new"
            value={draft}
            maxLength={MAX_SUBJECT_LENGTH}
            autoComplete="off"
            placeholder="Örn. Linux"
            onChange={(e) => setDraft(e.target.value)}
            className={inputClass}
          />
          <Button type="submit" disabled={!draft.trim() || !!addError}>
            Ekle
          </Button>
        </div>
        <p aria-live="polite" className="m-0 min-h-4 text-footnote text-danger">
          {addError ?? ''}
        </p>
      </form>

      <Button variant="ghost" onClick={onClose}>
        Bitti
      </Button>
    </div>
  )
}
