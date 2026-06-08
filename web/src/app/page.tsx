import { createElement, type ReactElement } from 'react'

export default function HomePage(): ReactElement {
  return createElement('main', null, createElement('h1', null, 'Forja'))
}
