import type { SVGProps } from 'react'

type P = Omit<SVGProps<SVGSVGElement>, 'children'>

function G({ d, ...rest }: P & { d: string }) {
  return (
    <svg
      width={20}
      height={20}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={1.8}
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
      focusable="false"
      {...rest}
    >
      <path d={d} />
    </svg>
  )
}

export const PencilGlyph = (p: P) => <G d="M4 20h4L19 9l-4-4L4 16v4zM13.5 6.5l4 4" {...p} />
export const ArrowUpGlyph = (p: P) => <G d="M12 19V5M6 11l6-6 6 6" {...p} />
export const ArrowDownGlyph = (p: P) => <G d="M12 5v14M6 13l6 6 6-6" {...p} />
export const TrashGlyph = (p: P) => <G d="M5 7h14M10 7V4h4v3M7 7l1 13h8l1-13" {...p} />
