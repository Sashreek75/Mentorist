/* ============================================================
   MENTORIST — shared.js v4
   Fixed routing · Auth state · Toast · QuestionStore
   ============================================================ */

const CONFIG = {
  GOOGLE_CLIENT_ID: "YOUR_GOOGLE_CLIENT_ID.apps.googleusercontent.com",
  MENTOR_FORM_URL:  "https://forms.gle/JzCzRqB4PmBnqvzA8",
  SUPABASE_URL: "https://vmuukfegnjotlgvdqfrx.supabase.co",
  SUPABASE_KEY: "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InZtdXVrZmVnbmpvdGxndmRxZnJ4Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3Nzg5NTY2MzYsImV4cCI6MjA5NDUzMjYzNn0.FswR9i0EgMZ5UPs8NpE-es4i3HonKQXilqBPA0ulT3Q"
};

const supabase = window.supabase.createClient(CONFIG.SUPABASE_URL, CONFIG.SUPABASE_KEY);

// Handle Supabase Auth State globally
supabase.auth.onAuthStateChange(async (event, session) => {
  if (event === 'SIGNED_IN' && session) {
    let user = session.user;
    let role = user.user_metadata.role;
    let pendingRole = localStorage.getItem('pendingRole');
    
    // First time login via signup (role not set in DB yet)
    if (!role && pendingRole) {
      const { data } = await supabase.auth.updateUser({
        data: { role: pendingRole, status: pendingRole === 'mentor' ? 'pending' : 'active', onboarded: pendingRole === 'admin' }
      });
      user = data.user;
      localStorage.removeItem('pendingRole');
    }
    
    // Admin override check
    if (user.email.endsWith('@mentorist.org') || user.email.startsWith('admin')) {
        const { data } = await supabase.auth.updateUser({ data: { role: 'admin', onboarded: true, status: 'active' }});
        user = data.user;
    }

    // Fallback
    if (!user.user_metadata.role) {
       const { data } = await supabase.auth.updateUser({ data: { role: 'student', status: 'active', onboarded: false }});
       user = data.user;
    }

    const appUser = {
      email: user.email,
      name: user.user_metadata.full_name || user.user_metadata.name || "User",
      role: user.user_metadata.role || 'student',
      status: user.user_metadata.status || 'active',
      onboarded: user.user_metadata.onboarded || false
    };
    
    Auth.setUser(appUser);
    UserStore.addOrUpdate(appUser); // Sync local store for UI purposes temporarily
    
    // Auto-route only if we are currently on the auth page
    if (window.location.pathname.includes('auth.html')) {
        Auth.routeAfterLogin(appUser);
    }
  } else if (event === 'SIGNED_OUT') {
    localStorage.removeItem("mn_user");
    if (!window.location.pathname.includes('index.html') && !window.location.pathname.includes('auth.html')) {
        window.location.href = "index.html";
    }
  }
});

/* ===== AUTH ===== */
const Auth = {
  getUser() {
    try { const r = localStorage.getItem("mn_user"); return r ? JSON.parse(r) : null; }
    catch { return null; }
  },
  setUser(u) { localStorage.setItem("mn_user", JSON.stringify(u)); },
  updateUser(patch) {
    const u = this.getUser(); if (!u) return;
    const nu = { ...u, ...patch };
    this.setUser(nu);
    UserStore.addOrUpdate(nu);
  },
  isLoggedIn() { return !!this.getUser(); },
  async logout() {
    if(!confirm("Are you sure you want to log out?")) return;
    await supabase.auth.signOut();
  },
  requireAuth() {
    const u = this.getUser();
    if (!u) { window.location.href = "auth.html"; return null; }
    return u;
  },
  routeAfterLogin(user) {
    if (!user) { window.location.href = "auth.html"; return; }
    
    // Ensure user is in UserStore
    UserStore.addOrUpdate(user);
    
    if (user.role === "admin" || user.email.endsWith('@mentorist.org')) {
      if (user.role !== 'admin') {
        user.role = 'admin';
        this.setUser(user);
        UserStore.addOrUpdate(user);
      }
      window.location.href = "admin.html";
      return;
    } else if (user.role === "mentor") {
      if (user.status === "rejected") { window.location.href = "mentorapplication.html"; return; }
      if (user.status !== "active") { window.location.href = "mentorapplication.html"; return; }
      
      // Auto-onboard mentors as they don't take the quiz
      if (!user.onboarded) {
        const onboardedUser = { ...user, onboarded: true };
        this.setUser(onboardedUser);
        UserStore.addOrUpdate(onboardedUser);
      }
      window.location.href = "mentordashboard.html"; 
    } else {
      if (!user.onboarded) { window.location.href = "onboarding.html"; return; }
      window.location.href = "studentdashboard.html";
    }
  }
};

