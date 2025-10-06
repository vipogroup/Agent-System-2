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
            window.location.href = '/public/admin-dashboard.html';
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
    window.location.href = '/public/admin-dashboard.html';
    
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
