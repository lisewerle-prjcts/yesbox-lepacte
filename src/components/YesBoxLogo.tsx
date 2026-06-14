import Link from 'next/link'

interface LogoProps {
  href?: string
  size?: 'sm' | 'md' | 'lg'
}

export default function YesBoxLogo({ href = '/', size = 'md' }: LogoProps) {
  const sizes = { sm: { nm: 'text-lg', bs: 'text-[9px]' }, md: { nm: 'text-2xl', bs: 'text-[10px]' }, lg: { nm: 'text-3xl', bs: 'text-[11px]' } }
  const s = sizes[size]

  const content = (
    <div className="flex flex-col leading-none">
      <span className={`font-serif font-bold ${s.nm}`} style={{ color: 'var(--ink)', letterSpacing: '-0.01em' }}>
        YES BOX
      </span>
      <span className={`font-mono uppercase tracking-widest ${s.bs}`} style={{ color: 'var(--muted)', marginTop: '1px' }}>
        Le pacte des couples qui tiennent
      </span>
    </div>
  )

  return href ? <Link href={href} className="hover:opacity-80 transition-opacity">{content}</Link> : content
}
