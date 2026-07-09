import Link from 'next/link'
import YesBoxLogo from '@/components/YesBoxLogo'
import { Check, ArrowRight } from 'lucide-react'

export default function TarifsPage() {
  const li = (t: string) => (
    <div key={t} className="flex gap-2 items-start">
      <Check className="w-4 h-4 flex-shrink-0 mt-0.5" style={{ color: 'var(--sage)' }} />
      <span style={{ fontSize: 13.5, color: 'var(--ink-2)' }}>{t}</span>
    </div>
  )

  return (
    <div style={{ minHeight: '100vh', background: 'var(--cream)' }}>
      <header style={{ borderBottom: '1px solid var(--line)', padding: '0 24px', height: 60, display: 'flex', alignItems: 'center', justifyContent: 'space-between', maxWidth: 1080, margin: '0 auto' }}>
        <YesBoxLogo size="sm" />
        <Link href="/connexion" className="btn-ghost text-sm py-2">Se connecter</Link>
      </header>

      <main style={{ maxWidth: 1080, margin: '0 auto', padding: '64px 24px 80px' }}>
        <div className="text-center mb-12">
          <div className="eyebrow justify-center mb-3">Tarifs</div>
          <h1 className="font-serif" style={{ fontSize: 'clamp(28px, 5vw, 48px)', fontWeight: 700, color: 'var(--ink)', marginBottom: 10 }}>
            Un seul achat. Une vie de rendez-vous.
          </h1>
          <p style={{ color: 'var(--muted)', fontSize: 15 }}>
            Le module 1 est gratuit. Lancement le <strong style={{ color: 'var(--ink)' }}>1er septembre 2026</strong>.
          </p>
        </div>

        <div className="grid md:grid-cols-3 gap-5 mb-12">
          {/* Gratuit */}
          <div className="card p-6 flex flex-col gap-4">
            <div className="tag-muted self-start">Découverte</div>
            <div>
              <div className="font-serif font-bold" style={{ fontSize: 40, color: 'var(--ink)' }}>0 <small style={{ fontSize: 20 }}>€</small></div>
              <div style={{ fontSize: 12, color: 'var(--muted)' }}>Module 1 gratuit · toujours</div>
            </div>
            <hr style={{ border: 'none', borderTop: '1px solid var(--line)' }} />
            {['Module "Moi et toi"', '5 questions introspectives', 'Espace couple privé'].map(li)}
            <Link href="/inscription" className="btn-ghost justify-center mt-auto">Commencer gratuitement</Link>
          </div>

          {/* Complet */}
          <div className="card p-6 flex flex-col gap-4" style={{ background: 'var(--brand)', border: 'none', transform: 'scale(1.02)' }}>
            <div className="self-start px-2.5 py-1 rounded-full text-xs font-semibold" style={{ background: 'rgba(255,255,255,.2)', color: 'white' }}>⭐ Recommandé</div>
            <div>
              <div className="font-serif font-bold" style={{ fontSize: 40, color: 'white' }}>89 <small style={{ fontSize: 20 }}>€</small></div>
              <div style={{ fontSize: 12, color: 'rgba(255,255,255,.7)' }}>paiement unique · accès à vie</div>
            </div>
            <hr style={{ border: 'none', borderTop: '1px solid rgba(255,255,255,.2)' }} />
            {['Les 10 modules complets', 'Sessions de révélation à deux', 'Score de connivence & journal', 'Votre CDD de couple personnalisé', 'Garantie 30 jours satisfait ou remboursé'].map(f => (
              <div key={f} className="flex gap-2 items-start">
                <Check className="w-4 h-4 flex-shrink-0 mt-0.5" style={{ color: 'rgba(255,255,255,.8)' }} />
                <span style={{ fontSize: 13.5, color: 'rgba(255,255,255,.9)' }}>{f}</span>
              </div>
            ))}
            <Link href="/inscription" className="mt-auto flex items-center justify-center gap-2 font-semibold py-3 px-5 rounded-lg" style={{ background: 'white', color: 'var(--brand)', fontSize: 14 }}>
              Pré-inscription <ArrowRight className="w-4 h-4" />
            </Link>
          </div>

          {/* Renouvellement */}
          <div className="card p-6 flex flex-col gap-4">
            <div className="tag-brand self-start">Renouvellement</div>
            <div>
              <div className="font-serif font-bold" style={{ fontSize: 40, color: 'var(--ink)' }}>19 <small style={{ fontSize: 20 }}>€/an</small></div>
              <div style={{ fontSize: 12, color: 'var(--muted)' }}>module 10 · à activer plus tard</div>
            </div>
            <hr style={{ border: 'none', borderTop: '1px solid var(--line)' }} />
            {['Rappel annuel à votre anniversaire', 'Fiche avenant générée', 'Nouvelles questions chaque année', 'Annulable à tout moment'].map(li)}
            <Link href="/inscription" className="btn-ghost justify-center mt-auto">Plus tard, dans l'app</Link>
          </div>
        </div>

        {/* Garantie */}
        <div className="card p-6 text-center" style={{ maxWidth: 520, margin: '0 auto' }}>
          <div className="text-3xl mb-3">🛡️</div>
          <h3 className="font-serif font-bold mb-2" style={{ fontSize: 20, color: 'var(--ink)' }}>Garantie 30 jours</h3>
          <p style={{ fontSize: 14, color: 'var(--muted)', lineHeight: 1.7 }}>
            Si après avoir terminé les 10 modules vous n'êtes pas satisfait·s, on vous rembourse intégralement. Sans question. Parce qu'on croit vraiment à ce programme.
          </p>
        </div>
      </main>
    </div>
  )
}
