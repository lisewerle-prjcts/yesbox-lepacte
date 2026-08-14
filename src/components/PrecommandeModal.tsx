'use client'

import { useState } from 'react'
import { useFormStatus } from 'react-dom'
import { soumettrePrecommande } from '@/app/actions/precommande'
import EditableText from '@/components/edit-mode/EditableText'
import { X, Heart, CheckCircle, Copy, Check } from 'lucide-react'

function SubmitBtn() {
  const { pending } = useFormStatus()
  return (
    <button type="submit" disabled={pending} className="btn-brand lg w-full justify-center">
      {pending ? 'Envoi en cours…' : <EditableText id="modal.precommande.submit">Réserver ma place</EditableText>}
    </button>
  )
}

interface Props {
  onClose: () => void
}

export default function PrecommandeModal({ onClose }: Props) {
  const [error, setError] = useState<string | null>(null)
  const [success, setSuccess] = useState(false)
  const [coupleCode, setCoupleCode] = useState<string | null>(null)
  const [copied, setCopied] = useState(false)

  async function handleSubmit(formData: FormData) {
    setError(null)
    const result = await soumettrePrecommande(formData)
    if (result.error) { setError(result.error); return }
    setCoupleCode(result.coupleCode || null)
    setSuccess(true)
  }

  async function copyCode() {
    if (!coupleCode) return
    await navigator.clipboard.writeText(coupleCode)
    setCopied(true)
    setTimeout(() => setCopied(false), 3000)
  }

  return (
    <div className="modal-overlay" onClick={e => e.target === e.currentTarget && onClose()}>
      <div className="modal-box slide-up">
        <div className="flex items-start justify-between mb-6">
          <div>
            <p className="eyebrow mb-2"><EditableText id="modal.precommande.eyebrow">Lancement · 1er septembre 2026</EditableText></p>
            <h2 className="font-serif text-2xl font-bold" style={{ color: 'var(--ink)' }}>
              <EditableText id="modal.precommande.titre">Inscription YES BOX</EditableText>
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
            <h3 className="font-serif text-xl font-bold mb-2"><EditableText id="modal.precommande.success.titre">Ton espace est prêt !</EditableText></h3>
            <p className="text-sm mb-5" style={{ color: 'var(--muted)' }}>
              <EditableText id="modal.precommande.success.texte" multiline>On t&apos;envoie un email dès le 1er septembre 2026 avec ton accès. Module 1 entièrement gratuit, puis 29 €/mois, résiliable à tout moment.</EditableText>
            </p>

            {coupleCode && (
              <div className="rounded-2xl p-4 mb-2 text-center" style={{ background: 'var(--brand-tint)' }}>
                <p className="text-xs mb-2 font-semibold uppercase tracking-wide" style={{ color: 'var(--muted)' }}>
                  <EditableText id="modal.precommande.code.label">Ton code couple</EditableText>
                </p>
                <p className="text-3xl font-mono font-bold tracking-[0.3em] mb-3" style={{ color: 'var(--brand)' }}>{coupleCode}</p>
                <button onClick={copyCode} className="btn-ghost text-sm py-2 px-4 inline-flex items-center gap-2">
                  {copied ? <Check className="w-4 h-4" /> : <Copy className="w-4 h-4" />}
                  {copied ? 'Copié !' : 'Copier le code'}
                </button>
                <p className="text-xs mt-3" style={{ color: 'var(--muted)' }}>
                  <EditableText id="modal.precommande.code.aide" multiline>Partage-le à ton/ta binôme pour que vous soyez associé·es. On te l&apos;a aussi envoyé par email.</EditableText>
                </p>
              </div>
            )}

            <button onClick={onClose} className="btn-ghost mt-6"><EditableText id="modal.precommande.success.fermer">Fermer</EditableText></button>
          </div>
        ) : (
          <>
            <div className="p-4 rounded-lg mb-6 flex items-center gap-3" style={{ background: 'var(--brand-tint)', border: '1px solid var(--brand-soft)' }}>
              <Heart className="w-4 h-4 flex-shrink-0" style={{ color: 'var(--brand)' }} />
              <p className="text-sm" style={{ color: 'var(--brand)' }}>
                <EditableText id="modal.precommande.pitch" multiline>Module 1 entièrement gratuit, puis 29 €/mois — résiliable à tout moment, paiement sécurisé au lancement. Tu ne paies rien maintenant.</EditableText>
              </p>
            </div>

            {error && <div className="alert-error mb-4">{error}</div>}

            <form action={handleSubmit} className="space-y-4">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="flabel"><EditableText id="modal.precommande.field.prenom">Ton prénom *</EditableText></label>
                  <input name="prenom" type="text" placeholder="Marie" required className="field" autoComplete="given-name" />
                </div>
                <div>
                  <label className="flabel"><EditableText id="modal.precommande.field.nom">Ton nom *</EditableText></label>
                  <input name="nom" type="text" placeholder="Dupont" required className="field" autoComplete="family-name" />
                </div>
              </div>
              <div>
                <label className="flabel"><EditableText id="modal.precommande.field.email">Ton email *</EditableText></label>
                <input name="email" type="email" placeholder="marie@exemple.fr" required className="field" autoComplete="email" />
              </div>
              <div>
                <label className="flabel"><EditableText id="modal.precommande.field.partenaire_prenom">Prénom de ton binôme</EditableText> <span style={{ color: 'var(--muted)', fontWeight: 400 }}>(optionnel)</span></label>
                <input name="partenaire_prenom" type="text" placeholder="Tom" className="field" />
              </div>
              <div>
                <label className="flabel"><EditableText id="modal.precommande.field.adresse">Ville / Pays</EditableText> <span style={{ color: 'var(--muted)', fontWeight: 400 }}>(optionnel)</span></label>
                <input name="adresse" type="text" placeholder="Paris, France" className="field" />
              </div>
              <div>
                <label className="flabel"><EditableText id="modal.precommande.field.message">Un mot ?</EditableText> <span style={{ color: 'var(--muted)', fontWeight: 400 }}>(optionnel)</span></label>
                <textarea name="message" placeholder="Pourquoi YES BOX vous parle…" rows={3} className="field" />
              </div>
              <SubmitBtn />
              <p className="text-center text-xs" style={{ color: 'var(--muted)' }}>
                <EditableText id="modal.precommande.disclaimer">Aucun paiement maintenant · Désistement possible · Données protégées</EditableText>
              </p>
            </form>
          </>
        )}
      </div>
    </div>
  )
}
