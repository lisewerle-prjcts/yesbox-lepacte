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
              <EditableText id="regles.revelation.texte" multiline>Un module n&apos;est révélé que lorsque les deux membres ont terminé leurs réponses. C&apos;est à ce moment que vous pouvez découvrir ensemble vos réponses. En fin de module, vous êtes invités à ajouter un élément dans votre journal : ce que vous avez appris avec le module, ce qui vous a ému·e et ce qui vous a étonné·e. Une fois le journal rempli, et si vous êtes à jour de votre abonnement, le module suivant se débloque.</EditableText>
            </p>
          </li>
          <li>
            <p className="font-semibold mb-1" style={{ color: 'var(--ink)' }}>
              <EditableText id="regles.duree.titre">Durée des modules</EditableText>
            </p>
            <p style={{ color: 'var(--muted)' }}>
              <EditableText id="regles.duree.texte" multiline>Chaque module compte entre 10 et 15 questions. À deux, il faut compter entre 30 et 60 minutes, en fonction des discussions qui vont en découler (réponses chacun·e de son côté, révélation, puis quelques notes dans le journal). Il faut donc y dédier 9 petits bouts de soirée.</EditableText>
            </p>
          </li>
          <li>
            <p className="font-semibold mb-1" style={{ color: 'var(--ink)' }}>
              <EditableText id="regles.confidentialite.titre">Confidentialité</EditableText>
            </p>
            <p style={{ color: 'var(--muted)' }}>
              <EditableText id="regles.confidentialite.texte" multiline>Les réponses restent strictement privées entre les deux membres du couple ; elles ne sont jamais partagées à des tiers. Les personnes en charge de l&apos;administration de YES BOX n&apos;ont pas accès aux réponses des couples. En fin de parcours, si vous souhaitez garder vos réponses, vous pouvez les télécharger dans la rubrique MON COMPTE. Sans action de votre part au bout de 18 mois, vos comptes sont supprimés et vos réponses sont effacées de manière permanente.</EditableText>
            </p>
          </li>
          <li>
            <p className="font-semibold mb-1" style={{ color: 'var(--ink)' }}>
              <EditableText id="regles.pacte.titre">Le pacte de couple</EditableText>
            </p>
            <p style={{ color: 'var(--muted)' }}>
              <EditableText id="regles.pacte.texte" multiline>Écrit à deux à la fin du programme, il reprend ce qui compte le plus parmi ce que vous avez vu au fil des modules. Chaque année, à votre date anniversaire, votre rendez-vous annuel vous permet de le relire ensemble et de le faire évoluer avec vous.</EditableText>
            </p>
          </li>
          <li>
            <p className="font-semibold mb-1" style={{ color: 'var(--ink)' }}>
              <EditableText id="regles.questions.titre">Questions</EditableText>
            </p>
            <p style={{ color: 'var(--muted)' }}>
              <EditableText id="regles.questions.texte" multiline>Pour toute question, vous pouvez écrire à </EditableText>
              <a href="mailto:lise.yesbox@gmail.com" style={{ color: 'var(--brand)' }}>lise.yesbox@gmail.com</a>
            </p>
          </li>
        </ul>
      </div>
    </div>
  )
}
