const API = window.location.origin;

// Log initialization
try {
  if (!window.errorLogger) {
    console.warn('Error logger not found. Make sure errorLogger.js is loaded before admin.js');
    // Create a simple fallback error logger
    window.errorLogger = {
      log: function(level, message, data) {
        console.log(`[${level}] ${message}`, data);
        return Date.now().toString();
      },
      createErrorConsole: function() {
        console.log('Error console created (fallback)');
      },
      getLogs: function() {
        return [];
      }
    };
  }
} catch (e) {
  console.error('Failed to initialize error logging:', e);
}
function getToken(){ return localStorage.getItem('token_admin'); }
function saveToken(t){ localStorage.setItem('token_admin', t); }

// פונקציות לשמירת והחזרת פרטי התחברות
function saveCredentials(email, password) {
  localStorage.setItem('saved_admin_email', email);
  localStorage.setItem('saved_admin_password', btoa(password)); // הצפנה בסיסית
  localStorage.setItem('remember_admin', 'true');
}

function getSavedCredentials() {
  const remember = localStorage.getItem('remember_admin');
  if (remember === 'true') {
    const email = localStorage.getItem('saved_admin_email');
    const password = localStorage.getItem('saved_admin_password');
    return {
      email: email || '',
      password: password ? atob(password) : '' // פענוח
    };
  }
  return { email: '', password: '' };
}

function clearSavedCredentials() {
  localStorage.removeItem('saved_admin_email');
  localStorage.removeItem('saved_admin_password');
  localStorage.removeItem('remember_admin');
}

async function loginAdmin(){
  try {
    const email = document.getElementById('emailA').value;
    const password = document.getElementById('passwordA').value;
    const rememberMe = document.getElementById('rememberMe').checked;
    
    if (!email) {
      alert('נא למלא אימייל');
      return;
    }
    
    // זמני - כניסה ישירה למנהל עם כל אימייל
    console.log('Direct admin access for:', email);
    
    // יצירת טוקן זמני
    const tempToken = 'temp_admin_token_' + Date.now();
    saveToken(tempToken);
    
    // שמירת פרטי התחברות אם המשתמש בחר "זכור אותי"
    if (rememberMe) {
      saveCredentials(email, password || 'temp');
    } else {
      clearSavedCredentials();
    }
    
    alert('כניסה זמנית למנהל - ללא בדיקת סיסמה');
    
    // Redirect to admin dashboard
    window.location.href = '/public/admin-dashboard.html';
    
  } catch (error) {
    console.error('Login error:', error);
    alert(error.message || 'אירעה שגיאה בהתחברות');
  }
}

async function loadPendingPayouts(){
  try {
    const token = getToken();
    const res = await fetch('/api/payouts/pending',{headers:{Authorization:'Bearer '+token}});
    const data = await res.json();
    const list = document.getElementById('pending');
    list.innerHTML = (data.items||[]).map(p=>`<div class="card">
      <div>סוכן #${p.agent_id} | בקשה #${p.id} | סכום: <b>${p.amount.toFixed(2)} ₪</b> | סטטוס: ${p.status}</div>
      <button onclick="approve(${p.id})">אשר</button>
      <button onclick="markPaid(${p.id})">סמן שולם</button>
    </div>`).join('');
  } catch (error) {
    const errorId = errorLogger.log('error', 'Failed to load pending payouts', { error: error.message });
    console.error('Error loading pending payouts:', error);
    document.getElementById('pending').innerHTML = `
      <div class="error-message">
        שגיאה בטעינת בקשות תשלום. 
        <a href="#" onclick="errorLogger.createErrorConsole(); return false;">הצג פרטים</a>
        <span style="color: #999; font-size: 0.9em;">(קוד שגיאה: ${errorId})</span>
      </div>`;
  }
}

// משתנה למעקב אחר זמן הבקשה האחרונה
let lastAgentsLoadTime = 0;
let refreshInterval;
const AGENTS_REFRESH_INTERVAL = 30000; // 30 שניות בין רענונים

