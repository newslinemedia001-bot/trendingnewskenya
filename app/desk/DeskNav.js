'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import styles from './desk.module.css'

const LINKS = [
  { href: '/desk', label: 'Dashboard', exact: true },
  { href: '/desk/stories', label: 'Stories' },
  { href: '/desk/stories/new', label: 'New story', exact: true },
]

export default function DeskNav({ isAdmin }) {
  const pathname = usePathname() || ''
  const links = isAdmin ? [...LINKS, { href: '/desk/team', label: 'Team' }] : LINKS

  return (
    <nav className={styles.nav} aria-label="Desk">
      {links.map((link) => {
        const active = link.exact
          ? pathname === link.href
          : pathname === link.href || pathname.startsWith(`${link.href}/`)
        return (
          <Link
            key={link.href}
            href={link.href}
            className={`${styles.navLink} ${active ? styles.navLinkActive : ''}`}
            aria-current={active ? 'page' : undefined}
          >
            {link.label}
          </Link>
        )
      })}
    </nav>
  )
}
