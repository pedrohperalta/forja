import { readFileSync } from 'node:fs'
import { fileURLToPath } from 'node:url'

import { describe, expect, it } from 'vitest'

const cssPath = fileURLToPath(new URL('./globals.css', import.meta.url))
const css = readFileSync(cssPath, 'utf8')

describe('admin responsive CSS', () => {
  it('maps admin border radii to the radius token scale', () => {
    const literalRadiusDeclarations = Array.from(css.matchAll(/border-radius:\s*([^;]+);/g))
      .map((match) => match[1]?.trim() ?? '')
      .filter((value) => value !== 'inherit')
      .filter((value) => !value.startsWith('var(--radius-'))

    expect(literalRadiusDeclarations).toEqual([])
  })

  it('maps admin spacing declarations to the spacing token scale', () => {
    const literalSpacingDeclarations = Array.from(
      css.matchAll(/(?:padding|margin|gap)(?:-[a-z]+)?:\s*([^;]+);/g),
    )
      .map((match) => match[0])
      .filter((declaration) => {
        const numericValues = declaration.match(/-?\d*\.?\d+(?:rem|px)/g) ?? []

        return numericValues.some((value) => !['1px', '2px', '3px', '-1px'].includes(value))
      })

    expect(literalSpacingDeclarations).toEqual([])
  })

  it('maps admin type sizes to the text and display token scales', () => {
    const literalTypeDeclarations = Array.from(css.matchAll(/font-size:\s*([^;]+);/g))
      .map((match) => match[1]?.trim() ?? '')
      .filter((value) => !value.startsWith('var(--text-'))
      .filter((value) => !value.startsWith('var(--display-'))

    expect(literalTypeDeclarations).toEqual([])
  })

  it('keeps the admin usable as a mobile web app', () => {
    expect(css).toContain('@media (max-width: 860px)')
    expect(css).toContain('@media (max-width: 520px)')
    expect(css).toContain('position: fixed;')
    expect(css).toContain('bottom: 0;')
    expect(css).toContain('env(safe-area-inset-bottom)')
    expect(css).toContain('grid-template-columns: repeat(3, minmax(0, 1fr));')
    expect(css).toMatch(/@media \(max-width:\s*860px\)\s*{[\s\S]*\.admin-stepper\s*{[\s\S]*grid-template-columns:\s*repeat\(3,\s*minmax\(0,\s*1fr\)\);/)
    expect(css).toMatch(/@media \(max-width:\s*860px\)\s*{[\s\S]*\.admin-stepper\s+li\s*{[\s\S]*min-width:\s*0;/)
    expect(css).not.toMatch(/@media \(max-width:\s*860px\)\s*{[\s\S]*\.admin-stepper\s*{[\s\S]*overflow-x:\s*auto;/)
    expect(css).not.toMatch(/@media \(max-width:\s*860px\)\s*{[\s\S]*\.admin-stepper\s*{[\s\S]*scroll-snap-type:/)
  })

  it('stacks mobile build generation controls below their copy', () => {
    expect(css).toMatch(/@media \(max-width:\s*860px\)\s*{[\s\S]*\.admin-build-command\s*{[\s\S]*grid-template-columns:\s*1fr;/)
    expect(css).toMatch(/@media \(max-width:\s*860px\)\s*{[\s\S]*\.admin-build-actions\s*{[\s\S]*display:\s*grid;/)
    expect(css).toMatch(/@media \(max-width:\s*860px\)\s*{[\s\S]*\.admin-build-actions\s*{[\s\S]*grid-template-columns:\s*1fr;/)
  })

  it('keeps mobile copy and action controls on separate rows', () => {
    expect(css).toMatch(/@media \(max-width:\s*860px\)\s*{[\s\S]*\.admin-header-row,[\s\S]*\.admin-topbar,[\s\S]*\.admin-panel-header,[\s\S]*\.admin-publication-banner,[\s\S]*\.admin-editor-next-step,[\s\S]*\.admin-form-heading,[\s\S]*\.admin-section-heading-row\s*{[\s\S]*grid-template-columns:\s*1fr;/)
    expect(css).toMatch(/@media \(max-width:\s*860px\)\s*{[\s\S]*\.admin-build-header,[\s\S]*\.admin-log-toolbar,[\s\S]*\.admin-linear-footer,[\s\S]*\.admin-actions-row,[\s\S]*\.admin-danger-actions,[\s\S]*\.admin-focus-actions,[\s\S]*\.admin-simple-actions\s*{[\s\S]*grid-template-columns:\s*1fr;/)
    expect(css).toMatch(/@media \(max-width:\s*860px\)\s*{[\s\S]*\.admin-header-row > \.admin-primary-button,[\s\S]*width:\s*100%;/)
    expect(css).toMatch(/@media \(max-width:\s*860px\)\s*{[\s\S]*\.admin-form-heading \.admin-primary-button,[\s\S]*width:\s*100%;/)
    expect(css).toMatch(/@media \(max-width:\s*860px\)\s*{[\s\S]*\.admin-linear-footer \.admin-primary-button,[\s\S]*width:\s*100%;/)
    expect(css).toMatch(/@media \(max-width:\s*860px\)\s*{[\s\S]*\.admin-actions-row \.admin-primary-button,[\s\S]*width:\s*100%;/)
    expect(css).toMatch(/@media \(max-width:\s*860px\)\s*{[\s\S]*\.admin-danger-actions \.admin-danger-button,[\s\S]*width:\s*100%;/)
  })

  it('lets exercise cards reflow vertically on small admin screens', () => {
    expect(css).toMatch(/@media \(max-width:\s*860px\)\s*{[\s\S]*\.admin-exercise-editor\s*>\s*summary\s*{[\s\S]*grid-template-columns:\s*auto minmax\(0,\s*1fr\);/)
    expect(css).toMatch(/@media \(max-width:\s*860px\)\s*{[\s\S]*\.admin-exercise-summary-actions\s*{[\s\S]*grid-column:\s*1 \/ -1;/)
    expect(css).toMatch(/@media \(max-width:\s*860px\)\s*{[\s\S]*\.admin-exercise-summary-actions\s*{[\s\S]*display:\s*grid;/)
    expect(css).toMatch(/@media \(max-width:\s*860px\)\s*{[\s\S]*\.admin-exercise-summary-actions\s*{[\s\S]*grid-template-columns:\s*minmax\(0,\s*1fr\) auto;/)
    expect(css).toMatch(/\.admin-drag-icon-button\s*{[\s\S]*width:\s*2\.25rem;/)
    expect(css).toMatch(/\.admin-drag-icon-button\s*{[\s\S]*height:\s*2\.25rem;/)
    expect(css).toMatch(/@media \(max-width:\s*860px\)\s*{[\s\S]*\.admin-drag-icon-button\s*{[\s\S]*display:\s*none;/)
    expect(css).toMatch(/@media \(max-width:\s*860px\)\s*{[\s\S]*\.admin-drag-instructions\s*{[\s\S]*display:\s*none;/)
    expect(css).toMatch(/@media \(max-width:\s*520px\)\s*{[\s\S]*\.admin-exercise-editor\s*>\s*summary\s*{[\s\S]*grid-template-columns:\s*1fr;/)
  })

  it('aligns mobile danger-zone destructive controls to the same row width', () => {
    expect(css).toMatch(/@media \(max-width:\s*860px\)\s*{[\s\S]*\.admin-danger-zone\s+\.admin-permanent-delete\s+summary\s*{[\s\S]*width:\s*100%;/)
    expect(css).toMatch(/@media \(max-width:\s*860px\)\s*{[\s\S]*\.admin-danger-zone\s+\.admin-permanent-delete\s+summary\s*{[\s\S]*justify-content:\s*center;/)
    expect(css).toMatch(/@media \(max-width:\s*860px\)\s*{[\s\S]*\.admin-danger-zone\s+\.admin-permanent-delete\s+summary\s*{[\s\S]*border-radius:\s*var\(--radius-pill\);/)
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

  it('keeps the admin shell width stable across responsive breakpoints', () => {
    expect(css).toMatch(/\.admin-shell\s*{[\s\S]*grid-template-columns:\s*var\(--sidebar-w\) minmax\(0,\s*1fr\);/)
    expect(css).toMatch(/\.admin-content\s*{[\s\S]*box-sizing:\s*border-box;/)
    expect(css).toMatch(/\.admin-content\s*{[\s\S]*min-width:\s*0;/)
    expect(css).toMatch(/\.admin-simple-dashboard\s*{[\s\S]*width:\s*100%;/)
    expect(css).toMatch(/\.admin-linear-flow\s*{[\s\S]*width:\s*100%;/)
    expect(css).toMatch(/\.admin-build-page\s*{[\s\S]*width:\s*100%;/)
    expect(css).toMatch(/@media \(max-width:\s*860px\)\s*{[\s\S]*\.admin-shell\s*{[\s\S]*display:\s*grid;/)
    expect(css).toMatch(/@media \(max-width:\s*860px\)\s*{[\s\S]*\.admin-shell\s*{[\s\S]*grid-template-columns:\s*minmax\(0,\s*1fr\);/)
    expect(css).toMatch(/@media \(max-width:\s*860px\)\s*{[\s\S]*\.admin-sidebar\s*{[\s\S]*top:\s*auto;/)
    expect(css).toMatch(/@media \(max-width:\s*860px\)\s*{[\s\S]*\.admin-sidebar\s*{[\s\S]*grid-template-rows:\s*none;/)
    expect(css).not.toMatch(/@media \(max-width:\s*860px\)\s*{[\s\S]*\.admin-shell\s*{[\s\S]*display:\s*block;/)
    expect(css).toMatch(/@media \(max-width:\s*860px\)\s*{[\s\S]*\.admin-content\s*{[\s\S]*calc\(\(var\(--space-12\) \* 2\) \+ env\(safe-area-inset-bottom\)\);/)
    expect(css).toMatch(/@media \(max-width:\s*520px\)\s*{[\s\S]*\.admin-content\s*{[\s\S]*calc\(\(var\(--space-12\) \* 2\) \+ env\(safe-area-inset-bottom\)\);/)
  })

  it('keeps the desktop logout action aligned to the sidebar control scale', () => {
    expect(css).toMatch(/\.admin-sidebar-footer\s*{[\s\S]*display:\s*grid;/)
    expect(css).toMatch(/\.admin-sidebar-footer\s+\.admin-secondary-button\s*{[\s\S]*width:\s*100%;/)
    expect(css).toMatch(/\.admin-sidebar-footer\s+\.admin-secondary-button\s*{[\s\S]*min-height:\s*2\.875rem;/)
    expect(css).toMatch(/\.admin-sidebar-footer\s+\.admin-secondary-button\s*{[\s\S]*justify-content:\s*center;/)
  })

  it('keeps the primary file picker hidden without reusing visible upload styles', () => {
    expect(css.match(/\.admin-file-input\s*{/g)).toHaveLength(1)
    expect(css).toMatch(/\.admin-file-input\s*{[\s\S]*position:\s*absolute;/)
    expect(css).toMatch(/\.admin-file-input\s*{[\s\S]*width:\s*1px;/)
    expect(css).toContain('.admin-equipment-photo-input')
  })
})
