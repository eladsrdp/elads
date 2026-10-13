# Priority Lite Rebrand — Stage 1 (Palette, Logo, PWA) Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Replace the navy/blue RDP look with the new brand — orange `#F55514` logo and accents on a neutral charcoal background — and swap in the new logo and app icons, without touching screen layouts.

**Architecture:** The app's colours come from Tailwind v4 `@theme` overrides in `client/src/index.css` (`slate-*` = neutrals, `emerald-*` = brand accent, `violet-*` = AI button). Re-pointing those scales recolours every existing class at once. Semantic "success" uses of `emerald` move to a new `success-*` scale; `amber-*` is re-pointed to yellow so warnings stay distinct from the orange. A vitest test parses `index.css` and enforces the palette and WCAG contrast pairs. The logo becomes an inline SVG component.

**Tech Stack:** React 19, Tailwind CSS v4 (`@theme`), Vite, Vitest. Spec: `docs/superpowers/specs/2026-10-13-priority-lite-rebrand-design.md`.

**Working directory for all commands:** `priority-lite/client` (inside the worktree) unless stated otherwise. Stage 2 (header/nav/surface polish, login) is a separate plan, written after the user has seen Stage 1 on their device.

---

## File Structure

| File | Responsibility | Change |
|---|---|---|
| `client/src/lib/brandPalette.test.ts` | Enforces palette values + contrast ratios by parsing `index.css` | Create |
| `client/src/index.css` | Theme tokens and body background | Modify |
| `client/src/components/EntryRow.tsx` | "Synced" chip | Modify (emerald → success) |
| `client/src/screens/Settings.tsx` | Import message, "real mode" label | Modify (emerald → success) |
| `client/src/screens/Summary.tsx` | On-target progress bar | Modify (emerald → success) |
| `client/src/components/RdpLogo.tsx` | Header logo | Rewrite (new mark) |
| `client/public/logo.svg` | Standalone logo asset | Create |
| `client/public/icon.svg` | App icon | Rewrite |
| `client/public/icon-maskable.svg` | Maskable app icon | Create |
| `client/public/manifest.webmanifest` | PWA colours + icons | Modify |
| `client/index.html` | `theme-color` | Modify |

---

### Task 1: Palette tokens, enforced by a test

**Files:**
- Create: `client/src/lib/brandPalette.test.ts`
- Modify: `client/src/index.css` (the comment block + `@theme` block, currently lines 58–94, and `body` background at line 109)

- [ ] **Step 1: Write the failing test**

Create `client/src/lib/brandPalette.test.ts`:

```ts
import { describe, expect, it } from 'vitest'
import css from '../index.css?raw'

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
```

- [ ] **Step 2: Run the test to verify it fails**

Run: `npx vitest run src/lib/brandPalette.test.ts`
Expected: FAIL — "brand orange is the primary accent" (got `#1ca0e0`), "base background…" (got `#0c2347`), and "defines a separate success scale…" (`token missing in index.css: success-400`).

- [ ] **Step 3: Replace the theme block in `index.css`**

In `client/src/index.css`, replace everything from the comment line `/*` that starts with `===== רידיזיין מותג RDP =====` through the closing `}` of `@theme { … }` with:

```css
/*
  ===== מיתוג Priority Lite =====
  טריק Tailwind v4: דורסים את סולמות הצבע הקיימים (slate / emerald / amber / violet)
  בגווני המותג. כך כל ה-bg-slate-900 / text-emerald-400 וכו' שבקומפוננטות מקבלים
  אוטומטית את הצבעים החדשים — בלי לגעת בעשרות קבצים.
    slate   → ניטרלי פחם (רקעים, כרטיסים, מסגרות, טקסט משני)
    emerald → כתום המותג #F55514 (כפתורים ראשיים, הדגשות, טאב פעיל)
    success → ירוק הצלחה (סטטוס "בפריוריטי", שמירה שהצליחה) — נפרד מהכתום
    amber   → צהוב (אזהרות, תג ממתינים) — כדי לא להתבלבל עם הכתום
  ניגודיות (WCAG AA) נאכפת ב-src/lib/brandPalette.test.ts.
*/
@theme {
  --color-slate-50: #f6f6f7;
  --color-slate-100: #ececef;
  --color-slate-200: #d9d9de;
  --color-slate-300: #b8b8c0;
  --color-slate-400: #92929c;
  --color-slate-500: #80808a;
  --color-slate-600: #5a5a64;
  --color-slate-700: #2e2e34;
  --color-slate-800: #1f1f23;
  --color-slate-900: #151517;
  --color-slate-950: #0d0d0f;

  --color-emerald-300: #ff9a6b;
  --color-emerald-400: #ff7a3d;
  --color-emerald-500: #f55514;
  --color-emerald-600: #c7440b;
  --color-emerald-700: #a53808;
  --color-emerald-900: #4a1c0a;

  --color-success-400: #3fb97a;
  --color-success-500: #2fa46a;

  --color-amber-400: #facc15;
  --color-amber-500: #eab308;

  /* violet → גוון קר נפרד לכפתור ה-AI (נשאר כמו שהיה) */
  --color-violet-500: #2f5bd0;
  --color-violet-600: #2848b0;

  /* פונטים */
  --font-sans: 'Rubik', 'Segoe UI', system-ui, -apple-system, sans-serif;
  --font-display: 'Secular One', 'Suez One', sans-serif;
}
```

