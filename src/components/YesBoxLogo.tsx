import Link from 'next/link'

interface LogoProps {
  href?: string
  size?: 'sm' | 'md' | 'lg'
  dark?: boolean
}

export default function YesBoxLogo({ href = '/', size = 'md', dark = false }: LogoProps) {
  const iconSize = size === 'sm' ? 30 : size === 'lg' ? 44 : 36
  const nameSize = size === 'sm' ? 15 : size === 'lg' ? 22 : 18
  const tagSize = size === 'sm' ? 8 : size === 'lg' ? 10 : 9
  const inkColor = dark ? 'rgba(255,255,255,0.92)' : 'var(--ink)'
  const mutedColor = dark ? 'rgba(255,255,255,0.45)' : 'var(--muted)'

  const content = (
    <div className="flex items-center gap-2.5 leading-none">
      {/* Logo bulle avec cœur rayé — reproduction SVG du logo YES BOX */}
      <svg width={iconSize} height={iconSize} viewBox="0 0 80 80" fill="none" xmlns="http://www.w3.org/2000/svg">
        {/* Fond bulle de dialogue */}
        <circle cx="40" cy="38" r="34" fill="#3a3330"/>
        {/* Queue de la bulle */}
        <path d="M18 64 L28 54 L14 52 Z" fill="#3a3330"/>
        {/* Cœur blanc */}
        <path d="M40 54 C40 54 20 43 20 30 C20 23 25.5 18 32 18 C36 18 39.5 20 40 22 C40.5 20 44 18 48 18 C54.5 18 60 23 60 30 C60 43 40 54 40 54Z" fill="white"/>
        {/* Rayures diagonales magenta sur le cœur */}
        <clipPath id="heart-clip">
          <path d="M40 54 C40 54 20 43 20 30 C20 23 25.5 18 32 18 C36 18 39.5 20 40 22 C40.5 20 44 18 48 18 C54.5 18 60 23 60 30 C60 43 40 54 40 54Z"/>
        </clipPath>
        <g clipPath="url(#heart-clip)">
          <rect x="10" y="10" width="60" height="50" fill="white"/>
          {/* Rayures diagonales */}
          {[-20,-10,0,10,20,30,40,50].map((x, i) => (
            <line key={i} x1={x} y1="10" x2={x+40} y2="60" stroke="#c5256e" strokeWidth="5.5"/>
          ))}
        </g>
      </svg>

      <div className="flex flex-col" style={{ gap: 2 }}>
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
