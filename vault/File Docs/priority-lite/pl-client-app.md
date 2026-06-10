# priority-lite/client/src/App.tsx

**שייך ל:** priority-lite / קליינט / נקודת כניסה

## מה הקובץ עושה
רכיב השורש של האפליקציה — שער ההתחברות והניווט הראשי. אם ה-session עוד נטען מציג "טוען…", אם אין משתמש מחובר מציג את מסך ה-Login, ואחרת מציג את שלד האפליקציה: כותרת עם שם הטאב וברכת שלום, אזור התוכן (אחד מארבעת המסכים: היום / דיווחים / סיכום / הגדרות לפי הטאב הנבחר), ו-BottomNav עם badge של מספר הטיוטות הממתינות.

## קבצים קשורים
- [[pl-client-main]] — מרנדר את הרכיב
- [[pl-client-state-use-auth]] — מצב ההתחברות שקובע Login או אפליקציה
- [[pl-client-components-bottom-nav]] — הניווט התחתון
- [[pl-client-screens-today]] — מסך "היום"
- [[pl-client-screens-entries]] — מסך "דיווחים"
- [[pl-client-screens-summary]] — מסך "סיכום"
- [[pl-client-screens-settings]] — מסך "הגדרות"
- [[priority-lite-app]] — קובץ הנושא של האפליקציה
