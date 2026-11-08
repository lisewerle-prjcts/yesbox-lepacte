// Règles d'envoi de tous les e-mails automatiques, en un coup d'œil
// (Admin > Actions manuelles). À tenir à jour quand une règle change :
// src/lib/rappels-email.ts, src/lib/grandes-dates.ts,
// src/lib/notifications-module.ts, src/app/actions/*.

interface Regle { email: string; quand: string; qui: string; notes?: string }

const FAMILLES: { titre: string; regles: Regle[] }[] = [
  {
    titre: 'Inscription & compte',
    regles: [
      { email: 'Confirmation de l’adresse e-mail', quand: 'À l’inscription ; renvoi à la demande', qui: 'La personne qui s’inscrit', notes: 'Renvoi limité à 1 par minute et 5 par jour pour une même adresse' },
      { email: 'Bienvenue (avec le code couple)', quand: 'Dès que l’adresse est confirmée, une seule fois', qui: 'La personne qui a créé le couple', notes: 'Pas envoyé à qui rejoint un couple existant' },
      { email: 'Invitation du ou de la partenaire', quand: 'Quand un membre l’envoie depuis son tableau de bord', qui: 'L’adresse saisie', notes: '3 invitations par jour et par couple au maximum' },
      { email: 'Mot de passe oublié', quand: 'À la demande', qui: 'La personne', notes: '1 demande par minute au maximum ; lien valable 1 heure' },
      { email: 'Nouveau mot de passe', quand: 'Quand tu réinitialises un mot de passe depuis l’admin', qui: 'La personne' },
    ],
  },
  {
    titre: 'Relances (inactivité, effacement des données)',
    regles: [
      { email: 'Relance « il ne manque plus qu’une personne »', quand: '3 jours puis 10 jours après l’e-mail de bienvenue (2 relances maximum)', qui: 'La personne inscrite', notes: 'Couple pas encore au complet, adresse confirmée ; avec le code couple et le lien pour inviter son ou sa partenaire ; visuels Instagram dans la version française ; rien au-delà de 90 jours' },
      { email: 'Relance « vous êtes au complet : à vous de jouer »', quand: '3 jours puis 10 jours après l’inscription du second membre (2 relances maximum)', qui: 'Les deux membres', notes: 'Couple au complet qui n’a encore enregistré aucune réponse ni conclusion ; visuels Instagram dans la version française ; rien au-delà de 90 jours' },
      { email: 'Relance « votre parcours vous attend »', quand: '10 jours sans nouvelle réponse ni conclusion, puis 20 jours (2 relances maximum)', qui: 'Celui ou celle qui doit agir, ou les deux', notes: 'Une fois le parcours commencé, uniquement avant la signature du pacte, couple au complet, module accessible ; au moins 10 jours entre deux relances ; le compteur repart à chaque nouvelle réponse' },
      { email: 'Avertissement avant l’effacement des données', quand: '2 mois, 1 mois, 1 semaine et la veille de l’effacement (après 24 mois d’inactivité)', qui: 'Les deux membres', notes: 'Envoyé même si les rappels sont désactivés (obligation d’information)' },
    ],
  },
  {
    titre: 'Fins de module & dévoilement des réponses',
    regles: [
      { email: 'À ton tour de répondre', quand: 'Tout de suite, quand un membre a fini de répondre à un module', qui: 'L’autre membre', notes: 'Une seule fois par module' },
      { email: 'Vos réponses sont prêtes', quand: 'Tout de suite, quand le second membre a fini de répondre', qui: 'L’autre membre' },
      { email: 'À ton tour d’écrire ta conclusion / de signer le pacte', quand: 'Tout de suite, quand un membre a écrit sa conclusion ou signé', qui: 'L’autre membre' },
      { email: 'Module scellé / pacte signé', quand: 'Tout de suite, quand les deux conclusions ou signatures sont faites', qui: 'L’autre membre' },
    ],
  },
  {
    titre: 'Rendez-vous mensuels, fêtes & bilan annuel',
    regles: [
      { email: 'E-mail du mois (18 thèmes)', quand: 'Chaque mois, le même jour que la signature du pacte', qui: 'Les deux membres', notes: 'À tous les couples qui ont signé leur pacte, avec ou sans abonnement. Chaque thème une seule fois, dans l’ordre, sans boucle : une fois le dernier envoyé, plus d’e-mail du mois. Rien les mois des fêtes de fin d’année (décembre), de la Saint-Valentin (février), du rendez-vous annuel et des anniversaires de couple ou de mariage, y compris pour le 1er : le thème suivant attend le mois d’après' },
      { email: 'Fêtes de fin d’année — un cadeau surprise', quand: 'Le 10 décembre (rattrapé jusqu’au 24)', qui: 'Les deux membres', notes: 'À tous les couples qui ont signé leur pacte' },
      { email: 'Saint-Valentin — une recette à deux', quand: 'Le 7 février (rattrapé jusqu’au 13)', qui: 'Les deux membres', notes: 'À tous les couples qui ont signé leur pacte' },
      { email: 'Le rendez-vous annuel approche', quand: 'À la place de l’e-mail du mois, quand le rendez-vous annuel tombe dans les 31 jours', qui: 'Les deux membres', notes: 'Le mois du rendez-vous lui-même, pas d’e-mail du mois' },
    ],
  },
  {
    titre: 'Anniversaires',
    regles: [
      { email: 'Anniversaire de couple', quand: 'Le jour J, une fois validé dans Vue d’ensemble > Tâches', qui: 'Les deux membres', notes: 'Un défi différent chaque année ; sans validation, il ne part pas' },
      { email: 'Anniversaire de mariage', quand: '7 jours avant, une fois validé dans Vue d’ensemble > Tâches', qui: 'Les deux membres', notes: 'Avec le nom des noces et une idée de cadeau ; sans validation, il ne part pas' },
    ],
  },
  {
    titre: 'Abonnement & cartes cadeaux',
    regles: [
      { email: 'Rendez-vous annuel dans 2 mois — abonnement', quand: '2 mois avant la date du rendez-vous annuel choisie par le couple', qui: 'Les deux membres', notes: 'Pacte signé, sans abonnement annuel : il faut l’abonnement (19 €/an) pour ouvrir le module de renouvellement' },
      { email: 'Annonce du renouvellement à 19 €/an', quand: '1 mois avant chaque renouvellement de l’abonnement annuel', qui: 'Les deux membres', notes: 'Renouvellement automatique pas arrêté ; envoyé même si les rappels sont désactivés' },
      { email: 'Fin de l’année du pack initial', quand: '1 mois avant la fin de l’année du pack (acheté ou offert)', qui: 'Les deux membres', notes: 'Pacte pas encore signé, sans abonnement ; propose de continuer à 19 €/an' },
      { email: 'Proposition de l’abonnement annuel', quand: '5 jours avant la fin du mois payé', qui: 'Les deux membres', notes: 'Couples encore à l’ancien abonnement mensuel : après la signature du pacte, passage à l’annuel pas encore programmé' },
      { email: 'Abonnement annuel programmé', quand: '5 jours avant la fin du mois payé', qui: 'Les deux membres', notes: 'Quand le passage à l’annuel est déjà programmé : simple information avant le prélèvement' },
      { email: 'Demande d’avis (bon de 10 €)', quand: '2 jours après la fin du premier module, puis 2 jours après la signature du pacte', qui: 'Les membres qui n’ont pas encore laissé d’avis', notes: 'Chacune une seule fois par couple ; module terminé = réponses dévoilées et conclusions des deux ; rien au-delà de 60 jours ; celle du premier module indique le dernier module terminé et ne part pas après la signature du pacte (celle du pacte la remplace)' },
      { email: 'Parrainage (avec le code)', quand: 'Le lendemain de la fin du module 5', qui: 'Les deux membres', notes: 'Une seule fois par couple ; module terminé = réponses dévoilées et conclusions des deux ; rien au-delà de 60 jours ; indique le nombre de modules terminés et le dernier, à la date de l’envoi' },
      { email: 'Carte cadeau', quand: 'Tout de suite après le paiement', qui: 'La personne qui achète' },
    ],
  },
  {
    titre: 'E-mails envoyés à l’équipe (toi)',
    regles: [
      { email: 'Nouvelle inscription', quand: 'À chaque inscription', qui: 'L’équipe' },
      { email: 'Grande date à venir', quand: '30 jours avant chaque anniversaire de couple ou de mariage', qui: 'L’équipe' },
      { email: 'E-mail d’anniversaire à valider', quand: '3 jours avant l’envoi, la veille et le jour même, s’il n’est pas validé', qui: 'L’équipe' },
    ],
  },
]

