type ConnectorIconProps = {
  slug?: string
  className?: string
}

export function ConnectorIcon({ slug, className = "h-5 w-5" }: ConnectorIconProps) {
  if (slug === "webhook") {
    return (
      <svg className={className} viewBox="0 0 24 24" fill="none" aria-hidden="true">
        <path
          d="M13 3L4 14h7l-1 7 9-11h-7l1-7z"
          stroke="currentColor"
          strokeWidth="1.75"
          strokeLinejoin="round"
        />
      </svg>
    )
  }

  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" aria-hidden="true">
      <ellipse cx="12" cy="6" rx="7" ry="3" stroke="currentColor" strokeWidth="1.75" />
      <path
        d="M5 6v6c0 1.66 3.13 3 7 3s7-1.34 7-3V6"
        stroke="currentColor"
        strokeWidth="1.75"
      />
      <path
        d="M5 12v6c0 1.66 3.13 3 7 3s7-1.34 7-3v-6"
        stroke="currentColor"
        strokeWidth="1.75"
      />
    </svg>
  )
}
