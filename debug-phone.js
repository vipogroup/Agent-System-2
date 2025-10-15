// Debug the specific phone number
const phoneRegex = /^(\+972|972|0)([23489]|5[0-9]|77)[0-9]{7}$/;
const testPhone = '0555580986';

console.log('🔍 Debugging phone number:', testPhone);
console.log('Length:', testPhone.length);
console.log('Regex pattern:', phoneRegex);
console.log('Test result:', phoneRegex.test(testPhone));

// Break down the number
console.log('\n📊 Number breakdown:');
console.log('Full number:', testPhone);
console.log('Prefix (first 3):', testPhone.substring(0, 3));
console.log('Remaining digits:', testPhone.substring(3));
console.log('Remaining length:', testPhone.substring(3).length);

// Test with regex parts
const match = testPhone.match(/^(\+972|972|0)([23489]|5[0-9]|77)([0-9]{7})$/);
console.log('\n🔍 Regex match result:', match);

if (match) {
    console.log('✅ Match found:');
    console.log('  Country/prefix:', match[1]);
    console.log('  Operator code:', match[2]);
    console.log('  Number:', match[3]);
} else {
    console.log('❌ No match - let\'s see why...');
    
    // Test each part separately
    const startsCorrect = /^(\+972|972|0)/.test(testPhone);
    console.log('Starts with correct prefix:', startsCorrect);
    
    if (startsCorrect) {
        const withoutPrefix = testPhone.replace(/^(\+972|972|0)/, '');
        console.log('Without prefix:', withoutPrefix);
        
        const operatorMatch = /^([23489]|5[0-9]|77)/.test(withoutPrefix);
        console.log('Operator code valid:', operatorMatch);
        
        if (operatorMatch) {
            const remaining = withoutPrefix.replace(/^([23489]|5[0-9]|77)/, '');
            console.log('Remaining after operator:', remaining);
            console.log('Remaining length:', remaining.length);
            console.log('Should be 7 digits:', /^[0-9]{7}$/.test(remaining));
        }
    }
}
