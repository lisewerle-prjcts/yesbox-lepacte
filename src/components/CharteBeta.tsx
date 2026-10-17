// Texte de la charte de participation à la bêta (17 octobre - 16 novembre
// 2026), repris du PDF « Yesbox_charte_betatest_oct_nov_2026 ». Affiché sur
// /charte-beta et dans la fenêtre qui s'ouvre à l'inscription avec le code
// BETANLR26 (cf. lib/charte-beta).

export const CASE_CHARTE_BETA =
  "J'ai lu cette charte, j'accepte de participer à la bêta de Yesbox dans ces conditions et d'être recontacté·e pour un entretien."

function Titre({ children }: { children: React.ReactNode }) {
  return <h2 className="font-serif font-bold mb-2 mt-6" style={{ fontSize: 18, color: 'var(--ink)' }}>{children}</h2>
}

function Liste({ children }: { children: React.ReactNode }) {
  return <ul className="mt-2 space-y-1 ml-5 list-disc">{children}</ul>
}

const DONNEES: [string, React.ReactNode][] = [
  ['Données collectées', 'Prénoms, adresses email, réponses aux modules, réponses aux questionnaires et notes d’entretien'],
  ['Finalité', 'Vous donner accès à la plateforme et l’améliorer. Aucune revente, aucune publicité ciblée'],
  ['Qui y a accès', (
    <>
      Votre partenaire : vos réponses aux modules révélés, votre journal et votre pacte.
      Lise, fondatrice de Yesbox : vos informations de compte, votre progression, vos questionnaires de satisfaction et entretiens.
      Nos sous-traitants techniques : uniquement pour les besoins du service, dans le cadre d’un contrat conforme au RGPD
    </>
  )],
  ['Sous-traitants et localisation', (
    <>
      Hébergement du site : Vercel (États-Unis). Base de données et authentification : Supabase (Irlande, UE).
      E-mails de service : Google et Resend (États-Unis). Paiement, uniquement si vous vous abonnez : Stripe
      (Irlande, UE, avec transferts possibles vers les États-Unis)
    </>
  )],
  ['Durée de conservation', 'Suppression 12 mois après la fin de la bêta, sauf si vous vous abonnez'],
]

