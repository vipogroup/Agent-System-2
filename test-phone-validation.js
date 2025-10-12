// Test script for Israeli phone number validation
console.log('📱 Testing Israeli phone number validation...\n');

// Updated regex from register-agent.html
const phoneRegex = /^(\+972|972|0)([23489]|5[0-9]|77)[0-9]{7}$/;

// Test cases - Israeli phone numbers
const testNumbers = [
    // Mobile numbers (should all pass)
    '0501234567', // Pelephone
    '0502345678', // Cellcom
    '0503456789', // Pelephone
    '0504567890', // Cellcom
    '0505678901', // Pelephone
    '0506789012', // Cellcom
    '0507890123', // Hot Mobile
    '0508901234', // Golan Telecom
    '0509012345', // Hot Mobile
    
    // The problematic ones that should now work:
    '0531234567', // Pelephone (was failing before)
    '0551234567', // Cellcom (was failing before)
    '0561234567', // Hot Mobile
    '0571234567', // Golan Telecom
    '0591234567', // Partner
    
    // Landline numbers
    '0212345678', // Jerusalem
    '0312345678', // Haifa
    '0412345678', // North
    '0771234567', // Special services
    '0891234567', // Premium services
    '0991234567', // Premium services
    
    // International format
    '+972501234567',
    '972501234567',
    '+972531234567', // This should now work
    '972551234567',  // This should now work
    
    // Invalid numbers (should fail)
    '0601234567', // Invalid prefix
    '0701234567', // Invalid prefix
    '050123456',  // Too short
    '05012345678', // Too long
    'abc1234567',  // Contains letters
];

console.log('Testing phone numbers:\n');

testNumbers.forEach(phone => {
    const cleanPhone = phone.replace(/[\s\-]/g, '');
    const isValid = phoneRegex.test(cleanPhone);
    const status = isValid ? '✅ VALID' : '❌ INVALID';
    console.log(`${status} - ${phone}`);
});

console.log('\n📊 Summary:');
const validCount = testNumbers.filter(phone => {
    const cleanPhone = phone.replace(/[\s\-]/g, '');
    return phoneRegex.test(cleanPhone);
}).length;

console.log(`Valid numbers: ${validCount}/${testNumbers.length}`);
console.log('\n✅ Phone validation test completed!');

// Test the specific problematic prefixes
console.log('\n🔍 Testing previously problematic prefixes:');
const problematicPrefixes = ['053', '055', '056', '057', '059'];
problematicPrefixes.forEach(prefix => {
    const testNumber = `${prefix}1234567`;
    const isValid = phoneRegex.test(testNumber);
    const status = isValid ? '✅ NOW WORKS' : '❌ STILL FAILS';
    console.log(`${status} - ${testNumber} (${prefix})`);
});
