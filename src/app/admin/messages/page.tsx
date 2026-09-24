import { createClient } from '@/lib/supabase/server'
import { WELCOME_EMAIL_DEFAULTS } from '@/lib/welcome-email'
import MessagesEditor from './MessagesEditor'

const DEFAULT_MESSAGES: Record<string, { label: string; default: string; multiline?: boolean }> = {
  email_bienvenue_subject: {
    label: 'Objet de l\'email de bienvenue (envoyé à chaque inscription)',
    default: WELCOME_EMAIL_DEFAULTS.email_bienvenue_subject,
  },
  email_bienvenue_body: {
    label: 'Corps de l\'email de bienvenue — variables {prenom} et {code} (code couple)',
    default: WELCOME_EMAIL_DEFAULTS.email_bienvenue_body,
    multiline: true,
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
  const supabase = await createClient()
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
