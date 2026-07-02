import Link from 'next/link'
import Image from 'next/image'

interface LogoProps {
  href?: string
  size?: 'sm' | 'md' | 'lg'
  dark?: boolean
}

export default function YesBoxLogo({ href = '/', size = 'md', dark = false }: LogoProps) {
  const iconSize = size === 'sm' ? 32 : size === 'lg' ? 48 : 40
  const nameSize = size === 'sm' ? 15 : size === 'lg' ? 22 : 18
  const tagSize = size === 'sm' ? 8 : size === 'lg' ? 10 : 9
  const inkColor = dark ? 'rgba(255,255,255,0.92)' : 'var(--ink)'
  const mutedColor = dark ? 'rgba(255,255,255,0.45)' : 'var(--muted)'

  const content = (
    <div className="flex items-center gap-2.5 leading-none">
      <Image
        src="/logo-yesbox.svg"
        alt="YES BOX logo"
        width={iconSize}
        height={iconSize}
        style={{ flexShrink: 0 }}
      />
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
