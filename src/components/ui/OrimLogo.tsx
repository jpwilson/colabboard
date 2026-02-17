'use client'

interface OrimLogoProps {
  size?: 'sm' | 'md' | 'lg'
  showText?: boolean
}

function LogoIcon({ sizeClass }: { sizeClass: string }) {
  return (
    <svg viewBox="0 0 40 40" className={sizeClass} fill="none" xmlns="http://www.w3.org/2000/svg">
      {/* Rounded yellow square background */}
      <rect x="2" y="2" width="36" height="36" rx="8" fill="#FFCA28" />
      <rect x="2" y="2" width="36" height="36" rx="8" fill="url(#grad)" />

      {/* Three overlapping circles */}
      <circle cx="14" cy="20" r="8" fill="#E6A800" opacity="0.85" />
      <circle cx="20" cy="20" r="8" fill="#FFCA28" opacity="0.85" />
      <circle cx="26" cy="20" r="8" fill="#FFD54F" opacity="0.85" />

      {/* Left-half dark borders on each circle */}
      <path d="M14 12 A8 8 0 0 0 14 28" stroke="#1a2b3c" strokeWidth="1.5" fill="none" strokeLinecap="round" />
      <path d="M20 12 A8 8 0 0 0 20 28" stroke="#1a2b3c" strokeWidth="1.5" fill="none" strokeLinecap="round" />
      <path d="M26 12 A8 8 0 0 0 26 28" stroke="#1a2b3c" strokeWidth="1.5" fill="none" strokeLinecap="round" />

      <defs>
        <linearGradient id="grad" x1="2" y1="2" x2="38" y2="38" gradientUnits="userSpaceOnUse">
          <stop offset="0%" stopColor="#FFD54F" stopOpacity="0.4" />
          <stop offset="100%" stopColor="#E6A800" stopOpacity="0.3" />
        </linearGradient>
      </defs>
    </svg>
  )
}

const sizes = {
  sm: { icon: 'h-7 w-7', oText: 'text-lg', rimText: 'text-sm' },
  md: { icon: 'h-9 w-9', oText: 'text-2xl', rimText: 'text-base' },
  lg: { icon: 'h-12 w-12', oText: 'text-4xl', rimText: 'text-2xl' },
}

export function OrimLogo({ size = 'md', showText = true }: OrimLogoProps) {
  const s = sizes[size]

  return (
    <span className="inline-flex items-center gap-2">
      <LogoIcon sizeClass={s.icon} />
      {showText && (
        <span className="font-nunito font-bold text-slate-800 leading-none">
          <span className={s.oText}>O</span>
          <span className={s.rimText}>rim</span>
        </span>
      )}
    </span>
  )
}

export { LogoIcon }
