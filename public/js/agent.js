const API = '';

function saveToken(t){ localStorage.setItem('token', t); }
function getToken(){ return localStorage.getItem('token'); }

async function registerAgent(){
  const email = document.getElementById('email').value;
  const password = document.getElementById('password').value;
  const full_name = document.getElementById('full_name').value;
  const res = await fetch('/api/agents/register',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({email,password,full_name})});
  const data = await res.json();
  if(data.token){ saveToken(data.token); renderMe(); } else { alert(data.error||'error'); }
}

async function login(){
  try {
    console.log('פונקציית login נקראה');
    
    const emailEl = document.getElementById('emailL');
    const passwordEl = document.getElementById('passwordL');
    
    if (!emailEl || !passwordEl) {
      console.error('לא נמצאו שדות אימייל או סיסמה');
      alert('שגיאה בטעינת הדף');
      return;
    }
    
    const email = emailEl.value;
    const password = passwordEl.value;
    
    console.log('ערכים:', { email, password: password ? '***' : 'ריק' });
    
    if (!email || !password) {
      alert('נא למלא אימייל וסיסמה');
      return;
    }
    
    console.log('שולח בקשת התחברות...');
    
    const res = await fetch(`${window.location.origin}/api/agents/login`,{
      method:'POST',
      headers:{'Content-Type':'application/json'},
      body:JSON.stringify({email,password})
    });
    
    console.log('תגובה מהשרת:', res.status);
    
    if (!res.ok) {
      console.error('שגיאה בתגובה:', res.status, res.statusText);
      alert('שגיאה בהתחברות');
      return;
    }
    
    const data = await res.json();
    console.log('נתונים מהשרת:', data);
    
    if(data.token){ 
      console.log('קיבלתי טוקן, שומר...');
      saveToken(data.token); 
      console.log('טוקן נשמר:', localStorage.getItem('token') ? 'הצליח' : 'נכשל');
      console.log('מנסה לטעון דשבורד...');
      await renderMe(); 
      console.log('renderMe הושלם');
    } else { 
      console.error('לא התקבל טוקן:', data);
      alert(data.error || 'שגיאה בהתחברות'); 
    }
  } catch (error) {
    console.error('שגיאה בהתחברות:', error);
    alert('שגיאה בחיבור לשרת: ' + error.message);
  }
}

async function renderMe(){
  try {
    const token = getToken();
    if(!token){ 
      console.log('אין טוקן - מציג טופס התחברות');
      return; 
    }
    
    console.log('מנסה לטעון נתוני סוכן...');
    const res = await fetch(`${window.location.origin}/api/agent/dashboard`,{headers:{Authorization:'Bearer '+token}});
    console.log('תגובה מדשבורד:', res.status);
    
    const data = await res.json();
    console.log('נתוני דשבורד:', data);
    
    const me = document.getElementById('me');
    
    // קבל נתוני פרופיל נוספים
    const profileRes = await fetch(`${window.location.origin}/api/agent/profile`,{headers:{Authorization:'Bearer '+token}});
    const profileData = await profileRes.json();
    console.log('נתוני פרופיל:', profileData);
    
    if(profileData && (profileData.agent || profileData.id)){
      const agent = profileData.agent || profileData;
      const shareLink = location.origin + '/public/demo-product.html?ref=' + agent.referral_code;
      console.log('מציג נתוני סוכן:', agent);
      
      me.innerHTML = `
        <div class="card">
          <h3>שלום, ${agent.full_name || agent.email}</h3>
          <p>קוד סוכן: <b>${agent.referral_code}</b></p>
          <p>לינק שיתוף לדוגמה: <span class="mono">${shareLink}</span> <button onclick="navigator.clipboard.writeText('${shareLink}')">העתק</button></p>
        </div>
        <div class="kpi">
          <div class="card"><h4>יתרה זמינה</h4><div><b>${(data.stats.total_earned||0).toFixed(2)}</b> ₪</div></div>
          <div class="card"><h4>עמלות</h4><div>${data.stats.total_commissions||0}</div></div>
          <div class="card"><h4>בקשות תשלום</h4><div>${data.pending_payouts.length||0}</div></div>
        </div>
      `;
      
      console.log('HTML של דשבורד הוגדר');
      
      // הסתר טפסי הרשמה והתחברות
      const loginRow = document.querySelector('.row');
      if (loginRow) {
        loginRow.style.display = 'none';
        console.log('הסתרתי טפסי התחברות');
      } else {
        console.error('לא נמצא אלמנט .row');
      }
      
      loadCommissions();
    } else {
      console.error('לא התקבלו נתוני סוכן מהפרופיל:', profileData);
      me.innerHTML = '<div class="card"><p>שגיאה בטעינת נתוני סוכן</p></div>';
    }
  } catch (error) {
    console.error('שגיאה בטעינת דשבורד:', error);
  }
}

async function loadCommissions(){
  const token = getToken();
  const res = await fetch(`${window.location.origin}/api/agent/dashboard`,{headers:{Authorization:'Bearer '+token}});
  const data = await res.json();
  const tbl = document.getElementById('commissions');
  tbl.innerHTML = `<tr><th>תאריך</th><th>הזמנה</th><th>סכום עסקה</th><th>עמלה</th><th>סטטוס</th></tr>` +
    (data.recent_commissions||[]).map(r=>`<tr>
      <td>${r.created_at}</td>
      <td>${r.order_uid||'-'}</td>
      <td>${(r.base_amount_cents/100)?.toFixed(2)}</td>
      <td>${(r.commission_amount_cents/100)?.toFixed(2)}</td>
      <td>${r.status}</td>
    </tr>`).join('');
}

async function requestPayout(){
  const token = getToken();
  const amount = parseFloat(prompt('סכום למשיכה (₪):')||'0');
  if(!amount || amount<=0) return;
  const res = await fetch(`${window.location.origin}/api/payouts/request`,{method:'POST',headers:{'Content-Type':'application/json',Authorization:'Bearer '+token},body:JSON.stringify({amount})});
  const data = await res.json();
  if(data.ok){ alert('הבקשה נרשמה'); renderMe(); } else { alert(data.error||'error'); }
}

// פונקציית התנתקות
function logout() {
  localStorage.removeItem('token');
  window.location.href = '/public/dashboard-agent.html';
}

window.addEventListener('DOMContentLoaded',()=>{
  console.log('דף נטען, מתחיל להגדיר event listeners...');
  
  // הוספת מאזין לכפתור ההתנתקות
  const btnLogout = document.getElementById('btnLogout');
  if (btnLogout) {
    btnLogout.addEventListener('click', logout);
  }
  
  const btnRegister = document.getElementById('btnRegister');
  const btnLogin = document.getElementById('btnLogin');
  const btnPayout = document.getElementById('btnPayout');
  
  if (btnRegister) {
    btnRegister.addEventListener('click', registerAgent);
    console.log('Event listener להרשמה הוגדר');
  }
  
  if (btnLogin) {
    btnLogin.addEventListener('click', login);
    console.log('Event listener להתחברות הוגדר');
  }
  
  if (btnPayout) {
    btnPayout.addEventListener('click', requestPayout);
    console.log('Event listener לבקשת תשלום הוגדר');
  }
  
  renderMe();
});