Then change the `body` rule's `background-color: #0c2347;` to `background-color: #151517;` and its `color: #e7f1fb;` to `color: #ececef;`.

- [ ] **Step 4: Run the test to verify it passes**

Run: `npx vitest run src/lib/brandPalette.test.ts`
Expected: PASS — all 13 tests.

- [ ] **Step 5: Build to confirm the theme compiles into the CSS bundle**

Run: `npm run build`
Expected: build succeeds with no TypeScript errors.
Then run: `grep -c "f55514" dist/assets/*.css`
Expected: a number ≥ 1 (the brand colour is in the shipped CSS).

- [ ] **Step 6: Commit**

```bash
git add src/lib/brandPalette.test.ts src/index.css
git commit -m "feat(priority-lite): brand palette (orange on charcoal) with contrast tests"
```

---

### Task 2: Success semantics stay green

Three places use `emerald` to mean "success", not "brand". After Task 1 they would turn orange, so they move to `success-*`.

**Files:**
- Modify: `client/src/components/EntryRow.tsx:16`
- Modify: `client/src/screens/Settings.tsx:90` and `:105`
- Modify: `client/src/screens/Summary.tsx:71`

- [ ] **Step 1: EntryRow — "synced" chip**

In `client/src/components/EntryRow.tsx` change:

```tsx
  synced: { label: 'בפריוריטי ✓', cls: 'bg-emerald-500/10 text-emerald-400' },
```
to:
```tsx
  synced: { label: 'בפריוריטי ✓', cls: 'bg-success-500/10 text-success-400' },
```

- [ ] **Step 2: Settings — import message and real-mode label**

In `client/src/screens/Settings.tsx` change `'text-rose-400' : 'text-emerald-400'` to `'text-rose-400' : 'text-success-400'`, and change
`<span className="text-emerald-400">אמיתי ✓</span>` to `<span className="text-success-400">אמיתי ✓</span>`.

- [ ] **Step 3: Summary — on-target bar**

In `client/src/screens/Summary.tsx` change
`${diffMin >= 0 ? 'bg-emerald-500' : 'bg-amber-500'}` to `${diffMin >= 0 ? 'bg-success-500' : 'bg-amber-500'}`.

- [ ] **Step 4: Verify the build and that the success classes are generated**

Run: `npm run build && grep -c "success-400" dist/assets/*.css`
Expected: build succeeds; count ≥ 1.

- [ ] **Step 5: Commit**

```bash
git add src/components/EntryRow.tsx src/screens/Settings.tsx src/screens/Summary.tsx
git commit -m "feat(priority-lite): keep success states green after the orange rebrand"
```

---

### Task 3: New logo mark in the header

**Files:**
- Create: `client/public/logo.svg`
- Rewrite: `client/src/components/RdpLogo.tsx` (the old badge, `StarOfDavid` and `RdpBadge` are removed; only `RdpLogo` is imported, in `App.tsx`)

- [ ] **Step 1: Create the standalone logo asset**

Create `client/public/logo.svg`:

```svg
<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 1056 1171" fill="#F55514">
  <path d="M202 163L448 22Q527 -20 607 22L664 56L452 182Q380 212 338 198Z"/>
  <path d="M774 118L1045 275Q1056 285 1045 296L746 477Q670 515 620 490L560 470Q505 450 452 482L1 745L1 406L50 376Q105 348 160 360L246 382Q300 395 347 370Z"/>
  <path d="M1055 419L1055 764L1020 786Q945 820 890 797L835 779Q780 765 727 790L279 1049L5 892Q-5 882 5 872L329 679Q390 650 440 662L527 684Q580 695 627 670Z"/>
  <path d="M390 1114L603 988Q660 960 715 971L852 1006L607 1148Q528 1190 448 1148Z"/>
</svg>
```

- [ ] **Step 2: Rewrite `RdpLogo.tsx`**

Replace the entire contents of `client/src/components/RdpLogo.tsx` with:

