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
    
    const response = await fetch(`${API}/api/agents/login`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ email, password })
    });
    
    const data = await response.json();
    
    if (!response.ok) {
      throw new Error(data.error || 'שגיאה בהתחברות');
    }
    
    if (data.agent?.role !== 'admin') {
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
