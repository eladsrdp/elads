// עיצוב מטבע בש"ח.

const formatter = new Intl.NumberFormat('he-IL', {
  style: 'currency',
  currency: 'ILS',
  maximumFractionDigits: 0,
})

const signedFormatter = new Intl.NumberFormat('he-IL', {
  style: 'currency',
  currency: 'ILS',
  maximumFractionDigits: 0,
  signDisplay: 'always',
})

/** "₪5,000" — סכום מעוצב ללא סימן כפוי. */
export function formatCurrency(amount: number): string {
  return formatter.format(amount)
}

/** "+₪5,000" / "−₪3,000" — לתנועות, עם סימן מפורש. */
export function formatSigned(amount: number): string {
  return signedFormatter.format(amount)
}
