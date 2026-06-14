import Link from 'next/link'

interface LogoProps {
  href?: string
  size?: 'sm' | 'md' | 'lg'
  dark?: boolean
}

export default function YesBoxLogo({ href = '/', size = 'md', dark = false }: LogoProps) {
  const iconSize = size === 'sm' ? 28 : size === 'lg' ? 40 : 34
  const nameSize = size === 'sm' ? 16 : size === 'lg' ? 24 : 20
  const tagSize = size === 'sm' ? 8.5 : size === 'lg' ? 10.5 : 9.5
  const inkColor = dark ? 'rgba(255,255,255,0.92)' : 'var(--ink)'
  const mutedColor = dark ? 'rgba(255,255,255,0.45)' : 'var(--muted)'

  const content = (
    <div className="flex items-center gap-2.5 leading-none">
      {/* Icon: speech bubble with YES mark */}
      <svg width={iconSize} height={iconSize} viewBox="0 0 36 36" fill="none" xmlns="http://www.w3.org/2000/svg">
        <rect width="36" height="36" rx="10" fill="var(--brand)" />
        <path d="M10 22.5C10 20.0147 11.6569 18 13.6667 18H22.3333C24.3431 18 26 20.0147 26 22.5V22.5C26 24.9853 24.3431 27 22.3333 27H14L10 30V22.5Z" fill="white" fillOpacity="0.18" />
        <path d="M11 14.5C11 12.0147 12.6569 10 14.6667 10H23.3333C25.3431 10 27 12.0147 27 14.5V14.5C27 16.9853 25.3431 19 23.3333 19H15L11 22V14.5Z" fill="white" />
        <path d="M15.5 14.5L17.5 16.5L20.5 12.5" stroke="var(--brand)" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" />
      </svg>
      <div className="flex flex-col" style={{ gap: 1 }}>
        <span className="font-serif font-bold" style={{ fontSize: nameSize, color: inkColor, letterSpacing: '-0.01em', lineHeight: 1 }}>
          YES BOX
        </span>
        <span className="font-mono uppercase" style={{ fontSize: tagSize, color: mutedColor, letterSpacing: '.09em', lineHeight: 1 }}>
          Le pacte des couples qui tiennent
        </span>
      </div>
    </div>
  )

  return href ? <Link href={href} className="hover:opacity-80 transition-opacity">{content}</Link> : content
}
