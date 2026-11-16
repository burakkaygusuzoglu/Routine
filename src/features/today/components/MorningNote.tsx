interface Props {
  text: string
}

/** Yesterday's "first task for the morning", from night mode. */
export function MorningNote({ text }: Props) {
  return (
    <section aria-label="Dünden not" className="rounded-card bg-surface px-4 py-3">
      <p className="text-footnote text-muted">Dün gece not ettin:</p>
      <p className="text-body font-semibold">{text}</p>
    </section>
  )
}
