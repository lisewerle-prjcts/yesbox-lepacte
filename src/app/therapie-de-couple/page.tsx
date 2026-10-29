import { metadataThematique, RoutePageThematique } from '@/lib/page-thematique-route'

export const metadata = metadataThematique('therapie-de-couple')

export default function Page() {
  return <RoutePageThematique slug="therapie-de-couple" />
}
