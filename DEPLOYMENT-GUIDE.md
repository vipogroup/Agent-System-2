# 🚀 מדריך פריסה לפרודקשן - Agent System 2.0

## 📋 שלב 1: הכנת הקבצים

### ✅ קבצים מוכנים להעלאה:
- `simple-server.js` - השרת הראשי ✅
- `package.json` - תלויות ✅
- `package-lock.json` - גרסאות מדויקות ✅
- `.env.example` - דוגמה להגדרות ✅
- `.gitignore` - קבצים להתעלמות ✅
- `render.yaml` - הגדרות Render ✅
- `README.md` - תיעוד מעודכן ✅

### 📁 תיקיות וקבצים:
- `github-system.html` - עמוד ראשי ✅
- `admin-login.html` - כניסת מנהל ✅
- `agent-login.html` - כניסת סוכן ✅
- `agent-dashboard.html` - דשבורד סוכן ✅
- `tracking-code.js` - מעקב הפניות ✅
- `public/` - דשבורד מנהל ורישום ✅
- `vc/` - אתר מכירות ✅

## 🗑️ שלב 2: ניקוי גיטהאב

### קבצים למחיקה מהגיטהאב:
```bash
# קבצים ישנים שלא נחוצים
rm -rf old-files/
rm -rf temp/
rm -rf backup/
rm *.backup
rm *.old
rm test-*.html
rm debug-*.js

# קבצי פיתוח
rm .env
rm data.sqlite
rm *.log
```

## 📤 שלב 3: העלאה לגיטהאב

### A. באמצעות הסקריפט האוטומטי:
```bash
# הרץ את הסקריפט המוכן
./deploy-to-github.bat
```

### B. באמצעות פקודות ידניות:
```bash
# אתחול Git (אם לא קיים)
git init
git remote add origin https://github.com/vipogroup/Agent-System-2.git

# הוספת קבצים
git add simple-server.js
git add package.json
git add package-lock.json
git add .env.example
git add .gitignore
git add render.yaml
git add README.md
git add github-system.html
git add admin-login.html
git add agent-login.html
git add agent-dashboard.html
git add tracking-code.js
git add public/
git add vc/

# Commit והעלאה
git commit -m "Agent System 2.0 - Production Ready"
git push -u origin main
```

## 🌐 שלב 4: פריסה ב-Render

### A. חיבור הפרויקט:
1. היכנס ל: https://dashboard.render.com/web/srv-d3hrv8gjchc73aocddg
2. או צור Web Service חדש
3. חבר את הרפוזיטורי: `https://github.com/vipogroup/Agent-System-2`

### B. הגדרות פריסה:
- **Name**: `agent-system-2`
- **Environment**: `Node`
- **Build Command**: `npm ci`
- **Start Command**: `npm start`
- **Plan**: `Free` (או לפי הצורך)

### C. משתני סביבה ב-Render:
```
NODE_ENV=production
PORT=10000
JWT_SECRET=your_super_secret_key_change_this
COMMISSION_RATE=0.10
CLEAR_WINDOW_DAYS=14
COOKIE_TTL_DAYS=30
```

## ✅ שלב 5: בדיקת הפריסה

### כתובות לבדיקה:
- **עמוד ראשי**: `https://your-app.onrender.com/`
- **כניסת מנהל**: `https://your-app.onrender.com/admin-login.html`
- **כניסת סוכן**: `https://your-app.onrender.com/agent-login.html`
- **דשבורד מנהל**: `https://your-app.onrender.com/public/admin-dashboard-fixed.html`
- **רישום סוכן**: `https://your-app.onrender.com/public/register-agent.html`
- **אתר מכירות**: `https://your-app.onrender.com/vc/index.html`

### בדיקות תפקוד:
1. ✅ רישום סוכן חדש
2. ✅ כניסה כמנהל (admin/admin)
3. ✅ צפייה בדשבורד מנהל
4. ✅ כניסה לדשבורד סוכן
5. ✅ סימולציה מכירה
6. ✅ מעקב הפניות באתר מכירות

## 🔧 פתרון בעיות נפוצות

### בעיית Build:
```bash
# אם יש שגיאת build, בדוק:
npm ci
npm start
```

### בעיית משתני סביבה:
- וודא שכל המשתנים מוגדרים ב-Render
- בדוק שאין רווחים מיותרים

### בעיית נתיבים:
- וודא שכל הקבצים הועלו לגיטהאב
- בדוק שהנתיבים נכונים (case-sensitive)

## 📞 תמיכה

במקרה של בעיות:
- בדוק את הלוגים ב-Render Dashboard
- וודא שהשרת מגיב על `/health`
- צור קשר: websites3d@gmail.com

---

**🎯 המערכת מוכנה לפרודקשן עם כל הפונקציות!**
