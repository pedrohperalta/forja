import { readFileSync } from 'node:fs'
import { fileURLToPath } from 'node:url'

import { describe, expect, it } from 'vitest'

const cssPath = fileURLToPath(new URL('./globals.css', import.meta.url))
const css = readFileSync(cssPath, 'utf8')

const rootStart = css.indexOf(':root {')
const rootEnd = css.indexOf('\n}', rootStart)
const cssOutsideTokens = css.slice(0, rootStart) + css.slice(rootEnd + 2)

describe('admin design tokens', () => {
  it('keeps brand-color rgba literals confined to the :root token block', () => {
    const brandLiterals = cssOutsideTokens.match(
      /rgba\((?:194, 240, 0|255, 69, 58|245, 158, 11)[^)]*\)/g,
    )

    expect(brandLiterals).toBeNull()
  })

  it('keeps hex color literals confined to the :root token block', () => {
    const hexLiterals = cssOutsideTokens
      .split('\n')
      .filter((line) => !line.includes('url('))
      .flatMap((line) => line.match(/#[0-9a-fA-F]{3,8}\b/g) ?? [])

    expect(hexLiterals).toEqual([])
  })

  it('does not resurrect classes deleted with their screens', () => {
    const deadClasses = [
      'admin-kpi',
      'admin-table-row',
      'admin-table-head',
      'admin-workflow',
      'admin-health',
      'admin-activity',
      'admin-shortcut',
      'admin-dashboard',
      'admin-topbar',
      'admin-stepper',
      'admin-sticky-publish',
      'admin-editor-next-step',
      'admin-publication-banner',
      'admin-unsaved-banner',
      'admin-import-review',
      'admin-simple-actions',
      'admin-chip',
      'admin-danger-zone',
      'admin-danger-actions',
      'bg-accent',
    ]

    for (const deadClass of deadClasses) {
      expect(css).not.toContain(`.${deadClass}`)
    }
  })

  it('gives the visible file upload affordance a keyboard focus ring', () => {
    expect(css).toMatch(/\.admin-file-upload:focus-within\s*{[\s\S]*outline:\s*2px solid var\(--accent-alpha-subtle\);/)
  })

  it('gives compact and destructive triggers a 44px hit target', () => {
    expect(css).toMatch(/\.admin-compact-button\s*\{[^}]*min-height:\s*2\.75rem;/)
    expect(css).toMatch(/\.admin-danger-row-terminal > summary\s*\{[^}]*min-height:\s*2\.75rem;/)
    expect(css).toMatch(/\.admin-permanent-delete summary\s*\{[^}]*min-height:\s*2\.75rem;/)
    expect(css).toMatch(/\.admin-exercise-advanced summary\s*\{[^}]*min-height:\s*2\.75rem;/)
  })

  it('expands the desktop drag handle hit area beyond its visual size', () => {
    expect(css).toMatch(/\.admin-drag-icon-button\s*\{[^}]*position:\s*relative;/)
    expect(css).toMatch(/\.admin-drag-icon-button::after\s*\{[^}]*inset:\s*-0\.25rem;/)
  })

  it('unifies the keyboard focus ring across disclosure summaries', () => {
    expect(css).toMatch(
      /summary:focus-visible\s*\{[^}]*outline:\s*2px solid var\(--color-accent\);/,
    )
  })

  it('spaces destructive disclosures with the token grid gap, not ad-hoc margins', () => {
    expect(css).toMatch(
      /\.admin-plan-card-actions \.admin-permanent-delete\[open\]\s*\{[^}]*display:\s*grid;/,
    )
    expect(css).toMatch(
      /\.admin-plan-card-actions \.admin-permanent-delete\[open\]\s*\{[^}]*gap:\s*var\(--space-4\);/,
    )
    expect(css).toMatch(
      /\.admin-plan-card-actions \.admin-permanent-delete\[open\]\s*\{[^}]*padding-bottom:\s*var\(--space-4\);/,
    )
    expect(css).toMatch(/\.admin-exercise-remove\s*\{[^}]*display:\s*grid;/)
    expect(css).toMatch(/\.admin-exercise-remove\s*\{[^}]*gap:\s*var\(--space-3\);/)
    expect(css).toMatch(/\.admin-danger-row-terminal\s*\{[^}]*display:\s*grid;/)
    expect(css).toMatch(/\.admin-danger-row-terminal\s*\{[^}]*gap:\s*var\(--space-3\);/)
    expect(css).not.toContain('.admin-exercise-remove[open] > summary')
    expect(css).not.toContain('.admin-danger-row-terminal[open] > summary')
  })

  it('gives the removable preview tiles a 44px remove target', () => {
    expect(css).toContain('.admin-file-preview-item')
    expect(css).toMatch(/\.admin-file-preview-remove\s*\{[^}]*width:\s*2\.75rem;/)
    expect(css).toMatch(/\.admin-file-preview-remove\s*\{[^}]*height:\s*2\.75rem;/)
  })

  it('normalizes the equipment photo input to the standard field radius', () => {
    expect(css).toMatch(
      /\.admin-equipment-photo-input\s*\{[^}]*border-radius:\s*var\(--radius-md\);/,
    )
  })
})

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
    expect(css).toMatch(
      /@media \(max-width:\s*860px\)\s*{[\s\S]*\.admin-nav\s*{[\s\S]*grid-template-columns:\s*repeat\(3,\s*minmax\(0,\s*1fr\)\);/,
    )
  })

  it('stacks mobile build generation controls below their copy', () => {
    expect(css).toMatch(
      /@media \(max-width:\s*860px\)\s*{[\s\S]*\.admin-build-command\s*{[\s\S]*grid-template-columns:\s*1fr;/,
    )
    expect(css).toMatch(
      /@media \(max-width:\s*860px\)\s*{[\s\S]*\.admin-build-actions\s*{[\s\S]*display:\s*grid;/,
    )
    expect(css).toMatch(
      /@media \(max-width:\s*860px\)\s*{[\s\S]*\.admin-build-actions\s*{[\s\S]*grid-template-columns:\s*1fr;/,
    )
  })

  it('keeps mobile copy and action controls on separate rows', () => {
    expect(css).toMatch(
      /@media \(max-width:\s*860px\)\s*{[\s\S]*\.admin-header-row,[\s\S]*\.admin-panel-header,[\s\S]*\.admin-form-heading,[\s\S]*\.admin-section-heading-row\s*{[\s\S]*grid-template-columns:\s*1fr;/,
    )
    expect(css).toMatch(
      /@media \(max-width:\s*860px\)\s*{[\s\S]*\.admin-build-header,[\s\S]*\.admin-log-toolbar,[\s\S]*\.admin-linear-footer,[\s\S]*\.admin-actions-row,[\s\S]*\.admin-focus-actions\s*{[\s\S]*grid-template-columns:\s*1fr;/,
    )
    expect(css).toMatch(
      /@media \(max-width:\s*860px\)\s*{[\s\S]*\.admin-header-row > \.admin-primary-button,[\s\S]*width:\s*100%;/,
    )
    expect(css).toMatch(
      /@media \(max-width:\s*860px\)\s*{[\s\S]*\.admin-form-heading \.admin-primary-button,[\s\S]*width:\s*100%;/,
    )
    expect(css).toMatch(
      /@media \(max-width:\s*860px\)\s*{[\s\S]*\.admin-linear-footer \.admin-primary-button,[\s\S]*width:\s*100%;/,
    )
    expect(css).toMatch(
      /@media \(max-width:\s*860px\)\s*{[\s\S]*\.admin-actions-row \.admin-primary-button,[\s\S]*width:\s*100%;/,
    )
    expect(css).toMatch(
      /@media \(max-width:\s*860px\)\s*{[\s\S]*\.admin-danger-row form\s*\{[\s\S]*width:\s*100%;/,
    )
  })

  it('lets exercise cards reflow vertically on small admin screens', () => {
    expect(css).toMatch(
      /@media \(max-width:\s*860px\)\s*{[\s\S]*\.admin-exercise-editor\s*>\s*summary\s*{[\s\S]*grid-template-columns:\s*auto minmax\(0,\s*1fr\);/,
    )
    expect(css).toMatch(
      /@media \(max-width:\s*860px\)\s*{[\s\S]*\.admin-exercise-summary-actions\s*{[\s\S]*grid-column:\s*1 \/ -1;/,
    )
    expect(css).toMatch(
      /@media \(max-width:\s*860px\)\s*{[\s\S]*\.admin-exercise-summary-actions\s*{[\s\S]*display:\s*grid;/,
    )
    expect(css).toMatch(
      /@media \(max-width:\s*860px\)\s*{[\s\S]*\.admin-exercise-summary-actions\s*{[\s\S]*grid-template-columns:\s*minmax\(0,\s*1fr\) auto;/,
    )
    expect(css).toMatch(/\.admin-drag-icon-button\s*\{[^}]*width:\s*2\.5rem;/)
    expect(css).toMatch(/\.admin-drag-icon-button\s*\{[^}]*height:\s*2\.5rem;/)
    expect(css).toMatch(
      /@media \(max-width:\s*860px\)\s*{[\s\S]*\.admin-drag-icon-button\s*{[\s\S]*display:\s*none;/,
    )
    expect(css).toMatch(
      /@media \(max-width:\s*860px\)\s*{[\s\S]*\.admin-drag-instructions\s*{[\s\S]*display:\s*none;/,
    )
    expect(css).toMatch(
      /@media \(max-width:\s*520px\)\s*{[\s\S]*\.admin-exercise-editor\s*>\s*summary\s*{[\s\S]*grid-template-columns:\s*1fr;/,
    )
  })

  it('stacks destructive action rows on small screens', () => {
    expect(css).toMatch(
      /@media \(max-width:\s*860px\)\s*{[\s\S]*\.admin-danger-row\s*{[\s\S]*grid-template-columns:\s*1fr;/,
    )
  })

  it('keeps mobile publish actions above the bottom navigation', () => {
    expect(css).toContain('bottom: calc(5.75rem + env(safe-area-inset-bottom));')
  })

  it('pins the editor action bar with state and actions in one place', () => {
    expect(css).toMatch(/\.admin-editor-actionbar\s*{[\s\S]*position:\s*sticky;/)
    expect(css).toMatch(/\.admin-editor-actionbar\s*{[\s\S]*z-index:\s*var\(--z-sticky\);/)
    expect(css).toMatch(/\.admin-editor-actionbar-actions\s*{[\s\S]*display:\s*flex;/)
    expect(css).toMatch(
      /@media \(max-width:\s*860px\)\s*{[\s\S]*\.admin-editor-actionbar\s*{[\s\S]*bottom:\s*calc\(5\.75rem \+ env\(safe-area-inset-bottom\)\);/,
    )
    expect(css).toMatch(
      /@media \(max-width:\s*860px\)\s*{[\s\S]*\.admin-editor-actionbar\s*{[\s\S]*flex-direction:\s*column;/,
    )
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
    expect(css).toMatch(
      /\.admin-shell\s*{[\s\S]*grid-template-columns:\s*var\(--sidebar-w\) minmax\(0,\s*1fr\);/,
    )
    expect(css).toMatch(/\.admin-content\s*{[\s\S]*box-sizing:\s*border-box;/)
    expect(css).toMatch(/\.admin-content\s*{[\s\S]*min-width:\s*0;/)
    expect(css).toMatch(/\.admin-simple-dashboard\s*{[\s\S]*width:\s*100%;/)
    expect(css).toMatch(/\.admin-linear-flow\s*{[\s\S]*width:\s*100%;/)
    expect(css).toMatch(/\.admin-build-page\s*{[\s\S]*width:\s*100%;/)
    expect(css).toMatch(
      /@media \(max-width:\s*860px\)\s*{[\s\S]*\.admin-shell\s*{[\s\S]*display:\s*grid;/,
    )
    expect(css).toMatch(
      /@media \(max-width:\s*860px\)\s*{[\s\S]*\.admin-shell\s*{[\s\S]*grid-template-columns:\s*minmax\(0,\s*1fr\);/,
    )
    expect(css).toMatch(
      /@media \(max-width:\s*860px\)\s*{[\s\S]*\.admin-sidebar\s*{[\s\S]*top:\s*auto;/,
    )
    expect(css).toMatch(
      /@media \(max-width:\s*860px\)\s*{[\s\S]*\.admin-sidebar\s*{[\s\S]*grid-template-rows:\s*none;/,
    )
    expect(css).not.toMatch(
      /@media \(max-width:\s*860px\)\s*{[\s\S]*\.admin-shell\s*{[\s\S]*display:\s*block;/,
    )
    expect(css).toMatch(
      /@media \(max-width:\s*860px\)\s*{[\s\S]*\.admin-content\s*{[\s\S]*calc\(\(var\(--space-12\) \* 2\) \+ env\(safe-area-inset-bottom\)\);/,
    )
    expect(css).toMatch(
      /@media \(max-width:\s*520px\)\s*{[\s\S]*\.admin-content\s*{[\s\S]*calc\(\(var\(--space-12\) \* 2\) \+ env\(safe-area-inset-bottom\)\);/,
    )
  })

  it('keeps the desktop logout action aligned to the sidebar control scale', () => {
    expect(css).toMatch(/\.admin-sidebar-footer\s*{[\s\S]*display:\s*grid;/)
    expect(css).toMatch(
      /\.admin-sidebar-footer\s+\.admin-secondary-button\s*{[\s\S]*width:\s*100%;/,
    )
    expect(css).toMatch(
      /\.admin-sidebar-footer\s+\.admin-secondary-button\s*{[\s\S]*min-height:\s*2\.875rem;/,
    )
    expect(css).toMatch(
      /\.admin-sidebar-footer\s+\.admin-secondary-button\s*{[\s\S]*justify-content:\s*center;/,
    )
  })

  it('keeps the primary file picker hidden without reusing visible upload styles', () => {
    expect(css.match(/\.admin-file-input\s*{/g)).toHaveLength(1)
    expect(css).toMatch(/\.admin-file-input\s*{[\s\S]*position:\s*absolute;/)
    expect(css).toMatch(/\.admin-file-input\s*{[\s\S]*width:\s*1px;/)
    expect(css).toContain('.admin-equipment-photo-input')
  })
})