async function loadAgents() {
  try {
    // בדיקה מתי הייתה הבקשה האחרונה
    const now = Date.now();
    if (now - lastAgentsLoadTime < 10000) { // הגבלת תדירות ל-10 שניות
      console.log('ממתין בין בקשות...');
      return;
    }
    
    lastAgentsLoadTime = now;
    
    const token = getToken();
    if (!token) {
      console.error('No token found');
      return;
    }
    
    console.log('טוען רשימת סוכנים...');
    const response = await fetch(`${API}/admin/agents`, {
      headers: { 
        'Authorization': 'Bearer ' + token,
        'Cache-Control': 'no-cache',
        'Pragma': 'no-cache'
      },
      cache: 'no-store'
    });
    
    if (response.status === 429) {
      const retryAfter = response.headers.get('Retry-After') || 30;
      console.warn(`יותר מדי בקשות. מנסה שוב בעוד ${retryAfter} שניות`);
      setTimeout(loadAgents, retryAfter * 1000);
      return;
    }
    
    if (!response.ok) {
      throw new Error(`שגיאת שרת: ${response.status} ${response.statusText}`);
    }
    
    const data = await response.json();
    const agentsList = document.getElementById('agentsList');
    
    if (!data || !Array.isArray(data.items)) {
      throw new Error('פורמט תגובה לא תקין מהשרת');
    }
    
    if (data.items.length > 0) {
      const table = `
        <div style="overflow-x:auto;">
          <table style="width: 100%; border-collapse: collapse; margin-top: 10px; min-width: 800px;">
            <thead>
              <tr style="background-color: #f8f9fa; border-bottom: 2px solid #dee2e6;">
                <th style="padding: 10px; text-align: right;">שם מלא</th>
                <th style="padding: 10px; text-align: right;">אימייל</th>
                <th style="padding: 10px; text-align: right;">קוד הפניה</th>
                <th style="padding: 10px; text-align: right;">סטטוס</th>
                <th style="padding: 10px; text-align: right;">תאריך הצטרפות</th>
              </tr>
            </thead>
            <tbody>
              ${data.items.map(agent => `
                <tr style="border-bottom: 1px solid #dee2e6;">
                  <td style="padding: 10px;">${escapeHtml(agent.full_name) || '-'}</td>
                  <td style="padding: 10px;">${escapeHtml(agent.email)}</td>
                  <td style="padding: 10px;">${escapeHtml(agent.referral_code) || '-'}</td>
                  <td style="padding: 10px;">${agent.is_active ? 'פעיל' : 'לא פעיל'}</td>
                  <td style="padding: 10px;">${agent.created_at ? new Date(agent.created_at).toLocaleDateString('he-IL') : '-'}</td>
                </tr>
              `).join('')}
            </tbody>
          </table>
        </div>
      `;
      agentsList.innerHTML = table;
    } else {
      agentsList.innerHTML = '<p>אין סוכנים רשומים במערכת</p>';
    }
    
    // תזמון הרענון הבא - רק אם אין רענון פעיל
    if (refreshInterval) {
      clearTimeout(refreshInterval);
    }
    refreshInterval = setTimeout(loadAgents, AGENTS_REFRESH_INTERVAL);
    
  } catch (error) {
    const errorId = errorLogger.log('error', 'Failed to load agents', { 
      error: error.message,
      stack: error.stack 
    });
    
    console.error('שגיאה בטעינת סוכנים:', error);
    const errorMessage = error.message || 'שגיאה לא ידועה';
    document.getElementById('agentsList').innerHTML = `
      <div style="color: #e74c3c; padding: 15px; background: #fde8e8; border-radius: 4px; margin: 10px 0;">
        שגיאה בטעינת רשימת הסוכנים: ${escapeHtml(errorMessage)}
        <div style="margin-top: 10px;">
          <button onclick="loadAgents()" style="margin-left: 10px; background: #e74c3c; color: white; border: none; padding: 5px 10px; border-radius: 3px; cursor: pointer;">נסה שוב</button>
          <a href="#" onclick="errorLogger.createErrorConsole(); return false;" style="color: #2980b9; text-decoration: none; font-size: 0.9em;">הצג פרטי שגיאה</a>
          <span style="color: #999; font-size: 0.9em; margin-right: 10px;">(קוד שגיאה: ${errorId})</span>
        </div>
      </div>`;
    
    // ננסה שוב אחרי 30 שניות במקרה של שגיאה
    if (refreshInterval) {
      clearTimeout(refreshInterval);
    }
    refreshInterval = setTimeout(loadAgents, 30000);
  }
}

// פונקציית עזר למניעת XSS
function escapeHtml(unsafe) {
  if (unsafe === null || unsafe === undefined) return '';
  return String(unsafe)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#039;");
}

