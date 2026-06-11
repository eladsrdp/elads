// לוגו RDP — שחזור SVG נקי של הסמל: מסגרת כפולה כחולה, "RDP", מגן דוד, "עם ישראל חי!".
// להחלפה בקובץ המקורי: שים PNG/SVG ב-public/ והחלף את הקומפוננטה ב-<img>.

function StarOfDavid({ size = 10, color = '#0c2347' }: { size?: number; color?: string }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" aria-hidden>
      <path
        d="M12 1l3.5 6h-7L12 1zm0 22l-3.5-6h7L12 23zM2 7l6.9.0 3.5 6-3.5 6L2 19l3.5-6L2 7zm20 0l-3.5 6 3.5 6-6.9 0-3.5-6 3.5-6L22 7z"
        fill="none"
        stroke={color}
        strokeWidth="1.6"
        strokeLinejoin="round"
      />
    </svg>
  )
}

/** סמל הלוגו המרובע (badge) — מתאים לשימוש קומפקטי בכותרת. */
export function RdpBadge({ size = 44 }: { size?: number }) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 100 100"
      role="img"
      aria-label="RDP — עם ישראל חי"
      className="shrink-0"
    >
      {/* מסגרת חיצונית */}
      <rect x="3" y="3" width="94" height="94" rx="10" fill="none" stroke="#1ca0e0" strokeWidth="3" />
      {/* רקע כחול פנימי */}
      <rect x="11" y="11" width="78" height="78" rx="6" fill="#1ca0e0" />
      {/* מסגרת פנימית לבנה */}
      <rect x="11" y="11" width="78" height="78" rx="6" fill="none" stroke="#ffffff" strokeWidth="2.5" />
      {/* RDP */}
      <text
        x="50"
        y="52"
        textAnchor="middle"
        fontFamily="'Suez One', 'Secular One', serif"
        fontSize="34"
        fontWeight="700"
        fill="#0c2347"
      >
        RDP
      </text>
      {/* מגן דוד קטן */}
      <g transform="translate(45,60)">
        <StarOfDavid size={10} color="#0c2347" />
      </g>
      {/* עם ישראל חי */}
      <text
        x="50"
        y="82"
        textAnchor="middle"
        fontFamily="'Secular One', sans-serif"
        fontSize="13"
        fill="#0c2347"
      >
        עם ישראל חי!
      </text>
    </svg>
  )
}

/** לוקאפ אופקי מלא: badge + שם המוצר — לשימוש בראש המסך. */
export function RdpLogo() {
  return (
    <div className="flex items-center gap-3">
      <RdpBadge size={42} />
      <div className="leading-tight">
        <div className="font-display text-lg text-slate-100">Priority Lite</div>
        <div className="text-[11px] text-emerald-400">RDP · דיווחי שעות</div>
      </div>
    </div>
  )
}