/* ===== USER STORE (ADMIN) ===== */
const UserStore = {
  getAll() {
    try { const r = localStorage.getItem("mn_all_users"); return r ? JSON.parse(r) : []; }
    catch { return []; }
  },
  save(users) { localStorage.setItem("mn_all_users", JSON.stringify(users)); },
  addOrUpdate(user) {
    const users = this.getAll();
    const idx = users.findIndex(u => u.email === user.email);
    if (idx > -1) {
      users[idx] = { ...users[idx], ...user };
    } else {
      users.push(user);
    }
    this.save(users);
  },
  updateStatus(email, status) {
    this.updateUserFields(email, { status });
  },
  updateUserFields(email, fields) {
    const users = this.getAll();
    const u = users.find(x => x.email === email);
    if (u) {
      Object.assign(u, fields);
      this.save(users);
      const curr = Auth.getUser();
      if (curr && curr.email === email) {
        Auth.setUser({ ...curr, ...fields });
      }
    }
  }
};

/* ===== QUESTION STORE ===== */
const QuestionStore = {
  getAll() {
    try { const r = localStorage.getItem("mn_questions"); return r ? JSON.parse(r) : []; }
    catch { return []; }
  },
  save(qs) { localStorage.setItem("mn_questions", JSON.stringify(qs)); },
  add(q) {
    const qs = this.getAll();
    const nq = { id: "q_" + Date.now(), ...q, createdAt: new Date().toISOString(), status: "pending", answers: [] };
    qs.unshift(nq);
    this.save(qs);
    return nq;
  },
  getForStudent(email) { return this.getAll().filter(q => q.studentEmail === email); },
  addAnswer(questionId, answer) {
    const qs = this.getAll();
    const q = qs.find(x => x.id === questionId);
    if (q) {
      if (!q.answers) q.answers = [];
      q.answers.push({ ...answer, createdAt: new Date().toISOString() });
      q.status = 'answered';
      this.save(qs);
    }
  },
  delete(id) {
    const qs = this.getAll().filter(q => q.id !== id);
    this.save(qs);
  },
  deleteAnswer(questionId, aIdx) {
    const qs = this.getAll();
    const q = qs.find(x => x.id === questionId);
    if (q && q.answers) {
      q.answers.splice(aIdx, 1);
      if (q.answers.length === 0) {
        q.status = 'pending';
      }
      this.save(qs);
    }
  }
};

/* ===== ALERT STORE (GLOBAL ANNOUNCEMENTS) ===== */
const AlertStore = {
  getAll() {
    try { const r = localStorage.getItem("mn_alerts"); return r ? JSON.parse(r) : []; }
    catch { return []; }
  },
  save(als) { localStorage.setItem("mn_alerts", JSON.stringify(als)); },
  add(al) {
    const als = this.getAll();
    const nal = { id: "al_" + Date.now(), ...al, createdAt: new Date().toISOString() };
    als.unshift(nal);
    this.save(als);
    return nal;
  },
  delete(id) {
    const als = this.getAll().filter(a => a.id !== id);
    this.save(als);
  }
};

/* ===== ADMIN AUTH (PASSWORD GATE) ===== */
const AdminAuth = {
  PASS: "mentorististhebest",
  check() {
    return sessionStorage.getItem("mn_admin_session") === "active";
  },
  authenticate() {
    const p = prompt("Enter Admin Password:");
    if (p === this.PASS) {
      sessionStorage.setItem("mn_admin_session", "active");
      return true;
    }
    alert("Incorrect password.");
    return false;
  },
  require() {
    if (!this.check()) {
      if (this.authenticate()) {
        window.location.reload();
      } else {
        window.location.href = "index.html";
      }
    }
  }
};

/* ===== UTILS ===== */
const Utils = {
  initials(name) {
    if (!name) return "?";
    return name.trim().split(/\s+/).map(w => w[0]).join("").toUpperCase().slice(0, 2);
  },
  relativeDate(iso) {
    if (!iso) return "";
    const diff = Math.floor((new Date() - new Date(iso)) / 1000);
    if (diff < 60)    return "just now";
    if (diff < 3600)  return Math.floor(diff / 60) + "m ago";
    if (diff < 86400) return Math.floor(diff / 3600) + "h ago";
    return new Date(iso).toLocaleDateString("en-US", { month: "short", day: "numeric" });
  },
  toast(msg, type = "success") {
    document.getElementById("toast-container")?.remove();
    const wrap = document.createElement("div");
    wrap.id = "toast-container";
    wrap.style.cssText = "position:fixed;bottom:28px;left:50%;transform:translateX(-50%);z-index:9000;pointer-events:none;";
    const t = document.createElement("div");
    t.style.cssText = `
      padding:12px 22px;border-radius:999px;font-size:14px;font-weight:500;
      white-space:nowrap;font-family:var(--font);
      animation:fadeUp 0.3s ease both;
      ${type==="success" ? "background:#0a2e1a;color:#00e87a;border:1px solid rgba(0,232,122,0.3);" : ""}
      ${type==="error"   ? "background:#2e0a0a;color:#ff6b6b;border:1px solid rgba(255,68,68,0.3);" : ""}
      ${type==="info"    ? "background:#1a1a2e;color:#93c5fd;border:1px solid rgba(96,165,250,0.3);" : ""}
    `;
    t.textContent = msg;
    wrap.appendChild(t);
    document.body.appendChild(wrap);
    setTimeout(() => { t.style.opacity="0"; t.style.transition="opacity 0.3s"; setTimeout(()=>wrap.remove(),300); }, 3000);
  }
};

