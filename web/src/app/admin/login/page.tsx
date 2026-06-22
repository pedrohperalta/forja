import type { ReactElement } from 'react'

export default function AdminLoginPage(): ReactElement {
  return (
    <main className="admin-login-page">
      <section className="admin-card admin-login-card">
        <div className="admin-accent-bar" />
        <div className="admin-card-body">
          <p className="admin-wordmark">FORJA ADMIN</p>
          <h1 className="admin-title">Painel de treino</h1>
          <p className="admin-subtitle">
            Edite planos, publique revisões e mantenha o conteúdo do app no mesmo padrão da
            Forja.
          </p>
          <div className="admin-login-assurance" aria-label="Garantias do admin">
            <span>Acesso restrito</span>
            <span>Publicação sempre manual</span>
          </div>
          <div className="admin-actions-row">
            <a className="admin-primary-button bg-accent" href="/api/admin/auth/google/start">
              Entrar com Google
            </a>
          </div>
        </div>
      </section>
    </main>
  )
}
