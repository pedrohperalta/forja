import { createElement } from 'react'
import { renderToStaticMarkup } from 'react-dom/server'
import { describe, expect, it } from 'vitest'

import { ArrowRightIcon, ChevronDownIcon, MinusIcon, PlusIcon, UploadIcon } from './AdminIcons'

describe('AdminIcons', () => {
  const icons = {
    ArrowRightIcon,
    ChevronDownIcon,
    MinusIcon,
    PlusIcon,
    UploadIcon,
  }

  it('draws every icon with the 2px stroke set on a 24 viewport', () => {
    for (const [name, Icon] of Object.entries(icons)) {
      const markup = renderToStaticMarkup(createElement(Icon))

      expect(markup, name).toContain('viewBox="0 0 24 24"')
      expect(markup, name).toContain('stroke="currentColor"')
      expect(markup, name).toContain('stroke-width="2"')
      expect(markup, name).toContain('aria-hidden="true"')
    }
  })

  it('defaults to the 20px control scale and accepts a size', () => {
    const markup = renderToStaticMarkup(createElement(PlusIcon))

    expect(markup).toContain('width="20"')
    expect(markup).toContain('height="20"')
    expect(renderToStaticMarkup(createElement(PlusIcon, { size: 16 }))).toContain('width="16"')
  })
})
