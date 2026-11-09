'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { SECTIONS } from '@/lib/site'
import styles from './SiteHeader.module.css'

export default function NavLinks() {
  const pathname = usePathname()
  const items = [{ slug: 'home', label: 'Home', href: '/' }, ...SECTIONS.map((s) => ({
    slug: s.slug,
    label: s.label,
    href: `/section/${s.slug}`,
  }))]

  return (
    <>
      {items.map((item) => {
        const active = pathname === item.href
        return (
          <Link
            key={item.slug}
            href={item.href}
            className={`${styles.navLink} ${active ? styles.navActive : ''}`}
            aria-current={active ? 'page' : undefined}
          >
            {item.label}
          </Link>
        )
      })}
    </>
  )
}