async function approve(id){
  const token = getToken();
  const res = await fetch(`/api/payouts/${id}/approve`,{method:'POST',headers:{Authorization:'Bearer '+token}});
  await res.json();
  loadPendingPayouts();
}
async function markPaid(id){
  const token = getToken();
  const res = await fetch(`/api/payouts/${id}/mark-paid`,{method:'POST',headers:{Authorization:'Bearer '+token}});
  await res.json();
  loadPendingPayouts();
}

// עצור את כל הרענונים האוטומטיים בעת סגירת הדף
window.addEventListener('beforeunload', () => {
  if (refreshInterval) {
    clearTimeout(refreshInterval);
  }
});

// פונקציית עזר ליצירת error badge
function createErrorBadge() {
  const errors = errorLogger.getLogs().filter(log => log.level === 'error' || log.level === 'unhandledRejection');
  const errorCount = errors.length;
  
  let badge = document.getElementById('errorBadge');
  if (!badge && errorCount > 0) {
    const header = document.querySelector('header');
    if (header) {
      badge = document.createElement('span');
      badge.id = 'errorBadge';
      badge.style.cssText = 'background: #e74c3c; color: white; border-radius: 50%; width: 20px; height: 20px; display: inline-flex; align-items: center; justify-content: center; margin-right: 10px; font-size: 12px;';
      header.insertBefore(badge, header.firstChild);
    }
  }
  
  if (badge) {
    if (errorCount > 0) {
      badge.textContent = errorCount > 9 ? '9+' : errorCount;
      badge.style.display = 'inline-flex';
    } else {
      badge.style.display = 'none';
    }
  }
}

// פונקציה לטעינת פרטי התחברות שמורים
function loadSavedCredentials() {
  const savedCreds = getSavedCredentials();
  if (savedCreds.email || savedCreds.password) {
    const emailInput = document.getElementById('emailA');
    const passwordInput = document.getElementById('passwordA');
    const rememberCheckbox = document.getElementById('rememberMe');
    
    if (emailInput) emailInput.value = savedCreds.email;
    if (passwordInput) passwordInput.value = savedCreds.password;
    if (rememberCheckbox) rememberCheckbox.checked = true;
  }
}

// פונקציה להוספת כפתור יציאה
function addLogoutButton() {
  const header = document.querySelector('header h2');
  if (header && !document.getElementById('logoutBtn')) {
    const logoutBtn = document.createElement('button');
    logoutBtn.id = 'logoutBtn';
    logoutBtn.textContent = 'יציאה';
    logoutBtn.style.cssText = `
      position: absolute;
      top: 20px;
      left: 20px;
      background: #e74c3c;
      color: white;
      border: none;
      padding: 8px 15px;
      border-radius: 4px;
      cursor: pointer;
      font-size: 14px;
    `;
    logoutBtn.onclick = () => {
      if (confirm('האם אתה בטוח שברצונך להתנתק?')) {
        localStorage.removeItem('token_admin');
        clearSavedCredentials();
        window.location.href = '/public/dashboard-admin.html';
      }
    };
    header.parentElement.style.position = 'relative';
    header.parentElement.appendChild(logoutBtn);
  }
}

window.addEventListener('DOMContentLoaded', () => {
  const token = getToken();
  
  if (window.location.pathname.includes('admin-dashboard.html')) {
    if (!token) {
      window.location.href = '/public/dashboard-admin.html';
      return;
    }
    
    // הוספת כפתור יציאה
    addLogoutButton();
    
    // יצירת error console ו-badge
    if (window.errorLogger) {
      errorLogger.createErrorConsole();
      createErrorBadge();
    }
    
    // Load data for admin dashboard
    loadPendingPayouts();
    loadAgents();
    
  } else {
    // Login page - טעינת פרטי התחברות שמורים
    loadSavedCredentials();
    
    const btnLoginA = document.getElementById('btnLoginA');
    if (btnLoginA) {
      btnLoginA.addEventListener('click', loginAdmin);
    }
    
    // הוספת אפשרות התחברות עם Enter
    const passwordInput = document.getElementById('passwordA');
    if (passwordInput) {
      passwordInput.addEventListener('keypress', (e) => {
        if (e.key === 'Enter') {
          loginAdmin();
        }
      });
    }
  }
});
