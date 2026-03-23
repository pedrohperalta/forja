import { MUSCLE_CATEGORIES } from '@/constants/categories'

describe('MUSCLE_CATEGORIES', () => {
  it('contains exactly 12 muscle groups', () => {
    expect(MUSCLE_CATEGORIES).toHaveLength(12)
  })

  it('all entries are non-empty strings', () => {
    for (const category of MUSCLE_CATEGORIES) {
      expect(typeof category).toBe('string')
      expect(category.length).toBeGreaterThan(0)
    }
  })

  it('has no duplicates', () => {
    const unique = new Set(MUSCLE_CATEGORIES)
    expect(unique.size).toBe(MUSCLE_CATEGORIES.length)
  })
})
