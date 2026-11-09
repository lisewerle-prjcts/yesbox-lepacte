import { metadataThematique, RoutePageThematique } from '@/lib/page-thematique-route'

export const metadata = metadataThematique('renouvellement-de-voeux')

export default function Page() {
  return <RoutePageThematique slug="renouvellement-de-voeux" />
}
