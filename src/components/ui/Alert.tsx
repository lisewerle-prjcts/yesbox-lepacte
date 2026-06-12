import { clsx } from 'clsx'
import { AlertCircle, CheckCircle, Info } from 'lucide-react'

interface AlertProps {
  type: 'error' | 'success' | 'info'
  message: string
  className?: string
}

export default function Alert({ type, message, className }: AlertProps) {
  const styles = {
    error: 'bg-red-50 text-red-700 border-red-200',
    success: 'bg-green-50 text-green-700 border-green-200',
    info: 'bg-magenta-50 text-magenta-700 border-magenta-200',
  }

  const icons = {
    error: <AlertCircle className="w-4 h-4 shrink-0" />,
    success: <CheckCircle className="w-4 h-4 shrink-0" />,
    info: <Info className="w-4 h-4 shrink-0" />,
  }

  return (
    <div
      className={clsx(
        'flex items-start gap-2 px-4 py-3 rounded-xl border text-sm',
        styles[type],
        className
      )}
    >
      {icons[type]}
      <span>{message}</span>
    </div>
  )
}