export default function CharteBeta() {
  return (
    <div style={{ color: 'var(--ink-2)', lineHeight: 1.7, fontSize: 14.5 }}>
      <div className="eyebrow mb-2">Du 17 octobre au 16 novembre 2026</div>
      <h1 className="font-serif text-3xl font-bold mb-4" style={{ color: 'var(--ink)' }}>Charte de participation à la bêta Yesbox</h1>

      <Titre>Bienvenue</Titre>
      <p>
        Merci de rejoindre la bêta de Yesbox, la plateforme en ligne qui aide les couples à mieux se connaître,
        mieux communiquer et construire un engagement choisi.
      </p>
      <p className="mt-2">
        Cette charte fixe le cadre de votre participation : ce que nous vous offrons, ce que nous vous demandons et
        la façon dont nous protégeons vos données. Elle s’adresse aux deux partenaires du couple, qui l’acceptent
        chacun et chacune.
      </p>

      <Titre>Déroulement de la bêta</Titre>
      <Liste>
        <li><strong>Durée :</strong> environ 4 semaines, du samedi 17 octobre au lundi 16 novembre 2026.</li>
        <li><strong>Gratuité :</strong> l’accès est entièrement offert pendant toute la bêta. Aucun moyen de paiement ne vous est demandé.</li>
        <li><strong>Contenu :</strong> vous accédez aux modules en ligne de Yesbox, à suivre à deux, à votre rythme.</li>
        <li>
          <strong>Version de test :</strong> la plateforme est encore en cours d’amélioration. Des bugs ou des contenus
          inachevés sont possibles, et c’est justement ce que nous cherchons à repérer avec vous.
        </li>
      </Liste>

      <Titre>Ce que nous attendons de vous</Titre>
      <p>En échange de l’accès offert, nous vous demandons de :</p>
      <Liste>
        <li>utiliser la plateforme à deux, au moins une fois par semaine si possible ;</li>
        <li>répondre à deux courts questionnaires en ligne, autour du 30 octobre et à la fin de la bêta ;</li>
        <li>si vous êtes d’accord, échanger 20 minutes avec nous, en visio ou en personne ;</li>
        <li>nous dire franchement ce qui fonctionne et ce qui coince. Les critiques nous sont aussi utiles que les compliments.</li>
      </Liste>
      <p className="mt-2">Ces engagements restent souples : la vie de couple passe avant la bêta.</p>

      <Titre>Confidentialité des contenus</Titre>
      <p>
        Les contenus de Yesbox (textes, exercices, visuels) sont protégés par le droit d’auteur. Jusqu’au lancement
        public, nous vous demandons de ne pas les copier, les capturer en écran ni les diffuser. Vous restez bien sûr
        libres de parler de votre expérience autour de vous : c’est même le meilleur des encouragements.
      </p>

      <Titre>Utilisation de vos retours et témoignages</Titre>
      <p>Vos réponses aux questionnaires et aux entretiens servent uniquement à améliorer Yesbox.</p>
      <p className="mt-2">
        Nous ne publierons jamais un témoignage sans votre accord explicite. Avant toute publication, nous vous
        demanderons par écrit :
      </p>
      <Liste>
        <li>si vous acceptez que votre témoignage soit cité ;</li>
        <li>sous quelle forme : prénoms, initiales ou de façon anonyme ;</li>
        <li>sur quels supports : site, réseaux sociaux, presse.</li>
      </Liste>
      <p className="mt-2">Vous pouvez retirer cet accord à tout moment.</p>

      <Titre>Vos données personnelles</Titre>
      <p>
        Ce que vous écrivez sur Yesbox touche à votre intimité. Nous le traitons avec le plus grand soin,
        conformément au RGPD.
      </p>
      <dl className="mt-3 rounded-lg overflow-hidden border" style={{ borderColor: 'var(--line)' }}>
        {DONNEES.map(([terme, definition], i) => (
          <div key={terme} className="sm:flex px-4 py-3" style={i ? { borderTop: '1px solid var(--line)' } : undefined}>
            <dt className="font-semibold sm:w-48 sm:flex-shrink-0" style={{ color: 'var(--ink)' }}>{terme}</dt>
            <dd>{definition}</dd>
          </div>
        ))}
      </dl>
      <p className="mt-3">
        Vos réponses aux modules sont chiffrées. Elles sont stockées sur notre serveur mais restent réservées à votre
        couple : votre partenaire voit vos réponses uniquement une fois le module révélé, ainsi que votre journal et
        votre pacte. L’administration de Yesbox voit seulement vos informations de compte et votre progression
        (modules commencés, terminés, révélés), jamais le contenu de vos réponses, de vos conclusions ou de votre pacte.
      </p>
      <p className="mt-2">
        Vous pouvez à tout moment consulter, corriger, exporter ou supprimer vos données en écrivant à{' '}
        <a href="mailto:lise.yesbox@gmail.com" className="text-magenta hover:underline">lise.yesbox@gmail.com</a>.
        En cas de désaccord, vous pouvez saisir la CNIL.
      </p>

      <Titre>Fin de la bêta et arrêt de participation</Titre>
      <p>Vous pouvez arrêter la bêta à tout moment, sans justification, par un simple message.</p>
      <p className="mt-2">
        À la fin de la bêta, votre accès gratuit s’arrête. Aucun abonnement ne démarre automatiquement : si vous
        souhaitez continuer, nous vous proposerons une offre réservée aux couples testeurs. Sinon, vos données sont
        supprimées dans le délai indiqué plus haut.
      </p>

      <Titre>Contact</Titre>
      <p>
        Pour toute question : Lise,{' '}
        <a href="mailto:lise.yesbox@gmail.com" className="text-magenta hover:underline">lise.yesbox@gmail.com</a>.
      </p>
      <p className="mt-2 text-sm" style={{ color: 'var(--muted)' }}>
        YES BOX, éditée par Lise Yessourour · SIREN 514 073 691, RCS Versailles.
      </p>
    </div>
  )
}
