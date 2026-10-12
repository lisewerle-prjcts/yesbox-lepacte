import { createCipheriv, createDecipheriv, createHash, randomBytes } from 'crypto'

// Chiffrement des contenus intimes des couples (réponses aux modules,
// conclusions du journal, texte du pacte) avant leur enregistrement en base :
// dans Supabase (tableau de bord, sauvegardes, éventuelle fuite), on ne voit
// qu'un texte illisible. Seul le serveur du site, qui détient la clé, peut
// les relire.
//
// Algorithme : AES-256-GCM (chiffrement authentifié : un contenu modifié en
// base est détecté). Clé : DONNEES_CLE_CHIFFREMENT (variable d'environnement
// Vercel, au moins 32 caractères aléatoires), dérivée en 256 bits par SHA-256.
//
// ⚠️ Sans cette clé, les contenus chiffrés sont définitivement illisibles :
// elle doit être sauvegardée en lieu sûr (gestionnaire de mots de passe).
//
// Format stocké : « enc:v1:<base64url(iv | tag | texte chiffré)> ». Une
// valeur sans ce préfixe est un ancien contenu en clair : elle est relue
// telle quelle, et chiffrée par la tâche planifiée quotidienne
// (chiffrerDonneesEnClair, src/lib/chiffrement-migration.ts).

const PREFIXE = 'enc:v1:'
const LONGUEUR_MIN_SECRET = 32

let cleEnCache: Buffer | null | undefined

function cle(): Buffer | null {
  if (cleEnCache !== undefined) return cleEnCache
  const secret = process.env.DONNEES_CLE_CHIFFREMENT
  if (!secret) {
    console.warn('[chiffrement] DONNEES_CLE_CHIFFREMENT absente : les nouveaux contenus sont enregistrés en clair.')
    cleEnCache = null
  } else if (secret.length < LONGUEUR_MIN_SECRET) {
    console.error(`[chiffrement] DONNEES_CLE_CHIFFREMENT trop courte (${LONGUEUR_MIN_SECRET} caractères minimum) : clé ignorée.`)
    cleEnCache = null
  } else {
    cleEnCache = createHash('sha256').update(secret, 'utf8').digest()
  }
  return cleEnCache
}

export function chiffrementActif(): boolean {
  return cle() !== null
}

export function estChiffre(valeur: string | null | undefined): boolean {
  return !!valeur && valeur.startsWith(PREFIXE)
}

// Les valeurs vides restent vides (aucune information à protéger, et les
// vérifications « a répondu ? » restent simples).
export function chiffrer(texte: string): string
export function chiffrer(texte: string | null): string | null
export function chiffrer(texte: string | null): string | null {
  if (texte === null || texte === '' || estChiffre(texte)) return texte
  const k = cle()
  if (!k) return texte
  const iv = randomBytes(12)
  const cipher = createCipheriv('aes-256-gcm', k, iv)
  const chiffre = Buffer.concat([cipher.update(texte, 'utf8'), cipher.final()])
  return PREFIXE + Buffer.concat([iv, cipher.getAuthTag(), chiffre]).toString('base64url')
}

export function dechiffrer(valeur: string): string
export function dechiffrer(valeur: string | null): string | null
export function dechiffrer(valeur: string | null): string | null {
  if (!valeur || !estChiffre(valeur)) return valeur
  const k = cle()
  if (!k) throw new Error('Contenu chiffré mais clé de chiffrement absente (DONNEES_CLE_CHIFFREMENT).')
  try {
    const brut = Buffer.from(valeur.slice(PREFIXE.length), 'base64url')
    const decipher = createDecipheriv('aes-256-gcm', k, brut.subarray(0, 12))
    decipher.setAuthTag(brut.subarray(12, 28))
    return Buffer.concat([decipher.update(brut.subarray(28)), decipher.final()]).toString('utf8')
  } catch {
    // Contenu modifié en base, ou texte saisi qui commence par le préfixe :
    // on l'affiche tel quel plutôt que de bloquer la page.
    console.error('[chiffrement] Contenu illisible (modifié ou chiffré avec une autre clé).')
    return valeur
  }
}

// Raccourci pour les lignes lues en base (réponses, conclusions).
export function dechiffrerLignes<T extends { valeur?: string | null }>(lignes: T[] | null | undefined): T[] {
  return (lignes ?? []).map(l => (l.valeur ? { ...l, valeur: dechiffrer(l.valeur) } : l))
}
