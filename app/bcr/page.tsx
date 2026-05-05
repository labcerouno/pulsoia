import { redirect } from 'next/navigation'

interface Props {
  searchParams: Promise<{ t?: string }>
}

export default async function LegacyBcrPage({ searchParams }: Props) {
  const params = await searchParams
  const token = params.t?.trim()

  if (!token) {
    redirect('/pulso')
  }

  redirect(`/pulso?t=${encodeURIComponent(token)}`)
}
