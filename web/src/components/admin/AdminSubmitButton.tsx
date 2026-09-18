'use client'

import type { ReactElement, ReactNode } from 'react'
import { useFormStatus } from 'react-dom'

type AdminSubmitButtonProps = {
  'aria-label'?: string
  children: ReactNode
  className: string
  disabled?: boolean
  form?: string
  formAction?: (formData: FormData) => Promise<void>
  name?: string
  spinnerTone?: 'dark' | 'light'
  value?: string
}

export function AdminSubmitButton({
  'aria-label': ariaLabel,
  children,
  className,
  disabled = false,
  form,
  formAction,
  name,
  spinnerTone = 'dark',
  value,
}: AdminSubmitButtonProps): ReactElement {
  const { pending } = useFormStatus()

  return (
    <button
      aria-label={ariaLabel}
      className={className}
      disabled={disabled || pending}
      form={form}
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
