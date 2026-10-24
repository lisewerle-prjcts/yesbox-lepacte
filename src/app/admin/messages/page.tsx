import { createClient } from '@/lib/supabase/server'
import { FAMILLES, MODELES_EMAIL, DESCRIPTION_VARIABLES, variablesDuModele } from '@/lib/modeles-email/catalogue'
import { contenusModeles } from '@/lib/modeles-email/serveur'
import MessagesEditor from './MessagesEditor'
import EditeurModeles from './EditeurModeles'

const DEFAULT_MESSAGES: Record<string, { label: string; default: string; multiline?: boolean }> = {
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

  const contenus = await contenusModeles()
  const modeles = MODELES_EMAIL.map(m => ({
    cle: m.cle,
    famille: m.famille,
    nom: m.nom,
    quand: m.quand,
    rappel: !!m.rappel,
    etiquette: m.etiquette ?? null,
    facultatives: m.facultatives ?? [],
    obligatoires: m.obligatoires ?? [],
    variables: variablesDuModele(m).map(v => ({ nom: v, description: DESCRIPTION_VARIABLES[v] ?? '' })),
    defaut: { fr: m.fr, en: m.en },
    actuel: contenus[m.cle],
  }))

  return (
    <div>
      <div className="mb-6">
        <h1 className="font-serif text-3xl font-bold mb-1" style={{ color: 'var(--ink)' }}>Messages & e-mails</h1>
        <p style={{ fontSize: 14, color: 'var(--muted)' }}>
          Tous les e-mails automatiques envoyés aux couples, en français et en anglais, classés par famille. Les variables
          entre accolades, comme <code style={{ background: 'var(--cream-2)', padding: '1px 5px', borderRadius: 4 }}>{'{prenom}'}</code>, sont remplacées automatiquement.
          Pour envoyer l’un de ces e-mails à la main, va dans Actions manuelles.
        </p>
      </div>
      <EditeurModeles familles={FAMILLES} modeles={modeles} />

      <h2 className="font-serif text-2xl font-bold mt-10 mb-3" style={{ color: 'var(--ink)' }}>Messages affichés sur le site</h2>
      <MessagesEditor messages={messages} />
    </div>
  )
}
