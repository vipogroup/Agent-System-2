import twilio from 'twilio';
import fetch from 'node-fetch';
import { CronJob } from 'cron';
import logger from './logger.js';

// 🔧 WhatsApp Service Configuration
const TWILIO_ACCOUNT_SID = process.env.TWILIO_ACCOUNT_SID;
const TWILIO_AUTH_TOKEN = process.env.TWILIO_AUTH_TOKEN;
const TWILIO_WHATSAPP_FROM = process.env.TWILIO_WHATSAPP_FROM || 'whatsapp:+14155238886';

// Alternative WhatsApp Business API
const WHATSAPP_API_URL = process.env.WHATSAPP_API_URL;
const WHATSAPP_API_TOKEN = process.env.WHATSAPP_API_TOKEN;

// Daily report settings
const DAILY_REPORT_TIME = process.env.DAILY_REPORT_TIME || '20:00';
const DAILY_REPORT_TIMEZONE = process.env.DAILY_REPORT_TIMEZONE || 'Asia/Jerusalem';

let twilioClient = null;

// Initialize Twilio client
function initTwilio() {
  if (TWILIO_ACCOUNT_SID && TWILIO_AUTH_TOKEN) {
    twilioClient = twilio(TWILIO_ACCOUNT_SID, TWILIO_AUTH_TOKEN);
    console.log('✅ Twilio WhatsApp service initialized');
    return true;
  }
  console.log('⚠️ Twilio credentials not found, using alternative method');
  return false;
}

// 📱 Format phone number for WhatsApp
function formatPhoneForWhatsApp(phone) {
  // Remove all non-digits
  let cleanPhone = phone.replace(/\D/g, '');
  
  // If starts with 0, replace with 972 (Israel country code)
  if (cleanPhone.startsWith('0')) {
    cleanPhone = '972' + cleanPhone.substring(1);
  }
  
  // If doesn't start with country code, add 972
  if (!cleanPhone.startsWith('972')) {
    cleanPhone = '972' + cleanPhone;
  }
  
  return `whatsapp:+${cleanPhone}`;
}

// 🚀 Send WhatsApp message via Twilio
async function sendViaTwilio(to, message) {
  try {
    if (!twilioClient) {
      throw new Error('Twilio client not initialized');
    }

    const result = await twilioClient.messages.create({
      body: message,
      from: TWILIO_WHATSAPP_FROM,
      to: formatPhoneForWhatsApp(to)
    });

    logger.whatsappSent(to, 'twilio', result.sid);
    return { success: true, messageId: result.sid, service: 'twilio' };
  } catch (error) {
    logger.whatsappFailed(to, 'twilio', error);
    return { success: false, error: error.message, service: 'twilio' };
  }
}

