import type { createClient } from '@/lib/supabase/server'

export async function isCouplePaired(supabase: Awaited<ReturnType<typeof createClient>>, coupleId: string | null | undefined) {
  if (!coupleId) return false
  const { count } = await supabase.from('profiles').select('id', { count: 'exact', head: true }).eq('couple_id', coupleId)
  return (count ?? 0) >= 2
}
