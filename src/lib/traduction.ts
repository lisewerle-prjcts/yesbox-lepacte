import Anthropic from '@anthropic-ai/sdk'
import { z } from 'zod'
import type { ContenuEmail } from '@/lib/modeles-email/catalogue'

// Traduction en anglais d'un e-mail écrit en français dans l'admin
// (composeur des actions manuelles), par l'API Claude. Clé ANTHROPIC_API_KEY
// dans les variables d'environnement (Vercel). Réservé à l'équipe : les
// réponses des couples ne passent jamais par ici.

const MODELE = 'claude-opus-5-5'

const CONSIGNES = `Tu traduis en anglais des e-mails écrits en français par l'équipe de YES BOX – Le Pacte, un programme en ligne pour les couples (8 modules de questions, un pacte de couple signé à deux, puis un rendez-vous annuel).

Règles :
- Ton chaleureux et naturel, comme un e-mail écrit directement en anglais ; pas de traduction mot à mot.
- Garde exactement la mise en forme : lignes vides entre paragraphes, retours à la ligne, listes, emojis, **gras**.
- Ne traduis jamais ce qui est entre accolades ({prenom}, {code}…) : recopie-le tel quel.
- Dans [bouton: Libellé | lien] et [lien: Libellé | lien], traduis seulement le libellé ; le lien ne change pas.
- Garde « YES BOX » et « YES BOX – Le Pacte » tels quels.
- Vocabulaire du site : rendez-vous annuel = yearly date ; pack initial = starter pack ; pacte de couple = couple's pact ; Mon compte = My Account ; « Ajouter un code » = "Add a code" ; tableau de bord = dashboard ; parrainage = referral ; carte cadeau = gift card.
- Formulations inclusives et neutres en genre (they, partner).
- Renvoie seulement la traduction de l'objet et du message, sans commentaire.`

const Traduction = z.object({ objet: z.string(), corps: z.string() })

const SCHEMA = {
  type: 'object',
  properties: {
    objet: { type: 'string', description: 'Objet de l’e-mail, traduit' },
    corps: { type: 'string', description: 'Message traduit, même mise en forme' },
  },
  required: ['objet', 'corps'],
  additionalProperties: false,
}

export function traductionConfiguree() {
  return !!process.env.ANTHROPIC_API_KEY
}

export async function traduireEmailEnAnglais(fr: ContenuEmail): Promise<{ en: ContenuEmail } | { error: string }> {
  const client = new Anthropic()
  try {
    const reponse = await client.beta.messages.create({
      model: MODELE,
      max_tokens: 16000,
      // Si le modèle décline la demande, l'API la relance d'elle-même sur un
      // autre modèle (fallbacks: 'default').
      betas: ['server-side-fallback-2026-07-01'],
      fallbacks: 'default',
      output_config: { effort: 'low', format: { type: 'json_schema', schema: SCHEMA } },
      system: CONSIGNES,
      messages: [{ role: 'user', content: JSON.stringify({ objet: fr.objet, corps: fr.corps }) }],
    })
    if (reponse.stop_reason === 'refusal') return { error: 'La traduction a été refusée : modifie le texte ou traduis-le à la main.' }
    if (reponse.stop_reason === 'max_tokens') return { error: 'Message trop long pour être traduit d’un coup.' }
    const texte = reponse.content.flatMap(b => (b.type === 'text' ? [b.text] : [])).join('')
    const resultat = Traduction.safeParse(JSON.parse(texte))
    if (!resultat.success) return { error: 'Traduction illisible : réessaie.' }
    return { en: resultat.data }
  } catch (e) {
    if (e instanceof Anthropic.AuthenticationError) return { error: 'Clé ANTHROPIC_API_KEY invalide.' }
    if (e instanceof Anthropic.RateLimitError) return { error: 'Trop de traductions d’un coup : réessaie dans une minute.' }
    if (e instanceof Anthropic.APIError) return { error: `Erreur du service de traduction (${e.status}) : réessaie.` }
    if (e instanceof SyntaxError) return { error: 'Traduction illisible : réessaie.' }
    return { error: 'Le service de traduction ne répond pas : réessaie.' }
  }
}
