// Rendu des modèles d'e-mails (automatiques ou écrits à la main dans
// l'admin). Utilisable côté serveur et dans l'aperçu de l'admin.
//
// Format d'un corps de modèle (texte simple, modifiable depuis l'admin) :
//   - une ligne vide sépare deux paragraphes ; un simple retour à la ligne
//     reste un retour à la ligne ;
//   - **texte** met en gras ;
//   - [lien: Libellé | {lien}] insère un lien dans le texte ;
//   - une ligne seule [bouton: Libellé | {lien}] affiche un bouton ;
//   - une ligne seule [code: {code}] affiche un code encadré ;
//   - une ligne seule [image: Description | {site}/emails/visuel.png] affiche
//     une image (visuels de public/emails) ; avec un troisième élément
//     [image: Description | {site}/emails/visuel.png | {lien}], l'image est
//     cliquable. La description s'affiche si l'image est bloquée ;
//   - un paragraphe qui commence par « petit: » s'affiche en petit et en gris ;
//   - {variable} est remplacée par sa valeur (échappée : un prénom ne peut
//     jamais injecter de HTML ni de lien).
// Un paragraphe qui contient une variable facultative vide n'est pas
// affiché ; une variable vide précédée d'une espace retire aussi l'espace
// (« Bonjour {prenom}, » devient « Bonjour, »).

export type Variables = Record<string, string | number | null | undefined>

const ROSE = '#c5256e'

export function echapperHtml(texte: string) {
  return texte
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;')
}

function valeur(vars: Variables, nom: string): string | undefined {
  if (!(nom in vars)) return undefined
  const v = vars[nom]
  // Une valeur ne peut jamais casser la mise en forme : une seule ligne.
  return v === null || v === undefined ? '' : String(v).replace(/[\r\n]+/g, ' ').trim()
}

// Remplace les variables connues ; les inconnues restent visibles telles
// quelles ({module}) pour être repérées.
function substituer(texte: string, vars: Variables, transformer: (v: string) => string) {
  return texte.replace(/( ?)\{([a-z_0-9]+)\}/g, (tout, espace: string, nom: string) => {
    const v = valeur(vars, nom)
    if (v === undefined) return tout
    return v ? espace + transformer(v) : ''
  })
}

export function variablesDuTexte(texte: string): string[] {
  return [...new Set([...texte.matchAll(/\{([a-z_0-9]+)\}/g)].map(m => m[1]))]
}

// Variables encore présentes une fois les valeurs connues remplacées.
export function variablesNonRemplacees(textes: string[], vars: Variables): string[] {
  return [...new Set(textes.flatMap(variablesDuTexte))].filter(nom => valeur(vars, nom) === undefined)
}

function urlSure(url: string) {
  return /^https?:\/\/[^\s"<>]+$/.test(url) || /^mailto:[^\s"<>]+$/.test(url)
}

function bouton(href: string, libelle: string) {
  return `<p style="margin:24px 0;"><a href="${href}" style="display:inline-block;background:${ROSE};color:white;text-decoration:none;font-family:Arial,sans-serif;font-weight:bold;font-size:14px;padding:12px 22px;border-radius:10px;">${libelle}</a></p>`
}

function image(src: string, description: string, href?: string) {
  const img = `<img src="${src}" alt="${description}" width="456" style="display:block;width:100%;max-width:456px;height:auto;border:0;border-radius:12px;margin:0 auto;">`
  return `<p style="margin:20px 0;text-align:center;">${href ? `<a href="${href}" style="text-decoration:none;">${img}</a>` : img}</p>`
}

function enLigne(texte: string, vars: Variables) {
  // Texte du modèle échappé, mise en forme appliquée, puis valeurs
  // (échappées) insérées : une valeur ne peut pas créer de mise en forme.
  let html = echapperHtml(texte)
  html = html.replace(/\[lien:\s*([^|\]]+?)\s*\|\s*([^\]]+?)\s*\]/g, (tout, libelle: string, cible: string) => {
    const url = substituer(cible, vars, v => v).replace(/&amp;/g, '&')
    return urlSure(url) ? `<a href="${echapperHtml(url)}" style="color:${ROSE};">${libelle}</a>` : libelle
  })
  html = html.replace(/\*\*(.+?)\*\*/g, '<strong>$1</strong>')
  html = substituer(html, vars, echapperHtml)
  return html.replace(/\n/g, '<br>')
}

function contientVariableVide(texte: string, vars: Variables, facultatives: string[]) {
  return variablesDuTexte(texte).some(nom => facultatives.includes(nom) && !valeur(vars, nom))
}

