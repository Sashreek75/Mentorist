/* ============================================================
   MENTORIST — shared.js v4
   Fixed routing · Auth state · Toast · QuestionStore
   ============================================================ */

const CONFIG = {
  GOOGLE_CLIENT_ID: "YOUR_GOOGLE_CLIENT_ID.apps.googleusercontent.com",
  MENTOR_FORM_URL:  "https://forms.gle/JzCzRqB4PmBnqvzA8",
  SUPABASE_URL: "https://vmuukfegnjotlgvdqfrx.supabase.co",
  SUPABASE_KEY: "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InZtdXVrZmVnbmpvdGxndmRxZnJ4Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3Nzg5NTY2MzYsImV4cCI6MjA5NDUzMjYzNn0.FswR9i0EgMZ5UPs8NpE-es4i3HonKQXilqBPA0ulT3Q",
  TABLES: {
    users: "mentorist_profiles",
    questions: "mentorist_questions",
    alerts: "mentorist_alerts"
  }
};

const supabaseClient = window.supabase.createClient(CONFIG.SUPABASE_URL, CONFIG.SUPABASE_KEY);

function inferRoleFromEmail(email = "") {
  const lower = String(email).toLowerCase();
  if (lower.endsWith("@mentorist.org") || lower.startsWith("admin")) return "admin";
  return "student";
}

function isMentorApplicant(user) {
  if (!user) return false;
  return user.role === "mentor" || !!user.applicationData || !!user.appliedAt;
}

function cleanObject(obj) {
  return Object.fromEntries(Object.entries(obj).filter(([, value]) => value !== undefined));
}

function toRemoteUser(user) {
  if (!user?.email) return null;
  const now = new Date().toISOString();
  return cleanObject({
    email: String(user.email).toLowerCase(),
    name: user.name || null,
    role: user.role || inferRoleFromEmail(user.email),
    status: user.status || null,
    onboarded: !!user.onboarded,
    profile: user.profile || null,
    application_data: user.applicationData || null,
    applied_at: user.appliedAt || null,
    approved_at: user.approvedAt || null,
    rejected_at: user.rejectedAt || null,
    dismissed_alert_ids: user.dismissedAlertIds || [],
    last_seen_at: user.lastSeenAt || now,
    updated_at: now
  });
}

function fromRemoteUser(row) {
  if (!row?.email) return null;
  return {
    email: String(row.email).toLowerCase(),
    name: row.name || row.profile?.name || row.email.split("@")[0] || "User",
    role: row.role || inferRoleFromEmail(row.email),
    status: row.status || "active",
    onboarded: row.onboarded ?? false,
    profile: row.profile || null,
    applicationData: row.application_data || row.applicationData || null,
    appliedAt: row.applied_at || row.appliedAt || null,
    approvedAt: row.approved_at || row.approvedAt || null,
    rejectedAt: row.rejected_at || row.rejectedAt || null,
    dismissedAlertIds: row.dismissed_alert_ids || row.dismissedAlertIds || [],
    lastSeenAt: row.last_seen_at || row.lastSeenAt || null,
    updatedAt: row.updated_at || row.updatedAt || null
  };
}

function toRemoteQuestion(q) {
  if (!q?.id) return null;
  return cleanObject({
    id: q.id,
    student_email: q.studentEmail || null,
    student_name: q.studentName || null,
    student_profile: q.studentProfile || null,
    topics: q.topics || [],
    question: q.question || "",
    context: q.context || null,
    answers: q.answers || [],
    status: q.status || "pending",
    created_at: q.createdAt || new Date().toISOString(),
    updated_at: new Date().toISOString()
  });
}

function fromRemoteQuestion(row) {
  if (!row?.id) return null;
  return {
    id: row.id,
    studentEmail: row.student_email || row.studentEmail || "",
    studentName: row.student_name || row.studentName || "",
    studentProfile: row.student_profile || row.studentProfile || {},
    topics: row.topics || [],
    question: row.question || "",
    context: row.context || null,
    answers: row.answers || [],
    status: row.status || "pending",
    createdAt: row.created_at || row.createdAt || new Date().toISOString(),
    updatedAt: row.updated_at || row.updatedAt || null
  };
}

