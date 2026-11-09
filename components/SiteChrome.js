'use client'

import { usePathname } from 'next/navigation'
import SiteHeader from './SiteHeader'
import SiteFooter from './SiteFooter'

/**
 * The newsroom desk is a working tool, not a page of the newspaper, so it
 * drops the masthead and section navigation entirely.
 */
export default function SiteChrome({ children }) {
  const pathname = usePathname() || ''
  if (pathname.startsWith('/desk')) return children

  return (
    <>
      <SiteHeader />
      <main id="main">{children}</main>
      <SiteFooter />
    </>
  )
}