```tsx
// לוגו Priority Lite — הסמל החדש (משושה פרוס). צבע המותג מגיע מ-CSS (text-emerald-500 = #F55514).
// הצורה משוחזרת בקירוב מהתמונה שסופקה; אם יתקבל קובץ וקטורי מקורי — מחליפים את ה-paths כאן וב-public/logo.svg.

/** הסמל לבדו — מתאים לכותרת, למסך כניסה ולכל שימוש קומפקטי. */
export function BrandMark({ size = 34 }: { size?: number }) {
  return (
    <svg
      width={size}
      height={Math.round((size * 1171) / 1056)}
      viewBox="0 0 1056 1171"
      role="img"
      aria-label="Priority Lite"
      fill="currentColor"
      className="shrink-0 text-emerald-500"
    >
      <path d="M202 163L448 22Q527 -20 607 22L664 56L452 182Q380 212 338 198Z" />
      <path d="M774 118L1045 275Q1056 285 1045 296L746 477Q670 515 620 490L560 470Q505 450 452 482L1 745L1 406L50 376Q105 348 160 360L246 382Q300 395 347 370Z" />
      <path d="M1055 419L1055 764L1020 786Q945 820 890 797L835 779Q780 765 727 790L279 1049L5 892Q-5 882 5 872L329 679Q390 650 440 662L527 684Q580 695 627 670Z" />
      <path d="M390 1114L603 988Q660 960 715 971L852 1006L607 1148Q528 1190 448 1148Z" />
    </svg>
  )
}

/** לוקאפ אופקי: סמל + שם המוצר — לראש המסך. */
export function RdpLogo() {
  return (
    <div className="flex items-center gap-3">
      <BrandMark size={34} />
      <div className="leading-tight">
        <div className="font-display text-lg text-slate-100">Priority Lite</div>
        <div className="text-[11px] text-emerald-400">RDP · דיווחי שעות</div>
      </div>
    </div>
  )
}
```

- [ ] **Step 3: Typecheck and build**

Run: `npm run build`
Expected: succeeds (no unused-import or missing-export errors; `App.tsx` still imports `RdpLogo`).

- [ ] **Step 4: Commit**

```bash
git add public/logo.svg src/components/RdpLogo.tsx
git commit -m "feat(priority-lite): new logo mark in the header"
```

---

### Task 4: App icons and PWA colours

**Files:**
- Rewrite: `client/public/icon.svg`
- Create: `client/public/icon-maskable.svg`
- Modify: `client/public/manifest.webmanifest`
- Modify: `client/index.html:7`

- [ ] **Step 1: Rewrite `public/icon.svg`**

```svg
<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 512 512">
  <rect width="512" height="512" rx="96" fill="#151517"/>
  <g transform="translate(121 106) scale(0.256)" fill="#F55514">
    <path d="M202 163L448 22Q527 -20 607 22L664 56L452 182Q380 212 338 198Z"/>
    <path d="M774 118L1045 275Q1056 285 1045 296L746 477Q670 515 620 490L560 470Q505 450 452 482L1 745L1 406L50 376Q105 348 160 360L246 382Q300 395 347 370Z"/>
    <path d="M1055 419L1055 764L1020 786Q945 820 890 797L835 779Q780 765 727 790L279 1049L5 892Q-5 882 5 872L329 679Q390 650 440 662L527 684Q580 695 627 670Z"/>
    <path d="M390 1114L603 988Q660 960 715 971L852 1006L607 1148Q528 1190 448 1148Z"/>
  </g>
</svg>
```

- [ ] **Step 2: Create `public/icon-maskable.svg`** (full-bleed square; the mark sits inside the central safe zone)

```svg
<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 512 512">
  <rect width="512" height="512" fill="#151517"/>
  <g transform="translate(121 106) scale(0.256)" fill="#F55514">
    <path d="M202 163L448 22Q527 -20 607 22L664 56L452 182Q380 212 338 198Z"/>
    <path d="M774 118L1045 275Q1056 285 1045 296L746 477Q670 515 620 490L560 470Q505 450 452 482L1 745L1 406L50 376Q105 348 160 360L246 382Q300 395 347 370Z"/>
    <path d="M1055 419L1055 764L1020 786Q945 820 890 797L835 779Q780 765 727 790L279 1049L5 892Q-5 882 5 872L329 679Q390 650 440 662L527 684Q580 695 627 670Z"/>
    <path d="M390 1114L603 988Q660 960 715 971L852 1006L607 1148Q528 1190 448 1148Z"/>
  </g>
</svg>
```

- [ ] **Step 3: Update `public/manifest.webmanifest`**

Replace the file contents with:

