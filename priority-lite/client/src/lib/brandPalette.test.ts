/// <reference types="node" />
import { readFileSync } from 'node:fs'
import { describe, expect, it } from 'vitest'

// vitest מחזיר מחרוזת ריקה ל-`index.css?raw` (CSS מדולג כברירת מחדל), לכן קוראים את הקובץ ישירות.
const css = readFileSync(new URL('../index.css', import.meta.url), 'utf8')

function token(name: string): string {
  const m = css.match(new RegExp(`--color-${name}:\\s*(#[0-9a-fA-F]{6})`))
  if (!m) throw new Error(`token missing in index.css: ${name}`)
  return m[1].toLowerCase()
}

function resolve(nameOrHex: string): string {
  return nameOrHex.startsWith('#') ? nameOrHex.toLowerCase() : token(nameOrHex)
}

function luminance(hex: string): number {
  const [r, g, b] = [1, 3, 5]
    .map((i) => parseInt(hex.slice(i, i + 2), 16) / 255)
    .map((c) => (c <= 0.03928 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4))
  return 0.2126 * r + 0.7152 * g + 0.0722 * b
}

function contrast(fg: string, bg: string): number {
  const a = luminance(resolve(fg))
  const b = luminance(resolve(bg))
  return (Math.max(a, b) + 0.05) / (Math.min(a, b) + 0.05)
}

describe('brand palette (index.css)', () => {
  it('brand orange is the primary accent', () => {
    expect(token('emerald-500')).toBe('#f55514')
  })

  it('base background is neutral charcoal, not navy', () => {
    expect(token('slate-900')).toBe('#151517')
    expect(css).toContain('background-color: #151517')
  })

  it('defines a separate success scale and yellow-leaning amber', () => {
    expect(token('success-400')).toBe('#3fb97a')
    expect(token('success-500')).toBe('#2fa46a')
    expect(token('amber-400')).toBe('#facc15')
  })

  // [foreground, background, minimum ratio] — WCAG AA for normal text is 4.5
  const pairs: [string, string, number][] = [
    ['slate-100', 'slate-900', 4.5], // body text
    ['slate-400', 'slate-800', 4.5], // secondary text on cards
    ['slate-500', 'slate-900', 4.5], // hints on the page background
    ['emerald-400', 'slate-900', 4.5], // orange text on page
    ['emerald-500', 'slate-900', 4.5], // brand orange text on page
    ['slate-900', 'emerald-500', 4.5], // dark label on orange button
    ['slate-900', 'emerald-400', 4.5], // dark label on hovered orange button
    ['#ffffff', 'emerald-600', 4.5], // white label on deep orange button
    ['success-400', 'slate-800', 4.5], // success text on cards
    ['amber-400', 'slate-900', 4.5], // warning text
  ]
  for (const [fg, bg, min] of pairs) {
    it(`contrast ${fg} on ${bg} >= ${min}`, () => {
      expect(contrast(fg, bg)).toBeGreaterThanOrEqual(min)
    })
  }
})