export function rendreCorps(corps: string, vars: Variables, facultatives: string[] = []): string {
  const blocs = corps.replace(/\r\n/g, '\n').split(/\n\s*\n/)
  const html: string[] = []
  for (const brut of blocs) {
    const bloc = brut.trim()
    if (!bloc || contientVariableVide(bloc, vars, facultatives)) continue

    const btn = bloc.match(/^\[bouton:\s*([^|\]]+?)\s*\|\s*([^\]]+?)\s*\]$/)
    if (btn) {
      const url = substituer(btn[2], vars, v => v)
      if (urlSure(url)) html.push(bouton(echapperHtml(url), echapperHtml(substituer(btn[1], vars, v => v))))
      continue
    }
    const code = bloc.match(/^\[code:\s*([^\]]+?)\s*\]$/)
    if (code) {
      const texte = substituer(code[1], vars, v => v)
      if (texte) html.push(`<p style="margin:20px 0;text-align:center;"><span style="display:inline-block;font-family:monospace;font-size:22px;letter-spacing:.12em;padding:12px 20px;border:2px dashed ${ROSE};border-radius:10px;background:white;">${echapperHtml(texte)}</span></p>`)
      continue
    }
    const img = bloc.match(/^\[image:\s*([^|\]]+?)\s*\|\s*([^|\]]+?)\s*(?:\|\s*([^\]]+?)\s*)?\]$/)
    if (img) {
      const src = substituer(img[2], vars, v => v)
      const href = img[3] ? substituer(img[3], vars, v => v) : ''
      if (/^https?:\/\/[^\s"<>]+$/.test(src)) {
        html.push(image(echapperHtml(src), echapperHtml(substituer(img[1], vars, v => v)), href && urlSure(href) ? echapperHtml(href) : undefined))
      }
      continue
    }
    const petit = bloc.match(/^petit:\s*([\s\S]*)$/)
    if (petit) {
      const contenu = enLigne(petit[1], vars)
      if (contenu.trim()) html.push(`<p style="margin:0 0 12px;font-size:12px;color:#8a8580;">${contenu}</p>`)
      continue
    }
    const contenu = enLigne(bloc, vars)
    if (contenu.trim()) html.push(`<p style="margin:0 0 12px;">${contenu}</p>`)
  }
  return html.join('')
}

// Mot personnel ajouté à un e-mail (validation des e-mails d'anniversaire) :
// à sa place si le modèle prévoit {mot_personnel}, sinon à la fin.
export function corpsAvecMotPersonnel(corps: string, mot: string | null | undefined) {
  return mot?.trim() && !corps.includes('{mot_personnel}') ? `${corps}\n\n{mot_personnel}` : corps
}

export function rendreObjet(objet: string, vars: Variables): string {
  return substituer(objet, vars, v => v).replace(/\*\*/g, '').replace(/[\r\n]+/g, ' ').replace(/\s{2,}/g, ' ').trim()
}

// ---------------------------------------------------------------------------
// Champs à compléter laissés par erreur dans un e-mail écrit à la main :
// [Prénom], [First name], {Prénom}, {{prenom}}… Ils ne sont pas des variables
// (seules {prenom}, {code}… en minuscules sans accent le sont) et partiraient
// tels quels. Les balises de mise en forme ([bouton: …], [lien: …],
// [code: …], [image: …]) et les crochets de citation ([…], [sic]) sont
// autorisés.
// ---------------------------------------------------------------------------

const CITATIONS = new Set(['sic', '...', '…', '.', '..'])

function sansAccent(texte: string) {
  return texte.normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase().replace(/[\s_-]+/g, ' ').trim()
}

// Variable à utiliser à la place du champ, quand on la devine.
function variableProposee(interieur: string): string | null {
  const n = sansAccent(interieur)
  if (/partenaire|partner/.test(n)) return '{partenaire}'
  if (/parrainage|referral/.test(n)) return '{code_parrainage}'
  if (/\bcode\b/.test(n)) return '{code}'
  if (/prenom|first ?name|\bname\b|\bnom\b/.test(n)) return '{prenom}'
  return null
}

export interface ChampACompleter { texte: string; remplacement: string | null }

export function champsACompleter(textes: string[]): ChampACompleter[] {
  const trouves = new Map<string, ChampACompleter>()
  const motifs = [
    /\{\{\s*([^{}\n]{1,40}?)\s*\}\}/g,   // {{prenom}}
    /\{([^{}\n]{1,40})\}/g,              // {Prénom}, {first name}
    /\[([^\[\]\n]{1,40})\]/g,            // [Prénom], [First name]
  ]
  for (const texte of textes) {
    for (const motif of motifs) {
      for (const m of texte.matchAll(motif)) {
        const brut = m[0]
        const interieur = m[1].trim()
        if (brut.startsWith('{') && !brut.startsWith('{{') && /^[a-z_0-9]+$/.test(interieur)) continue // vraie variable
        if (brut.startsWith('[') && (interieur.includes(':') || CITATIONS.has(sansAccent(interieur)))) continue
        if (!brut.startsWith('{{') && texte[m.index! - 1] === '{' && texte[m.index! + brut.length] === '}') continue // déjà compté comme {{…}}
        if (!trouves.has(brut)) trouves.set(brut, { texte: brut, remplacement: variableProposee(interieur) })
      }
    }
  }
  return [...trouves.values()]
}

// Message à afficher (admin) quand des champs à compléter restent.
export function messageChampsACompleter(champs: ChampACompleter[]): string {
  const details = champs.map(c => (c.remplacement ? `${c.texte} → ${c.remplacement}` : c.texte)).join(', ')
  return `Champs à compléter restés dans le message, qui partiraient tels quels : ${details}. Utilise les variables entre accolades ({prenom}, {partenaire}, {code}, {code_parrainage}) ou remplace-les par ton texte.`
}
