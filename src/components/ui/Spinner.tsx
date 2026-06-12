import { clsx } from 'clsx'

interface SpinnerProps {
  className?: string
  size?: 'sm' | 'md' | 'lg'
}

export default function Spinner({ className, size = 'md' }: SpinnerProps) {
  const sizes = { sm: 'h-4 w-4', md: 'h-6 w-6', lg: 'h-10 w-10' }
  return (
    <div
      className={clsx(
        'animate-spin rounded-full border-2 border-magenta border-t-transparent',
        sizes[size],
        className
      )}
    />
  )
}
