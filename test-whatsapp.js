// Test script for WhatsApp functionality
import { sendWhatsAppMessage, generateSaleNotificationMessage, generateDailyReportMessage } from './whatsapp-service.js';

// Test data
const testAgent = {
  id: 1,
  full_name: 'יוסי כהן',
  email: 'yossi@example.com',
  phone: '0555545821',
  referral_code: 'YOSSI2024',
  totalCommissions: 1250,
  sales: 4
};

console.log('🧪 Testing WhatsApp functionality...\n');

// Test 1: Sale notification
console.log('📱 Test 1: Sale notification message');
const saleMessage = generateSaleNotificationMessage(testAgent, 3990, 399, 'YOSSI2024');
console.log('Generated message:');
console.log(saleMessage);
console.log('\n---\n');

// Test 2: Daily report
console.log('📊 Test 2: Daily report message');
const dailyMessage = generateDailyReportMessage(testAgent, 15, 450);
console.log('Generated message:');
console.log(dailyMessage);
console.log('\n---\n');

// Test 3: Send WhatsApp message (will be logged since no service configured)
console.log('📲 Test 3: Sending WhatsApp message');
try {
  const result = await sendWhatsAppMessage(testAgent.phone, 'בדיקת מערכת WhatsApp - הכל עובד!');
  console.log('Result:', result);
} catch (error) {
  console.error('Error:', error);
}

console.log('\n✅ WhatsApp tests completed!');
