// hachamama-parenting-program/mentor-dashboard/src/app/content/edit-panel.tsx
'use client'

import { useState } from 'react'
import { createSupabaseBrowserClient } from '@/lib/supabase/client'
import { createSupabaseContentDataSource } from '@/lib/content-data-source'
import { validateMediaFile } from '@/lib/content-view'
import type { MessageRecord } from '@/lib/content-data-source'

export function EditPanel({
  message,
  onClose,
  onBodySave,
  onMediaSaved,
}: {
  message: MessageRecord
  onClose: () => void
  onBodySave: (body: string) => void
  onMediaSaved: (url: string, mediaType: string) => void
}) {
  const [body, setBody] = useState(message.body_text)
  const [error, setError] = useState<string | null>(null)
  const [uploading, setUploading] = useState(false)
  const dataSource = createSupabaseContentDataSource(createSupabaseBrowserClient())

  async function handleFile(file: File) {
    const validation = validateMediaFile(file)
    if (!validation.ok) {
      setError(validation.error)
      return
    }
    setError(null)
    setUploading(true)
    try {
      const { url } = await dataSource.uploadMedia(file, message.content_day_number)
      await dataSource.updateMessageMedia(message.id, url, validation.mediaType)
      onMediaSaved(url, validation.mediaType)
    } finally {
      setUploading(false)
    }
  }

  return (
    <div
      style={{
        position: 'fixed',
        top: 0,
        right: 0,
        width: 360,
        height: '100%',
        background: 'white',
        borderLeft: '1px solid #ddd',
        padding: 16,
        overflowY: 'auto',
      }}
    >
      <button onClick={onClose}>✕ סגור</button>
      <h3>
        יום {message.content_day_number}, {message.send_offset_time}
      </h3>
      <textarea
        value={body}
        onChange={(e) => setBody(e.target.value)}
        onBlur={() => onBodySave(body)}
        rows={8}
        style={{ width: '100%' }}
      />
      <div
        onDragOver={(e) => e.preventDefault()}
        onDrop={(e) => {
          e.preventDefault()
          const file = e.dataTransfer.files[0]
          if (file) handleFile(file)
        }}
        style={{ border: '1px dashed #999', borderRadius: 8, padding: 16, marginTop: 12, textAlign: 'center' }}
      >
        {message.media_url ? (
          <p>מדיה קיימת: {message.media_type}</p>
        ) : (
          <p>גרור קובץ לפה, או:</p>
        )}
        <input
          type="file"
          onChange={(e) => {
            const file = e.target.files?.[0]
            if (file) handleFile(file)
          }}
        />
        {uploading && <p>מעלה...</p>}
        {error && <p style={{ color: 'red' }}>{error}</p>}
      </div>
    </div>
  )
}
