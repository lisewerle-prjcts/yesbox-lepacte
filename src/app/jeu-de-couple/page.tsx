import { metadataThematique, RoutePageThematique } from '@/lib/page-thematique-route'

export const metadata = metadataThematique('jeu-de-couple')

export default function Page() {
  return <RoutePageThematique slug="jeu-de-couple" />
}
