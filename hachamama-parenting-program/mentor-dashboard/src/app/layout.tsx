// hachamama-parenting-program/mentor-dashboard/src/app/layout.tsx
import { BRAND } from '@/lib/brand'

export const metadata = {
  title: 'החממה — דשבורד מנחות',
}

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="he" dir="rtl">
      <body style={{ margin: 0, background: BRAND.paper }}>{children}</body>
    </html>
  )
}