```json
{
  "name": "Priority Lite — דיווחי שעות",
  "short_name": "Priority Lite",
  "lang": "he",
  "dir": "rtl",
  "start_url": "/",
  "display": "standalone",
  "background_color": "#151517",
  "theme_color": "#151517",
  "icons": [
    {
      "src": "/icon.svg",
      "sizes": "any",
      "type": "image/svg+xml",
      "purpose": "any"
    },
    {
      "src": "/icon-maskable.svg",
      "sizes": "any",
      "type": "image/svg+xml",
      "purpose": "maskable"
    }
  ]
}
```

- [ ] **Step 4: Update `index.html` theme colour**

Change `<meta name="theme-color" content="#0c2347" />` to `<meta name="theme-color" content="#151517" />`.

- [ ] **Step 5: Verify**

Run: `node -e "JSON.parse(require('fs').readFileSync('public/manifest.webmanifest','utf8')); console.log('manifest ok')"`
Expected: `manifest ok`.
Run: `npm run build && ls dist/icon.svg dist/icon-maskable.svg dist/logo.svg`
Expected: build succeeds; all three files are listed.

- [ ] **Step 6: Commit**

```bash
git add public/icon.svg public/icon-maskable.svg public/manifest.webmanifest index.html
git commit -m "feat(priority-lite): new app icons and PWA colours"
```

---

### Task 5: Full verification, deploy, vault

**Files:**
- Modify: `vault/Meeting Notes/priority-lite-app.md` (append a session entry)

- [ ] **Step 1: Run the whole test suite and the production build**

From `priority-lite` (one level up): `npm test`
Expected: server and client suites all pass (client count rises by 13 from the new palette tests).
From `priority-lite`: `node scripts/vercel-build.mjs`
Expected: ends with `Vercel build complete`.

- [ ] **Step 2: Push to both refs**

```bash
git push origin HEAD:main
git push origin HEAD
```
If `main` is rejected as non-fast-forward: `git fetch origin`, check that `git diff --name-only HEAD...origin/main` does not touch `priority-lite/`, then `git merge origin/main --no-edit` and push again.

- [ ] **Step 3: Check the Vercel deployment status (do not assume it deployed)**

Run (use the pushed commit's short SHA):
`gh api "repos/eladsrdp/elads/commits/<sha>/status" --jq '.statuses[] | select(.context == "Vercel – priority-lite") | .state + " " + .description'`
Expected: `success Deployment has completed` (may need ~90 seconds; re-run until it is no longer pending). On `failure`, stop and diagnose before continuing.

- [ ] **Step 4: Verify the live bundle**

Run:
```bash
node -e "(async()=>{const h=await (await fetch('https://priority-lite-one.vercel.app/',{cache:'no-store'})).text();const css=h.match(/assets\/index-[^\"]+\.css/)[0];const t=await (await fetch('https://priority-lite-one.vercel.app/'+css)).text();console.log(css,'orange',t.toLowerCase().includes('#f55514'),'oldblue',t.toLowerCase().includes('#1ca0e0'));const m=await (await fetch('https://priority-lite-one.vercel.app/manifest.webmanifest',{cache:'no-store'})).json();console.log('theme',m.theme_color)})()"
```
Expected: `orange true oldblue false` and `theme #151517`.

- [ ] **Step 5: Log in the vault and push**

Append a `### 2026-10-13 — מיתוג מחדש שלב 1: פלטה, לוגו, אייקונים [shipped]` entry (What was done / Decisions / Notes / Related with `[[repo-github-migration]]`) at the bottom of `vault/Meeting Notes/priority-lite-app.md`: palette via `@theme` overrides, success/amber handling, hand-traced logo (approximation), SVG-only icons (PNG deferred), contrast test, live verification result. Commit `docs(vault): log rebrand stage 1` and push both refs.

- [ ] **Step 6: Hand back to the user**

Tell the user (Hebrew): Stage 1 is live; close and reopen the app (up to twice); what to look at; what was and was not verified visually. Stage 2 plan is written only after the user's feedback.

---

## Self-Review

**Spec coverage (Stage 1):** palette scales — Task 1; `success-*` + sweep of success uses — Tasks 1–2; amber → yellow — Task 1; violet unchanged — Task 1 (kept); `body`/`theme-color`/manifest backgrounds — Tasks 1, 4; contrast verification — Task 1 test; logo replacing the badge — Task 3; app icons (SVG) — Task 4; deploy, bundle check, vault log — Task 5. Spec's PNG icons are deferred (spec amended). Stage 2 items (header, nav icons, surfaces, login) are out of this plan by design.

**Placeholder scan:** none — every step has the exact code or command.

**Type/name consistency:** `RdpLogo` stays exported (used by `App.tsx`); `BrandMark` is new and only used in `RdpLogo.tsx`; token names in the test (`emerald-500`, `slate-900`, `success-400/500`, `amber-400`) match the CSS added in Task 1.
