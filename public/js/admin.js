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
    console.log('Admin login successful, creating admin dashboard...');
    
    // Create admin dashboard directly in the page
    document.body.innerHTML = `
      <div style="padding: 20px; font-family: Arial, sans-serif; direction: rtl; background: #f5f7fa; min-height: 100vh;">
        <div style="max-width: 1200px; margin: 0 auto;">
          <div style="background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); color: white; padding: 20px; border-radius: 10px; margin-bottom: 20px; display: flex; justify-content: space-between; align-items: center;">
            <h1 style="margin: 0;">🏢 דשבורד מנהל</h1>
            <button onclick="logout()" style="background: rgba(255,255,255,0.2); color: white; border: none; padding: 10px 20px; border-radius: 5px; cursor: pointer;">יציאה</button>
          </div>
          
          <div style="display: grid; grid-template-columns: repeat(auto-fit, minmax(250px, 1fr)); gap: 20px; margin-bottom: 30px;">
            <div style="background: white; padding: 20px; border-radius: 10px; box-shadow: 0 2px 10px rgba(0,0,0,0.1); text-align: center;">
              <h3 style="color: #666; margin: 0 0 10px 0;">סוכנים פעילים</h3>
              <div style="font-size: 2rem; font-weight: bold; color: #2c3e50;" id="activeAgents">טוען...</div>
            </div>
            <div style="background: white; padding: 20px; border-radius: 10px; box-shadow: 0 2px 10px rgba(0,0,0,0.1); text-align: center;">
              <h3 style="color: #666; margin: 0 0 10px 0;">סה״כ עמלות</h3>
              <div style="font-size: 2rem; font-weight: bold; color: #2c3e50;" id="totalCommissions">טוען...</div>
            </div>
            <div style="background: white; padding: 20px; border-radius: 10px; box-shadow: 0 2px 10px rgba(0,0,0,0.1); text-align: center;">
              <h3 style="color: #666; margin: 0 0 10px 0;">בקשות תשלום</h3>
              <div style="font-size: 2rem; font-weight: bold; color: #2c3e50;" id="payoutRequests">טוען...</div>
            </div>
          </div>
          
          <div style="background: white; padding: 20px; border-radius: 10px; box-shadow: 0 2px 10px rgba(0,0,0,0.1); margin-bottom: 20px;">
            <h2 style="color: #2c3e50; margin: 0 0 20px 0; padding-bottom: 10px; border-bottom: 2px solid #eee;">👥 ניהול מערכת</h2>
            <div style="display: grid; grid-template-columns: repeat(auto-fit, minmax(200px, 1fr)); gap: 15px;">
              <button onclick="window.location.href='/public/dashboard-agent.html'" 
                      style="padding: 15px; background: #007bff; color: white; border: none; border-radius: 8px; cursor: pointer; font-size: 16px;">
                📊 דף הסוכנים
              </button>
              <button onclick="window.location.href='/'" 
                      style="padding: 15px; background: #28a745; color: white; border: none; border-radius: 8px; cursor: pointer; font-size: 16px;">
                🏠 דף הבית
              </button>
              <button onclick="loadAgentsList()" 
                      style="padding: 15px; background: #17a2b8; color: white; border: none; border-radius: 8px; cursor: pointer; font-size: 16px;">
                👥 רשימת סוכנים
              </button>
            </div>
          </div>
          
          <div id="agentsList" style="background: white; padding: 20px; border-radius: 10px; box-shadow: 0 2px 10px rgba(0,0,0,0.1); display: none;">
            <h3>רשימת סוכנים</h3>
            <div id="agentsContent">טוען...</div>
          </div>
        </div>
      </div>
    `;
    
    // Load dashboard data
    loadAdminStats();
    
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

// Load admin statistics
async function loadAdminStats() {
  try {
    const token = localStorage.getItem('adminToken');
    const response = await fetch(`${API}/api/admin/dashboard`, {
      headers: {
        'Authorization': `Bearer ${token}`
      }
    });
    
    if (response.ok) {
      const data = await response.json();
      document.getElementById('activeAgents').textContent = data.stats.activeAgents || 0;
      document.getElementById('totalCommissions').textContent = `₪${data.stats.totalCommissions || 0}`;
      document.getElementById('payoutRequests').textContent = data.stats.payoutRequests || 0;
    } else {
      // Fallback data
      document.getElementById('activeAgents').textContent = '1';
      document.getElementById('totalCommissions').textContent = '₪0';
      document.getElementById('payoutRequests').textContent = '0';
    }
  } catch (error) {
    console.error('Error loading admin stats:', error);
    // Show fallback data
    document.getElementById('activeAgents').textContent = '1';
    document.getElementById('totalCommissions').textContent = '₪0';
    document.getElementById('payoutRequests').textContent = '0';
  }
}

// Load agents list
async function loadAgentsList() {
  const agentsList = document.getElementById('agentsList');
  const agentsContent = document.getElementById('agentsContent');
  
  agentsList.style.display = 'block';
  agentsContent.innerHTML = 'טוען רשימת סוכנים...';
  
  try {
    const token = localStorage.getItem('adminToken');
    const response = await fetch(`${API}/api/admin/dashboard`, {
      headers: {
        'Authorization': `Bearer ${token}`
      }
    });
    
    if (response.ok) {
      const data = await response.json();
      const agents = data.agents || [];
      
      if (agents.length === 0) {
        agentsContent.innerHTML = '<p>אין סוכנים במערכת</p>';
      } else {
        agentsContent.innerHTML = `
          <table style="width: 100%; border-collapse: collapse;">
            <thead>
              <tr style="background: #f8f9fa;">
                <th style="padding: 10px; border: 1px solid #ddd; text-align: right;">שם</th>
                <th style="padding: 10px; border: 1px solid #ddd; text-align: right;">אימייל</th>
                <th style="padding: 10px; border: 1px solid #ddd; text-align: right;">סטטוס</th>
                <th style="padding: 10px; border: 1px solid #ddd; text-align: right;">עמלות</th>
              </tr>
            </thead>
            <tbody>
              ${agents.map(agent => `
                <tr>
                  <td style="padding: 10px; border: 1px solid #ddd;">${agent.name || 'לא צוין'}</td>
                  <td style="padding: 10px; border: 1px solid #ddd;">${agent.email}</td>
                  <td style="padding: 10px; border: 1px solid #ddd;">
                    <span style="padding: 4px 8px; border-radius: 12px; font-size: 12px; ${agent.status === 'active' ? 'background: #d4edda; color: #155724;' : 'background: #fff3cd; color: #856404;'}">
                      ${agent.status === 'active' ? 'פעיל' : 'ממתין'}
                    </span>
                  </td>
                  <td style="padding: 10px; border: 1px solid #ddd;">₪${agent.totalCommissions || 0}</td>
                </tr>
              `).join('')}
            </tbody>
          </table>
        `;
      }
    } else {
      agentsContent.innerHTML = '<p>שגיאה בטעינת רשימת הסוכנים</p>';
    }
  } catch (error) {
    console.error('Error loading agents:', error);
    agentsContent.innerHTML = '<p>שגיאה בטעינת רשימת הסוכנים</p>';
  }
}

// Logout function
function logout() {
  localStorage.removeItem('adminToken');
  window.location.reload();
}

window.addEventListener('DOMContentLoaded',()=>{
  document.getElementById('btnLoginA').addEventListener('click', loginAdmin);
});
