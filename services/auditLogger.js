// Audit Logging Service
const fs = require('fs').promises;
const path = require('path');

// 📁 יצירת תיקיית לוגים
const LOGS_DIR = path.join(__dirname, '..', 'logs');
const AUDIT_LOG_FILE = path.join(LOGS_DIR, 'audit.log');
const SECURITY_LOG_FILE = path.join(LOGS_DIR, 'security.log');

// 🔧 אתחול תיקיית לוגים
const initLogsDirectory = async () => {
  try {
    await fs.access(LOGS_DIR);
  } catch (error) {
    await fs.mkdir(LOGS_DIR, { recursive: true });
    console.log('📁 Logs directory created');
  }
};

// 📝 פונקציה כללית לכתיבת לוגים
const writeLog = async (filename, logEntry) => {
  try {
    await initLogsDirectory();
    const logLine = JSON.stringify(logEntry) + '\n';
    await fs.appendFile(filename, logLine);
  } catch (error) {
    console.error('❌ Failed to write log:', error);
  }
};

// 🔍 רישום פעולות משתמשים (Audit Log)
const logUserAction = async (userId, action, status, req, metadata = {}) => {
  const logEntry = {
    timestamp: new Date().toISOString(),
    type: 'USER_ACTION',
    userId: userId || 'anonymous',
    action: action,
    status: status, // 'SUCCESS', 'FAILED', 'BLOCKED'
    ip: req?.ip || req?.connection?.remoteAddress || 'unknown',
    userAgent: req?.headers?.['user-agent'] || 'unknown',
    method: req?.method || 'unknown',
    url: req?.url || 'unknown',
    metadata: metadata
  };

  await writeLog(AUDIT_LOG_FILE, logEntry);
  
  // הדפס ללוג הקונסולה גם
  const statusEmoji = status === 'SUCCESS' ? '✅' : status === 'FAILED' ? '❌' : '🚫';
  console.log(`${statusEmoji} ${action}: User ${userId || 'anonymous'} from ${logEntry.ip}`);
};

// 🛡️ רישום אירועי אבטחה (Security Log)
const logSecurityEvent = async (eventType, severity, req, details = {}) => {
  const logEntry = {
    timestamp: new Date().toISOString(),
    type: 'SECURITY_EVENT',
    eventType: eventType, // 'SUSPICIOUS_REQUEST', 'RATE_LIMIT_EXCEEDED', 'INVALID_TOKEN', etc.
    severity: severity, // 'LOW', 'MEDIUM', 'HIGH', 'CRITICAL'
    ip: req?.ip || req?.connection?.remoteAddress || 'unknown',
    userAgent: req?.headers?.['user-agent'] || 'unknown',
    method: req?.method || 'unknown',
    url: req?.url || 'unknown',
    headers: req?.headers || {},
    body: req?.body || {},
    details: details
  };

  await writeLog(SECURITY_LOG_FILE, logEntry);
  
  // הדפס ללוג הקונסולה עם צבע לפי חומרה
  const severityEmoji = {
    'LOW': '🟡',
    'MEDIUM': '🟠', 
    'HIGH': '🔴',
    'CRITICAL': '🚨'
  };
  
  console.log(`${severityEmoji[severity] || '⚠️'} SECURITY: ${eventType} from ${logEntry.ip}`);
};

// 📊 קריאת לוגים לצורך ניתוח
const getAuditLogs = async (limit = 100, filter = {}) => {
  try {
    await initLogsDirectory();
    const data = await fs.readFile(AUDIT_LOG_FILE, 'utf8');
    const lines = data.trim().split('\n').filter(line => line);
    
    let logs = lines.map(line => {
      try {
        return JSON.parse(line);
      } catch (error) {
        return null;
      }
    }).filter(log => log !== null);

    // סינון לפי קריטריונים
    if (filter.userId) {
      logs = logs.filter(log => log.userId === filter.userId);
    }
    if (filter.action) {
      logs = logs.filter(log => log.action === filter.action);
    }
    if (filter.status) {
      logs = logs.filter(log => log.status === filter.status);
    }
    if (filter.fromDate) {
      logs = logs.filter(log => new Date(log.timestamp) >= new Date(filter.fromDate));
    }
    if (filter.toDate) {
      logs = logs.filter(log => new Date(log.timestamp) <= new Date(filter.toDate));
    }

    // מיון לפי זמן (החדשים ראשון) והגבלת כמות
    return logs
      .sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp))
      .slice(0, limit);
      
  } catch (error) {
    console.error('❌ Failed to read audit logs:', error);
    return [];
  }
};

