// Test script for welcome message functionality
import { generateWelcomeMessage } from './whatsapp-service.js';

// Test agent data
const testAgent = {
  id: 999,
  full_name: 'בדיקה חדש',
  email: 'test@example.com',
  phone: '0587009938',
  referral_code: 'TEST2024'
};

console.log('📱 Testing welcome message generation...');
console.log('Agent data:', testAgent);
console.log('\n--- Generated Welcome Message ---');

const welcomeMessage = generateWelcomeMessage(testAgent);
console.log(welcomeMessage);

console.log('\n--- End of Message ---');
console.log('✅ Welcome message test completed!');
