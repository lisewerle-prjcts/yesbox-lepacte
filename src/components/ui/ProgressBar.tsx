'use client'

import { clsx } from 'clsx'
import { useT } from '@/components/i18n/LocaleContext'

interface ProgressBarProps {
  value: number
  max?: number
  className?: string
  showLabel?: boolean
}

export default function ProgressBar({
  value,
  max = 100,
  className,
  showLabel = false,
}: ProgressBarProps) {
  const percentage = Math.round((value / max) * 100)
  const t = useT()

  return (
    <div className={clsx('w-full', className)}>
      {showLabel && (
        <div className="flex justify-between text-xs text-gray-500 mb-1">
          <span>{t('Progression', 'Progress')}</span>
          <span>{percentage}%</span>
        </div>
      )}
      <div className="h-2 bg-cream-300 rounded-full overflow-hidden">
        <div
          className="h-full bg-gradient-to-r from-magenta to-magenta-400 rounded-full transition-all duration-500 ease-out"
          style={{ width: `${percentage}%` }}
        />
      </div>
    </div>
  )
}
