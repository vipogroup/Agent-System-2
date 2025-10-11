import fs from 'fs';
import path from 'path';

// Logger configuration
const LOG_LEVELS = {
  ERROR: 0,
  WARN: 1,
  INFO: 2,
  DEBUG: 3
};

const LOG_COLORS = {
  ERROR: '\x1b[31m', // Red
  WARN: '\x1b[33m',  // Yellow
  INFO: '\x1b[36m',  // Cyan
  DEBUG: '\x1b[37m', // White
  RESET: '\x1b[0m'
};

class Logger {
  constructor() {
    this.logLevel = LOG_LEVELS[process.env.LOG_LEVEL] || LOG_LEVELS.INFO;
    this.logFile = path.join(process.cwd(), 'logs', 'whatsapp-system.log');
    this.maxLogSize = 10 * 1024 * 1024; // 10MB
    this.maxLogFiles = 5;
    
    // Ensure logs directory exists
    this.ensureLogDirectory();
  }

  ensureLogDirectory() {
    const logDir = path.dirname(this.logFile);
    if (!fs.existsSync(logDir)) {
      fs.mkdirSync(logDir, { recursive: true });
    }
  }

  formatMessage(level, message, data = null) {
    const timestamp = new Date().toISOString();
    const formattedMessage = `[${timestamp}] [${level}] ${message}`;
    
    if (data) {
      return `${formattedMessage} ${JSON.stringify(data)}`;
    }
    
    return formattedMessage;
  }

  writeToFile(message) {
    try {
      // Check if log rotation is needed
      if (fs.existsSync(this.logFile)) {
        const stats = fs.statSync(this.logFile);
        if (stats.size > this.maxLogSize) {
          this.rotateLog();
        }
      }

      fs.appendFileSync(this.logFile, message + '\n');
    } catch (error) {
      console.error('Failed to write to log file:', error);
    }
  }

  rotateLog() {
    try {
      // Move current log files
      for (let i = this.maxLogFiles - 1; i > 0; i--) {
        const oldFile = `${this.logFile}.${i}`;
        const newFile = `${this.logFile}.${i + 1}`;
        
        if (fs.existsSync(oldFile)) {
          if (i === this.maxLogFiles - 1) {
            fs.unlinkSync(oldFile); // Delete oldest log
          } else {
            fs.renameSync(oldFile, newFile);
          }
        }
      }

      // Move current log to .1
      if (fs.existsSync(this.logFile)) {
        fs.renameSync(this.logFile, `${this.logFile}.1`);
      }
    } catch (error) {
      console.error('Failed to rotate log files:', error);
    }
  }

  log(level, message, data = null) {
    if (LOG_LEVELS[level] > this.logLevel) {
      return;
    }

    const formattedMessage = this.formatMessage(level, message, data);
    
    // Console output with colors
    const color = LOG_COLORS[level] || LOG_COLORS.RESET;
    console.log(`${color}${formattedMessage}${LOG_COLORS.RESET}`);
    
    // File output
    this.writeToFile(formattedMessage);
  }

  error(message, data = null) {
    this.log('ERROR', message, data);
  }

  warn(message, data = null) {
    this.log('WARN', message, data);
  }

  info(message, data = null) {
    this.log('INFO', message, data);
  }

  debug(message, data = null) {
    this.log('DEBUG', message, data);
  }

  // WhatsApp specific logging methods
  whatsappSent(phone, service, messageId = null) {
    this.info(`WhatsApp message sent`, {
      phone,
      service,
      messageId,
      timestamp: new Date().toISOString()
    });
  }

  whatsappFailed(phone, service, error) {
    this.error(`WhatsApp message failed`, {
      phone,
      service,
      error: error.message || error,
      timestamp: new Date().toISOString()
    });
  }

  dailyReportSent(agentCount, successCount, failedCount) {
    this.info(`Daily reports completed`, {
      totalAgents: agentCount,
      successful: successCount,
      failed: failedCount,
      timestamp: new Date().toISOString()
    });
  }

  saleNotification(agentName, amount, commission) {
    this.info(`Sale notification sent`, {
      agent: agentName,
      saleAmount: amount,
      commission,
      timestamp: new Date().toISOString()
    });
  }

  visitTracked(agentName, referralCode, totalVisits, todayVisits) {
    this.debug(`Visit tracked`, {
      agent: agentName,
      referralCode,
      totalVisits,
      todayVisits,
      timestamp: new Date().toISOString()
    });
  }

  // Get recent logs for admin dashboard
  getRecentLogs(lines = 50) {
    try {
      if (!fs.existsSync(this.logFile)) {
        return [];
      }

      const content = fs.readFileSync(this.logFile, 'utf8');
      const logLines = content.trim().split('\n');
      
      return logLines.slice(-lines).reverse();
    } catch (error) {
      this.error('Failed to read log file', error);
      return [];
    }
  }

  // Clear old logs
  clearOldLogs(daysToKeep = 7) {
    try {
      const cutoffDate = new Date();
      cutoffDate.setDate(cutoffDate.getDate() - daysToKeep);

      // Clear main log file if it's too old
      if (fs.existsSync(this.logFile)) {
        const stats = fs.statSync(this.logFile);
        if (stats.mtime < cutoffDate) {
          fs.unlinkSync(this.logFile);
          this.info('Old log file cleared');
        }
      }

      // Clear rotated log files
      for (let i = 1; i <= this.maxLogFiles; i++) {
        const rotatedFile = `${this.logFile}.${i}`;
        if (fs.existsSync(rotatedFile)) {
          const stats = fs.statSync(rotatedFile);
          if (stats.mtime < cutoffDate) {
            fs.unlinkSync(rotatedFile);
            this.info(`Old rotated log file cleared: ${rotatedFile}`);
          }
        }
      }
    } catch (error) {
      this.error('Failed to clear old logs', error);
    }
  }
}

// Create singleton instance
const logger = new Logger();

export default logger;
