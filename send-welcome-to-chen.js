// Send welcome message to Chen manually
import { sendWhatsAppMessage } from './whatsapp-service.js';

// Chen's NEW details from Render (after re-registration)
const chen = {
  id: 1760265609311,
  full_name: 'חן',
  email: 'g0555580986@gmail.com',
  phone: '0555580986',
  referral_code: 'SCBBVKD4'  // New referral code
};

console.log('📱 Sending welcome message to Chen...');
console.log('Agent details:', chen);

try {
  // Manual welcome message with correct production URLs
  const welcomeMessage = `🎉 ברוך הבא למערכת הסוכנים! 

שלום ${chen.full_name}! 👋

🎯 ההרשמה שלך הושלמה בהצלחה!

📋 פרטי החשבון שלך:
👤 שם: ${chen.full_name}
📧 מייל: ${chen.email}
🔗 קוד הפניה: ${chen.referral_code}

🚀 איך להתחיל:
1️⃣ היכנס לדשבורד שלך: https://agent-system-2.onrender.com/agent-login.html
2️⃣ שתף את קישור המכירות שלך: https://agent-system-2.onrender.com/vc/?ref=${chen.referral_code}
3️⃣ קבל 10% עמלה מכל מכירה!

💡 טיפים להצלחה:
• שתף את הקישור ברשתות החברתיות
• ספר לחברים ומשפחה על המוצר
• השתמש בכפתורי השיתוף בדשבורד

📱 תמיכה: אם יש שאלות, פנה אלינו בכל עת!

בהצלחה! 🚀💰

צוות מערכת הסוכנים 🎯`;

  console.log('\n--- Generated Welcome Message ---');
  console.log(welcomeMessage);
  console.log('\n--- Sending via WhatsApp ---');
  
  const result = await sendWhatsAppMessage(chen.phone, welcomeMessage);
  
  if (result.success) {
    console.log(`✅ Welcome message sent to ${chen.full_name} via ${result.service}`);
  } else {
    console.log(`⚠️ Failed to send welcome message: ${result.error}`);
    console.log('\n📋 Copy this message and send manually via WhatsApp:');
    console.log('Phone:', chen.phone);
    console.log('Message:');
    console.log(welcomeMessage);
  }
} catch (error) {
  console.error('❌ Error:', error);
}
