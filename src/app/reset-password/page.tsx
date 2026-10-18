import { redirect } from 'next/navigation'

// Ancienne adresse des liens « mot de passe oublié » déjà envoyés.
export default function ResetPasswordPage() {
  redirect('/nouveau-mot-de-passe')
}
