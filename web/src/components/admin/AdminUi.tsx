import Link from 'next/link'
import type { ReactElement, ReactNode } from 'react'

type AdminFrameProps = {
  active: 'overview' | 'plans' | 'import' | 'builds'
  eyebrow: string
  title: string
  subtitle?: string
  action?: ReactNode
  children: ReactNode
}

type AdminCardProps = {
  children: ReactNode
  accent?: boolean
  className?: string
}

type StatusTone = 'neutral' | 'accent' | 'warning' | 'danger'

type StatusPillProps = {
  children: ReactNode
  tone?: StatusTone
}

type FieldProps = {
  label: string
  children: ReactNode
}

type AdminTagProps = {
  children: ReactNode
}

const NAV_ITEMS = [
  { key: 'overview', href: '/admin', label: 'Painel' },
  { key: 'plans', href: '/admin/plans', label: 'Planos' },
  { key: 'import', href: '/admin/import', label: 'Importar' },
  { key: 'builds', href: '/admin/mobile-builds', label: 'Builds' },
] satisfies Array<{
  key: AdminFrameProps['active']
  href: string
  label: string
}>

export function AdminFrame({
  active,
  eyebrow,
  title,
  subtitle,
  action,
  children,
}: AdminFrameProps): ReactElement {
  return (
    <main className="admin-shell">
      <div className="admin-content">
        <div className="admin-topbar">
          <Link className="admin-wordmark" href="/admin">
            FORJA ADMIN
          </Link>
          <nav className="admin-top-nav" aria-label="Navegação admin">
            {NAV_ITEMS.map((item) => (
              <Link
                key={item.key}
                className="admin-nav-link"
                data-active={item.key === active}
                href={item.href}
              >
                <span>{item.label}</span>
              </Link>
            ))}
          </nav>
          <form action="/api/admin/auth/logout" method="post">
            <button className="admin-secondary-button" type="submit">
              Sair
            </button>
          </form>
        </div>
        <header className="admin-header-row">
          <div>
            <p className="admin-section-label">{eyebrow}</p>
            <h1 className="admin-title">{title}</h1>
            {subtitle ? <p className="admin-subtitle">{subtitle}</p> : null}
          </div>
          {action}
        </header>
        {children}
      </div>
    </main>
  )
}

export function AdminCard({
  children,
  accent = false,
  className = '',
}: AdminCardProps): ReactElement {
  const classes = `admin-card${accent ? ' admin-card-accent' : ''}${className ? ` ${className}` : ''}`

  return (
    <section className={classes}>
      {accent ? <div className="admin-accent-bar" /> : null}
      <div className="admin-card-body">{children}</div>
    </section>
  )
}

export function StatusPill({ children, tone = 'neutral' }: StatusPillProps): ReactElement {
  return (
    <span className="status-pill" data-tone={tone === 'neutral' ? undefined : tone}>
      {children}
    </span>
  )
}

export function AdminTag({ children }: AdminTagProps): ReactElement {
  return <span className="admin-tag">{children}</span>
}

export function AdminField({ label, children }: FieldProps): ReactElement {
  return (
    <label className="admin-field">
      <span>{label}</span>
      {children}
    </label>
  )
}

export function ChevronLeftIcon(): ReactElement {
  return (
    <svg aria-hidden="true" fill="none" height="20" viewBox="0 0 20 20" width="20">
      <path
        d="M12.5 15 7.5 10l5-5"
        stroke="currentColor"
        strokeLinecap="round"
        strokeLinejoin="round"
        strokeWidth="2"
      />
    </svg>
  )
}
