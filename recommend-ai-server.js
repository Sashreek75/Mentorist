#!/usr/bin/env node

/**
 * Mentorist recommendation server.
 *
 * Responsibilities:
 *  - Holds the Gemini API key server-side (never shipped to the browser).
 *  - Retrieves Mentorist's OWN data (available mentors + broadcast
 *    opportunities) and the student's recent recommendation history, then
 *    injects all of it into the model prompt so advice is grounded in the
 *    platform's real inventory and never repeats itself.
 *  - Adds live Google Search grounding when supported, degrading gracefully
 *    to a plain (ungrounded) call, then to the offline core playbook.
 *  - Enforces server-side rate limiting (the client localStorage quota is
 *    trivially bypassable and is now only a UX hint).
 *  - Persists each generated recommendation for cross-session dedupe + feedback.
 */

const http = require('http');
const { URL } = require('url');
const dotenv = require('dotenv');
const { buildRecommendationBundle } = require('./recommendation-core.js');

dotenv.config();

const PORT = Number(process.env.PORT || 3000);
const HOST = process.env.HOST || '127.0.0.1';
const GEMINI_API_KEY = process.env.GEMINI_API_KEY || process.env.MENTORIST_GEMINI_KEY || '';
const GEMINI_MODEL = process.env.GEMINI_MODEL || 'gemini-2.5-flash';

// Supabase (anon) — used read-only for internal retrieval + history. The anon
// key is public by design; defaults mirror the values already shipped in
// shared.js so the server works out of the box, but env overrides are preferred.
const SUPABASE_URL = process.env.SUPABASE_URL || 'https://vmuukfegnjotlgvdqfrx.supabase.co';
const SUPABASE_KEY = process.env.SUPABASE_ANON_KEY || process.env.SUPABASE_KEY ||
  'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InZtdXVrZmVnbmpvdGxndmRxZnJ4Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3Nzg5NTY2MzYsImV4cCI6MjA5NDUzMjYzNn0.FswR9i0EgMZ5UPs8NpE-es4i3HonKQXilqBPA0ulT3Q';

// CORS: lock to an explicit allowlist when provided, otherwise echo the
// caller's origin (keeps static-host + file:// usage working).
const ALLOWED_ORIGINS = (process.env.ALLOWED_ORIGINS || '')
  .split(',').map((o) => o.trim()).filter(Boolean);

// Server-side rate limits (the real protection; the client quota is cosmetic).
const RATE_PER_IP_PER_HOUR = Number(process.env.RATE_PER_IP_PER_HOUR || 40);
const RATE_PER_USER_PER_DAY = Number(process.env.RATE_PER_USER_PER_DAY || 25);

const SYSTEM_PROMPT = `You are an elite, no-nonsense college and career mentor for a nonprofit that guides high-school students. You behave like a $1,000/hr advisor who genuinely cares.

Core rules:
- Tailor every recommendation to the student's EXACT profile and question. Never give generic advice and never say "join a club."
- Prefer Mentorist's own mentors and opportunities when they fit (they are provided under INTERNAL MENTORIST INVENTORY). Recommend a specific named mentor or opportunity when relevant.
- You MAY also recommend real external opportunities (competitions, scholarships, summer/research programs, courses) by name.
- For EVERY recommendation, add a short "Why this fits you" line tying it to a specific detail from the student's profile.
- Do NOT repeat anything in the "ALREADY RECOMMENDED" list; offer fresh ideas instead.
- Include a brief personalized roadmap (Now / Next / Later) when the request is about planning.
- Be honest about trade-offs. If the profile is missing a key detail, ask up to 2 short follow-up questions first.
- Format in clean Markdown and END with exactly 3 "This Week" action items.`;

/* ─────────────────────────── Supabase (lazy, optional) ─────────────────── */

let _supabase = null;
let _supabaseTried = false;
function getSupabase() {
  if (_supabaseTried) return _supabase;
  _supabaseTried = true;
  try {
    const { createClient } = require('@supabase/supabase-js');
    _supabase = createClient(SUPABASE_URL, SUPABASE_KEY, { auth: { persistSession: false } });
  } catch (err) {
    console.warn('[recommend-ai-server] Supabase unavailable, retrieval disabled:', err.message);
    _supabase = null;
  }
  return _supabase;
}

