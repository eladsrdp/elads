# priority-lite/.gitignore

**שייך ל:** priority-lite / root / קונפיגורציה

## מה הקובץ עושה
מגדיר מה לא נכנס ל-git: ‏node_modules/‏, dist/‏ (תוצרי build), data/‏ (קובץ ה-SQLite עם עובדים וקודי OTP), ‏.env (סודות), ‏whitelist.json (רשימת עובדים אמיתית עם פרטים אישיים) וקבצי ‎*.tsbuildinfo. חשוב מבחינת אבטחה: גם הסודות וגם נתוני העובדים האמיתיים מוחרגים מהריפו במכוון.

## קבצים קשורים
- [[pl-server-env-example]] — התבנית הציבורית של ה-.env המוחרג
- [[pl-server-whitelist]] — קובץ העובדים האמיתי שמוחרג כאן
- [[priority-lite-app]] — קובץ הנושא של האפליקציה
