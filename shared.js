/* ============================================================
   MENTORIST — shared.js v4
   Fixed routing · Auth state · Toast · QuestionStore
   ============================================================ */

const CONFIG = {
  GOOGLE_CLIENT_ID: "YOUR_GOOGLE_CLIENT_ID.apps.googleusercontent.com",
  MENTOR_FORM_URL:  "https://forms.gle/JzCzRqB4PmBnqvzA8"
};

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
  logout() {
    if(!confirm("Are you sure you want to log out?")) return;
    localStorage.removeItem("mn_user");
    sessionStorage.removeItem('mn_suppress_redirect');
    window.location.href = "index.html";
  },
  requireAuth() {
    const u = this.getUser();
    if (!u) { window.location.href = "auth.html"; return null; }
    return u;
  },
  routeAfterLogin(user) {
    if (!user) { window.location.href = "auth.html"; return; }
    
    // Bulletproof suppress check
    const p = new URLSearchParams(window.location.search);
    if (p.has('no_redirect')) {
      sessionStorage.setItem('mn_suppress_redirect', '1');
      return;
    }
    if (sessionStorage.getItem('mn_suppress_redirect') === '1') {
      // Only suppress on landing page
      if (window.location.pathname.endsWith('index.html') || window.location.pathname.endsWith('/')) {
        return;
      }
    }

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

/* ===== GOOGLE AUTH PLACEHOLDER ===== */
const GoogleAuth = {
  init(btn, onSuccess) {
    if (!btn) return;
    btn.addEventListener("click", () => this.simulate(onSuccess));
  },
  simulate(onSuccess) {
    /*
      PRODUCTION: Replace with Google Identity Services:
      google.accounts.id.initialize({ client_id: CONFIG.GOOGLE_CLIENT_ID, callback: ... });
      google.accounts.id.prompt();
    */
    const name = prompt("(Demo) Enter your name:");
    if (!name || !name.trim()) return;
    const email = prompt("(Demo) Enter your email:");
    if (!email || !email.trim()) return;
    onSuccess({ name: name.trim(), email: email.trim().toLowerCase() });
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

document.addEventListener('DOMContentLoaded', () => MobileNav.init());