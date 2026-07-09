import Link from 'next/link'
import { ArrowLeft, ArrowRight, Lock } from 'lucide-react'
import { creerSessionPaiement } from '@/app/actions/paiement'

export default function PaywallRevelation({ titre }: { titre: string }) {
  return (
    <div style={{ minHeight: '100vh', background: 'var(--dark)', fontFamily: 'var(--font-geist)' }}>
      <div style={{ borderBottom: '1px solid var(--dark-line)', padding: '16px 24px', maxWidth: 860, margin: '0 auto' }}>
        <Link href="/tableau-de-bord" className="flex items-center gap-2 text-sm font-medium" style={{ color: 'var(--dark-muted)' }}>
          <ArrowLeft className="w-4 h-4" />Tableau de bord
        </Link>
      </div>

      <div style={{ maxWidth: 520, margin: '0 auto', padding: '80px 24px', textAlign: 'center' }}>
        <div className="w-16 h-16 rounded-full flex items-center justify-center mx-auto mb-6" style={{ background: 'var(--dark-2)', border: '1px solid var(--dark-line)' }}>
          <Lock className="w-7 h-7" style={{ color: 'var(--brand)' }} />
        </div>
        <div className="eyebrow justify-center mb-3" style={{ color: 'var(--dark-muted)' }}>{titre}</div>
        <h1 className="font-serif" style={{ fontSize: 'clamp(26px, 4vw, 36px)', fontWeight: 700, color: 'var(--dark-paper)', lineHeight: 1.2, marginBottom: 16 }}>
          Vos réponses vous attendent
        </h1>
        <p style={{ color: 'var(--dark-muted)', fontSize: 15, marginBottom: 32, lineHeight: 1.6 }}>
          Vous avez toutes les deux terminé ce module. Pour ouvrir la session de révélation, noter votre connivence et débloquer la suite du parcours, passez à l&apos;accès complet — un paiement unique de 89€, à vie.
        </p>
        <form action={creerSessionPaiement}>
          <button type="submit" className="btn-brand lg">
            Débloquer l&apos;accès complet — 89€ <ArrowRight className="w-4 h-4" />
          </button>
        </form>
      </div>
    </div>
  )
}