async function safe(promise, fallback) {
  try {
    const value = await promise;
    return value;
  } catch (err) {
    console.warn('[recommend-ai-server] retrieval step failed:', err.message);
    return fallback;
  }
}

// Available Mentorist mentors (role=mentor, active) with their expertise.
async function fetchAvailableMentors(limit = 12) {
  const sb = getSupabase();
  if (!sb) return [];
  const { data, error } = await sb
    .from('mentorist_profiles')
    .select('name, profile, role, status')
    .eq('role', 'mentor')
    .eq('status', 'active')
    .limit(limit);
  if (error) throw error;
  return (data || []).map((m) => {
    const p = m.profile || {};
    const expertise = [p.interest, ...(p.skills || []), ...(p.careers || [])]
      .filter(Boolean).slice(0, 6).join(', ');
    return { name: m.name || 'Mentor', expertise: expertise || 'general mentorship' };
  });
}

// Opportunities broadcast by mentors/admins (events, programs, etc.).
async function fetchOpportunities(limit = 15) {
  const sb = getSupabase();
  if (!sb) return [];
  const { data, error } = await sb
    .from('mentorist_alerts')
    .select('title, tag, body, created_at')
    .order('created_at', { ascending: false })
    .limit(limit);
  if (error) throw error;
  return (data || []).map((a) => ({
    title: a.title || 'Opportunity',
    tag: a.tag || 'general',
    body: (a.body || '').slice(0, 240)
  }));
}

// Student's recent recommendations → used to avoid repeats.
async function fetchRecentRecommendations(email, limit = 8) {
  const sb = getSupabase();
  if (!sb || !email) return [];
  const { data, error } = await sb
    .from('mentorist_recommendations')
    .select('topic, summary, created_at')
    .eq('student_email', String(email).toLowerCase())
    .order('created_at', { ascending: false })
    .limit(limit);
  if (error) throw error;
  return data || [];
}

async function saveRecommendation(row) {
  const sb = getSupabase();
  if (!sb || !row.student_email) return null;
  const id = `rec_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;
  const payload = {
    id,
    student_email: String(row.student_email).toLowerCase(),
    request_type: row.request_type || null,
    user_query: (row.user_query || '').slice(0, 800) || null,
    topic: row.topic || row.request_type || 'General strategy',
    summary: (row.summary || '').slice(0, 500),
    source: row.source || 'gemini',
    grounded: !!row.grounded,
    created_at: new Date().toISOString()
  };
  const { error } = await sb.from('mentorist_recommendations').insert(payload);
  if (error) { console.warn('[recommend-ai-server] history save failed:', error.message); return null; }
  return id;
}

/* ─────────────────────────── Prompt construction ───────────────────────── */

function buildStudentProfileBlock(profile) {
  const missing = [];
  if (!profile?.schoolName) missing.push('school name');
  if (!profile?.schoolGrade && !profile?.grade) missing.push('grade level');
  if (!profile?.interest || profile.interest === 'undecided') missing.push('primary interest');
  if (!profile?.currentCourses?.length) missing.push('current courses');
  if (!profile?.targetColleges?.length && !profile?.goal) missing.push('target colleges or goal');

  const lines = [
    'STUDENT PROFILE',
    `- Name: ${profile?.name || 'Student'}`,
    `- School: ${profile?.schoolName || 'Unknown school'}`,
    `- Location: ${profile?.schoolLocation || 'Unknown location'}`,
    `- Grade: ${profile?.schoolGrade || profile?.grade || 'Unknown'}`,
    `- Interest: ${profile?.interest || 'Undecided'}`,
    `- Workload preference: ${profile?.workloadPreference || 'balanced'}`,
    `- Time available per week: ${profile?.timeAvailability || 'Not specified'}`,
    `- GPA: ${profile?.currentGpa || 'Not specified'}`,
    `- Courses: ${(profile?.currentCourses || []).join(', ') || 'Not specified'}`,
    `- Skills: ${(profile?.skills || []).join(', ') || 'Not specified'}`,
    `- Extracurriculars: ${(profile?.extracurriculars || []).join(', ') || 'Not specified'}`,
    `- Projects: ${(profile?.passionProjects || []).join(', ') || 'Not specified'}`,
    `- Target colleges: ${(profile?.targetColleges || []).join(', ') || 'Not specified'}`,
    `- Career goals: ${(profile?.careers || []).join(', ') || 'Not specified'}`,
    `- Long-term goal: ${profile?.goal || 'Not specified'}`
  ];
  return { block: lines.filter(Boolean).join('\n'), missing };
}

function buildInventoryBlock(mentors, opportunities) {
  const parts = [];
  if (mentors?.length) {
    parts.push('INTERNAL MENTORIST INVENTORY — AVAILABLE MENTORS (prefer these when relevant):');
    parts.push(mentors.map((m) => `- ${m.name} — expertise: ${m.expertise}`).join('\n'));
  }
  if (opportunities?.length) {
    parts.push('INTERNAL MENTORIST INVENTORY — CURRENT OPPORTUNITIES (prefer these when relevant):');
    parts.push(opportunities.map((o) => `- [${o.tag}] ${o.title}: ${o.body}`).join('\n'));
  }
  if (!parts.length) return '';
  return parts.join('\n');
}

function buildHistoryBlock(history) {
  if (!history?.length) return '';
  const items = history
    .map((h) => `- (${h.topic || 'general'}) ${String(h.summary || '').slice(0, 120)}`)
    .join('\n');
  return `ALREADY RECOMMENDED (do NOT repeat these; build on them or offer something new):\n${items}`;
}

function sanitizeUserText(text) {
  // Keep prompt-injection blast radius small: trim, cap, strip code fences that
  // could be used to fake instructions.
  return String(text || '').replace(/```/g, '').slice(0, 800).trim();
}