// 🌐 Send WhatsApp message via Business API
async function sendViaBusinessAPI(to, message) {
  try {
    if (!WHATSAPP_API_URL || !WHATSAPP_API_TOKEN) {
      throw new Error('WhatsApp Business API credentials not configured');
    }

    const response = await fetch(WHATSAPP_API_URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${WHATSAPP_API_TOKEN}`
      },
      body: JSON.stringify({
        messaging_product: 'whatsapp',
        to: formatPhoneForWhatsApp(to).replace('whatsapp:+', ''),
        type: 'text',
        text: {
          body: message
        }
      })
    });

    const result = await response.json();
    
    if (response.ok) {
      logger.whatsappSent(to, 'business-api', result.messages?.[0]?.id);
      return { success: true, messageId: result.messages?.[0]?.id, service: 'business-api' };
    } else {
      throw new Error(result.error?.message || 'Business API error');
    }
  } catch (error) {
    logger.whatsappFailed(to, 'business-api', error);
    return { success: false, error: error.message, service: 'business-api' };
  }
}

// 📲 Main function to send WhatsApp message
export async function sendWhatsAppMessage(phone, message) {
  console.log(`📱 Sending WhatsApp to ${phone}: ${message.substring(0, 50)}...`);
  
  // Try Twilio first
  if (twilioClient) {
    const result = await sendViaTwilio(phone, message);
    if (result.success) {
      return result;
    }
  }
  
  // Fallback to Business API
  if (WHATSAPP_API_URL && WHATSAPP_API_TOKEN) {
    const result = await sendViaBusinessAPI(phone, message);
    if (result.success) {
      return result;
    }
  }
  
  // If both fail, log the message (for development/testing)
  console.log('📝 WhatsApp message (not sent - no service available):');
  console.log(`To: ${phone}`);
  console.log(`Message: ${message}`);
  console.log('---');
  
  return { 
    success: false, 
    error: 'No WhatsApp service available',
    service: 'none',
    phone,
    message 
  };
}

// 📊 Generate daily report message
export function generateDailyReportMessage(agent, todayVisits, todayCommissions) {
  const today = new Date().toLocaleDateString('he-IL');
  
  return `🔥 עדכון יומי - ${today}

שלום ${agent.full_name}! 👋

📈 הסטטיסטיקות שלך היום:
👥 ביקורים חדשים: ${todayVisits}
🔗 דרך הלינק שלך: ${process.env.SITE_URL || 'האתר'}/vc/?ref=${agent.referral_code}
💰 עמלות שצברת היום: ₪${todayCommissions.toFixed(2)}
📊 סה"כ עמלות: ₪${(agent.totalCommissions || 0).toFixed(2)}

${todayVisits > 0 ? 'המשך כך! 💪' : 'בואו נעבוד קצת יותר מחר! 🚀'}

בהצלחה,
צוות המכירות 🎯`;
}

// 🎉 Generate sale notification message
export function generateSaleNotificationMessage(agent, saleAmount, commission, referralCode) {
  const now = new Date().toLocaleString('he-IL');
  
  return `🎉 מזל טוב! יש לך מכירה חדשה!

💰 סכום הרכישה: ₪${saleAmount.toFixed(2)}
🤑 העמלה שלך: ₪${commission.toFixed(2)} (${(commission/saleAmount*100).toFixed(1)}%)
📅 תאריך ושעה: ${now}
🔗 דרך הקוד שלך: ${referralCode}

📊 סטטיסטיקות מעודכנות:
💵 סה"כ עמלות: ₪${(agent.totalCommissions || 0).toFixed(2)}
📈 סה"כ מכירות: ${agent.sales || 0}

כל הכבוד! המשך כך! 🚀🔥

צוות המכירות 🎯`;
}

// 🎉 Generate welcome message for new agent
export function generateWelcomeMessage(agent) {
  const loginUrl = process.env.NODE_ENV === 'production' 
    ? 'https://agent-system-2.onrender.com/agent-login.html'
    : 'http://localhost:10000/agent-login.html';
    
  const salesUrl = process.env.NODE_ENV === 'production'
    ? `https://agent-system-2.onrender.com/vc/?ref=${agent.referral_code}`
    : `http://localhost:10000/vc/?ref=${agent.referral_code}`;

  return `🎉 ברוך הבא למערכת הסוכנים! 

שלום ${agent.full_name}! 👋

🎯 ההרשמה שלך הושלמה בהצלחה!

📋 פרטי החשבון שלך:
👤 שם: ${agent.full_name}
📧 מייל: ${agent.email}
🔗 קוד הפניה: ${agent.referral_code}

🚀 איך להתחיל:
1️⃣ היכנס לדשבורד שלך: ${loginUrl}
2️⃣ שתף את קישור המכירות שלך: ${salesUrl}
3️⃣ קבל 10% עמלה מכל מכירה!

💡 טיפים להצלחה:
• שתף את הקישור ברשתות החברתיות
• ספר לחברים ומשפחה על המוצר
• השתמש בכפתורי השיתוף בדשבורד

📱 תמיכה: אם יש שאלות, פנה אלינו בכל עת!

בהצלחה! 🚀💰

צוות מערכת הסוכנים 🎯`;
}

// 📅 Send daily reports to all active agents
export async function sendDailyReports(agents, getAgentTodayStats) {
  console.log('📊 Starting daily reports...');
  
  const activeAgents = agents.filter(agent => agent.is_active && agent.phone);
  
  if (activeAgents.length === 0) {
    console.log('⚠️ No active agents with phone numbers found');
    return;
  }
  
  const results = [];
  
  for (const agent of activeAgents) {
    try {
      // Get today's statistics for this agent
      const todayStats = getAgentTodayStats(agent.id);
      
      // Generate message
      const message = generateDailyReportMessage(
        agent, 
        todayStats.visits, 
        todayStats.commissions
      );
      
      // Send WhatsApp message
      const result = await sendWhatsAppMessage(agent.phone, message);
      
      results.push({
        agent: agent.full_name,
        phone: agent.phone,
        success: result.success,
        service: result.service,
        error: result.error
      });
      
      // Add delay between messages to avoid rate limiting
      await new Promise(resolve => setTimeout(resolve, 1000));
      
    } catch (error) {
      console.error(`❌ Error sending daily report to ${agent.full_name}:`, error);
      results.push({
        agent: agent.full_name,
        phone: agent.phone,
        success: false,
        error: error.message
      });
    }
  }
  
  console.log('📊 Daily reports completed:', results);
  return results;
}

// 🕐 Setup daily report cron job
export function setupDailyReportCron(agents, getAgentTodayStats) {
  // Parse time (format: "HH:MM")
  const [hour, minute] = DAILY_REPORT_TIME.split(':').map(Number);
  
  // Create cron pattern: "minute hour * * *" (every day at specified time)
  const cronPattern = `${minute} ${hour} * * *`;
  
  console.log(`⏰ Setting up daily reports cron job: ${cronPattern} (${DAILY_REPORT_TIMEZONE})`);
  
  const job = new CronJob(
    cronPattern,
    () => {
      console.log('⏰ Daily report cron job triggered');
      sendDailyReports(agents, getAgentTodayStats);
    },
    null,
    true, // Start immediately
    DAILY_REPORT_TIMEZONE
  );
  
  console.log(`✅ Daily reports scheduled for ${DAILY_REPORT_TIME} (${DAILY_REPORT_TIMEZONE})`);
  return job;
}

// 🚀 Initialize WhatsApp service
export function initWhatsAppService() {
  console.log('🚀 Initializing WhatsApp service...');
  
  const twilioInitialized = initTwilio();
  const businessAPIConfigured = !!(WHATSAPP_API_URL && WHATSAPP_API_TOKEN);
  
  if (!twilioInitialized && !businessAPIConfigured) {
    console.log('⚠️ No WhatsApp service configured. Messages will be logged only.');
    console.log('💡 To enable WhatsApp notifications:');
    console.log('   1. Set up Twilio: TWILIO_ACCOUNT_SID, TWILIO_AUTH_TOKEN');
    console.log('   2. Or set up Business API: WHATSAPP_API_URL, WHATSAPP_API_TOKEN');
  }
  
  return {
    twilio: twilioInitialized,
    businessAPI: businessAPIConfigured,
    available: twilioInitialized || businessAPIConfigured
  };
}

// Export service status
export function getWhatsAppServiceStatus() {
  return {
    twilio: {
      configured: !!(TWILIO_ACCOUNT_SID && TWILIO_AUTH_TOKEN),
      client: !!twilioClient
    },
    businessAPI: {
      configured: !!(WHATSAPP_API_URL && WHATSAPP_API_TOKEN)
    },
    dailyReports: {
      time: DAILY_REPORT_TIME,
      timezone: DAILY_REPORT_TIMEZONE
    }
  };
}