export default function ReglesEnvoi() {
  return (
    <details className="card p-5 mb-6">
      <summary className="cursor-pointer font-semibold" style={{ fontSize: 16, color: 'var(--ink)' }}>
        Règles d’envoi des e-mails automatiques
      </summary>
      <div className="mt-3 space-y-1" style={{ fontSize: 12, color: 'var(--muted)' }}>
        <p>Les e-mails « tout de suite » partent au moment de l’action. Les autres partent chaque matin vers 8 h–9 h (heure de Paris), lors de la tâche quotidienne.</p>
        <p>Une copie de chaque e-mail part vers lise.yesbox@gmail.com, avec l’objet « [Copie → destinataire] … » (variable MAIL_COPIE_CACHEE sur Vercel pour changer d’adresse, vide pour arrêter), sauf les e-mails de sécurité : lien de confirmation ou de connexion, mot de passe oublié, nouveau mot de passe.</p>
        <p>Les rappels (relances, e-mails du mois, abonnement, anniversaires) ne sont pas envoyés aux personnes qui les ont désactivés dans Mon compte ou via le lien en bas de chaque rappel.</p>
      </div>
      <div className="mt-4 space-y-5">
        {FAMILLES.map(f => (
          <div key={f.titre}>
            <h3 className="font-semibold mb-2" style={{ fontSize: 14, color: 'var(--ink)' }}>{f.titre}</h3>
            <div className="overflow-x-auto">
              <table className="w-full" style={{ fontSize: 12.5, borderCollapse: 'collapse' }}>
                <thead>
                  <tr style={{ textAlign: 'left', color: 'var(--muted)', borderBottom: '1px solid var(--line)' }}>
                    <th className="py-1.5 pr-3" style={{ width: '24%' }}>E-mail</th>
                    <th className="py-1.5 pr-3" style={{ width: '30%' }}>Quand</th>
                    <th className="py-1.5 pr-3" style={{ width: '16%' }}>À qui</th>
                    <th className="py-1.5">Conditions</th>
                  </tr>
                </thead>
                <tbody>
                  {f.regles.map(r => (
                    <tr key={r.email} style={{ borderBottom: '1px solid var(--line)', verticalAlign: 'top' }}>
                      <td className="py-1.5 pr-3" style={{ color: 'var(--ink)', fontWeight: 500 }}>{r.email}</td>
                      <td className="py-1.5 pr-3" style={{ color: 'var(--ink-2)' }}>{r.quand}</td>
                      <td className="py-1.5 pr-3" style={{ color: 'var(--ink-2)' }}>{r.qui}</td>
                      <td className="py-1.5" style={{ color: 'var(--muted)' }}>{r.notes ?? '—'}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        ))}
      </div>
    </details>
  )
}