// 🔒 קריאת לוגי אבטחה
const getSecurityLogs = async (limit = 100, severity = null) => {
  try {
    await initLogsDirectory();
    const data = await fs.readFile(SECURITY_LOG_FILE, 'utf8');
    const lines = data.trim().split('\n').filter(line => line);
    
    let logs = lines.map(line => {
      try {
        return JSON.parse(line);
      } catch (error) {
        return null;
      }
    }).filter(log => log !== null);

    // סינון לפי חומרה
    if (severity) {
      logs = logs.filter(log => log.severity === severity);
    }

    // מיון לפי זמן (החדשים ראשון) והגבלת כמות
    return logs
      .sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp))
      .slice(0, limit);
      
  } catch (error) {
    console.error('❌ Failed to read security logs:', error);
    return [];
  }
};

// 📈 סטטיסטיקות לוגים
const getLogStats = async () => {
  try {
    const auditLogs = await getAuditLogs(1000);
    const securityLogs = await getSecurityLogs(1000);
    
    const now = new Date();
    const last24h = new Date(now.getTime() - 24 * 60 * 60 * 1000);
    const last7d = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
    
    return {
      audit: {
        total: auditLogs.length,
        last24h: auditLogs.filter(log => new Date(log.timestamp) >= last24h).length,
        last7d: auditLogs.filter(log => new Date(log.timestamp) >= last7d).length,
        byStatus: {
          success: auditLogs.filter(log => log.status === 'SUCCESS').length,
          failed: auditLogs.filter(log => log.status === 'FAILED').length,
          blocked: auditLogs.filter(log => log.status === 'BLOCKED').length
        }
      },
      security: {
        total: securityLogs.length,
        last24h: securityLogs.filter(log => new Date(log.timestamp) >= last24h).length,
        last7d: securityLogs.filter(log => new Date(log.timestamp) >= last7d).length,
        bySeverity: {
          low: securityLogs.filter(log => log.severity === 'LOW').length,
          medium: securityLogs.filter(log => log.severity === 'MEDIUM').length,
          high: securityLogs.filter(log => log.severity === 'HIGH').length,
          critical: securityLogs.filter(log => log.severity === 'CRITICAL').length
        }
      }
    };
  } catch (error) {
    console.error('❌ Failed to get log stats:', error);
    return null;
  }
};

// 🧹 ניקוי לוגים ישנים (לשמירה על מקום)
const cleanOldLogs = async (daysToKeep = 30) => {
  try {
    const cutoffDate = new Date();
    cutoffDate.setDate(cutoffDate.getDate() - daysToKeep);
    
    // ניקוי audit logs
    const auditLogs = await getAuditLogs(10000);
    const filteredAuditLogs = auditLogs.filter(log => 
      new Date(log.timestamp) >= cutoffDate
    );
    
    // כתיבה מחדש של הקובץ
    const auditContent = filteredAuditLogs.map(log => JSON.stringify(log)).join('\n') + '\n';
    await fs.writeFile(AUDIT_LOG_FILE, auditContent);
    
    // ניקוי security logs
    const securityLogs = await getSecurityLogs(10000);
    const filteredSecurityLogs = securityLogs.filter(log => 
      new Date(log.timestamp) >= cutoffDate
    );
    
    const securityContent = filteredSecurityLogs.map(log => JSON.stringify(log)).join('\n') + '\n';
    await fs.writeFile(SECURITY_LOG_FILE, securityContent);
    
    console.log(`🧹 Cleaned logs older than ${daysToKeep} days`);
    
  } catch (error) {
    console.error('❌ Failed to clean old logs:', error);
  }
};

module.exports = {
  logUserAction,
  logSecurityEvent,
  getAuditLogs,
  getSecurityLogs,
  getLogStats,
  cleanOldLogs
};
