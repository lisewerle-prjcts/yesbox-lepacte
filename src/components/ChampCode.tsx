'use client'

import { useState } from 'react'

// Champ de saisie d'un code (carte cadeau, parrainage, code gratuit). Le
// navigateur le prenait pour un identifiant et y préremplissait l'adresse
// e-mail enregistrée : il reste en lecture seule (jamais prérempli) jusqu'à
// ce qu'on clique dedans.
export default function ChampCode({ value, onChange, onEntree, placeholder }: {
  value: string
  onChange: (valeur: string) => void
  onEntree?: () => void
  placeholder: string
}) {
  const [verrouille, setVerrouille] = useState(true)
  return (
    <input
      type="text"
      className="input-field uppercase"
      placeholder={placeholder}
      name="code_avantage"
      autoComplete="off"
      autoCorrect="off"
      autoCapitalize="characters"
      spellCheck={false}
      data-1p-ignore
      data-lpignore="true"
      data-form-type="other"
      readOnly={verrouille}
      onFocus={() => setVerrouille(false)}
      onPointerDown={() => setVerrouille(false)}
      value={value}
      onChange={e => onChange(e.target.value)}
      onKeyDown={e => { if (e.key === 'Enter') onEntree?.() }}
    />
  )
}
