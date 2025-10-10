# 💾 הוראות גיבוי נתונים - Render Deployment

## 🚨 בעיית אובדן נתונים
ב-Render, קבצים נמחקים בכל פריסה חדשה. כדי לשמור על נתוני הסוכנים, יש צורך בגיבוי ידני.

## 📋 תהליך גיבוי לפני פריסה

### שלב 1: יצירת גיבוי
```bash
# גש לכתובת הבאה בדפדפן:
https://agent-system-2.onrender.com/api/backup/data
```

### שלב 2: העתקת הנתונים
מהתגובה, העתק את הערכים הבאים:

1. **AGENTS_DATA** - העתק את הערך מ-`instructions.agents_data`
2. **SALES_DATA** - העתק את הערך מ-`instructions.sales_data`

### שלב 3: הגדרת Environment Variables ב-Render

1. היכנס לדשבורד של Render
2. בחר בפרויקט Agent-System-2
3. לך ל-Environment → Environment Variables
4. הוסף/עדכן:
   - **Key**: `AGENTS_DATA`
   - **Value**: [הדבק את הנתונים מהגיבוי]
   
   - **Key**: `SALES_DATA` 
   - **Value**: [הדבק את הנתונים מהגיבוי]

### שלב 4: פריסה
עכשיו אפשר לבצע פריסה חדשה - הנתונים ישמרו!

## 🔄 שחזור נתונים אחרי פריסה

אם הנתונים לא נטענו אוטומטית, השתמש ב-API לשחזור:

```bash
POST https://agent-system-2.onrender.com/api/backup/restore
Content-Type: application/json

{
  "agents": [נתוני הסוכנים מהגיבוי],
  "sales": [נתוני המכירות מהגיבוי]
}
```

## ⚡ גיבוי אוטומטי

המערכת מדפיסה בלוגים את הנתונים לגיבוי כל פעם שמשהו משתנה.
חפש בלוגים של Render:
- `AGENTS_DATA should be set to:`
- `SALES_DATA should be set to:`

## 🎯 המלצה לעתיד

לפתרון קבוע יותר, כדאי לעבור למסד נתונים חיצוני כמו:
- MongoDB Atlas (חינמי)
- PostgreSQL על Render
- Firebase Firestore

## 📞 תמיכה

אם יש בעיות עם הגיבוי, בדוק את הלוגים ב-Render או צור קשר לתמיכה.
