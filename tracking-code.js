// קוד מעקב להוספה לאתר המכירות
// יש להוסיף את הקוד הזה לכל דף באתר https://vipogroup.github.io/4Massage-for-sale-VC/

(function() {
    // כתובת השרת שלך - עדכן את זה לכתובת הנכונה
    const TRACKING_SERVER = window.location.origin; // השרת המקומי
    
    // קבלת קוד ההפניה מה-URL
    function getReferralCode() {
        const urlParams = new URLSearchParams(window.location.search);
        return urlParams.get('ref');
    }
    
    // שמירת קוד ההפניה בעוגיה
    function saveReferralCode(refCode) {
        if (refCode) {
            // שמירה לשבוע
            const expiryDate = new Date();
            expiryDate.setDate(expiryDate.getDate() + 7);
            document.cookie = `referral_code=${refCode}; expires=${expiryDate.toUTCString()}; path=/`;
            console.log('Referral code saved:', refCode);
        }
    }
    
    // קבלת קוד ההפניה מהעוגיה
    function getSavedReferralCode() {
        const cookies = document.cookie.split(';');
        for (let cookie of cookies) {
            const [name, value] = cookie.trim().split('=');
            if (name === 'referral_code') {
                return value;
            }
        }
        return null;
    }
    
    // מעקב אחר ביקור
    async function trackVisit(refCode) {
        try {
            await fetch(`${TRACKING_SERVER}/api/track-visit`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({
                    referral_code: refCode,
                    visitor_ip: null, // יטופל בשרת
                    user_agent: navigator.userAgent,
                    page_url: window.location.href
                })
            });
            console.log('Visit tracked for referral code:', refCode);
        } catch (error) {
            console.error('Error tracking visit:', error);
        }
    }
    
    // מעקב אחר רכישה - יש לקרוא לפונקציה הזו כאשר לקוח רוכש
    window.trackSale = async function(saleAmount, customerEmail = null, productName = null) {
        const refCode = getSavedReferralCode();
        if (!refCode) {
            console.log('No referral code found - sale not tracked');
            return;
        }
        
        try {
            const response = await fetch(`${TRACKING_SERVER}/api/record-sale`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({
                    referral_code: refCode,
                    sale_amount: saleAmount,
                    customer_email: customerEmail,
                    product_name: productName
                })
            });
            
            const result = await response.json();
            if (response.ok) {
                console.log('Sale tracked successfully:', result);
                return result;
            } else {
                console.error('Error tracking sale:', result.error);
            }
        } catch (error) {
            console.error('Error tracking sale:', error);
        }
    };
    
    // אתחול המעקב
    function initTracking() {
        const refCode = getReferralCode();
        
        if (refCode) {
            // יש קוד הפניה חדש - שמור אותו ועקוב אחר הביקור
            saveReferralCode(refCode);
            trackVisit(refCode);
            
            // הסר את הפרמטר מה-URL כדי שהוא לא יישאר
            const url = new URL(window.location);
            url.searchParams.delete('ref');
            window.history.replaceState({}, document.title, url.toString());
        } else {
            // בדוק אם יש קוד הפניה שמור
            const savedRefCode = getSavedReferralCode();
            if (savedRefCode) {
                console.log('Using saved referral code:', savedRefCode);
            }
        }
    }
    
    // הפעל את המעקב כאשר הדף נטען
    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', initTracking);
    } else {
        initTracking();
    }
    
    // הוסף אירוע לכפתורי רכישה (דוגמה)
    // יש להתאים את זה לכפתורים האמיתיים באתר שלך
    document.addEventListener('click', function(e) {
        // דוגמה: אם יש כפתור עם class "buy-button"
        if (e.target.classList.contains('buy-button') || 
            e.target.classList.contains('purchase-btn') ||
            e.target.id === 'buyNow') {
            
            // כאן תוכל להוסיף לוגיקה לזיהוי סכום הרכישה
            const saleAmount = 500; // דוגמה - יש להחליף בסכום האמיתי
            const productName = 'עיסוי מקצועי'; // דוגמה
            
            // עקוב אחר הרכישה
            trackSale(saleAmount, null, productName);
        }
    });
})();

// דוגמה לשימוש ידני:
// כאשר לקוח משלם, קרא לפונקציה:
// trackSale(500, 'customer@email.com', 'עיסוי שוודי');
