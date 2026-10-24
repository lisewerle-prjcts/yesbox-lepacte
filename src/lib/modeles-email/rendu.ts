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

export function rendreObjet(objet: string, vars: Variables): string {
  return substituer(objet, vars, v => v).replace(/\*\*/g, '').replace(/[\r\n]+/g, ' ').replace(/\s{2,}/g, ' ').trim()
}
