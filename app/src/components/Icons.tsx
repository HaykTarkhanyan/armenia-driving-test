import type { ReactNode } from 'react'
import type { GuideKind } from '../content/guides.ts'

function Line({ children, className }: { children: ReactNode; className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      {children}
    </svg>
  )
}

export const HomeIcon = () => (
  <Line>
    <path d="M4 11l8-7 8 7" />
    <path d="M6 10v10h12V10" />
  </Line>
)

export const TopicsIcon = () => (
  <Line>
    <path d="M4 6h16M4 12h16M4 18h16" />
  </Line>
)

/** A signpost: the shortcuts. */
export const ShortcutsIcon = () => (
  <Line>
    <path d="M12 3v18M8 21h8" />
    <path d="M12 5h6l2.5 2.5L18 10h-6z" />
    <path d="M12 12H6l-2.5 2.5L6 17h6" />
  </Line>
)

export const ExamIcon = () => (
  <Line>
    <circle cx="12" cy="13.5" r="7.5" />
    <path d="M12 9.5v4l2.5 2M9.5 2.5h5" />
  </Line>
)

export const ProgressIcon = () => (
  <Line>
    <path d="M5 20v-6M12 20V5M19 20v-10" />
  </Line>
)

export const Chevron = () => (
  <Line className="chev">
    <path d="M9 5l7 7-7 7" />
  </Line>
)

export const Flame = () => (
  <Line>
    <path d="M12 3c.6 3.2 5.5 5.6 5.5 11a5.5 5.5 0 0 1-11 0c0-2.3 1-3.8 2.3-5 .2 1.6.9 2.6 1.9 3.1C10.300 9 10.700 6 12 3z" />
  </Line>
)

export const SunIcon = () => (
  <Line>
    <circle cx="12" cy="12" r="4" />
    <path d="M12 2.500v2.500M12 19v2.500M2.500 12H5M19 12h2.500M5.300 5.300l1.800 1.800M16.900 16.900l1.800 1.800M5.300 18.700l1.800-1.800M16.900 7.100l1.800-1.800" />
  </Line>
)

export const MoonIcon = () => (
  <Line>
    <path d="M20 14.500A8 8 0 0 1 9.500 4a8 8 0 1 0 10.500 10.500z" />
  </Line>
)

/** The road-sign shape that says what kind of shortcut this is. */
export function Sign({ kind }: { kind: GuideKind }) {
  return (
    <svg className="sign" viewBox="0 0 32 32" aria-hidden="true">
      {kind === 'rule' && (
        <>
          <circle cx="16" cy="16" r="15" fill="#0033a0" />
          <path d="M9 16.5l5 5 9.5-10.5" fill="none" stroke="#fff" strokeWidth="3.4" strokeLinecap="round" strokeLinejoin="round" />
        </>
      )}
      {kind === 'lean' && (
        <>
          <path d="M16 3l14 25H2z" fill="#fff" stroke="#d90012" strokeWidth="3.4" strokeLinejoin="round" />
          <path d="M16 12v7" stroke="#16181c" strokeWidth="3" strokeLinecap="round" />
          <circle cx="16" cy="23.6" r="1.8" fill="#16181c" />
        </>
      )}
      {kind === 'never' && (
        <>
          <circle cx="16" cy="16" r="13" fill="#fff" stroke="#d90012" strokeWidth="4.4" />
          <path d="M7 7l18 18" stroke="#d90012" strokeWidth="4.4" />
        </>
      )}
      {kind === 'exception' && (
        <>
          <rect x="6" y="6" width="20" height="20" rx="1.5" transform="rotate(45 16 16)" fill="#fff" stroke="#16181c" strokeWidth="1" />
          <rect x="9" y="9" width="14" height="14" transform="rotate(45 16 16)" fill="#f2a800" />
        </>
      )}
    </svg>
  )
}
