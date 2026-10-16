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
              <EditableText id="regles.individuelles.texte.v2" multiline>Chaque membre répond de son côté aux questions de chaque module. Personne ne peut voir les réponses de l&apos;autre avant que les deux membres du couple aient terminé les leurs.</EditableText>
            </p>
          </li>
          <li>
            <p className="font-semibold mb-1" style={{ color: 'var(--ink)' }}>
              <EditableText id="regles.revelation.titre">La révélation</EditableText>
            </p>
            <p style={{ color: 'var(--muted)' }}>
              <EditableText id="regles.revelation.texte.v3" multiline>Un module n&apos;est révélé que lorsque les deux membres ont terminé leurs réponses. C&apos;est à ce moment que vous pouvez découvrir ensemble vos réponses. En fin de module, chaque membre écrit sa conclusion dans votre journal, en répondant à deux courtes questions sur ce que le module lui a apporté. Une fois vos deux conclusions écrites, et si vous êtes à jour de votre abonnement, le module suivant se débloque. Vos réponses aux questions de chaque module se retrouvent au fur et à mesure dans PROGRESSION ; les réponses finales de chaque module et vos réponses au module 9, qui constituent votre pacte, se trouvent dans NOTRE PACTE. Chacun·e peut compléter ses réponses finales à tout moment.</EditableText>
            </p>
          </li>
          <li>
            <p className="font-semibold mb-1" style={{ color: 'var(--ink)' }}>
              <EditableText id="regles.duree.titre">Durée des modules</EditableText>
            </p>
            <p style={{ color: 'var(--muted)' }}>
              <EditableText id="regles.duree.texte.v2" multiline>Chaque module compte une dizaine de questions. À deux, il faut compter entre 30 et 60 minutes, en fonction des discussions qui vont en découler (réponses chacun·e de son côté, révélation, puis quelques notes dans le journal). Il faut donc y dédier 9 petits bouts de soirée.</EditableText>
            </p>
          </li>
          <li>
            <p className="font-semibold mb-1" style={{ color: 'var(--ink)' }}>
              <EditableText id="regles.confidentialite.titre">Confidentialité</EditableText>
            </p>
            <p style={{ color: 'var(--muted)' }}>
              <EditableText id="regles.confidentialite.intro" multiline>Les modules sont réalisés entre vous deux, sans jugement.</EditableText>
            </p>
            <p style={{ color: 'var(--muted)', marginTop: 8 }}>
              <EditableText id="regles.confidentialite.lecture" multiline>Personne d&apos;autre ne lit vos réponses : elles restent visibles uniquement pour vous deux et sont chiffrées sur nos serveurs. Vous pouvez les télécharger à tout moment, et les effacer quand vous quittez le programme.</EditableText>
            </p>
            <p style={{ color: 'var(--muted)', marginTop: 8 }}>
              <EditableText id="regles.confidentialite.jugement" multiline>Et pas de jugement : ni thérapeute, ni intelligence artificielle n&apos;analyse ce que vous écrivez. Juste des questions pour vous aider à vous parler.</EditableText>
            </p>
            <p style={{ color: 'var(--muted)', marginTop: 8 }}>
              <EditableText id="regles.confidentialite.texte.v3" multiline>Les personnes en charge de l&apos;administration de YES BOX n&apos;ont pas accès aux réponses des couples. En fin de parcours, si vous souhaitez garder vos réponses, vous pouvez les télécharger dans la rubrique MON COMPTE. Sans action de votre part, 1 an après la fin de votre abonnement, vos comptes sont supprimés et vos réponses sont effacées de manière permanente. Un e-mail vous prévient 2 mois, 1 mois, 1 semaine et la veille de l&apos;effacement.</EditableText>
            </p>
          </li>
          <li>
            <p className="font-semibold mb-1" style={{ color: 'var(--ink)' }}>
              <EditableText id="regles.pacte.titre">Le pacte de couple</EditableText>
            </p>
            <p style={{ color: 'var(--muted)' }}>
              <EditableText id="regles.pacte.texte.v3" multiline>Écrit à deux à la fin du parcours initial (module 9), il reprend ce qui compte le plus parmi ce que vous avez vu au fil des modules. En le signant, vous choisissez la date de votre rendez-vous annuel, idéalement un an plus tard (entre 6 et 18 mois) : dans un an, à la Saint-Valentin ou à une date qui vous est propre. Ce jour-là, le module « Notre rendez-vous annuel » s&apos;ouvre pour le relire ensemble et le faire évoluer avec vous.</EditableText>
            </p>
          </li>
          <li>
            <p className="font-semibold mb-1" style={{ color: 'var(--ink)' }}>
              <EditableText id="regles.abonnementannuel.titre">Pacte – notre rendez-vous annuel</EditableText>
            </p>
            <p style={{ color: 'var(--muted)' }}>
              <EditableText id="regles.abonnementannuel.texte.v2" multiline>Une fois votre pacte signé par vous deux, l&apos;abonnement mensuel laisse automatiquement la place à l&apos;abonnement « Pacte – notre rendez-vous annuel » (19 €/an), sans démarche de votre part. La bascule a lieu à la fin du mois déjà payé, et un e-mail vous prévient quelques jours avant. Vous pouvez l&apos;annuler depuis MON COMPTE. Cet abonnement donne accès au module « Notre rendez-vous annuel » et à tous les modules si vous souhaitez les refaire. Résiliable à tout moment depuis MON COMPTE : l&apos;accès reste ouvert jusqu&apos;au dernier jour de l&apos;année payée.</EditableText>
            </p>
          </li>
          <li>
            <p className="font-semibold mb-1" style={{ color: 'var(--ink)' }}>
              <EditableText id="regles.rappels.titre">E-mails de rappel</EditableText>
            </p>
            <p style={{ color: 'var(--muted)' }}>
              <EditableText id="regles.rappels.texte.v2" multiline>Si votre parcours est en pause depuis 10 jours, YES BOX vous envoie un petit rappel (deux au maximum). Une fois votre pacte signé, vous recevez des e-mails réguliers pour faire vivre vos engagements (2 par mois maximum). Vous pouvez désactiver ces rappels à tout moment dans MON COMPTE, où vous choisissez aussi la langue du site et des e-mails.</EditableText>
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
