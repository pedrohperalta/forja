import { createElement, type ReactElement, type ReactNode } from 'react'

import './globals.css'

type RootLayoutProps = {
  children: ReactNode
}

export default function RootLayout({ children }: RootLayoutProps): ReactElement {
  return createElement('html', { lang: 'pt-BR' }, createElement('body', null, children))
}
