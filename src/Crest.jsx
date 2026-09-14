export default function Crest({ size = 40, className = '' }) {
  return (
    <svg
      viewBox="0 0 64 80"
      width={size}
      height={(size * 80) / 64}
      className={`crest ${className}`}
      aria-hidden="true"
    >
      <path
        d="M14 10 L20 19 L26 8 L32 17 L38 8 L44 19 L50 10 L50 23 L14 23 Z"
        fill="currentColor"
      />
      <path
        d="M8 23 L32 12 L56 23 L56 47 C56 62 45 72 32 77 C19 72 8 62 8 47 Z"
        fill="none"
        stroke="currentColor"
        strokeWidth="2.5"
      />
      <text
        x="32"
        y="49"
        textAnchor="middle"
        fontFamily="Fraunces, serif"
        fontWeight="600"
        fontSize="19"
        fill="currentColor"
      >
        FK
      </text>
      <circle cx="32" cy="63" r="6.5" fill="none" stroke="currentColor" strokeWidth="1.6" />
      <path
        d="M32 57.5l2.6 1.9-1 3-3.2 0-1-3zM27.5 61.3l1.4 3M36.5 61.3l-1.4 3M29.9 66.4h4.2"
        fill="none"
        stroke="currentColor"
        strokeWidth="1"
      />
    </svg>
  )
}
