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
        y="53"
        textAnchor="middle"
        fontFamily="Fraunces, serif"
        fontWeight="600"
        fontSize="21"
        fill="currentColor"
      >
        FK
      </text>
    </svg>
  )
}
