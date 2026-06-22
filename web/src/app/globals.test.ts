import { readFileSync } from 'node:fs'
import { fileURLToPath } from 'node:url'

import { describe, expect, it } from 'vitest'

const cssPath = fileURLToPath(new URL('./globals.css', import.meta.url))
const css = readFileSync(cssPath, 'utf8')

describe('admin responsive CSS', () => {
  it('keeps the admin usable as a mobile web app', () => {
    expect(css).toContain('@media (max-width: 860px)')
    expect(css).toContain('@media (max-width: 520px)')
    expect(css).toContain('position: fixed;')
    expect(css).toContain('bottom: 0;')
    expect(css).toContain('env(safe-area-inset-bottom)')
    expect(css).toContain('grid-template-columns: repeat(3, minmax(0, 1fr));')
    expect(css).toContain('overflow-x: auto;')
    expect(css).toContain('scroll-snap-type: x mandatory;')
  })

  it('keeps mobile publish actions above the bottom navigation', () => {
    expect(css).toContain('bottom: calc(5.75rem + env(safe-area-inset-bottom));')
  })

  it('does not scale admin title typography with viewport width', () => {
    expect(css).not.toMatch(/font-size:\s*clamp\([^;]*vw/i)
  })

  it('prevents document-level horizontal drift in the admin shell', () => {
    expect(css).toMatch(/html,\s*body\s*{[\s\S]*overflow-x:\s*hidden;/)
    expect(css).toMatch(/html,\s*body\s*{[\s\S]*overflow-x:\s*clip;/)
    expect(css).toMatch(/\.admin-shell\s*{[\s\S]*overflow-x:\s*hidden;/)
    expect(css).toMatch(/\.admin-shell\s*{[\s\S]*overflow-x:\s*clip;/)
  })

  it('keeps the primary file picker hidden without reusing visible upload styles', () => {
    expect(css.match(/\.admin-file-input\s*{/g)).toHaveLength(1)
    expect(css).toMatch(/\.admin-file-input\s*{[\s\S]*position:\s*absolute;/)
    expect(css).toMatch(/\.admin-file-input\s*{[\s\S]*width:\s*1px;/)
    expect(css).toContain('.admin-equipment-photo-input')
  })
})