function buildPrompt(profile, requestType, userQuery, ctx) {
  const { block: profileBlock, missing } = buildStudentProfileBlock(profile);
  const inventory = buildInventoryBlock(ctx.mentors, ctx.opportunities);
  const historyBlock = buildHistoryBlock(ctx.history);
  const resolvedQuery = sanitizeUserText(userQuery) ||
    `Give the most useful ${(requestType || 'academic strategy').toLowerCase()} based on the profile.`;

  return [
    `REQUEST TYPE: ${requestType || 'General strategy'}`,
    `STUDENT QUESTION: ${resolvedQuery}`,
    '',
    profileBlock,
    '',
    inventory,
    inventory ? '' : null,
    historyBlock,
    historyBlock ? '' : null,
    `KNOWN GAPS: ${missing.length ? missing.join(', ') : 'No obvious gaps'}`,
    '',
    'INSTRUCTIONS',
    '- Recommend specific, named mentors/opportunities/programs/courses/projects.',
    '- Prefer the INTERNAL MENTORIST INVENTORY items above when they fit the student.',
    '- For each recommendation include a one-line "Why this fits you" tied to the profile.',
    '- Do not repeat anything from ALREADY RECOMMENDED.',
    '- If planning is involved, include a short Now / Next / Later roadmap.',
    '- Format in clean Markdown and end with exactly 3 "This Week" actions.'
  ].filter((x) => x !== null).join('\n');
}

/* ─────────────────────────── Gemini call ───────────────────────────────── */

function getGeminiModelCandidates() {
  return [...new Set([GEMINI_MODEL, 'gemini-2.5-flash', 'gemini-2.0-flash', 'gemini-flash-latest'].filter(Boolean))];
}

function textFromGemini(data) {
  return data?.candidates?.[0]?.content?.parts?.map((part) => part?.text || '').join('').trim()
    || data?.candidates?.[0]?.content?.parts?.[0]?.text?.trim()
    || data?.text?.trim()
    || '';
}

async function fetchWithTimeout(url, options = {}, timeoutMs = 22000) {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), timeoutMs);
  try {
    return await fetch(url, { ...options, signal: options.signal || controller.signal });
  } finally {
    clearTimeout(timeout);
  }
}

