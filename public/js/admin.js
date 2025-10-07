const API = window.location.origin;
function getToken(){ return localStorage.getItem('adminToken'); }
function saveToken(t){ localStorage.setItem('adminToken', t); }

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
    console.error('Error loading pending payouts:', error);
    document.getElementById('pending').innerHTML = 'אין בקשות תשלום ממתינות';
  }
}

async function loadAgents() {
  try {
    console.log('מתחיל לטעון רשימת סוכנים...');
    const token = getToken();
    console.log('Token:', token ? 'קיים' : 'חסר');
    
    const response = await fetch('/admin/agents', {
      headers: { 'Authorization': 'Bearer ' + token }
    });
    
    console.log('תגובת שרת:', response.status, response.statusText);
    
    if (!response.ok) {
      const errorText = await response.text();
      console.error('שגיאה בתגובת השרת:', errorText);
      throw new Error(`שגיאה בטעינת סוכנים: ${response.status} ${response.statusText}`);
    }
    
    const data = await response.json();
    console.log('נתוני סוכנים שהתקבלו:', data);
    
    const agentsList = document.getElementById('agentsList');
    
    if (data.items && data.items.length > 0) {
      console.log(`נמצאו ${data.items.length} סוכנים`);
      const table = `
        <table style="width: 100%; border-collapse: collapse; margin-top: 10px;">
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
            ${data.items.map(agent => {
              console.log('סוכן:', agent);
              return `
                <tr style="border-bottom: 1px solid #dee2e6;">
                  <td style="padding: 10px;">${agent.full_name || '-'}</td>
                  <td style="padding: 10px;">${agent.email || 'ללא אימייל'}</td>
                  <td style="padding: 10px;">${agent.referral_code || '-'}</td>
                  <td style="padding: 10px;">${agent.is_active ? 'פעיל' : 'לא פעיל'}</td>
                  <td style="padding: 10px;">${agent.created_at ? new Date(agent.created_at).toLocaleDateString('he-IL') : 'לא ידוע'}</td>
                </tr>
              `;
            }).join('')}
          </tbody>
        </table>
      `;
      agentsList.innerHTML = table;
    } else {
      console.log('לא נמצאו סוכנים במערכת');
      agentsList.innerHTML = '<p>אין סוכנים רשומים במערכת</p>';
    }
  } catch (error) {
    console.error('שגיאה בטעינת רשימת הסוכנים:', error);
    const errorMessage = `שגיאה בטעינת רשימת הסוכנים: ${error.message}`;
    console.error(errorMessage);
    const agentsList = document.getElementById('agentsList');
    if (agentsList) {
      agentsList.innerHTML = `<div style="color: red; padding: 10px; background: #ffebee; border-radius: 4px;">${errorMessage}</div>`;
    }
  }
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
