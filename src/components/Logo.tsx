import Link from 'next/link'
import { clsx } from 'clsx'

interface LogoProps {
  className?: string
  href?: string
  size?: 'sm' | 'md' | 'lg'
}

export default function Logo({ className, href = '/', size = 'md' }: LogoProps) {
  const sizes = {
    sm: 'text-xl',
    md: 'text-2xl',
    lg: 'text-4xl',
  }

  const content = (
    <span className={clsx('font-fraunces font-bold', sizes[size], className)}>
      <span className="text-magenta">YES BOX</span>
      <span className="text-gray-800"> — Le Pacte</span>
    </span>
  )

  if (href) {
    return <Link href={href}>{content}</Link>
  }

  return content
}
