# הוראות הטמעת מעקב הפניות באתר המכירות

## 📋 מה צריך לעשות:

### 1. הוספת קוד המעקב לאתר
העתק את הקוד מהקובץ `tracking-code.js` והוסף אותו לכל דף באתר המכירות שלך:

```html
<!-- הוסף את זה לפני סגירת תג ה-</body> -->
<script>
// הקוד מ-tracking-code.js כאן
</script>
```

### 2. עדכון כתובת השרת
בקוד המעקב, עדכן את השורה:
```javascript
const TRACKING_SERVER = 'https://agent-system-2.onrender.com';
```

אם אתה משתמש בשרת המקומי:
```javascript
const TRACKING_SERVER = 'http://192.168.10.172:3000';
```

### 3. הוספת מעקב רכישות
כאשר לקוח רוכש משהו, קרא לפונקציה:

```javascript
// דוגמה: רכישה של ₪500
trackSale(500, 'customer@email.com', 'עיסוי מקצועי');
```

### 4. זיהוי כפתורי רכישה
עדכן את הקוד כדי לזהות את הכפתורים האמיתיים באתר שלך:

```javascript
// במקום:
if (e.target.classList.contains('buy-button'))

// השתמש בשמות הכפתורים האמיתיים שלך:
if (e.target.id === 'הכפתור-שלך' || 
    e.target.classList.contains('הקלאס-שלך'))
```

## 🔧 דוגמה מלאה להטמעה:

```html
<!DOCTYPE html>
<html>
<head>
    <title>עיסויים מקצועיים</title>
</head>
<body>
    <!-- התוכן של האתר שלך -->
    
    <button id="buyNow" onclick="handlePurchase()">קנה עכשיו - ₪500</button>
    
    <script>
        // קוד המעקב (העתק מ-tracking-code.js)
        
        // פונקציה לטיפול ברכישה
        function handlePurchase() {
            // כאן הלוגיקה של התשלום שלך
            
            // אחרי שהתשלום הצליח:
            trackSale(500, null, 'עיסוי מקצועי');
            
            alert('הרכישה בוצעה בהצלחה!');
        }
    </script>
</body>
</html>
```

## 🌐 בדיקת הקישור:

1. **קישור הסוכן:** `https://vipogroup.github.io/4Massage-for-sale-VC/?ref=177F776D`
2. **מה יקרה:**
   - הלקוח יגיע לאתר עם קוד ההפניה
   - הקוד יישמר בעוגיה לשבוע
   - כל רכישה תיוחס לסוכן עם קוד 177F776D
   - הסוכן יקבל עמלה של 10%

## ⚠️ חשוב:
- וודא שהשרת שלך פועל ונגיש
- בדוק שהכתובת בקוד המעקב נכונה
- בדוק שכפתורי הרכישה מזוהים נכון
