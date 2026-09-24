'use client'

import { useState } from 'react'
import Link from 'next/link'
import EditableText from '@/components/edit-mode/EditableText'
import InscriptionForm, { ConfirmationEmail } from '@/components/InscriptionForm'
import { X } from 'lucide-react'

export default function InscriptionModal({ onClose }: { onClose: () => void }) {
  const [confirmationEmail, setConfirmationEmail] = useState<string | null>(null)

  return (
    <div className="modal-overlay" onClick={e => e.target === e.currentTarget && onClose()}>
      <div className="modal-box slide-up">
        <div className="flex justify-end -mt-2 -mr-2">
          <button onClick={onClose} className="p-1.5 rounded-lg hover:bg-cream transition-colors flex-shrink-0" aria-label="Fermer">
            <X className="w-5 h-5" style={{ color: 'var(--muted)' }} />
          </button>
        </div>

        {confirmationEmail ? (
          <ConfirmationEmail email={confirmationEmail} />
        ) : (
          <>
            <div className="mb-6">
              <p className="eyebrow mb-2"><EditableText id="modal.inscription.eyebrow">Module 1 gratuit pour vous deux</EditableText></p>
              <h2 className="font-serif text-2xl font-bold" style={{ color: 'var(--ink)' }}>
                <EditableText id="modal.inscription.titre">Crée ton compte</EditableText>
              </h2>
            </div>

            <InscriptionForm
              submitId="modal.inscription.submit"
              submitLabel="JE M'INSCRIS"
              onNeedsConfirmation={setConfirmationEmail}
            />

            <p className="text-center text-xs text-gray-400 mt-4">
              <EditableText id="inscription.cgu.prefix">En créant un compte, tu acceptes nos</EditableText>{' '}
              <Link href="/mentions-legales" className="text-magenta hover:underline">
                <EditableText id="inscription.cgu.lien">conditions d&apos;utilisation</EditableText>
              </Link>.
            </p>
          </>
        )}
      </div>
    </div>
  )
}
