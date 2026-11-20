// אחרי שכפול גרסה (clone_content_version ב-DB, שמעתיק רק שורות) — מעתיק גם את קבצי המדיה עצמם
// ב-Storage, כך שלכל גרסה יש עותק משלה ומחיקה/החלפה של קובץ בגרסה אחת לא שוברת גרסה אחרת.
// לוגיקה טהורה: מקבלת data source ו-fetch מבחוץ, כדי שתהיה ניתנת לבדיקה בלי רשת.
import type { ContentDataSource, MediaType } from './content-data-source'

export interface CopyMediaResult {
  copied: number
  failed: number
}

type FetchLike = (url: string) => Promise<{ ok: boolean; blob(): Promise<Blob> }>

export async function copyVersionMedia(
  dataSource: Pick<ContentDataSource, 'listMessagesForVersion' | 'uploadMedia' | 'updateMessageMedia'>,
  versionId: string,
  fetchFile: FetchLike,
  onProgress?: (done: number, total: number) => void,
): Promise<CopyMediaResult> {
  const messages = await dataSource.listMessagesForVersion(versionId)
  const withMedia = messages.filter((m) => m.media_url)

  // אותו קובץ יכול להיות מוצמד לכמה הודעות — מעתיקים כל כתובת-מקור פעם אחת.
  const messagesByUrl = new Map<string, typeof withMedia>()
  for (const m of withMedia) {
    const list = messagesByUrl.get(m.media_url as string) ?? []
    list.push(m)
    messagesByUrl.set(m.media_url as string, list)
  }

  let copied = 0
  let failed = 0
  let done = 0
  const total = messagesByUrl.size
  onProgress?.(0, total)

  for (const [oldUrl, group] of messagesByUrl) {
    try {
      const response = await fetchFile(oldUrl)
      if (!response.ok) throw new Error('הורדת קובץ המדיה נכשלה')
      const blob = await response.blob()
      const file = new File([blob], 'media', { type: blob.type })
      // הנתיב החדש נבנה ע"י uploadMedia (שם רנדומלי, סיומת מה-MIME) — לא נגזר משם הקובץ המקורי.
      const { url } = await dataSource.uploadMedia(file, group[0].content_day_number)
      for (const m of group) {
        await dataSource.updateMessageMedia(m.id, url, m.media_type as MediaType | null)
      }
      copied++
    } catch {
      // הודעות שהעתקת המדיה שלהן נכשלה ממשיכות להצביע על הקובץ המקורי (עדיין עובד) — רק מדווחים.
      failed++
    }
    done++
    onProgress?.(done, total)
  }

  return { copied, failed }
}
