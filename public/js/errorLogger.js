class ErrorLogger {
  constructor() {
    this.logs = [];
    this.maxLogs = 100; // Limit number of stored logs
    this.initialize();
  }

  initialize() {
    // Load existing logs from localStorage
    const savedLogs = localStorage.getItem('errorLogs');
    if (savedLogs) {
      try {
        this.logs = JSON.parse(savedLogs).slice(0, this.maxLogs);
      } catch (e) {
        console.error('Failed to load error logs:', e);
      }
    }
    
    // Override console.error
    const originalError = console.error;
    console.error = (...args) => {
      this.log('error', args.join(' '));
      originalError.apply(console, args);
    };

    // Catch unhandled promise rejections
    window.addEventListener('unhandledrejection', (event) => {
      this.log('unhandledRejection', event.reason?.message || 'Unknown error');
    });

    // Catch global errors
    window.addEventListener('error', (event) => {
      this.log('globalError', {
        message: event.message,
        source: event.filename,
        line: event.lineno,
        col: event.colno
      });
    });
  }

  log(level, message, details = {}) {
    const timestamp = new Date().toISOString();
    const errorId = 'err_' + Math.random().toString(36).substr(2, 9);
    const logEntry = {
      id: errorId,
      timestamp,
      level,
      message: typeof message === 'object' ? JSON.stringify(message) : message,
      details: typeof details === 'object' ? JSON.stringify(details) : details,
      page: window.location.href,
      userAgent: navigator.userAgent
    };

    this.logs.unshift(logEntry);
    if (this.logs.length > this.maxLogs) {
      this.logs.pop();
    }

    // Save to localStorage
    try {
      localStorage.setItem('errorLogs', JSON.stringify(this.logs));
    } catch (e) {
      console.error('Failed to save error logs:', e);
    }

    return errorId;
  }

  getLogs(limit = 50) {
    return this.logs.slice(0, limit);
  }

  clearLogs() {
    this.logs = [];
    localStorage.removeItem('errorLogs');
  }

  // Create a visual error console in the UI
  createErrorConsole() {
    const consoleElement = document.createElement('div');
    consoleElement.id = 'errorConsole';
    consoleElement.style.cssText = `
      position: fixed;
      bottom: 0;
      right: 0;
      width: 100%;
      max-width: 600px;
      max-height: 300px;
      overflow-y: auto;
      background: rgba(0,0,0,0.9);
      color: #fff;
      padding: 10px;
      font-family: monospace;
      font-size: 12px;
      z-index: 9999;
      border-top: 2px solid #ff4444;
      display: none;
    `;

    const toggleButton = document.createElement('button');
    toggleButton.textContent = 'הצג/הסתר שגיאות';
    toggleButton.style.cssText = `
      position: fixed;
      bottom: 10px;
      right: 10px;
      z-index: 10000;
      padding: 5px 10px;
      background: #ff4444;
      color: white;
      border: none;
      border-radius: 3px;
      cursor: pointer;
    `;

    toggleButton.addEventListener('click', () => {
      consoleElement.style.display = consoleElement.style.display === 'none' ? 'block' : 'none';
    });

    document.body.appendChild(consoleElement);
    document.body.appendChild(toggleButton);

    // Update the console with current logs
    this.updateConsole();
  }

  updateConsole() {
    const consoleElement = document.getElementById('errorConsole');
    if (!consoleElement) return;

    const logs = this.getLogs();
    consoleElement.innerHTML = `
      <div style="display: flex; justify-content: space-between; margin-bottom: 10px;">
        <strong>יומן שגיאות (${logs.length})</strong>
        <button onclick="errorLogger.clearLogs()" style="margin-left: 10px;">נקה הכל</button>
      </div>
      <div style="max-height: 250px; overflow-y: auto;">
        ${logs.map(log => `
          <div style="margin-bottom: 8px; padding: 5px; border-bottom: 1px solid #333;">
            <div><strong>${new Date(log.timestamp).toLocaleString()}</strong> [${log.level.toUpperCase()}]</div>
            <div>${log.message}</div>
            ${log.details ? `<div style="color: #aaa; font-size: 0.9em;">${log.details}</div>` : ''}
          </div>
        `).join('')}
        ${logs.length === 0 ? '<div>אין שגיאות נוכחיות</div>' : ''}
      </div>
    `;
  }
}

// Initialize error logger
const errorLogger = new ErrorLogger();

// Export for global access
window.errorLogger = errorLogger;

// Auto-initialize error console removed to prevent duplicate listeners
// Error console will be initialized by admin.js when needed
