'use client'

import { useState } from 'react'
import { useFormStatus } from 'react-dom'
import { soumettrePrecommande } from '@/app/actions/precommande'
import EditableText from '@/components/edit-mode/EditableText'
import { useT } from '@/components/i18n/LocaleContext'
import { X, Heart, CheckCircle } from 'lucide-react'

function SubmitBtn() {
  const { pending } = useFormStatus()
  const t = useT()
  return (
    <button type="submit" disabled={pending} className="btn-brand lg w-full justify-center">
      {pending ? t('Envoi en cours…', 'Sending…') : <EditableText id="modal.precommande.submit">Réserver ma place</EditableText>}
    </button>
  )
}

interface Props {
  onClose: () => void
}

export default function PrecommandeModal({ onClose }: Props) {
  const t = useT()
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
            <p className="eyebrow mb-2"><EditableText id="modal.precommande.eyebrow">Module découverte 100% gratuit</EditableText></p>
            <h2 className="font-serif text-2xl font-bold" style={{ color: 'var(--ink)' }}>
              <EditableText id="modal.precommande.titre">Essayer YES BOX</EditableText>
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
            <h3 className="font-serif text-xl font-bold mb-2"><EditableText id="modal.precommande.success.titre">Tu es sur la liste !</EditableText></h3>
            <p className="text-sm" style={{ color: 'var(--muted)' }}>
              <EditableText id="modal.precommande.success.texte" multiline>On t&apos;envoie un email dès le 1er septembre 2026 avec ton accès. Abonnement à 29 €/mois, résiliable à tout moment, au lancement.</EditableText>
            </p>
            <button onClick={onClose} className="btn-ghost mt-6"><EditableText id="modal.precommande.success.fermer">Fermer</EditableText></button>
          </div>
        ) : (
          <>
            <div className="p-4 rounded-lg mb-6 flex items-center gap-3" style={{ background: 'var(--brand-tint)', border: '1px solid var(--brand-soft)' }}>
              <Heart className="w-4 h-4 flex-shrink-0" style={{ color: 'var(--brand)' }} />
              <p className="text-sm" style={{ color: 'var(--brand)' }}>
                <EditableText id="modal.precommande.pitch" multiline>1er module gratuit, puis si cela vous plait, 29 €/mois · résiliable à tout moment. Tu ne paies rien maintenant.</EditableText>
              </p>
            </div>

            {error && <div className="alert-error mb-4">{error}</div>}

            <form action={handleSubmit} className="space-y-4">
              <div>
                <label className="flabel"><EditableText id="modal.precommande.field.prenom">Ton prénom *</EditableText></label>
                <input name="prenom" type="text" placeholder={t('Marie', 'Mary')} required className="field" autoComplete="given-name" />
              </div>
              <div>
                <label className="flabel"><EditableText id="modal.precommande.field.nom">Ton nom de famille</EditableText></label>
                <input name="nom" type="text" placeholder={t('Dupont', 'Smith')} className="field" autoComplete="family-name" />
              </div>
              <div>
                <label className="flabel"><EditableText id="modal.precommande.field.email">Ton email *</EditableText></label>
                <input name="email" type="email" placeholder={t('marie@exemple.fr', 'mary@example.com')} required className="field" autoComplete="email" />
              </div>
              <div>
                <label className="flabel"><EditableText id="modal.precommande.field.partner_prenom">Le prénom de ton/ta partenaire</EditableText> <span style={{ color: 'var(--muted)', fontWeight: 400 }}>{t('(optionnel)', '(optional)')}</span></label>
                <input name="partner_prenom" type="text" placeholder={t('Tom', 'Alex')} className="field" />
              </div>
              <div>
                <label className="flabel"><EditableText id="modal.precommande.field.adresse">Ville / Pays</EditableText> <span style={{ color: 'var(--muted)', fontWeight: 400 }}>{t('(optionnel)', '(optional)')}</span></label>
                <input name="adresse" type="text" placeholder={t('Paris, France', 'New York, USA')} className="field" />
              </div>
              <div>
                <label className="flabel"><EditableText id="modal.precommande.field.message">Un mot ?</EditableText> <span style={{ color: 'var(--muted)', fontWeight: 400 }}>{t('(optionnel)', '(optional)')}</span></label>
                <textarea name="message" placeholder={t('Pourquoi YES BOX vous parle…', 'Why YES BOX speaks to you…')} rows={3} className="field" />
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