function toRemoteAlert(alert) {
  if (!alert?.id) return null;
  return cleanObject({
    id: alert.id,
    title: alert.title || "",
    tag: alert.tag || "Alert",
    body: alert.body || "",
    author: alert.author || "Founder",
    created_at: alert.createdAt || new Date().toISOString(),
    updated_at: new Date().toISOString()
  });
}

function fromRemoteAlert(row) {
  if (!row?.id) return null;
  return {
    id: row.id,
    title: row.title || "",
    tag: row.tag || "Alert",
    body: row.body || "",
    author: row.author || "Founder",
    createdAt: row.created_at || row.createdAt || new Date().toISOString(),
    updatedAt: row.updated_at || row.updatedAt || null
  };
}

function mergeUsersByEmail(users) {
  const map = new Map();
  for (const user of users.filter(Boolean)) {
    const key = user.email?.toLowerCase();
    if (!key) continue;
    const curr = map.get(key);
    if (!curr) {
      map.set(key, user);
      continue;
    }
    const currTime = new Date(curr.updatedAt || curr.lastSeenAt || 0).getTime();
    const nextTime = new Date(user.updatedAt || user.lastSeenAt || 0).getTime();
    map.set(key, nextTime >= currTime ? { ...curr, ...user } : { ...user, ...curr });
  }
  return [...map.values()];
}

