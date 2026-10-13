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
