import type { ReactElement } from 'react'

type IconProps = {
  size?: number
}

function iconProps(size: number): {
  'aria-hidden': true
  fill: 'none'
  focusable: 'false'
  height: number
  viewBox: '0 0 24 24'
  width: number
} {
  return {
    'aria-hidden': true,
    fill: 'none',
    focusable: 'false',
    height: size,
    viewBox: '0 0 24 24',
    width: size,
  }
}

export function PlusIcon({ size = 20 }: IconProps): ReactElement {
  return (
    <svg {...iconProps(size)}>
      <path d="M12 5v14M5 12h14" stroke="currentColor" strokeLinecap="round" strokeWidth="2" />
    </svg>
  )
}

export function MinusIcon({ size = 20 }: IconProps): ReactElement {
  return (
    <svg {...iconProps(size)}>
      <path d="M5 12h14" stroke="currentColor" strokeLinecap="round" strokeWidth="2" />
    </svg>
  )
}

export function ChevronDownIcon({ size = 20 }: IconProps): ReactElement {
  return (
    <svg {...iconProps(size)}>
      <path
        d="m6 9 6 6 6-6"
        stroke="currentColor"
        strokeLinecap="round"
        strokeLinejoin="round"
        strokeWidth="2"
      />
    </svg>
  )
}

export function ArrowRightIcon({ size = 20 }: IconProps): ReactElement {
  return (
    <svg {...iconProps(size)}>
      <path
        d="M5 12h14m-6-6 6 6-6 6"
        stroke="currentColor"
        strokeLinecap="round"
        strokeLinejoin="round"
        strokeWidth="2"
      />
    </svg>
  )
}

export function UploadIcon({ size = 20 }: IconProps): ReactElement {
  return (
    <svg {...iconProps(size)}>
      <path
        d="M12 16V4m0 0 4 4m-4-4L8 8M5 20h14"
        stroke="currentColor"
        strokeLinecap="round"
        strokeLinejoin="round"
        strokeWidth="2"
      />
    </svg>
  )
}

export function CloseIcon({ size = 20 }: IconProps): ReactElement {
  return (
    <svg {...iconProps(size)}>
      <path d="M6 6l12 12M18 6 6 18" stroke="currentColor" strokeLinecap="round" strokeWidth="2" />
    </svg>
  )
}
