import type { ReactElement } from 'react'

export default function AdminLoginPage(): ReactElement {
  return (
    <main className="admin-login-page">
      <div className="admin-login-rings" aria-hidden="true" />
      <div className="admin-login-glow" aria-hidden="true" />
      <div className="admin-login-glow admin-login-glow--alt" aria-hidden="true" />
      <section className="admin-login-card">
        <span className="admin-login-bar" aria-hidden="true" />
        <p className="admin-login-eyebrow">
          <span className="admin-login-spark" aria-hidden="true" />
          FORJA ADMIN
        </p>
        <h1 className="admin-login-title admin-display">
          Painel de <span>treino</span>
        </h1>
        <p className="admin-login-subtitle">
          Edite planos, publique revisões e mantenha o conteúdo do app no mesmo padrão da Forja.
        </p>
        <a
          className="admin-primary-button bg-accent admin-button-lg admin-login-cta"
          href="/api/admin/auth/google/start"
        >
          <span>Entrar com Google</span>
          <svg aria-hidden="true" viewBox="0 0 20 20" width="18" height="18">
            <path
              d="M4 10h11M11 5l5 5-5 5"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
            />
          </svg>
        </a>
      </section>
    </main>
  )
}
