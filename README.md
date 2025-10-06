# 🚀 מערכת שותפים/סוכנים מתקדמת

מערכת מלאה לניהול שותפים וסוכנים עם דשבורדים מתקדמים, מותאמת למובייל ומחשב.

## ✨ **תכונות עיקריות:**
- 🔐 **מערכת אימות מלאה** - JWT, הצפנת סיסמאות
- 👥 **ניהול סוכנים** - רישום, התחברות, פרופילים
- 💰 **מעקב עמלות** - חישוב אוטומטי, בקשות תשלום
- 📊 **דשבורד מנהל** - ניהול מלא של המערכת
- 📱 **מותאם למובייל** - עובד מושלם על כל המכשירים
- 🌐 **גישה מרחוק** - נגיש מכל מקום ברשת

## דרישות
- Node.js 18+
- npm

## 🚀 **התקנה מהירה**

### 1. **הורדה והתקנה:**
```bash
git clone https://github.com/vipogroup/Agent-system.git
cd Agent-system
npm install
```

### 2. **הגדרת משתני סביבה:**
צור קובץ `.env` עם התוכן הבא:
```env
JWT_SECRET=your_super_secret_key_here
PORT=3000
COMMISSION_RATE=0.10
CLEAR_WINDOW_DAYS=14
COOKIE_TTL_DAYS=30
```

### 3. **יצירת מנהל ראשון:**
```bash
node src/create-admin.js
```

### 4. **הפעלת השרת:**
```bash
npm run dev
```

השרת יפעל על: `http://localhost:3000`

### 5. **גישה למערכת:**
- **מנהל:** `http://localhost:3000/public/dashboard-admin.html`
- **סוכן:** `http://localhost:3000/public/dashboard-agent.html`

## 🌐 **פריסה בענן (Render)**

המערכת מוכנה לפריסה מיידית ב-Render:

1. **התחבר ל-[Render](https://render.com)**
2. **צור Web Service חדש**
3. **חבר את הרפוזיטורי:** `https://github.com/vipogroup/Agent-System-2`
4. **Render יזהה אוטומטית** את קובץ `render.yaml`
5. **לחץ Deploy** - המערכת תהיה זמינה תוך דקות!

### **אחרי הפריסה:**
- **כתובת ציבורית:** `https://your-app-name.onrender.com`
- **מנהל:** `https://your-app-name.onrender.com/public/dashboard-admin.html`
- **סוכן:** `https://your-app-name.onrender.com/public/dashboard-agent.html`

## קבצים חשובים
- `src/server.js` – נקודת כניסה.
- `src/db.js` – אתחול SQLite + סכימה אוטומטית.
- `src/auth.js` – JWT, מחלקת אמצעי זיהוי.
- `src/routes.js` – כל ה-API.
- `src/jobs/clearCommissions.js` – ג'וב שמאשר עמלות אחרי חלון ביטולים.
- `public/` – דפי דשבורד לדמו.

## משתני סביבה (.env)
```
JWT_SECRET=change_this_secret
PORT=3000
CLEAR_WINDOW_DAYS=14
COOKIE_TTL_DAYS=30
```

## זרימת עבודה
1. סוכן נרשם (`POST /api/agents/register`) → מקבל token.
2. משתמש מגיע עם `?ref=CODE` → `POST /api/track?ref=CODE` שומר עוגיה.
3. תשלום מצליח → קוראים ל-`POST /api/orders` (בדמו זה ידני) → נוצרת עמלה `PENDING_CLEARANCE`.
4. ג'וב יומי (`node src/jobs/clearCommissions.js`) מעביר ל-`CLEARED`.
5. סוכן מבקש משיכה (`POST /api/payouts/request`).
6. אדמין מאשר/מסמן כמשולם.

## אזהרות ופתיחות
- זהו **דמו בסיסי** – ללא הקשחה מלאה, וללא איפוסי סיסמה/2FA.
- לפני פרודקשן: להקשיח CORS, Rate Limiting, אימות קלט, ולוגים.
- חיבור לסליקה אמיתית: לבנות Webhooks בנתיבי ה־API או בנתיבים חדשים.

## רישוי
MIT


## שינוי שיעור העמלה (ברירת מחדל 10% = 0.10)
- דרך משתנה סביבה: `COMMISSION_RATE=0.10` ( fallback אם אין ערך ב-DB ).
- או דרך API לאדמין:
  - `GET /admin/settings/commission-rate`  (דורש אדמין + JWT)
  - `POST /admin/settings/commission-rate` עם גוף `{ "rate": 0.12 }` לשינוי ל-12%.


## אבטחה ושיפורים שבוצעו
- סיסמאות נשמרות עם **bcrypt** (לא SHA-256).
- רישום ציבורי יוצר **Agent בלבד**; יצירת Admin נעשית בסקריפט seed.
- סכומים נשמרים ב-**אגורות** (INTEGER cents) למניעת שגיאות עיגול.
- אפשרות **override** לעמלה פר-סוכן (`commission_rate_override`).
- **Rate limit** בסיסי ל-API.

### יצירת אדמין ראשון
```bash
node src/seedAdmin.js
```

### שיעור עמלה ברירת מחדל ו-override
- גלובלי: `POST /admin/settings/commission-rate { "rate": 0.10 }`
- פר-סוכן: `POST /admin/agents/:id/commission-override { "rate": 0.12 }` או `null` להסרה.

### הזמנה בדמו
`POST /api/orders` עם גוף `{ "total_amount": 100 }` (₪100) — יישמרו אגורות אוטומטית.

