// hachamama-parenting-program/mentor-dashboard/src/app/content/version-bar.tsx
'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { createSupabaseBrowserClient } from '@/lib/supabase/client'
import { createSupabaseContentDataSource, type ContentVersionRecord } from '@/lib/content-data-source'
import { BRAND, buttonPrimaryStyle, buttonSecondaryStyle } from '@/lib/brand'

const selectStyle = {
  padding: '6px 10px',
  border: `1px solid ${BRAND.greenMuted}`,
  borderRadius: 8,
  fontSize: 14,
} as const

// בורר גרסת תוכן + שכפול + הגדרת ברירת מחדל. הגרסה הנבחרת נשמרת ב-URL (?version=<id>),
// כך שהעמוד (server component) טוען רק את ההודעות של הגרסה הזו.
export function VersionBar({ versions, selectedId }: { versions: ContentVersionRecord[]; selectedId: string }) {
  const router = useRouter()
  const [busy, setBusy] = useState(false)
  const [message, setMessage] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [cloneName, setCloneName] = useState('')
  const [cloning, setCloning] = useState(false)
  const dataSource = createSupabaseContentDataSource(createSupabaseBrowserClient())
  const selected = versions.find((v) => v.id === selectedId)

  async function handleClone() {
    const name = cloneName.trim()
    if (!name) return
    setBusy(true)
    setError(null)
    try {
      const newId = await dataSource.cloneVersion(selectedId, name)
      setCloneName('')
      setCloning(false)
      router.push(`/content?version=${newId}`)
      router.refresh()
    } catch (e) {
      setError(`שכפול הגרסה נכשל: ${e instanceof Error ? e.message : String(e)}`)
    } finally {
      setBusy(false)
    }
  }

  async function handleSetDefault() {
    setBusy(true)
    setError(null)
    setMessage(null)
    try {
      await dataSource.setDefaultVersion(selectedId)
      setMessage('✓ הגרסה הזו תשויך מעכשיו לנרשמות חדשות')
      router.refresh()
    } catch (e) {
      setError(`הגדרת ברירת המחדל נכשלה: ${e instanceof Error ? e.message : String(e)}`)
    } finally {
      setBusy(false)
    }
  }

  return (
    <div style={{ margin: '12px 0 20px', display: 'flex', gap: 10, flexWrap: 'wrap', alignItems: 'center' }}>
      <label style={{ color: BRAND.greenDark, fontWeight: 600 }}>
        גרסת תוכן:{' '}
        <select
          style={selectStyle}
          value={selectedId}
          onChange={(e) => router.push(`/content?version=${e.target.value}`)}
          disabled={busy}
        >
          {versions.map((v) => (
            <option key={v.id} value={v.id}>
              {v.name}
              {v.is_default ? ' (ברירת מחדל להרשמות חדשות)' : ''}
            </option>
          ))}
        </select>
      </label>

      {selected && !selected.is_default && (
        <button style={buttonSecondaryStyle} onClick={handleSetDefault} disabled={busy}>
          הפוך לברירת מחדל להרשמות חדשות
        </button>
      )}

      {cloning ? (
        <>
          <input
            style={selectStyle}
            placeholder="שם לגרסה החדשה"
            value={cloneName}
            onChange={(e) => setCloneName(e.target.value)}
            autoFocus
          />
          <button style={buttonPrimaryStyle} onClick={handleClone} disabled={busy || !cloneName.trim()}>
            {busy ? 'משכפל...' : 'שכפל'}
          </button>
          <button style={buttonSecondaryStyle} onClick={() => setCloning(false)} disabled={busy}>
            בטל
          </button>
        </>
      ) : (
        <button style={buttonSecondaryStyle} onClick={() => setCloning(true)} disabled={busy}>
          שכפל גרסה זו
        </button>
      )}

      {message && <span style={{ color: BRAND.greenDark, fontWeight: 600 }}>{message}</span>}
      {error && <span style={{ color: BRAND.copper }}>{error}</span>}
    </div>
  )
}