/* ===== GOOGLE AUTH VIA SUPABASE ===== */
const GoogleAuth = {
  init(btn, isSignup = false) {
    if (!btn) return;
    btn.addEventListener("click", async () => {
      if (isSignup) {
        // Save selected role before redirecting out to Google
        const roleCard = document.querySelector('.role-card.selected');
        if (roleCard) localStorage.setItem('pendingRole', roleCard.dataset.role);
      }
      
      await supabase.auth.signInWithOAuth({
        provider: 'google',
        options: {
          redirectTo: window.location.origin + window.location.pathname
        }
      });
    });
  }
};

/* ===== MOBILE NAVIGATION LOGIC ===== */
const MobileNav = {
  init() {
    this.createMobileMenu();
    this.setupDashboardNav();
    this.bindEvents();
  },

  createMobileMenu() {
    const navbar = document.querySelector('.navbar');
    if (!navbar || document.querySelector('.mobile-menu')) return;

    // Add Toggle Button
    const toggle = document.createElement('button');
    toggle.className = 'nav-menu-toggle';
    toggle.setAttribute('aria-label', 'Toggle Menu');
    toggle.innerHTML = `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><line x1="3" y1="12" x2="21" y2="12"></line><line x1="3" y1="6" x2="21" y2="6"></line><line x1="3" y1="18" x2="21" y2="18"></line></svg>`;
    navbar.appendChild(toggle);

    // Create Overlay
    const menu = document.createElement('div');
    menu.className = 'mobile-menu';
    
    const navLinks = document.querySelector('.nav-links')?.cloneNode(true);
    const navActions = document.querySelector('.nav-actions')?.cloneNode(true);
    
    if (navLinks) menu.appendChild(navLinks);
    if (navActions) {
      navActions.style.display = 'flex'; // Ensure visible in mobile menu
      menu.appendChild(navActions);
    }

    document.body.appendChild(menu);
    this.menu = menu;
    this.toggle = toggle;
  },

  setupDashboardNav() {
    // Only inject on dashboard pages
    const path = window.location.pathname;
    const isDashboard = path.includes('dashboard') || path.includes('admin.html');
    if (!isDashboard || document.querySelector('.bottom-nav')) return;

    const user = Auth.getUser();
    if (!user) return;

    const bNav = document.createElement('nav');
    bNav.className = 'bottom-nav';

    let items = [];
    if (user.role === 'admin') {
      items = [
        { label: 'Admin', icon: 'shield', link: 'admin.html' },
        { label: 'Vault', icon: 'archive', link: 'vault.html' },
        { label: 'Logout', icon: 'log-out', link: '#', action: () => Auth.logout() }
      ];
    } else if (user.role === 'mentor') {
      items = [
        { label: 'Home', icon: 'home', link: 'mentordashboard.html' },
        { label: 'Vault', icon: 'archive', link: 'vault.html' },
        { label: 'Logout', icon: 'log-out', link: '#', action: () => Auth.logout() }
      ];
    } else {
      items = [
        { label: 'Home', icon: 'home', link: 'studentdashboard.html' },
        { label: 'Vault', icon: 'archive', link: 'vault.html' },
        { label: 'Logout', icon: 'log-out', link: '#', action: () => Auth.logout() }
      ];
    }

    const icons = {
      home: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z"></path><polyline points="9 22 9 12 15 12 15 22"></polyline></svg>`,
      archive: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polyline points="21 8 21 21 3 21 3 8"></polyline><rect x="1" y="3" width="22" height="5"></rect><line x1="10" y1="12" x2="14" y2="12"></line></svg>`,
      shield: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"></path></svg>`,
      'log-out': `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4"></path><polyline points="16 17 21 12 16 7"></polyline><line x1="21" y1="12" x2="9" y2="12"></line></svg>`
    };

    items.forEach(item => {
      const a = document.createElement('a');
      a.href = item.link;
      a.className = `bottom-nav-item ${path.includes(item.link) ? 'active' : ''}`;
      if (item.action) a.onclick = (e) => { e.preventDefault(); item.action(); };
      
      a.innerHTML = `
        ${icons[item.icon]}
        <span>${item.label}</span>
      `;
      bNav.appendChild(a);
    });

    document.body.appendChild(bNav);
  },

  bindEvents() {
    if (!this.toggle) return;
    this.toggle.addEventListener('click', () => {
      this.menu.classList.toggle('active');
      const isActive = this.menu.classList.contains('active');
      this.toggle.innerHTML = isActive 
        ? `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><line x1="18" y1="6" x2="6" y2="18"></line><line x1="6" y1="6" x2="18" y2="18"></line></svg>`
        : `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><line x1="3" y1="12" x2="21" y2="12"></line><line x1="3" y1="6" x2="21" y2="6"></line><line x1="3" y1="18" x2="21" y2="18"></line></svg>`;
    });

    // Close menu on link click
    this.menu.querySelectorAll('a').forEach(link => {
      link.addEventListener('click', () => {
        this.menu.classList.remove('active');
        this.toggle.innerHTML = `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><line x1="3" y1="12" x2="21" y2="12"></line><line x1="3" y1="6" x2="21" y2="6"></line><line x1="3" y1="18" x2="21" y2="18"></line></svg>`;
      });
    });
  }
};

