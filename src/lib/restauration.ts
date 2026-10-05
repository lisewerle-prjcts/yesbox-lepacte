import { createHmac, timingSafeEqual } from 'crypto'

// Bloc de restauration ajouté à la fin de l'export « Mes données » : les
// mêmes données, lisibles par la machine, pour pouvoir les ré-importer après
// une désinscription. Le bloc est signé (HMAC) avec un secret serveur : un
// fichier modifié à la main est refusé, ce qui empêche de s'attribuer des
// réponses ou des modules révélés qui n'ont jamais existé.

export const MARQUEUR_RESTAURATION = 'YESBOX-RESTAURATION-V1:'

export interface DonneesRestauration {
  version: 1
  exporte_le: string
  /** E-mail de la personne qui a fait l'export. */
  auteur_email: string
  couple: {
    nom_couple: string | null
    date_anniversaire: string | null
    pacte_texte: string | null
    pacte_signe_le: string | null
    rdv_annuel_le: string | null
  }
  membres: { email: string; prenom: string | null }[]
  modules: { slug: string; statut: string; revealed: boolean; reponses_partagees: boolean }[]
  reponses: { module_slug: string; email: string; question_slug: string; valeur: string | null }[]
  journal: { module_slug: string; email: string; question_slug: string; valeur: string | null }[]
}

function secret(): string {
  const s = process.env.RESTAURATION_SECRET || process.env.SUPABASE_SERVICE_ROLE_KEY
  if (!s) throw new Error('Secret de restauration manquant')
  return s
}

function signer(contenu: string): string {
  return createHmac('sha256', secret()).update(`yesbox-restauration-v1.${contenu}`).digest('base64url')
}

export function encoderRestauration(donnees: DonneesRestauration): string {
  const contenu = Buffer.from(JSON.stringify(donnees), 'utf8').toString('base64url')
  return `${MARQUEUR_RESTAURATION}${contenu}.${signer(contenu)}`
}

// Retrouve et vérifie le bloc dans le texte d'un fichier exporté. Renvoie
// null si le bloc est absent, illisible ou modifié.
export function decoderRestauration(fichier: string): DonneesRestauration | null {
  const ligne = fichier.split(/\r?\n/).find(l => l.startsWith(MARQUEUR_RESTAURATION))
  if (!ligne) return null
  const [contenu, signature] = ligne.slice(MARQUEUR_RESTAURATION.length).trim().split('.')
  if (!contenu || !signature) return null
  const attendue = Buffer.from(signer(contenu))
  const recue = Buffer.from(signature)
  if (attendue.length !== recue.length || !timingSafeEqual(attendue, recue)) return null
  try {
    const donnees = JSON.parse(Buffer.from(contenu, 'base64url').toString('utf8')) as DonneesRestauration
    return donnees?.version === 1 ? donnees : null
  } catch {
    return null
  }
}
