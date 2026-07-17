/* ============================================================
   MENTORIST — shared.js v4
   Fixed routing · Auth state · Toast · QuestionStore
   ============================================================ */

const CONFIG = {
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
  // SECURITY: only the verified @mentorist.org domain maps to admin. The old
  // `startsWith("admin")` rule let anyone register e.g. admin@gmail.com and
  // self-promote. Real admin authority should be granted server-side via DB
  // role + RLS; this domain check is a stopgap.
  if (lower.endsWith("@mentorist.org")) return "admin";
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

const GOOGLE_POST_AUTH_ROUTE_KEY = 'mn_google_post_auth_route';
const GOOGLE_OAUTH_PENDING_KEY = 'mn_google_oauth_pending';
const GOOGLE_OAUTH_PENDING_TTL_MS = 10 * 60 * 1000;

function setGooglePostAuthRoute(route) {
  if (!route) {
    clearGooglePostAuthRoute();
    return;
  }
  try { sessionStorage.setItem(GOOGLE_POST_AUTH_ROUTE_KEY, route); } catch {}
  try { localStorage.setItem(GOOGLE_POST_AUTH_ROUTE_KEY, route); } catch {}
}

function clearGooglePostAuthRoute() {
  try { sessionStorage.removeItem(GOOGLE_POST_AUTH_ROUTE_KEY); } catch {}
  try { localStorage.removeItem(GOOGLE_POST_AUTH_ROUTE_KEY); } catch {}
}

function consumeGooglePostAuthRoute() {
  let route = null;
  try { route = sessionStorage.getItem(GOOGLE_POST_AUTH_ROUTE_KEY); } catch {}
  if (!route) {
    try { route = localStorage.getItem(GOOGLE_POST_AUTH_ROUTE_KEY); } catch {}
  }
  clearGooglePostAuthRoute();
  return route;
}

function markGoogleOAuthPending() {
  try { localStorage.setItem(GOOGLE_OAUTH_PENDING_KEY, String(Date.now())); } catch {}
}

function clearGoogleOAuthPending() {
  try { localStorage.removeItem(GOOGLE_OAUTH_PENDING_KEY); } catch {}
}

function hasRecentGoogleOAuthPending() {
  try {
    const raw = localStorage.getItem(GOOGLE_OAUTH_PENDING_KEY);
    if (!raw) return false;
    const startedAt = parseInt(raw, 10);
    if (!Number.isFinite(startedAt)) {
      localStorage.removeItem(GOOGLE_OAUTH_PENDING_KEY);
      return false;
    }
    const fresh = (Date.now() - startedAt) < GOOGLE_OAUTH_PENDING_TTL_MS;
    if (!fresh) localStorage.removeItem(GOOGLE_OAUTH_PENDING_KEY);
    return fresh;
  } catch {
    return false;
  }
}

function isOAuthCallbackRequest() {
  try {
    const query = new URLSearchParams(window.location.search || '');
    const hash = new URLSearchParams(String(window.location.hash || '').replace(/^#/, ''));
    return query.has('code') ||
      query.has('error') ||
      query.has('error_description') ||
      query.has('provider_token') ||
      query.has('access_token') ||
      hash.has('access_token') ||
      hash.has('refresh_token') ||
      hash.has('error');
  } catch {
    return false;
  }
}

function isAuthPagePath(pathname = window.location.pathname) {
  const normalized = String(pathname || '').toLowerCase();
  return normalized.endsWith('/auth.html') || normalized.endsWith('/auth') || normalized === '/auth.html' || normalized === '/auth';
}

function buildAuthRedirectUrl() {
  const current = new URL(window.location.href);
  const authUrl = new URL('auth.html', current);
  authUrl.search = '';
  authUrl.hash = '';
  return authUrl.toString();
}

// Routing guard — prevents duplicate navigation calls
let _authRoutingInProgress = false;
let _authLastRoutedEmail = null;

// Handle Supabase Auth State globally
supabaseClient.auth.onAuthStateChange(async (event, session) => {
  if ((event === 'SIGNED_IN' || event === 'INITIAL_SESSION') && session?.user) {
    let user = session.user;
    const metadata = user.user_metadata || {};
    const email = String(user.email || "").toLowerCase();
    const pendingRole = localStorage.getItem('pendingRole');
    const storedUser = UserStore.getByEmail(email);
    let nextMetadata = { ...metadata };

    console.log(`[AUTH] ${event} event for ${email}, role=${metadata.role || 'unset'}, pendingRole=${pendingRole}`);

    if (email.endsWith('@mentorist.org')) {
      console.log(`[AUTH] Admin detected via verified domain: ${email}`);
      nextMetadata = { ...nextMetadata, role: 'admin', onboarded: true, status: 'active' };
      localStorage.removeItem('pendingRole');
      void supabaseClient.auth.updateUser({ data: { role: 'admin', onboarded: true, status: 'active' } })
        .catch(err => console.warn("[AUTH] Failed to persist admin metadata:", err?.message));
    } else if (!nextMetadata.role && pendingRole) {
      console.log(`[AUTH] First-time signup: setting role to ${pendingRole}`);
      nextMetadata = {
        ...nextMetadata,
        role: pendingRole,
        status: pendingRole === 'mentor' ? 'pending' : 'active',
        onboarded: pendingRole === 'admin',
        full_name: metadata.full_name || email.split("@")[0]
      };
      localStorage.removeItem('pendingRole');
      void supabaseClient.auth.updateUser({
        data: { role: pendingRole, status: pendingRole === 'mentor' ? 'pending' : 'active', onboarded: pendingRole === 'admin', full_name: metadata.full_name || email.split("@")[0] }
      }).catch(err => console.warn("[AUTH] Failed to persist signup metadata:", err?.message));
    } else if (!nextMetadata.role && storedUser?.role) {
      console.log(`[AUTH] Returning user found in store: ${storedUser.role}`);
      nextMetadata = {
        ...nextMetadata,
        role: storedUser.role,
        status: storedUser.status || (storedUser.role === 'mentor' ? 'pending' : 'active'),
        onboarded: storedUser.onboarded ?? storedUser.role === 'admin',
        profile: storedUser.profile || null,
        applicationData: storedUser.applicationData || null,
        dismissedAlertIds: storedUser.dismissedAlertIds || []
      };
      void supabaseClient.auth.updateUser({
        data: { role: storedUser.role, status: storedUser.status || (storedUser.role === 'mentor' ? 'pending' : 'active'), onboarded: storedUser.onboarded ?? storedUser.role === 'admin', profile: storedUser.profile || null, applicationData: storedUser.applicationData || null, dismissedAlertIds: storedUser.dismissedAlertIds || [] }
      }).catch(err => console.warn("[AUTH] Failed to restore stored user data:", err?.message));
    } else if (!nextMetadata.role) {
      console.log("[AUTH] New user detected, setting default role to student");
      nextMetadata = { ...nextMetadata, role: 'student', status: 'active', onboarded: false };
      void supabaseClient.auth.updateUser({ data: { role: 'student', status: 'active', onboarded: false } })
        .catch(err => console.warn("[AUTH] Failed to set default role:", err?.message));
    }

    user = { ...user, user_metadata: nextMetadata };
    const appUser = Auth.finalizeAuthenticatedUser(user);
    console.log(`[AUTH] App user created:`, { email: appUser.email, role: appUser.role, onboarded: appUser.onboarded });

    // Background sync — never blocks routing
    void UserStore.refreshFromRemote()
      .then(() => console.log("[AUTH] Remote data refreshed"))
      .catch(err => console.warn("[AUTH] Remote sync warning:", err?.message));

    const shouldAutoRoute = isAuthPagePath() || isOAuthCallbackRequest() || hasRecentGoogleOAuthPending();
    if (shouldAutoRoute) {
      // Prevent duplicate routing for same user
      if (_authRoutingInProgress && _authLastRoutedEmail === email) {
        console.log("[AUTH] Routing already in progress for this user, skipping duplicate");
        return;
      }
      _authRoutingInProgress = true;
      _authLastRoutedEmail = email;
      setTimeout(() => { _authRoutingInProgress = false; }, 3000);

      clearGoogleOAuthPending();
      const googleRoute = consumeGooglePostAuthRoute();
      if (googleRoute === 'mentor-review') {
        console.log("[AUTH] Routing to mentor-review page");
        window.location.href = 'mentor-review.html';
        return;
      }
      if (!appUser.onboarded && appUser.role === 'mentor') {
        console.log("[AUTH] New mentor signup, routing to mentor-review");
        window.location.href = 'mentor-review.html';
        return;
      }
      if (!appUser.onboarded && appUser.role === 'student') {
        console.log("[AUTH] New student signup, routing to onboarding");
        window.location.href = 'onboarding.html';
        return;
      }
      console.log("[AUTH] Routing after login");
      Auth.routeAfterLogin(appUser);
    } else {
      console.log("[AUTH] Not on auth page, skipping auto-route");
    }
  } else if (event === 'SIGNED_OUT') {
    console.log("[AUTH] Sign-out event");
    _authRoutingInProgress = false;
    _authLastRoutedEmail = null;
    localStorage.removeItem("mn_user");
    localStorage.removeItem('pendingRole');
    clearGooglePostAuthRoute();
    clearGoogleOAuthPending();
    const currentPath = window.location.pathname;
    if (!currentPath.includes('/index') && currentPath !== '/' && !currentPath.includes('/auth') && !currentPath.includes('/admin')) {
      window.location.href = "index.html";
    }
  }
});

/* ===== AUTH ===== */
const Auth = {
  fromSupabaseUser(user, options = {}) {
    const metadata = user?.user_metadata || {};
    const email = String(user?.email || "").toLowerCase();
    const pendingRole = options.pendingRole || null;
    let role = metadata.role || pendingRole || inferRoleFromEmail(email);
    
    const stored = UserStore.getByEmail(email);
    const storedRole = stored?.role || role;
    
    // Determine if this is a mentor applicant (pending approval)
    const isMentorPending = isMentorApplicant(stored);
    const finalRole = isMentorPending ? 'mentor' : storedRole;
    
    const appUser = {
      email,
      name: stored?.name || metadata.full_name || metadata.name || email.split("@")[0] || "User",
      role: finalRole,
      status: stored?.status || metadata.status || (finalRole === "mentor" ? "pending" : "active"),
      onboarded: stored?.onboarded ?? metadata.onboarded ?? finalRole === "admin",
      profile: stored?.profile ?? metadata.profile,
      applicationData: stored?.applicationData ?? metadata.applicationData,
      rejectedAt: stored?.rejectedAt ?? metadata.rejectedAt ?? null
    };
    
    console.log(`[AUTH] fromSupabaseUser created:`, appUser);
    return appUser;
  },
  finalizeAuthenticatedUser(user, options = {}) {
    if (!user) return null;
    const appUser = this.normalizeUser(this.fromSupabaseUser(user, options));
    this.setUser(appUser);
    UserStore.addOrUpdate(appUser);
    return appUser;
  },
  async bootstrapFromSession(options = {}) {
    try {
      // Race: getSession vs 4s timeout — prevents page freeze
      const sessionPromise = supabaseClient.auth.getSession();
      const timeoutPromise = new Promise((_, reject) =>
        setTimeout(() => reject(new Error('Session bootstrap timed out')), 4000)
      );
      const { data, error } = await Promise.race([sessionPromise, timeoutPromise]);
      if (error) throw error;
      const sessionUser = data?.session?.user;
      if (!sessionUser) return null;
      return this.finalizeAuthenticatedUser(sessionUser, options);
    } catch (err) {
      console.warn("[AUTH] Session bootstrap failed or timed out:", err?.message || err);
      return null;
    }
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
      role: user.email ? (user.email.endsWith('@mentorist.org') ? 'admin' : role) : role,
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
  async forceLogout(reason = null) {
    localStorage.setItem('mn_auth_notice', reason || 'You have been signed out.');
    localStorage.removeItem("mn_user");
    if (reason) {
      sessionStorage.removeItem("mn_admin_session");
    }
    try {
      if (supabaseClient && supabaseClient.auth) {
        await supabaseClient.auth.signOut();
      }
    } catch (e) {
      console.warn("Failed to sign out from Supabase:", e);
    }
    if (!window.location.pathname.includes('/auth')) {
      window.location.href = 'auth.html?mode=login';
    }
  },
  async logout() {
    if(!confirm("Are you sure you want to log out?")) return;
    await this.forceLogout('You have been signed out.');
  },
  requireAuth() {
    const u = this.getUser();
    if (!u) {
      // Check for any Supabase session token key (handles different Supabase project refs)
      const hasSupabaseToken = Object.keys(localStorage).some(k =>
        k.startsWith('sb-') && k.endsWith('-auth-token')
      );
      if (hasSupabaseToken) {
        // Session may exist — bootstrap silently in background and show loading placeholder
        void this.bootstrapFromSession({ route: true }).then(bootstrapped => {
          if (bootstrapped) {
            // User loaded — page will route automatically via onAuthStateChange
            console.log('[AUTH] requireAuth: bootstrapped user from token, routing...');
          } else {
            // Token was stale — redirect to auth
            console.log('[AUTH] requireAuth: stale token, redirecting to auth');
            window.location.href = 'auth.html';
          }
        }).catch(() => { window.location.href = 'auth.html'; });
        return { email: 'loading@mentorist.org', role: 'student', name: 'Loading...', status: 'active', onboarded: true };
      }
      window.location.href = "auth.html";
      return null;
    }
    return u;
  },
  routeAfterLogin(user) {
    if (!user) return;
    user = this.normalizeUser(this.syncCurrentUserFromStore(user.email) || user);
    
    if (user.status === 'banned' || user.status === 'suspended' || user.status === 'rejected') {
      Auth.forceLogout(`Your account is ${user.status}.`);
      return;
    }

    UserStore.addOrUpdate(user);
    
    // ADMIN routing (highest priority)
    if (user.role === "admin" || user.email.endsWith('@mentorist.org')) {
      if (user.role !== 'admin') {
        user.role = 'admin';
        this.setUser(user);
        UserStore.addOrUpdate(user);
        console.log("[ROUTE] Set role to admin based on email");
      }
      console.log("[ROUTE] Admin detected, routing to admin.html");
      window.location.href = "admin.html";
      return;
    }
    
    // MENTOR routing
    if (user.role === "mentor") {
      if (user.status === "rejected") { 
        console.log("[ROUTE] Mentor rejected, routing to mentorapplication");
        window.location.href = "mentorapplication.html"; 
        return; 
      }
      
      // New mentors (not onboarded) go to mentor-review for application
      if (!user.onboarded) {
        console.log("[ROUTE] New mentor, routing to mentor-review");
        window.location.href = "mentor-review.html";
        return;
      }
      
      if (user.status !== "active") { 
        console.log("[ROUTE] Mentor not active (status=" + user.status + "), routing to mentorapplication");
        window.location.href = "mentorapplication.html"; 
        return; 
      }
      
      console.log("[ROUTE] Active mentor, routing to mentordashboard");
      window.location.href = "mentordashboard.html"; 
      return;
    }
    
    // STUDENT routing
    if (!user.onboarded) { 
      console.log("[ROUTE] Student not onboarded, routing to onboarding");
      window.location.href = "onboarding.html"; 
      return; 
    }
    
    console.log("[ROUTE] Student onboarded, routing to studentdashboard");
    window.location.href = "studentdashboard.html";
  }
};

/* ===== USER STORE (ADMIN) ===== */
const UserStore = {
  getAll() {
    try { const r = localStorage.getItem("mn_all_users"); return r ? JSON.parse(r) : []; }
    catch { return []; }
  },
  save(users) { localStorage.setItem("mn_all_users", JSON.stringify(users)); },
  async refreshFromRemote(retries = 3) {
    let lastError = null;
    
    for (let attempt = 0; attempt < retries; attempt++) {
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
        
        // Persist any local users that don't exist remotely
        for (const localUser of localUsers) {
          if (localUser?.email && !remoteUsers.some(remote => remote.email === localUser.email)) {
            void this.persistRemote(localUser);
          }
        }
        return merged;
      } catch (err) {
        lastError = err;
        if (attempt < retries - 1) {
          // Wait before retrying with exponential backoff
          await new Promise(resolve => setTimeout(resolve, Math.pow(2, attempt) * 1000));
        }
      }
    }
    
    console.warn("Mentorist remote sync failed after retries. Using local cache.", lastError?.message || lastError);
    return this.getAll();
  },
  async persistRemote(user, retries = 3) {
    const row = toRemoteUser(user);
    if (!row) {
      console.warn("Unable to create remote user row: invalid user object", user);
      return;
    }
    
    for (let attempt = 0; attempt < retries; attempt++) {
      try {
        const { data, error } = await supabaseClient
          .from(CONFIG.TABLES.users)
          .upsert(row, { onConflict: "email" });
        
        if (error) {
          throw new Error(`Upsert failed: ${error.message}`);
        }
        
        // Successfully persisted
        console.log(`✓ User profile persisted for ${row.email}`);
        return;
      } catch (err) {
        const isLastAttempt = attempt === retries - 1;
        const message = `Persist attempt ${attempt + 1}/${retries} failed: ${err?.message || err}`;
        
        if (isLastAttempt) {
          console.error(`✗ Failed to persist user ${row.email} after ${retries} attempts:`, err?.message || err);
        } else {
          console.warn(message);
          await new Promise(resolve => setTimeout(resolve, Math.pow(2, attempt) * 1000));
        }
      }
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
        if ((synced?.status === 'rejected' || synced?.status === 'banned') && !window.location.pathname.includes('/admin')) {
          Auth.forceLogout('Your account was permanently banned or rejected by the Mentorist admin team.');
          return;
        }
        if (synced?.status === 'suspended' && !window.location.pathname.includes('/admin')) {
          Auth.forceLogout('Your account has been temporarily suspended.');
          return;
        }
        if (synced && window.location.pathname.includes('/mentorapplication') && synced.role === 'mentor' && synced.status === 'active') {
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
  async refreshFromRemote(retries = 2) {
    let lastError = null;
    
    for (let attempt = 0; attempt < retries; attempt++) {
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
        lastError = err;
        if (attempt < retries - 1) {
          await new Promise(resolve => setTimeout(resolve, Math.pow(2, attempt) * 1000));
        }
      }
    }
    
    console.warn("Mentorist remote question sync failed after retries. Using local cache.", lastError?.message || lastError);
    return this.getAll();
  },
  async persistRemote(question, retries = 2) {
    const row = toRemoteQuestion(question);
    if (!row) return;
    
    for (let attempt = 0; attempt < retries; attempt++) {
      try {
        const { error } = await supabaseClient
          .from(CONFIG.TABLES.questions)
          .upsert(row, { onConflict: "id" });
        if (error) throw error;
        return; // Success
      } catch (err) {
        if (attempt < retries - 1) {
          await new Promise(resolve => setTimeout(resolve, Math.pow(2, attempt) * 500));
        } else {
          console.warn("Unable to persist Mentorist question remotely.", err?.message || err);
        }
      }
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
    if (!email) return [];
    const target = String(email).toLowerCase();
    return this.getAll().filter(q => {
      const qEmail = String(q.studentEmail || '').toLowerCase();
      return qEmail === target && qEmail.length > 0;
    });
  },
  addAnswer(questionId, answer) {
    if (!questionId || !answer) return;
    const qs = this.getAll();
    const q = qs.find(x => x.id === questionId);
    if (q) {
      if (!Array.isArray(q.answers)) q.answers = [];
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
    if (q && Array.isArray(q.answers) && aIdx >= 0 && aIdx < q.answers.length) {
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
  async refreshFromRemote(retries = 2) {
    let lastError = null;
    
    for (let attempt = 0; attempt < retries; attempt++) {
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
        lastError = err;
        if (attempt < retries - 1) {
          await new Promise(resolve => setTimeout(resolve, Math.pow(2, attempt) * 1000));
        }
      }
    }
    
    console.warn("Mentorist remote alert sync failed after retries. Using local cache.", lastError?.message || lastError);
    return this.getAll();
  },
  async persistRemote(alert, retries = 2) {
    const row = toRemoteAlert(alert);
    if (!row) return;
    
    for (let attempt = 0; attempt < retries; attempt++) {
      try {
        const { error } = await supabaseClient
          .from(CONFIG.TABLES.alerts)
          .upsert(row, { onConflict: "id" });
        if (error) throw error;
        return; // Success
      } catch (err) {
        if (attempt < retries - 1) {
          await new Promise(resolve => setTimeout(resolve, Math.pow(2, attempt) * 500));
        } else {
          console.warn("Unable to persist Mentorist alert remotely.", err?.message || err);
        }
      }
    }
  },
  add(al) {
    if (!al || !al.title || !al.body) return null;
    const als = this.getAll();
    const nal = { 
      id: `al_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`, 
      ...al, 
      title: String(al.title).trim(),
      body: String(al.body).trim(),
      tag: String(al.tag || 'Update').trim(),
      author: String(al.author || 'Founder').trim(),
      createdAt: new Date().toISOString() 
    };
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
  require() {
    if (this.check()) return;

    // Halt everything and show a custom password screen
    document.body.innerHTML = `
      <div style="position:fixed;inset:0;background:var(--bg);z-index:99999;display:flex;flex-direction:column;align-items:center;justify-content:center;padding:24px;">
        <div style="max-width:400px;width:100%;background:var(--bg-1);border:1px solid var(--b1);border-radius:var(--r-2xl);padding:40px;text-align:center;box-shadow:0 30px 60px -12px rgba(0,0,0,0.5);">
          <div style="display:inline-flex;align-items:center;justify-content:center;width:48px;height:48px;background:var(--green-dim);color:var(--green);border-radius:50%;margin-bottom:24px;">
            <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><rect x="3" y="11" width="18" height="11" rx="2" ry="2"></rect><path d="M7 11V7a5 5 0 0 1 10 0v4"></path></svg>
          </div>
          <h2 style="font-family:var(--font-h);font-size:28px;color:var(--t1);margin-bottom:12px;font-weight:800;">Restricted Access</h2>
          <p style="color:var(--t3);font-size:15px;margin-bottom:32px;">Please enter the master password to unlock the admin dashboard.</p>
          <input type="password" id="mnAdminPwd" placeholder="Password" style="width:100%;background:var(--bg-2);border:1px solid var(--b2);padding:14px 16px;border-radius:var(--r-lg);color:var(--t1);font-size:16px;margin-bottom:16px;outline:none;transition:border-color 0.2s;" />
          <p id="mnAdminErr" style="color:var(--red);font-size:14px;font-weight:600;margin-bottom:16px;display:none;"></p>
          <button id="mnAdminBtn" style="width:100%;background:var(--green);color:#000;border:none;padding:14px;border-radius:var(--r-pill);font-weight:800;font-size:16px;cursor:pointer;transition:transform 0.2s, background 0.2s;">Unlock Dashboard</button>
        </div>
      </div>
    `;

    let attempts = 3;
    const btn = document.getElementById('mnAdminBtn');
    const input = document.getElementById('mnAdminPwd');
    const err = document.getElementById('mnAdminErr');

    input.addEventListener('focus', () => input.style.borderColor = 'var(--green)');
    input.addEventListener('blur', () => input.style.borderColor = 'var(--b2)');

    const submit = () => {
      const val = input.value;
      if (val === this.PASS) {
        sessionStorage.setItem("mn_admin_session", "active");
        window.location.reload();
      } else {
        attempts--;
        if (attempts > 0) {
          err.textContent = `Incorrect password. ${attempts} attempt${attempts === 1 ? '' : 's'} remaining.`;
          err.style.display = 'block';
          input.value = '';
          input.focus();
          btn.style.transform = 'translateX(-5px)';
          setTimeout(() => btn.style.transform = 'translateX(5px)', 100);
          setTimeout(() => btn.style.transform = 'translateX(0)', 200);
        } else {
          window.location.href = "index.html";
        }
      }
    };

    btn.onclick = submit;
    input.onkeydown = (e) => { if (e.key === 'Enter') submit(); };
    
    // Slight delay to ensure DOM is ready before focusing
    setTimeout(() => input.focus(), 100);

    // Throw an error to completely halt the rest of the script execution in admin.html
    throw new Error("Admin authentication required. Halting execution.");
  }
};

/* ===== UTILS ===== */
const Utils = {
  escapeHtml(unsafe) {
    if (!unsafe) return "";
    return String(unsafe)
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;")
      .replace(/"/g, "&quot;")
      .replace(/'/g, "&#039;");
  },
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
    // Announce toasts to assistive tech. Errors are assertive, others polite.
    wrap.setAttribute("role", "status");
    wrap.setAttribute("aria-live", type === "error" ? "assertive" : "polite");
    wrap.style.cssText = "position:fixed;bottom:28px;left:50%;transform:translateX(-50%);z-index:9000;pointer-events:none;";
    const t = document.createElement("div");
    t.style.cssText = `
      padding:13px 24px;border-radius:999px;font-size:14px;font-weight:600;
      white-space:nowrap;font-family:var(--font);
      box-shadow:0 12px 34px rgba(16,40,30,0.16);backdrop-filter:blur(12px);
      animation:fadeUp 0.3s ease both;
      ${type==="success" ? "background:#ffffff;color:#0b8459;border:1px solid rgba(14,159,110,0.32);" : ""}
      ${type==="error"   ? "background:#ffffff;color:#c93b3b;border:1px solid rgba(220,75,75,0.32);" : ""}
      ${type==="info"    ? "background:#ffffff;color:#2f74d0;border:1px solid rgba(47,116,208,0.32);" : ""}
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
      try {
        console.log(`[GOOGLE] ${isSignup ? 'Signup' : 'Login'} initiated`);
        
        if (isSignup) {
          // Save selected role before redirecting out to Google
          const roleCard = document.querySelector('.role-card.selected');
          if (roleCard) {
            const selectedRole = roleCard.dataset.role;
            console.log(`[GOOGLE] Saving pending role: ${selectedRole}`);
            localStorage.setItem('pendingRole', selectedRole);
            
            if (selectedRole === 'mentor') {
              setGooglePostAuthRoute('mentor-review');
              console.log(`[GOOGLE] Mentor signup - will route to mentor-review after auth`);
            } else {
              localStorage.setItem('mn_student_tour_pending', '1');
              clearGooglePostAuthRoute();
              console.log(`[GOOGLE] ${selectedRole} signup - will route to normal path with student tour pending`);
            }
          } else {
            console.warn("[GOOGLE] No role card selected!");
          }
        } else {
          clearGooglePostAuthRoute();
          try { localStorage.removeItem('mn_student_tour_pending'); } catch {}
        }

        // Build the proper redirect URL - use absolute URL construction
        let redirectUrl = '';
        try {
          redirectUrl = buildAuthRedirectUrl();
          console.log(`[GOOGLE] Redirect URL (constructor): ${redirectUrl}`);
        } catch (e) {
          // Fallback: manual URL construction
          redirectUrl = window.location.protocol + '//' + window.location.host + '/auth.html';
          console.log(`[GOOGLE] Redirect URL (fallback): ${redirectUrl}`);
        }
        
        console.log(`[GOOGLE] Starting OAuth flow with redirect: ${redirectUrl}`);
        markGoogleOAuthPending();
        
        const { error } = await supabaseClient.auth.signInWithOAuth({
          provider: 'google',
          options: {
            redirectTo: redirectUrl,
            skipBrowserRedirect: false,
            queryParams: {
              prompt: 'select_account'
            }
          }
        });

        if (error) {
          localStorage.removeItem('pendingRole');
          clearGooglePostAuthRoute();
          clearGoogleOAuthPending();
          Utils.toast(`Google sign-in failed: ${error.message || 'Unknown error'}`, 'error');
          console.error('[GOOGLE] OAuth error:', error);
        } else {
          console.log('[GOOGLE] OAuth flow initiated, redirecting to Google...');
        }
      } catch (err) {
        localStorage.removeItem('pendingRole');
        clearGooglePostAuthRoute();
        clearGoogleOAuthPending();
        Utils.toast('An error occurred during Google sign-in. Please try again.', 'error');
        console.error('[GOOGLE] OAuth exception:', err);
      }
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
  const needsRemoteSync = /\/auth|\/admin|\/mentor-review|\/mentorapplication|\/studentdashboard|\/mentordashboard|\/onboarding|\/vault/.test(window.location.pathname);
  if (needsRemoteSync) {
    if (window.location.pathname.includes('/admin') && !AdminAuth.check()) return; // Don't sync if locked out

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
      }).subscribe((status) => {
        if (typeof window.setRealtimeStatus === 'function') {
          if (status === 'SUBSCRIBED') window.setRealtimeStatus('connected');
          else if (status === 'CLOSED' || status === 'CHANNEL_ERROR') window.setRealtimeStatus('disconnected');
        }
      });
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

  if ((refreshed?.status === 'rejected' || refreshed?.status === 'banned') && current && String(current.email || '').toLowerCase() === String(targetEmail || '').toLowerCase() && !window.location.pathname.includes('/admin')) {
    Auth.forceLogout('Your Mentorist account was permanently banned or rejected by the admin team.');
    return;
  }
  if (refreshed?.status === 'suspended' && current && String(current.email || '').toLowerCase() === String(targetEmail || '').toLowerCase() && !window.location.pathname.includes('/admin')) {
    Auth.forceLogout('Your Mentorist account has been temporarily suspended.');
    return;
  }

  if (window.location.pathname.includes('/admin')) {
    if (typeof window.render === 'function') window.render();
    if (typeof window.renderStats === 'function') window.renderStats();
    if (typeof window.renderAlerts === 'function') window.renderAlerts();
    if (typeof window.renderQuestions === 'function') window.renderQuestions();
  }

  if (window.location.pathname.includes('/mentor-review') && typeof window.renderQueue === 'function') {
    window.renderQueue();
  }

  if (window.location.pathname.includes('/studentdashboard')) {
    if (typeof window.refreshFeed === 'function') window.refreshFeed();
    if (typeof window.renderAlerts === 'function') window.renderAlerts();
  }

  if (window.location.pathname.includes('/mentordashboard')) {
    if (typeof window.render === 'function') window.render();
    if (typeof window.renderAlerts === 'function') window.renderAlerts();
  }

  if (window.location.pathname.includes('/mentorapplication') && refreshed && refreshed.role === 'mentor' && refreshed.status === 'active') {
    Auth.routeAfterLogin(refreshed);
  }

  if (window.location.pathname.includes('/auth') && refreshed) {
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
    // Check if this alert has already been dismissed
    const dismissed = JSON.parse(localStorage.getItem('mn_dismissed_alerts') || '[]');
    if (dismissed.includes(al.id)) {
      console.log('[BROADCAST] Alert already dismissed, skipping:', al.id);
      return;
    }

    const overlay = document.createElement('div');
    overlay.className = 'broadcast-overlay';
    overlay.style.cssText = `
      position:fixed; inset:0; background:rgba(15,28,23,0.45);
      backdrop-filter:blur(10px); -webkit-backdrop-filter:blur(10px);
      z-index:9999; display:flex; align-items:center; justify-content:center;
      padding:24px; animation:fadeIn 0.4s ease;
    `;

    const card = document.createElement('div');
    card.style.cssText = `
      background:var(--bg-1); border:1px solid var(--green);
      border-radius:var(--r-3xl); width:100%; max-width:540px;
      padding:48px; position:relative; overflow:hidden;
      box-shadow: 0 30px 80px rgba(16,40,30,0.25);
      animation:scaleIn 0.5s cubic-bezier(0.2, 1, 0.3, 1);
    `;

    card.innerHTML = `
      <div style="position:absolute; top:0; left:0; width:100%; height:4px; background:linear-gradient(90deg, var(--green), var(--green-4));"></div>
      <div style="display:flex; align-items:center; gap:12px; margin-bottom:24px;">
        <span style="font-size:10px; font-weight:800; color:var(--green); background:var(--green-dim); padding:4px 12px; border-radius:var(--r-pill); text-transform:uppercase; letter-spacing:0.1em; border:1px solid rgba(0,232,122,0.2);">${Utils.escapeHtml(al.tag || 'Global Update')}</span>
        <span style="font-size:12px; color:var(--t4); font-weight:600;">Broadcasted by ${Utils.escapeHtml(al.author || 'Founder')}</span>
      </div>
      <h2 style="font-family:var(--font-h); font-size:32px; font-weight:800; color:var(--t1); margin-bottom:16px; letter-spacing:-0.03em; line-height:1.2;">${Utils.escapeHtml(al.title)}</h2>
      <p style="font-size:16px; color:var(--t2); line-height:1.7; margin-bottom:32px;">${Utils.escapeHtml(al.body)}</p>
      
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
