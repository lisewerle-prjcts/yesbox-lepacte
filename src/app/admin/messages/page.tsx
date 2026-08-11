import { createAdminClient } from '@/lib/supabase/server'
import MessagesEditor from './MessagesEditor'

export const dynamic = 'force-dynamic'

const DEFAULT_MESSAGES: Record<string, { label: string; default: string; multiline?: boolean }> = {
  precommande_success: {
    label: 'Message après pré-commande (affiché dans le modal)',
    default: 'Ta place est réservée ! Tu recevras un email dès l\'ouverture le 1er septembre 2026. À très vite.',
    multiline: true,
  },
  email_confirmation_subject: {
    label: 'Objet de l\'email de confirmation (envoyé au pré-commandeur)',
    default: 'Ta pré-commande YES BOX est confirmée ✦',
  },
  email_confirmation_body: {
    label: 'Corps de l\'email de confirmation (pré-commandeur)',
    default: `Bonjour {prenom},\n\nMerci pour ta pré-commande ! Tu fais partie des premiers couples à rejoindre YES BOX — Le Pacte.\n\nLe programme ouvre le 1er septembre 2026. Tu recevras un email dès que tu pourras accéder à ton espace couple et commencer le Module 1 gratuitement.\n\nÀ très vite,\nL'équipe YES BOX`,
    multiline: true,
  },
  email_admin_subject: {
    label: 'Objet de l\'email de notification admin',
    default: '✦ Nouvelle pré-commande — {prenom}',
  },
  module_debloque_message: {
    label: 'Message affiché quand un module est débloqué',
    default: 'Le module suivant est maintenant disponible. À vous deux de décider quand vous êtes prêts.',
    multiline: true,
  },
  revelation_intro: {
    label: 'Texte d\'intro de la session de révélation',
    default: 'Vous avez tous les deux répondu. Il est temps de découvrir vos réponses côte à côte.',
    multiline: true,
  },
}

export default async function AdminMessages() {
  const supabase = createAdminClient()
  const { data: settings } = await supabase.from('settings').select('key,value')
  const settingsMap: Record<string, string> = {}
  settings?.forEach(s => { settingsMap[s.key] = s.value })

  const messages = Object.entries(DEFAULT_MESSAGES).map(([key, meta]) => ({
    key,
    label: meta.label,
    value: settingsMap[key] ?? meta.default,
    defaultValue: meta.default,
    multiline: meta.multiline ?? false,
  }))

  return (
    <div>
      <div className="mb-6">
        <h1 className="font-serif text-3xl font-bold mb-1" style={{ color: 'var(--ink)' }}>Messages & emails</h1>
        <p style={{ fontSize: 14, color: 'var(--muted)' }}>Modifie les messages automatiques. Les variables <code style={{ background: 'var(--cream-2)', padding: '1px 5px', borderRadius: 4 }}>{'{prenom}'}</code> sont remplacées automatiquement.</p>
      </div>
      <MessagesEditor messages={messages} />
    </div>
  )
}
