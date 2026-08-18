import Link from 'next/link'
import { Lock, ArrowRight } from 'lucide-react'
import EditableText from '@/components/edit-mode/EditableText'

export default function AbonnementRequisPage() {
  return (
    <div className="fade" style={{ maxWidth: 560, margin: '64px auto', textAlign: 'center' }}>
      <div className="card p-10">
        <div className="w-16 h-16 rounded-full flex items-center justify-center mx-auto mb-5" style={{ background: 'var(--brand-tint)' }}>
          <Lock className="w-8 h-8" style={{ color: 'var(--brand)' }} />
        </div>
        <div className="eyebrow justify-center mb-3"><EditableText id="abonnement.eyebrow">Module 1 terminé</EditableText></div>
        <h1 className="font-serif" style={{ fontSize: 26, fontWeight: 700, color: 'var(--ink)', marginBottom: 12 }}>
          <EditableText id="abonnement.titre">Abonnez-vous pour continuer votre pacte</EditableText>
        </h1>
        <p style={{ color: 'var(--muted)', fontSize: 14, marginBottom: 28, lineHeight: 1.7 }}>
          <EditableText id="abonnement.texte" multiline>
            « Moi et toi » — le module gratuit et son reveal croisé — sont terminés. Pour débloquer les modules suivants (Nous, Communication, Conflits, Le Pacte, Le Renouvellement), il vous faut un abonnement actif.
          </EditableText>
        </p>
        <Link href="/tarifs" className="btn-brand lg">
          <EditableText id="abonnement.cta">Voir les formules</EditableText> <ArrowRight className="w-4 h-4" />
        </Link>
      </div>
    </div>
  )
}
