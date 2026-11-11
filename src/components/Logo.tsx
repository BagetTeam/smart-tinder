export function Logo({ className = 'h-8 w-8' }: { className?: string }) {
  return (
    <svg viewBox="0 0 64 64" className={className} aria-hidden>
      <defs>
        <linearGradient id="logo-g" x1="0" y1="0" x2="1" y2="1">
          <stop offset="0" stopColor="#ff4f7b" />
          <stop offset="1" stopColor="#8b5cf6" />
        </linearGradient>
      </defs>
      <rect width="64" height="64" rx="18" fill="url(#logo-g)" />
      <path d="M32 50s-16-9.5-16-21a8.5 8.5 0 0 1 16-4 8.5 8.5 0 0 1 16 4c0 11.5-16 21-16 21z" fill="#fff" />
      <path d="M26 31c2-3 4-3 6 0s4 3 6 0" stroke="#8b5cf6" strokeWidth="2.6" fill="none" strokeLinecap="round" />
    </svg>
  )
}
