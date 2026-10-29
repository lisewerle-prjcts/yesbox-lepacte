import { metadataThematique, RoutePageThematique } from '@/lib/page-thematique-route'

export const metadata = metadataThematique('pacte-de-couple')

export default function Page() {
  return <RoutePageThematique slug="pacte-de-couple" />
}
