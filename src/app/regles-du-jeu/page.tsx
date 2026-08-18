import { Scale } from 'lucide-react'
import EditableText from '@/components/edit-mode/EditableText'

export default function ReglesDuJeuPage() {
  return (
    <div className="fade" style={{ maxWidth: 720, margin: '0 auto' }}>
      <div style={{ marginBottom: 28 }}>
        <div className="flex items-center gap-3" style={{ marginBottom: 6 }}>
          <Scale className="w-6 h-6" style={{ color: 'var(--brand)' }} />
          <h1 className="font-serif" style={{ fontSize: 32, fontWeight: 700, color: 'var(--ink)' }}>
            <EditableText id="regles.titre">Règles du jeu</EditableText>
          </h1>
        </div>
        <p style={{ color: 'var(--muted)', fontSize: 14 }}>
          <EditableText id="regles.intro" multiline>Pour que l&apos;expérience reste juste et sincère pour les deux membres du couple, YES BOX applique les règles suivantes :</EditableText>
        </p>
      </div>

      <div className="card p-6">
        <ul className="space-y-5" style={{ color: 'var(--ink-2)', lineHeight: 1.7, fontSize: 14.5 }}>
          <li>
            <p className="font-semibold mb-1" style={{ color: 'var(--ink)' }}>
              <EditableText id="regles.pairage.titre">Pairage du couple</EditableText>
            </p>
            <p style={{ color: 'var(--muted)' }}>
              <EditableText id="regles.pairage.texte" multiline>Le premier membre qui crée son profil obtient un code unique de 5 lettres/chiffres. Le second membre saisit ce code lors de son inscription (ou plus tard, depuis son espace) pour rejoindre le même couple. Un couple ne peut compter que deux membres.</EditableText>
            </p>
          </li>
          <li>
            <p className="font-semibold mb-1" style={{ color: 'var(--ink)' }}>
              <EditableText id="regles.individuelles.titre">Réponses individuelles</EditableText>
            </p>
            <p style={{ color: 'var(--muted)' }}>
              <EditableText id="regles.individuelles.texte" multiline>Chaque membre répond seul aux questions de chaque module. Aucun des deux ne peut voir les réponses de l&apos;autre avant que le module ne soit marqué « révélé ».</EditableText>
            </p>
          </li>
          <li>
            <p className="font-semibold mb-1" style={{ color: 'var(--ink)' }}>
              <EditableText id="regles.revelation.titre">La révélation</EditableText>
            </p>
            <p style={{ color: 'var(--muted)' }}>
              <EditableText id="regles.revelation.texte" multiline>Un module n&apos;est révélé que lorsque les deux membres ont terminé leurs réponses. C&apos;est à ce moment que le module suivant se débloque.</EditableText>
            </p>
          </li>
          <li>
            <p className="font-semibold mb-1" style={{ color: 'var(--ink)' }}>
              <EditableText id="regles.confidentialite.titre">Confidentialité</EditableText>
            </p>
            <p style={{ color: 'var(--muted)' }}>
              <EditableText id="regles.confidentialite.texte" multiline>Les réponses restent strictement privées entre les deux membres du couple ; elles ne sont jamais partagées à des tiers.</EditableText>
            </p>
          </li>
          <li>
            <p className="font-semibold mb-1" style={{ color: 'var(--ink)' }}>
              <EditableText id="regles.cdd.titre">Le CDD de couple</EditableText>
            </p>
            <p style={{ color: 'var(--muted)' }}>
              <EditableText id="regles.cdd.texte" multiline>Rédigé à la fin du programme, il est réexaminé chaque année via le BAC annuel, avec la possibilité de le faire évoluer par avenant.</EditableText>
            </p>
          </li>
        </ul>
      </div>
    </div>
  )
}
