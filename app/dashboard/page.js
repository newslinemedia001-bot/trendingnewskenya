import { redirect } from 'next/navigation'

export const dynamic = 'force-dynamic'

/** The desk used to live here; keep old bookmarks working. */
export default function DashboardRedirect() {
  redirect('/desk')
}
