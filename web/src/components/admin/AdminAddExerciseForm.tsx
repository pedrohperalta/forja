import type { MuscleCategory } from '@forja/domain'
import type { ReactElement } from 'react'

import { AdminField } from '@/components/admin/AdminUi'

type ServerAction = (formData: FormData) => Promise<void>

type AdminAddExerciseFormProps = {
  addExerciseAction: ServerAction
  categoryOptions: readonly MuscleCategory[]
  empty?: boolean
  planId: string
}

export function AdminAddExerciseForm({
  addExerciseAction,
  categoryOptions,
  empty = false,
  planId,
}: AdminAddExerciseFormProps): ReactElement {
  const fields = (
    <div className="admin-add-exercise-fields">
      <AdminField label="Nome do exercício">
        <input
          className="admin-input"
          name="exerciseName"
          placeholder="Remada Baixa"
          required
        />
      </AdminField>
      <AdminField label="Categoria">
        <select className="admin-input" defaultValue="Peito" name="exerciseCategory">
          {categoryOptions.map((category) => (
            <option key={category} value={category}>
              {category}
            </option>
          ))}
        </select>
      </AdminField>
      <button className="admin-primary-button admin-compact-button bg-accent" type="submit">
        {empty ? 'Adicionar exercício' : 'Adicionar'}
      </button>
      <p className="admin-muted">
        Séries, descanso e equipamento têm padrões prontos — ajuste depois no card do exercício.
      </p>
    </div>
  )

  return (
    <form
      action={addExerciseAction}
      aria-label="Adicionar exercício"
      className={`admin-add-exercise${empty ? ' admin-add-exercise-empty' : ''}`}
    >
      <input name="planId" type="hidden" value={planId} />
      {empty ? (
        fields
      ) : (
        <details className="admin-add-exercise-reveal">
          <summary>+ Adicionar exercício</summary>
          {fields}
        </details>
      )}
    </form>
  )
}
