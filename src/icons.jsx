function base(props) {
  return {
    viewBox: '0 0 24 24',
    fill: 'none',
    stroke: 'currentColor',
    strokeWidth: 1.8,
    strokeLinecap: 'round',
    strokeLinejoin: 'round',
    'aria-hidden': true,
    ...props,
  }
}

export function IconChecklist({ size = 22 }) {
  return (
    <svg width={size} height={size} {...base()}>
      <rect x="5" y="3.5" width="14" height="17" rx="2" />
      <path d="M9 8h6M9 12h6M9 16h3" />
      <path d="M9 3.5V3a1 1 0 0 1 1-1h4a1 1 0 0 1 1 1v.5" />
    </svg>
  )
}

export function IconUsers({ size = 22 }) {
  return (
    <svg width={size} height={size} {...base()}>
      <circle cx="9" cy="8" r="3" />
      <path d="M3 20c0-3.3 2.7-6 6-6s6 2.7 6 6" />
      <circle cx="17" cy="9" r="2.4" />
      <path d="M15.5 14.2c2.6.4 4.5 2.7 4.5 5.3" />
    </svg>
  )
}

export function IconCard({ size = 22 }) {
  return (
    <svg width={size} height={size} {...base()}>
      <rect x="3" y="6" width="18" height="13" rx="2" />
      <circle cx="9" cy="11" r="1.8" />
      <path d="M6 16c0-1.7 1.3-3 3-3s3 1.3 3 3" />
      <path d="M14 10h4M14 13h4" />
    </svg>
  )
}

export function IconUser({ size = 22 }) {
  return (
    <svg width={size} height={size} {...base()}>
      <circle cx="12" cy="8" r="3.5" />
      <path d="M4.5 20c0-4.1 3.4-7.5 7.5-7.5s7.5 3.4 7.5 7.5" />
    </svg>
  )
}

export function IconLogout({ size = 20 }) {
  return (
    <svg width={size} height={size} {...base()}>
      <path d="M9 4H6a2 2 0 0 0-2 2v12a2 2 0 0 0 2 2h3" />
      <path d="M15 8l4 4-4 4" />
      <path d="M19 12H9" />
    </svg>
  )
}

export function IconChevronRight({ size = 18 }) {
  return (
    <svg width={size} height={size} {...base()}>
      <path d="M9 5l7 7-7 7" />
    </svg>
  )
}

export function IconShuffle({ size = 22 }) {
  return (
    <svg width={size} height={size} {...base()}>
      <path d="M3 6h3.5c2 0 3 1 4 2.5L15 18h3.5" />
      <path d="M15 6h3.5L21 8" />
      <path d="M18 4l3 4-3 4" />
      <path d="M3 18h3.5c2 0 3-1 4-2.5" />
      <path d="M18 14l3 4-3 4" />
    </svg>
  )
}

export function IconTrash({ size = 18 }) {
  return (
    <svg width={size} height={size} {...base()}>
      <path d="M4 7h16M9 7V4h6v3M7 7l1 13h8l1-13M10 11v5M14 11v5" />
    </svg>
  )
}
