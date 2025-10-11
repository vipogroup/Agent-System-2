// Quick WhatsApp Configuration Test
import dotenv from 'dotenv';
import { initWhatsAppService, getWhatsAppServiceStatus, sendWhatsAppMessage } from './whatsapp-service.js';

// Load environment variables
dotenv.config();

console.log('🧪 בדיקת הגדרות WhatsApp...\n');

// Check environment variables
console.log('📋 משתני סביבה:');
console.log(`TWILIO_ACCOUNT_SID: ${process.env.TWILIO_ACCOUNT_SID ? '✅ מוגדר' : '❌ חסר'}`);
console.log(`TWILIO_AUTH_TOKEN: ${process.env.TWILIO_AUTH_TOKEN ? '✅ מוגדר' : '❌ חסר'}`);
console.log(`TWILIO_WHATSAPP_FROM: ${process.env.TWILIO_WHATSAPP_FROM || '❌ חסר'}`);
console.log(`WHATSAPP_API_URL: ${process.env.WHATSAPP_API_URL ? '✅ מוגדר' : '❌ חסר'}`);
console.log(`WHATSAPP_API_TOKEN: ${process.env.WHATSAPP_API_TOKEN ? '✅ מוגדר' : '❌ חסר'}`);

console.log('\n---\n');

// Initialize WhatsApp service
console.log('🚀 אתחול שירות WhatsApp...');
const serviceStatus = initWhatsAppService();

console.log('\n📊 סטטוס שירות:');
const status = getWhatsAppServiceStatus();
console.log(JSON.stringify(status, null, 2));

console.log('\n---\n');

// Test message sending (will be logged if no service available)
console.log('📱 בדיקת שליחת הודעה...');
const testPhone = '0587009938'; // המספר מהתמונה
const testMessage = 'בדיקת מערכת WhatsApp - הכל עובד! 🚀';

try {
  const result = await sendWhatsAppMessage(testPhone, testMessage);
  
  console.log('\n📋 תוצאת הבדיקה:');
  console.log(`✅ הצלחה: ${result.success}`);
  console.log(`🔧 שירות: ${result.service}`);
  if (result.error) {
    console.log(`❌ שגיאה: ${result.error}`);
  }
  if (result.messageId) {
    console.log(`🆔 מזהה הודעה: ${result.messageId}`);
  }
  
} catch (error) {
  console.error('❌ שגיאה בבדיקה:', error.message);
}

console.log('\n🎯 סיכום:');
if (serviceStatus.available) {
  console.log('✅ שירות WhatsApp זמין ופעיל');
} else {
  console.log('⚠️ שירות WhatsApp לא מוגדר');
  console.log('💡 עקוב אחרי המדריך ב-WHATSAPP_FIX_GUIDE.md');
}

console.log('\n✅ בדיקה הושלמה!');
