import { describe, expect, it } from 'vitest'
import { buildQuery } from './useCustNotes'

describe('buildQuery', () => {
  it('ריק — בלי פרמטרים', () => {
    expect(buildQuery({})).toBe('')
  })

  it('q בלבד', () => {
    expect(buildQuery({ q: 'גיבוי' })).toBe(`q=${encodeURIComponent('גיבוי')}`)
  })

  it('mine=true מתווסף רק כשאמת', () => {
    expect(buildQuery({ mine: true })).toBe('mine=true')
    expect(buildQuery({ mine: false })).toBe('')
  })

  it('כמה ערכי status מתווספים כפרמטרים חוזרים', () => {
    const qs = buildQuery({ status: ['לפיתוח', 'בוצעה'] })
    const params = new URLSearchParams(qs)
    expect(params.getAll('status')).toEqual(['לפיתוח', 'בוצעה'])
  })

  it('שילוב של כל הפרמטרים יחד', () => {
    const qs = buildQuery({ q: 'x', mine: true, status: ['טיוטא'] })
    const params = new URLSearchParams(qs)
    expect(params.get('q')).toBe('x')
    expect(params.get('mine')).toBe('true')
    expect(params.getAll('status')).toEqual(['טיוטא'])
  })
})
