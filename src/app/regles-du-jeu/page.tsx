import Link from 'next/link'
import ReglesDuJeu from '@/components/ReglesDuJeu'
import { ArrowLeft } from 'lucide-react'

export default function ReglesDuJeuPage() {
  return (
    <div className="fade" style={{ maxWidth: 640, margin: '0 auto' }}>
      <Link href="/tableau-de-bord" className="flex items-center gap-1.5 text-sm font-medium mb-6" style={{ color: 'var(--muted)' }}>
        <ArrowLeft className="w-4 h-4" />Retour au tableau de bord
      </Link>
      <div className="card p-8 sm:p-10">
        <p className="eyebrow mb-3">Avant de commencer</p>
        <ReglesDuJeu />
      </div>
    </div>
  )
}