document.addEventListener('DOMContentLoaded', () => {
  MobileNav.init();
  GlobalBroadcast.init();
});

/* ===== GLOBAL BROADCAST SYSTEM ===== */
const GlobalBroadcast = {
  init() {
    const alerts = AlertStore.getAll();
    if (!alerts.length) return;

    const dismissed = JSON.parse(localStorage.getItem('mn_dismissed_alerts') || '[]');
    const latest = alerts[0]; // Focus on the most recent broadcast

    if (!dismissed.includes(latest.id)) {
      // Check if we are on a dashboard or landing page
      const isDashboard = window.location.pathname.includes('dashboard') || window.location.pathname.includes('admin.html');
      if (isDashboard) {
        setTimeout(() => this.show(latest), 1000);
      }
    }
  },

  show(al) {
    const overlay = document.createElement('div');
    overlay.className = 'broadcast-overlay';
    overlay.style.cssText = `
      position:fixed; inset:0; background:rgba(0,0,0,0.85); 
      backdrop-filter:blur(10px); -webkit-backdrop-filter:blur(10px);
      z-index:9999; display:flex; align-items:center; justify-content:center;
      padding:24px; animation:fadeIn 0.4s ease;
    `;

    const card = document.createElement('div');
    card.style.cssText = `
      background:var(--bg-1); border:1px solid var(--green);
      border-radius:var(--r-3xl); width:100%; max-width:540px;
      padding:48px; position:relative; overflow:hidden;
      box-shadow: 0 0 60px rgba(0,232,122,0.15);
      animation:scaleIn 0.5s cubic-bezier(0.2, 1, 0.3, 1);
    `;

    card.innerHTML = `
      <div style="position:absolute; top:0; left:0; width:100%; height:4px; background:linear-gradient(90deg, var(--green), #1aff8e);"></div>
      <div style="display:flex; align-items:center; gap:12px; margin-bottom:24px;">
        <span style="font-size:10px; font-weight:800; color:var(--green); background:var(--green-dim); padding:4px 12px; border-radius:var(--r-pill); text-transform:uppercase; letter-spacing:0.1em; border:1px solid rgba(0,232,122,0.2);">${al.tag || 'Global Update'}</span>
        <span style="font-size:12px; color:var(--t4); font-weight:600;">Broadcasted by Founder</span>
      </div>
      <h2 style="font-family:var(--font-h); font-size:32px; font-weight:800; color:var(--t1); margin-bottom:16px; letter-spacing:-0.03em; line-height:1.2;">${al.title}</h2>
      <p style="font-size:16px; color:var(--t2); line-height:1.7; margin-bottom:32px;">${al.body}</p>
      
      <div style="display:flex; gap:16px;">
        <button id="bcClose" class="btn btn-primary btn-lg btn-full" style="flex:1;">Got it, thanks!</button>
      </div>
    `;

    overlay.appendChild(card);
    document.body.appendChild(overlay);
    document.body.style.overflow = 'hidden';

    document.getElementById('bcClose').onclick = () => {
      this.dismiss(al.id);
      overlay.style.opacity = '0';
      overlay.style.transition = 'opacity 0.3s';
      setTimeout(() => {
        overlay.remove();
        document.body.style.overflow = 'auto';
      }, 300);
    };
  },

  dismiss(id) {
    const dismissed = JSON.parse(localStorage.getItem('mn_dismissed_alerts') || '[]');
    if (!dismissed.includes(id)) {
      dismissed.push(id);
      localStorage.setItem('mn_dismissed_alerts', JSON.stringify(dismissed));
    }
  }
};
