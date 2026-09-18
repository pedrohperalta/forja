'use client'

import type { ReactElement, ReactNode } from 'react'
import { useFormStatus } from 'react-dom'

type AdminSubmitButtonProps = {
  children: ReactNode
  className: string
  disabled?: boolean
  formAction?: (formData: FormData) => Promise<void>
  name?: string
  spinnerTone?: 'dark' | 'light'
  value?: string
}

export function AdminSubmitButton({
  children,
  className,
  disabled = false,
  formAction,
  name,
  spinnerTone = 'dark',
  value,
}: AdminSubmitButtonProps): ReactElement {
  const { pending } = useFormStatus()

  return (
    <button
      className={className}
      disabled={disabled || pending}
      formAction={formAction}
      name={name}
      type="submit"
      value={value}
    >
      {pending ? (
        <span
          aria-hidden="true"
          className={`admin-button-spinner${spinnerTone === 'light' ? ' admin-button-spinner-light' : ''}`}
        />
      ) : null}
      {children}
    </button>
  )
}