// One attempt against one model, optionally with Google Search grounding.
async function callGeminiOnce(model, prompt, systemPrompt, useGrounding) {
  const requestBody = {
    systemInstruction: { parts: [{ text: systemPrompt }] },
    contents: [{ role: 'user', parts: [{ text: prompt }] }],
    generationConfig: { temperature: 0.55, topP: 0.95, maxOutputTokens: 1600 }
  };
  if (useGrounding) requestBody.tools = [{ googleSearch: {} }];

  const endpoint = `https://generativelanguage.googleapis.com/v1beta/models/${encodeURIComponent(model)}:generateContent?key=${encodeURIComponent(GEMINI_API_KEY)}`;
  const response = await fetchWithTimeout(endpoint, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(requestBody)
  }, 24000);

  if (!response.ok) {
    const errBody = await response.text().catch(() => '');
    const error = new Error(`Gemini ${response.status}: ${errBody.slice(0, 160)}`);
    error.statusCode = response.status;
    error.body = errBody;
    throw error;
  }
  const data = await response.json();
  const text = textFromGemini(data);
  if (!text || text.length < 50) {
    const error = new Error('Gemini returned empty/insufficient response');
    error.statusCode = 502;
    throw error;
  }
  const grounded = !!data?.candidates?.[0]?.groundingMetadata;
  return { text, grounded };
}

async function generateGeminiStrategy(prompt, systemPrompt) {
  if (!GEMINI_API_KEY) {
    const error = new Error('GEMINI_API_KEY is not configured');
    error.statusCode = 503;
    throw error;
  }
  let lastError = null;
  for (const model of getGeminiModelCandidates()) {
    // Try grounded first; if the model/key rejects the tool, retry plain.
    for (const useGrounding of [true, false]) {
      try {
        const { text, grounded } = await callGeminiOnce(model, prompt, systemPrompt, useGrounding);
        return { text, grounded, model };
      } catch (error) {
        lastError = error;
        const toolIssue = useGrounding && /tool|google_search|googleSearch|INVALID_ARGUMENT|400/i.test(error.message);
        console.warn(`[recommend-ai-server] ${model} (grounding=${useGrounding}) failed:`, error.message);
        if (useGrounding && !toolIssue) break; // non-tool failure → skip plain retry, try next model
      }
    }
  }
  throw lastError || new Error('Gemini unavailable');
}

/* ─────────────────────────── Rate limiting ─────────────────────────────── */

const ipHits = new Map();   // ip -> [timestamps]
const userHits = new Map(); // email -> [timestamps]

function prune(arr, windowMs, now) { return arr.filter((t) => now - t < windowMs); }

function checkRateLimit(ip, email) {
  const now = Date.now();
  const HOUR = 3600_000, DAY = 86_400_000;

  const ipArr = prune(ipHits.get(ip) || [], HOUR, now);
  if (ipArr.length >= RATE_PER_IP_PER_HOUR) {
    return { allowed: false, reason: 'Too many requests from this network. Please try again later.' };
  }
  let userArr = [];
  if (email) {
    userArr = prune(userHits.get(email) || [], DAY, now);
    if (userArr.length >= RATE_PER_USER_PER_DAY) {
      return { allowed: false, reason: 'You have reached your daily AI limit. It resets in 24 hours.' };
    }
  }
  ipArr.push(now); ipHits.set(ip, ipArr);
  if (email) { userArr.push(now); userHits.set(email, userArr); }
  return { allowed: true };
}

function clientIp(req) {
  return (req.headers['x-forwarded-for'] || '').split(',')[0].trim()
    || req.socket?.remoteAddress || 'unknown';
}

/* ─────────────────────────── HTTP plumbing ─────────────────────────────── */

function corsHeaders(req) {
  const origin = req.headers.origin || '';
  let allow = '*';
  if (ALLOWED_ORIGINS.length) {
    allow = ALLOWED_ORIGINS.includes(origin) ? origin : ALLOWED_ORIGINS[0];
  } else if (origin && origin !== 'null') {
    allow = origin; // echo for browser requests from a real origin
  }
  return {
    'Access-Control-Allow-Origin': allow,
    'Access-Control-Allow-Methods': 'GET,POST,OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type',
    'Vary': 'Origin'
  };
}

function json(res, req, statusCode, payload) {
  const body = Buffer.from(JSON.stringify(payload));
  res.writeHead(statusCode, {
    'Content-Type': 'application/json; charset=utf-8',
    'Content-Length': body.length,
    ...corsHeaders(req)
  });
  res.end(body);
}

