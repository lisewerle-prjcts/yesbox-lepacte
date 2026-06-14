'use client'

import { useState } from 'react'
import { useFormStatus } from 'react-dom'
import { soumettrePrecommande } from '@/app/actions/precommande'
import { X, Heart, CheckCircle } from 'lucide-react'

function SubmitBtn() {
  const { pending } = useFormStatus()
  return (
    <button type="submit" disabled={pending} className="btn-brand lg w-full justify-center">
      {pending ? 'Envoi en cours…' : 'Réserver ma place — 89 €'}
    </button>
  )
}

interface Props {
  onClose: () => void
}

export default function PrecommandeModal({ onClose }: Props) {
  const [error, setError] = useState<string | null>(null)
  const [success, setSuccess] = useState(false)

  async function handleSubmit(formData: FormData) {
    setError(null)
    const result = await soumettrePrecommande(formData)
    if (result.error) { setError(result.error); return }
    setSuccess(true)
  }

  return (
    <div className="modal-overlay" onClick={e => e.target === e.currentTarget && onClose()}>
      <div className="modal-box slide-up">
        <div className="flex items-start justify-between mb-6">
          <div>
            <p className="eyebrow mb-2">Lancement · 1er septembre 2026</p>
            <h2 className="font-serif text-2xl font-bold" style={{ color: 'var(--ink)' }}>
              Pré-commander YES BOX
            </h2>
          </div>
          <button onClick={onClose} className="p-1.5 rounded-lg hover:bg-cream transition-colors flex-shrink-0">
            <X className="w-5 h-5" style={{ color: 'var(--muted)' }} />
          </button>
        </div>

        {success ? (
          <div className="text-center py-8">
            <div className="w-16 h-16 rounded-full flex items-center justify-center mx-auto mb-4" style={{ background: 'var(--sage-soft)' }}>
              <CheckCircle className="w-8 h-8" style={{ color: 'var(--sage)' }} />
            </div>
            <h3 className="font-serif text-xl font-bold mb-2">Tu es sur la liste !</h3>
            <p className="text-sm" style={{ color: 'var(--muted)' }}>
              On t'envoie un email dès le 1er septembre 2026 avec ton accès.
              Accès complet à vie — 89 € au lancement.
            </p>
            <button onClick={onClose} className="btn-ghost mt-6">Fermer</button>
          </div>
        ) : (
          <>
            <div className="p-4 rounded-lg mb-6 flex items-center gap-3" style={{ background: 'var(--brand-tint)', border: '1px solid var(--brand-soft)' }}>
              <Heart className="w-4 h-4 flex-shrink-0" style={{ color: 'var(--brand)' }} />
              <p className="text-sm" style={{ color: 'var(--brand)' }}>
                <strong>89 € · accès à vie</strong> — paiement sécurisé au lancement. Tu ne paies rien maintenant.
              </p>
            </div>

            {error && <div className="alert-error mb-4">{error}</div>}

            <form action={handleSubmit} className="space-y-4">
              <div>
                <label className="flabel">Ton prénom *</label>
                <input name="prenom" type="text" placeholder="Marie" required className="field" autoComplete="given-name" />
              </div>
              <div>
                <label className="flabel">Ton email *</label>
                <input name="email" type="email" placeholder="marie@exemple.fr" required className="field" autoComplete="email" />
              </div>
              <div>
                <label className="flabel">Ville / Pays <span style={{ color: 'var(--muted)', fontWeight: 400 }}>(optionnel)</span></label>
                <input name="adresse" type="text" placeholder="Paris, France" className="field" />
              </div>
              <div>
                <label className="flabel">Un mot ? <span style={{ color: 'var(--muted)', fontWeight: 400 }}>(optionnel)</span></label>
                <textarea name="message" placeholder="Pourquoi YES BOX vous parle…" rows={3} className="field" />
              </div>
              <SubmitBtn />
              <p className="text-center text-xs" style={{ color: 'var(--muted)' }}>
                Aucun paiement maintenant · Désistement possible · Données protégées
              </p>
            </form>
          </>
        )}
      </div>
    </div>
  )
}
