// Debug Environment Variables
import dotenv from 'dotenv';

// Load environment variables
dotenv.config();

console.log('🔍 Environment Variables Debug:');
console.log('================================');

console.log('📋 All Twilio Variables:');
console.log(`TWILIO_ACCOUNT_SID: ${process.env.TWILIO_ACCOUNT_SID ? 'SET ✅' : 'NOT SET ❌'}`);
console.log(`TWILIO_AUTH_TOKEN: ${process.env.TWILIO_AUTH_TOKEN ? 'SET ✅' : 'NOT SET ❌'}`);
console.log(`TWILIO_WHATSAPP_FROM: ${process.env.TWILIO_WHATSAPP_FROM || 'NOT SET ❌'}`);

console.log('\n📋 WhatsApp Business API Variables:');
console.log(`WHATSAPP_API_URL: ${process.env.WHATSAPP_API_URL ? 'SET ✅' : 'NOT SET ❌'}`);
console.log(`WHATSAPP_API_TOKEN: ${process.env.WHATSAPP_API_TOKEN ? 'SET ✅' : 'NOT SET ❌'}`);

console.log('\n📋 Other Variables:');
console.log(`NODE_ENV: ${process.env.NODE_ENV || 'NOT SET'}`);
console.log(`PORT: ${process.env.PORT || 'NOT SET'}`);

console.log('\n🔧 Values (first 10 chars):');
if (process.env.TWILIO_ACCOUNT_SID) {
  console.log(`TWILIO_ACCOUNT_SID: ${process.env.TWILIO_ACCOUNT_SID.substring(0, 10)}...`);
}
if (process.env.TWILIO_AUTH_TOKEN) {
  console.log(`TWILIO_AUTH_TOKEN: ${process.env.TWILIO_AUTH_TOKEN.substring(0, 10)}...`);
}

console.log('\n🧪 Testing Twilio Initialization:');
try {
  const TWILIO_ACCOUNT_SID = process.env.TWILIO_ACCOUNT_SID;
  const TWILIO_AUTH_TOKEN = process.env.TWILIO_AUTH_TOKEN;
  
  if (TWILIO_ACCOUNT_SID && TWILIO_AUTH_TOKEN) {
    console.log('✅ Twilio credentials found - attempting to initialize...');
    
    // Try to import and initialize Twilio
    const twilio = await import('twilio');
    const client = twilio.default(TWILIO_ACCOUNT_SID, TWILIO_AUTH_TOKEN);
    
    console.log('✅ Twilio client created successfully!');
    console.log('🎯 The issue is NOT with credentials');
    
  } else {
    console.log('❌ Twilio credentials missing');
    console.log('🎯 The issue IS with missing environment variables');
  }
} catch (error) {
  console.error('❌ Error testing Twilio:', error.message);
}

console.log('\n================================');
console.log('🏁 Debug completed!');
