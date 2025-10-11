# 📱 מדריך הגדרת מערכת WhatsApp - Agent System

## 🎯 מה המערכת עושה?

מערכת הודעות WhatsApp אוטומטית לסוכנים עם **2 סוגי עדכונים**:

### 📊 **עדכון יומי** (בשעה 20:00)
- סיכום יומי של ביקורים שנכנסו דרך הלינק של הסוכן
- סכום העמלות שצבר היום
- מוטיבציה והעידוד

### 🛒 **עדכון מיידי** (בכל רכישה)
- הודעה מיידית כשלקוח מזמין מוצר דרך הלינק של הסוכן
- פרטי המכירה והעמלה
- מזל טוב ועידוד

---

## 🔧 אפשרויות הגדרה

### **אפשרות 1: Twilio WhatsApp (מומלץ)**

1. **הרשמה ל-Twilio:**
   - היכנס ל: https://www.twilio.com/
   - הירשם לחשבון חדש (יש גרסה חינמית)
   - אמת את מספר הטלפון שלך

2. **הגדרת WhatsApp Sandbox:**
   ```
   Console → Messaging → Try it out → Send a WhatsApp message
   שלח הודעה ל: +1 415 523 8886
   עם הקוד: join [sandbox-name]
   ```

3. **קבלת פרטי החיבור:**
   ```
   Account SID: ACxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx
   Auth Token: xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx
   WhatsApp From: whatsapp:+14155238886
   ```

4. **הוספה לקובץ .env:**
   ```env
   TWILIO_ACCOUNT_SID=ACxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx
   TWILIO_AUTH_TOKEN=xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx
   TWILIO_WHATSAPP_FROM=whatsapp:+14155238886
   ```

### **אפשרות 2: WhatsApp Business API**

1. **הרשמה ל-WhatsApp Business API**
2. **קבלת API Token ו-URL**
3. **הוספה לקובץ .env:**
   ```env
   WHATSAPP_API_URL=https://your-whatsapp-api-endpoint.com
   WHATSAPP_API_TOKEN=your_whatsapp_api_token
   ```

---

## ⚙️ הגדרות נוספות

### **זמן עדכון יומי:**
```env
DAILY_REPORT_TIME=20:00          # שעה בפורמט HH:MM
DAILY_REPORT_TIMEZONE=Asia/Jerusalem
```

### **כתובת האתר (לקישורים):**
```env
SITE_URL=https://your-domain.com
```

---

## 🚀 הפעלה

1. **עצור את השרת הנוכחי** (Ctrl+C)
2. **הפעל מחדש:**
   ```bash
   npm start
   ```

3. **בדוק את הלוג:**
   ```
   📱 Initializing WhatsApp service...
   ✅ Twilio WhatsApp service initialized
   ✅ Daily report cron job setup completed
   ✅ Midnight reset cron job setup completed
   ```

---

## 🧪 בדיקות

### **בדיקת סטטוס המערכת:**
```bash
GET http://localhost:10000/api/whatsapp/status
```

### **שליחת הודעת בדיקה:**
```bash
POST http://localhost:10000/api/whatsapp/test
Content-Type: application/json

{
  "phone": "0555545821",
  "message": "בדיקת מערכת WhatsApp - הכל עובד!"
}
```

### **שליחת דוח יומי ידני:**
```bash
POST http://localhost:10000/api/whatsapp/send-daily-reports
```

### **איפוס מונה ביקורים יומי:**
```bash
POST http://localhost:10000/api/agents/reset-daily-visits
```

---

## 📊 דוגמאות הודעות

### **עדכון יומי:**
```
🔥 עדכון יומי - 11/10/2025

שלום יוסי כהן! 👋

📈 הסטטיסטיקות שלך היום:
👥 ביקורים חדשים: 15
🔗 דרך הלינק שלך: האתר/vc/?ref=YOSSI2024
💰 עמלות שצברת היום: ₪450.00
📊 סה"כ עמלות: ₪1,250.00

המשך כך! 💪

בהצלחה,
צוות המכירות 🎯
```

### **הודעת מכירה:**
```
🎉 מזל טוב! יש לך מכירה חדשה!

💰 סכום הרכישה: ₪3,990.00
🤑 העמלה שלך: ₪399.00 (10.0%)
📅 תאריך ושעה: 11/10/2025, 14:30:15
🔗 דרך הקוד שלך: YOSSI2024

📊 סטטיסטיקות מעודכנות:
💵 סה"כ עמלות: ₪1,649.00
📈 סה"כ מכירות: 5

כל הכבוד! המשך כך! 🚀🔥

צוות המכירות 🎯
```

---

## 🔍 פתרון בעיות

### **"WhatsApp service not available"**
- ודא שהגדרת את משתני הסביבה בקובץ .env
- בדוק שה-TWILIO_ACCOUNT_SID ו-TWILIO_AUTH_TOKEN נכונים

### **"Failed to send WhatsApp message"**
- ודא שמספר הטלפון בפורמט נכון (עם 972 במקום 0)
- בדוק שהסוכן רשום ל-Twilio Sandbox

### **"Cron job not working"**
- בדוק את הזמן והאזור זמן בקובץ .env
- ראה בלוג אם יש שגיאות

---

## 📱 מספרי טלפון נכונים

המערכת ממירה אוטומטית מספרים ישראליים:
- `0555545821` → `whatsapp:+972555545821`
- `050-123-4567` → `whatsapp:+972501234567`

---

## 🎉 סיכום

אחרי ההגדרה, המערכת תשלח אוטומטית:
- ✅ **עדכון יומי** בשעה 20:00 לכל הסוכנים הפעילים
- ✅ **הודעת מכירה מיידית** בכל רכישה חדשה
- ✅ **איפוס מונים** בחצות כל יום

**המערכת מוכנה לעבודה! 🚀**