// Handle Supabase Auth State globally
supabaseClient.auth.onAuthStateChange(async (event, session) => {
  if (event === 'SIGNED_IN' && session) {
    let user = session.user;
    const metadata = user.user_metadata || {};
    const email = String(user.email || "").toLowerCase();
    let role = metadata.role;
    let pendingRole = localStorage.getItem('pendingRole');

    await UserStore.refreshFromRemote();
    const storedUser = UserStore.getByEmail(email);
    
    // First time login via signup (role not set in DB yet)
    if (!role && pendingRole) {
      const { data } = await supabaseClient.auth.updateUser({
        data: { role: pendingRole, status: pendingRole === 'mentor' ? 'pending' : 'active', onboarded: pendingRole === 'admin' }
      });
      user = data.user;
      localStorage.removeItem('pendingRole');
    }
    
    // Returning users should inherit their stored profile immediately.
    if (!role && storedUser?.role) {
      const { data } = await supabaseClient.auth.updateUser({
        data: {
          role: storedUser.role,
          status: storedUser.status || (storedUser.role === 'mentor' ? 'pending' : 'active'),
          onboarded: storedUser.onboarded ?? storedUser.role === 'admin',
          profile: storedUser.profile || null,
          applicationData: storedUser.applicationData || null,
          dismissedAlertIds: storedUser.dismissedAlertIds || []
        }
      });
      user = data.user;
    }
    
    // Admin override check
    if (email.endsWith('@mentorist.org') || email.startsWith('admin')) {
        const { data } = await supabaseClient.auth.updateUser({ data: { role: 'admin', onboarded: true, status: 'active' }});
        user = data.user;
    }

    // Fallback
    if (!user.user_metadata?.role) {
       const { data } = await supabaseClient.auth.updateUser({ data: { role: 'student', status: 'active', onboarded: false }});
       user = data.user;
    }

    const appUser = Auth.fromSupabaseUser(user);
    
    Auth.setUser(appUser);
    UserStore.addOrUpdate(appUser); // Sync local store for UI purposes temporarily
    await UserStore.persistRemote(appUser);
    await UserStore.refreshFromRemote();
    
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
  fromSupabaseUser(user) {
    const metadata = user?.user_metadata || {};
    const email = String(user?.email || "").toLowerCase();
    const role = metadata.role || inferRoleFromEmail(email);
    const stored = UserStore.getByEmail(email);
    const storedRole = stored?.role || role;
    const applicantRole = isMentorApplicant(stored) ? 'mentor' : storedRole;
    return {
      email,
      name: stored?.name || metadata.full_name || metadata.name || email.split("@")[0] || "User",
      role: applicantRole,
      status: stored?.status || metadata.status || (role === "mentor" ? "pending" : "active"),
      onboarded: stored?.onboarded ?? metadata.onboarded ?? role === "admin",
      profile: stored?.profile ?? metadata.profile,
      applicationData: stored?.applicationData ?? metadata.applicationData,
      rejectedAt: stored?.rejectedAt ?? metadata.rejectedAt ?? null
    };
  },
  syncCurrentUserFromStore(email) {
    const current = this.getUser();
    const targetEmail = String(email || current?.email || "").toLowerCase();
    if (!targetEmail) return null;

    const stored = UserStore.getByEmail(targetEmail);
    if (!stored) return current;

    const merged = this.normalizeUser({ ...(current || {}), ...stored });
    this.setUser(merged);
    return merged;
  },
  normalizeUser(user) {
    if (!user) return null;
    const role = isMentorApplicant(user) ? 'mentor' : (user.role || inferRoleFromEmail(user.email));
    const merged = {
      ...user,
      role: user.email ? (user.email.endsWith('@mentorist.org') || user.email.startsWith('admin') ? 'admin' : role) : role,
      status: user.status || (isMentorApplicant(user) || role === "mentor" ? "pending" : "active"),
      onboarded: user.onboarded ?? role === "admin"
    };
    return merged;
  },
  getUser() {
    try { const r = localStorage.getItem("mn_user"); return r ? JSON.parse(r) : null; }
    catch { return null; }
  },
  setUser(u) {
    if (!u) return;
    const normalized = { ...u, email: String(u.email || "").toLowerCase() };
    localStorage.setItem("mn_user", JSON.stringify(normalized));
  },
  updateUser(patch) {
    const u = this.getUser(); if (!u) return;
    const nu = this.normalizeUser({ ...u, ...cleanObject(patch), updatedAt: new Date().toISOString() });
    this.setUser(nu);
    UserStore.addOrUpdate(nu);
  },
  isLoggedIn() { return !!this.getUser(); },
  async forceLogout(reason = 'You have been signed out.') {
    localStorage.setItem('mn_auth_notice', reason);
    localStorage.removeItem("mn_user");
    if (reason) {
      sessionStorage.removeItem("mn_admin_session");
    }
    try {
      void supabaseClient.auth.signOut();
    } catch {}
    if (!window.location.pathname.includes('auth.html')) {
      window.location.href = 'auth.html?mode=login';
    }
  },
  async logout() {
    if(!confirm("Are you sure you want to log out?")) return;
    await this.forceLogout('You have been signed out.');
  },
  requireAuth() {
    const u = this.getUser();
    if (!u) { window.location.href = "auth.html"; return null; }
    return u;
  },
  routeAfterLogin(user) {
    if (!user) { window.location.href = "auth.html"; return; }
    
    user = this.normalizeUser(this.syncCurrentUserFromStore(user.email) || user);
    
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
  async refreshFromRemote() {
    try {
      const { data, error } = await supabaseClient
        .from(CONFIG.TABLES.users)
        .select("*")
        .order("updated_at", { ascending: false });
      if (error) throw error;
      const remoteUsers = (data || []).map(fromRemoteUser).filter(Boolean);
      const localUsers = this.getAll();
      const merged = mergeUsersByEmail([...localUsers, ...remoteUsers]);
      this.save(merged);
      for (const localUser of localUsers) {
        if (localUser?.email && !remoteUsers.some(remote => remote.email === localUser.email)) {
          void this.persistRemote(localUser);
        }
      }
      return merged;
    } catch (err) {
      console.warn("Mentorist remote sync unavailable, using local cache.", err?.message || err);
      return this.getAll();
    }
  },
  async persistRemote(user) {
    const row = toRemoteUser(user);
    if (!row) return;
    try {
      const { error } = await supabaseClient
        .from(CONFIG.TABLES.users)
        .upsert(row, { onConflict: "email" });
      if (error) throw error;
    } catch (err) {
      console.warn("Unable to persist Mentorist user remotely.", err?.message || err);
    }
  },
  getByEmail(email) {
    if (!email) return null;
    const normalizedEmail = String(email).toLowerCase();
    return this.getAll().find(u => String(u.email).toLowerCase() === normalizedEmail) || null;
  },
  addOrUpdate(user) {
    const users = this.getAll();
    const normalizedEmail = String(user?.email || "").toLowerCase();
    const nu = { ...user, email: normalizedEmail, updatedAt: new Date().toISOString() };
    const idx = users.findIndex(u => String(u.email).toLowerCase() === normalizedEmail);
    if (idx > -1) {
      users[idx] = { ...users[idx], ...nu };
    } else {
      users.push(nu);
    }
    this.save(mergeUsersByEmail(users));
    void this.persistRemote(nu);
  },
  updateStatus(email, status) {
    this.updateUserFields(email, { status });
  },
  updateUserFields(email, fields) {
    const users = this.getAll();
    const targetEmail = String(email || "").toLowerCase();
    const u = users.find(x => String(x.email).toLowerCase() === targetEmail);
    if (u) {
      Object.assign(u, cleanObject(fields), { updatedAt: new Date().toISOString() });
      this.save(mergeUsersByEmail(users));
      void this.persistRemote(u);
      const curr = Auth.getUser();
      if (curr && String(curr.email).toLowerCase() === targetEmail) {
        const synced = Auth.syncCurrentUserFromStore(targetEmail);
        if (synced?.status === 'rejected') {
          Auth.forceLogout('Your account was rejected by the Mentorist admin team.');
          return;
        }
        if (synced && window.location.pathname.includes('mentorapplication.html') && synced.role === 'mentor' && synced.status === 'active') {
          Auth.routeAfterLogin(synced);
        }
      }
      if (typeof window.refreshMentoristState === 'function') {
        window.refreshMentoristState(targetEmail);
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
  async refreshFromRemote() {
    try {
      const { data, error } = await supabaseClient
        .from(CONFIG.TABLES.questions)
        .select("*")
        .order("created_at", { ascending: false });
      if (error) throw error;
      const remoteQuestions = (data || []).map(fromRemoteQuestion).filter(Boolean);
      const local = this.getAll();
      const merged = [...remoteQuestions];
      for (const q of local) {
        if (!merged.some(r => r.id === q.id)) merged.push(q);
      }
      this.save(merged);
      for (const localQuestion of local) {
        if (localQuestion?.id && !remoteQuestions.some(remote => remote.id === localQuestion.id)) {
          void this.persistRemote(localQuestion);
        }
      }
      return merged;
    } catch (err) {
      console.warn("Mentorist remote question sync unavailable, using local cache.", err?.message || err);
      return this.getAll();
    }
  },
  async persistRemote(question) {
    const row = toRemoteQuestion(question);
    if (!row) return;
    try {
      const { error } = await supabaseClient
        .from(CONFIG.TABLES.questions)
        .upsert(row, { onConflict: "id" });
      if (error) throw error;
    } catch (err) {
      console.warn("Unable to persist Mentorist question remotely.", err?.message || err);
    }
  },
  add(q) {
    const qs = this.getAll();
    const nq = {
      id: `q_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`,
      ...q,
      studentEmail: q.studentEmail ? String(q.studentEmail).toLowerCase() : q.studentEmail,
      createdAt: new Date().toISOString(),
      status: "pending",
      answers: []
    };
    qs.unshift(nq);
    this.save(qs);
    void this.persistRemote(nq);
    return nq;
  },
  getForStudent(email) {
    const target = String(email || '').toLowerCase();
    return this.getAll().filter(q => String(q.studentEmail || '').toLowerCase() === target);
  },
  addAnswer(questionId, answer) {
    const qs = this.getAll();
    const q = qs.find(x => x.id === questionId);
    if (q) {
      if (!q.answers) q.answers = [];
      q.answers.push({ ...answer, createdAt: new Date().toISOString() });
      q.status = 'answered';
      this.save(qs);
      void this.persistRemote(q);
    }
  },
  delete(id) {
    const qs = this.getAll().filter(q => q.id !== id);
    this.save(qs);
    void supabaseClient.from(CONFIG.TABLES.questions).delete().eq('id', id);
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
      void this.persistRemote(q);
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
  async refreshFromRemote() {
    try {
      const { data, error } = await supabaseClient
        .from(CONFIG.TABLES.alerts)
        .select("*")
        .order("created_at", { ascending: false });
      if (error) throw error;
      const remoteAlerts = (data || []).map(fromRemoteAlert).filter(Boolean);
      const localAlerts = this.getAll();
      const merged = [...remoteAlerts];
      for (const alert of localAlerts) {
        if (!merged.some(remote => remote.id === alert.id)) merged.push(alert);
      }
      this.save(merged);
      for (const localAlert of localAlerts) {
        if (localAlert?.id && !remoteAlerts.some(remote => remote.id === localAlert.id)) {
          void this.persistRemote(localAlert);
        }
      }
      return merged;
    } catch (err) {
      console.warn("Mentorist remote alert sync unavailable, using local cache.", err?.message || err);
      return this.getAll();
    }
  },
  async persistRemote(alert) {
    const row = toRemoteAlert(alert);
    if (!row) return;
    try {
      const { error } = await supabaseClient
        .from(CONFIG.TABLES.alerts)
        .upsert(row, { onConflict: "id" });
      if (error) throw error;
    } catch (err) {
      console.warn("Unable to persist Mentorist alert remotely.", err?.message || err);
    }
  },
  add(al) {
    const als = this.getAll();
    const nal = { id: `al_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`, ...al, createdAt: new Date().toISOString() };
    als.unshift(nal);
    this.save(als);
    void this.persistRemote(nal);
    return nal;
  },
  delete(id) {
    const als = this.getAll().filter(a => a.id !== id);
    this.save(als);
    void supabaseClient.from(CONFIG.TABLES.alerts).delete().eq('id', id);
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
      
      await supabaseClient.auth.signInWithOAuth({
        provider: 'google',
        options: {
          redirectTo: new URL('auth.html?mode=login', window.location.origin).href,
          queryParams: {
            prompt: 'select_account'
          }
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
        { label: 'Logout', icon: 'log-out', link: '#', action: () => Auth.forceLogout('You have been signed out.') }
      ];
    } else if (user.role === 'mentor') {
      items = [
        { label: 'Home', icon: 'home', link: 'mentordashboard.html' },
        { label: 'Vault', icon: 'archive', link: 'vault.html' },
        { label: 'Logout', icon: 'log-out', link: '#', action: () => Auth.forceLogout('You have been signed out.') }
      ];
    } else {
      items = [
        { label: 'Home', icon: 'home', link: 'studentdashboard.html' },
        { label: 'Vault', icon: 'archive', link: 'vault.html' },
        { label: 'Logout', icon: 'log-out', link: '#', action: () => Auth.forceLogout('You have been signed out.') }
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
  const needsRemoteSync = /auth\.html|admin\.html|mentor-review\.html|mentorapplication\.html|studentdashboard\.html|mentordashboard\.html|onboarding\.html|vault\.html/.test(window.location.pathname);
  if (needsRemoteSync) {
    UserStore.refreshFromRemote().then(() => {
      QuestionStore.refreshFromRemote().finally(() => {
        AlertStore.refreshFromRemote().finally(() => {
          if (typeof window.refreshMentoristState === 'function') {
            window.refreshMentoristState();
          }
        });
      });
    });
    // Subscribe to real-time changes on the users table so admin views update instantly
    try {
      if (typeof window.setRealtimeStatus === 'function') window.setRealtimeStatus('connecting');
      const channel = supabaseClient.channel('public:mentorist_profiles');
      channel.on('postgres_changes', { event: '*', schema: 'public', table: CONFIG.TABLES.users }, (payload) => {
        try {
          const evt = payload.event || payload.eventType || payload.type || '';
          if (evt === 'INSERT' || evt === 'UPDATE' || evt === 'UPDATE:') {
            const newRow = payload.new || payload.record || payload.payload || null;
            const u = fromRemoteUser(newRow);
            if (u) {
              UserStore.addOrUpdate(u);
              if (typeof window.refreshMentoristState === 'function') window.refreshMentoristState(u.email);
            }
          } else if (evt === 'DELETE') {
            const oldRow = payload.old || payload.record || null;
            const email = oldRow?.email;
            if (email) {
              const users = UserStore.getAll().filter(x => x.email !== String(email).toLowerCase());
              UserStore.save(users);
              if (typeof window.refreshMentoristState === 'function') window.refreshMentoristState();
            }
          }
        } catch (e) {
          console.warn('Realtime user event handling error', e?.message || e);
        }
      }).subscribe();
      if (typeof window.setRealtimeStatus === 'function') window.setRealtimeStatus('connected');
    } catch (e) {
      console.warn('Realtime subscription unavailable', e?.message || e);
      if (typeof window.setRealtimeStatus === 'function') window.setRealtimeStatus('disconnected');
    }
    setInterval(() => {
      UserStore.refreshFromRemote().then(() => {
        QuestionStore.refreshFromRemote().finally(() => {
          AlertStore.refreshFromRemote().finally(() => {
            if (typeof window.refreshMentoristState === 'function') {
              window.refreshMentoristState();
            }
          });
        });
      });
    }, 5000);

    window.addEventListener('focus', () => {
      UserStore.refreshFromRemote().then(() => {
        QuestionStore.refreshFromRemote().finally(() => {
          AlertStore.refreshFromRemote().finally(() => {
            if (typeof window.refreshMentoristState === 'function') {
              window.refreshMentoristState();
            }
          });
        });
      }).catch(() => {});
    });
  }
});

window.setRealtimeStatus = function(status) {
  const badge = document.getElementById('realtimeStatusBadge');
  if (!badge) return;
  badge.textContent = `Realtime: ${status}`;
  badge.className = `realtime-badge realtime-${String(status).toLowerCase().replace(/\s+/g,'-')}`;
};

window.refreshMentoristState = function(email) {
  const current = Auth.getUser();
  const targetEmail = email || current?.email;
  const refreshed = targetEmail ? Auth.syncCurrentUserFromStore(targetEmail) : current;

  if (refreshed?.status === 'rejected' && current && String(current.email || '').toLowerCase() === String(targetEmail || '').toLowerCase()) {
    Auth.forceLogout('Your Mentorist account was rejected by the admin team.');
    return;
  }

  if (window.location.pathname.includes('admin.html')) {
    if (typeof window.render === 'function') window.render();
    if (typeof window.renderStats === 'function') window.renderStats();
    if (typeof window.renderAlerts === 'function') window.renderAlerts();
    if (typeof window.renderQuestions === 'function') window.renderQuestions();
  }

  if (window.location.pathname.includes('mentor-review.html') && typeof window.renderQueue === 'function') {
    window.renderQueue();
  }

  if (window.location.pathname.includes('studentdashboard.html')) {
    if (typeof window.refreshFeed === 'function') window.refreshFeed();
    if (typeof window.renderAlerts === 'function') window.renderAlerts();
  }

  if (window.location.pathname.includes('mentordashboard.html')) {
    if (typeof window.render === 'function') window.render();
    if (typeof window.renderAlerts === 'function') window.renderAlerts();
  }

  if (window.location.pathname.includes('mentorapplication.html') && refreshed && refreshed.role === 'mentor' && refreshed.status === 'active') {
    Auth.routeAfterLogin(refreshed);
  }

  if (window.location.pathname.includes('auth.html') && refreshed) {
    Auth.routeAfterLogin(refreshed);
  }
};

window.addEventListener('storage', (event) => {
  if (event.key !== 'mn_all_users') return;
  window.refreshMentoristState();
});

/* ===== GLOBAL BROADCAST SYSTEM ===== */
const GlobalBroadcast = {
  init() {
    return;
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