function readBody(req) {
  return new Promise((resolve, reject) => {
    let raw = '';
    req.on('data', (chunk) => {
      raw += chunk;
      if (raw.length > 1_000_000) { reject(new Error('Request body too large')); req.destroy(); }
    });
    req.on('end', () => {
      if (!raw) return resolve({});
      try { resolve(JSON.parse(raw)); } catch { reject(new Error('Invalid JSON body')); }
    });
    req.on('error', reject);
  });
}

const server = http.createServer(async (req, res) => {
  if (req.method === 'OPTIONS') {
    res.writeHead(204, corsHeaders(req));
    res.end();
    return;
  }

  const url = new URL(req.url, `http://${req.headers.host || `${HOST}:${PORT}`}`);

  try {
    if (req.method === 'GET' && url.pathname === '/health') {
      json(res, req, 200, {
        ok: true,
        service: 'mentorist-recommend-ai',
        models: getGeminiModelCandidates(),
        geminiConfigured: !!GEMINI_API_KEY,
        supabaseConfigured: !!getSupabase(),
        grounding: 'google-search (graceful fallback)'
      });
      return;
    }

    if (req.method === 'POST' && url.pathname === '/api/ai-strategy') {
      const body = await readBody(req);
      const profile = body.profile || {};
      const email = (profile.email || body.userEmail || '').toLowerCase();
      const requestType = body.requestType || 'General strategy';
      const userQuery = body.userQuery || '';

      // Server-side rate limiting (authoritative).
      const limit = checkRateLimit(clientIp(req), email);
      if (!limit.allowed) {
        json(res, req, 429, { success: false, error: limit.reason });
        return;
      }

      // Retrieve internal inventory + history in parallel; all degrade to [].
      const [mentors, opportunities, history] = await Promise.all([
        safe(fetchAvailableMentors(), []),
        safe(fetchOpportunities(), []),
        safe(fetchRecentRecommendations(email), [])
      ]);

      const prompt = buildPrompt(profile, requestType, userQuery, { mentors, opportunities, history });
      const systemPrompt = typeof body.systemPrompt === 'string' && body.systemPrompt.length > 40
        ? body.systemPrompt
        : SYSTEM_PROMPT;

      const { text, grounded, model } = await generateGeminiStrategy(prompt, systemPrompt);

      const recommendationId = await safe(saveRecommendation({
        student_email: email,
        request_type: requestType,
        user_query: userQuery,
        topic: requestType,
        summary: text.slice(0, 400),
        source: 'gemini',
        grounded
      }), null);

      json(res, req, 200, {
        success: true,
        source: 'gemini',
        text: text,
        markdown: text,
        output_text: text,
        model,
        grounded,
        usedInternalData: !!(mentors.length || opportunities.length),
        recommendationId,
        generatedAt: new Date().toISOString()
      });
      return;
    }

    // Feedback loop: thumbs up/down on a stored recommendation.
    if (req.method === 'POST' && url.pathname === '/api/feedback') {
      const body = await readBody(req);
      const sb = getSupabase();
      if (!sb || !body.recommendationId) {
        json(res, req, 400, { success: false, error: 'recommendationId required' });
        return;
      }
      const feedback = body.feedback === 'up' ? 'up' : body.feedback === 'down' ? 'down' : null;
      const { error } = await sb.from('mentorist_recommendations')
        .update({ feedback }).eq('id', body.recommendationId);
      if (error) throw error;
      json(res, req, 200, { success: true });
      return;
    }

    // Structured offline bundle (used by tests / optional structured UI).
    if (req.method === 'POST' && url.pathname === '/api/recommend') {
      const profile = await readBody(req);
      const bundle = buildRecommendationBundle(profile, {});
      json(res, req, 200, { success: true, data: bundle, source: 'core', generatedAt: new Date().toISOString() });
      return;
    }

    json(res, req, 404, { success: false, error: 'Not found' });
  } catch (error) {
    console.error('[recommend-ai-server]', error.message);
    json(res, req, error.statusCode || 500, { success: false, error: error.message });
  }
});

server.listen(PORT, HOST, () => {
  console.log(`Mentorist recommendation server running on http://${HOST}:${PORT}`);
  console.log(`  Gemini: ${GEMINI_API_KEY ? 'configured' : 'NOT configured'} | Supabase retrieval: ${getSupabase() ? 'on' : 'off'}`);
});
