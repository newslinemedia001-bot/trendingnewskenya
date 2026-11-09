/**
 * Role definitions shared by the server and the desk UI.
 * No secrets and no Node imports: safe in a client bundle.
 *
 * Two roles only:
 *   editor — publishes and manages their own stories.
 *   admin  — manages every story on the site, plus accounts and passwords.
 */
export const ROLES = ['admin', 'editor']

export const ROLE_LABEL = {
  admin: 'Administrator',
  editor: 'Editor',
}

export const ROLE_NOTE = {
  admin: 'Manages every story on the site, and every account.',
  editor: 'Publishes and manages their own stories.',
}

export const ROLE_ORDER = { admin: 0, editor: 1 }
