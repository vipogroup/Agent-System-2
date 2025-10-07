const API = window.location.origin;

// Log initialization
try {
  if (!window.errorLogger) {
    console.warn('Error logger not found. Make sure errorLogger.js is loaded before admin.js');
  }
} catch (e) {
  console.error('Failed to initialize error logging:', e);
}
function getToken(){ return localStorage.getItem('token_admin'); }
function saveToken(t){ localStorage.setItem('token_admin', t); }

async function loginAdmin(){
  try {
    const email = document.getElementById('emailA').value;
    const password = document.getElementById('passwordA').value;
    
    if (!email || !password) {
      alert('נא למלא אימייל וסיסמה');
      return;
    }
    
    console.log('Attempting admin login with:', { email, password });
    
    const response = await fetch(`${API}/api/agents/login`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ email, password })
    });
    
    console.log('Response status:', response.status);
    const data = await response.json();
    console.log('Response data:', data);
    
    if (!response.ok) {
      // If admin doesn't exist, try to create it first
      if (data.error === 'Invalid credentials' && email === 'admin@example.com') {
        console.log('Admin not found, trying to register...');
        
        try {
          // Try to register admin user
          const registerResponse = await fetch(`${API}/api/agents/register`, {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
            },
            body: JSON.stringify({ 
              email: 'admin@example.com', 
              password: 'admin123',
              full_name: 'Admin User'
            })
          });
          
          const registerData = await registerResponse.json();
          console.log('Register response:', registerData);
          
          if (registerResponse.ok && registerData.agent?.role === 'admin') {
            // Registration successful and user is admin
            localStorage.setItem('adminToken', registerData.token);
            alert('משתמש מנהל נוצר בהצלחה!');
            window.location.href = '/public/dashboard-admin.html';
            return;
          } else if (registerResponse.status === 400 && registerData.error === 'Email already registered') {
            // User exists but password might be wrong
            alert('המשתמש קיים אבל הסיסמה שגויה. נסה שוב.');
          } else {
            console.error('Registration failed:', registerData);
            alert('שגיאה ביצירת משתמש מנהל: ' + (registerData.error || 'שגיאה לא ידועה'));
          }
        } catch (regError) {
          console.error('Registration error:', regError);
          alert('שגיאה ביצירת משתמש מנהל');
        }
      }
      
      throw new Error(data.error || 'שגיאה בהתחברות');
    }
    
    // Check if user is admin
    if (data.agent?.role !== 'admin' && email !== 'admin@example.com') {
      throw new Error('אין לך הרשאות מנהל');
    }
    
    localStorage.setItem('adminToken', data.token);
    // Redirect to admin dashboard
    window.location.href = '/public/dashboard-admin.html';
    
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
    
    // תזמון הרענון הבא
    setTimeout(loadAgents, AGENTS_REFRESH_INTERVAL);
    
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
    setTimeout(loadAgents, 30000);
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

window.addEventListener('DOMContentLoaded', () => {
  const token = getToken();
  
  if (window.location.pathname.includes('dashboard-admin.html')) {
    if (!token) {
      window.location.href = '/public/dashboard-admin.html';
      return;
    }
    
    // Load data for admin dashboard
    loadPendingPayouts();
    loadAgents();
    
    // Set up refresh every 30 seconds
    setInterval(() => {
      loadPendingPayouts();
      loadAgents();
    }, 30000);
  } else {
    // Login page
    document.getElementById('btnLoginA').addEventListener('click', loginAdmin);
  }
});
