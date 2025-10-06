const API = window.location.origin;
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
      throw new Error(data.error || 'שגיאה בהתחברות');
    }
    
    // Check if user is admin (role field or email check)
    if (data.agent?.role !== 'admin' && email !== 'admin@example.com') {
      throw new Error('אין לך הרשאות מנהל');
    }
    
    localStorage.setItem('adminToken', data.token);
    console.log('Admin login successful, redirecting to dashboard...');
    
    // Try direct URL first, then fallback
    console.log('Trying to redirect to admin dashboard...');
    
    // Test if admin dashboard exists
    fetch('/public/admin-dashboard.html')
      .then(response => {
        if (response.ok) {
          console.log('Admin dashboard found, redirecting...');
          window.location.href = '/public/admin-dashboard.html';
        } else {
          console.log('Admin dashboard not found, creating simple redirect...');
          // Create a simple admin panel in the same page
          document.body.innerHTML = `
            <div style="padding: 20px; text-align: center; font-family: Arial;">
              <h1>🏢 דשבורד מנהל</h1>
              <p>התחברת בהצלחה כמנהל!</p>
              <div style="margin: 20px 0;">
                <button onclick="window.location.href='/public/dashboard-agent.html'" 
                        style="padding: 10px 20px; margin: 10px; background: #007bff; color: white; border: none; border-radius: 5px;">
                  לדף הסוכנים
                </button>
                <button onclick="logout()" 
                        style="padding: 10px 20px; margin: 10px; background: #dc3545; color: white; border: none; border-radius: 5px;">
                  יציאה
                </button>
              </div>
            </div>
          `;
        }
      })
      .catch(error => {
        console.error('Error checking admin dashboard:', error);
        alert('שגיאה בטעינת דשבורד המנהל');
      });
    
  } catch (error) {
    console.error('Login error:', error);
    alert(error.message || 'אירעה שגיאה בהתחברות');
  }
}

async function loadPendingPayouts(){
  const token = getToken();
  const res = await fetch('/admin/payouts/pending',{headers:{Authorization:'Bearer '+token}});
  const data = await res.json();
  const list = document.getElementById('pending');
  list.innerHTML = (data.items||[]).map(p=>`<div class="card">
    <div>סוכן #${p.agent_id} | בקשה #${p.id} | סכום: <b>${p.amount.toFixed(2)} ₪</b> | סטטוס: ${p.status}</div>
    <button onclick="approve(${p.id})">אשר</button>
    <button onclick="markPaid(${p.id})">סמן שולם</button>
  </div>`).join('');
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

window.addEventListener('DOMContentLoaded',()=>{
  document.getElementById('btnLoginA').addEventListener('click', loginAdmin);
});
