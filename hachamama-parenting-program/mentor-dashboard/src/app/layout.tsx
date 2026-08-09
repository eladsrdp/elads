// hachamama-parenting-program/mentor-dashboard/src/app/layout.tsx
import { BRAND, FONT_FAMILY } from '@/lib/brand'

export const metadata = {
  title: 'החממה — דשבורד מנחות',
}

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="he" dir="rtl">
      <head>
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="" />
        <link
          href="https://fonts.googleapis.com/css2?family=Assistant:wght@400;500;600;700&family=Rubik:wght@400;500;600;700&display=swap"
          rel="stylesheet"
        />
      </head>
      <body style={{ margin: 0, background: BRAND.paper, fontFamily: FONT_FAMILY }}>{children}</body>
    </html>
  )
}
