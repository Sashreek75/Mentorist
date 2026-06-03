#!/usr/bin/env node
/**
 * Mentorist recommendation API server.
 * Discovers school catalogs, analyzes peer student profiles, and returns
 * school-aware recommendations for courses, jobs, projects, and extracurriculars.
 */

const http = require('http');
const { createClient } = require('@supabase/supabase-js');
const Core = require('./recommendation-core.js');
const { GoogleGenAI } = require('@google/genai');
require('dotenv').config();

let ai = null;
try {
  if (process.env.GEMINI_API_KEY) {
    ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });
    console.log("Gemini AI initialized for recommendation engine.");
  }
} catch (e) {
  console.warn("Gemini AI failed to initialize:", e);
}

const PORT = Number(process.env.PORT || 3000);
const DEFAULT_SUPABASE_URL = 'https://vmuukfegnjotlgvdqfrx.supabase.co';
const DEFAULT_SUPABASE_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InZtdXVrZmVnbmpvdGxndnJ4Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3Nzg5NTY2MzYsImV4cCI6MjA5NDUzMjYzNn0.FswR9i0EgMZ5UPs8NpE-es4i3HonKQXilqBPA0ulT3Q';
const SUPABASE_URL = process.env.SUPABASE_URL || DEFAULT_SUPABASE_URL;
const SUPABASE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_ANON_KEY || DEFAULT_SUPABASE_KEY;
const supabase = createClient(SUPABASE_URL, SUPABASE_KEY, {
  auth: { persistSession: false, autoRefreshToken: false }
});

const catalogCache = new Map();
const peerCache = new Map();

function corsHeaders(origin = '*') {
  return {
    'Access-Control-Allow-Origin': origin,
    'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type',
    'Access-Control-Max-Age': '86400'
  };
}

function json(res, status, payload, origin = '*') {
  res.writeHead(status, { 'Content-Type': 'application/json', ...corsHeaders(origin) });
  res.end(JSON.stringify(payload));
}

function textSearch(value) {
  return Core.normalizeText(value || '');
}

function withTimeout(ms = 12000) {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(new Error('Request timed out')), ms);
  return {
    signal: controller.signal,
    cancel: () => clearTimeout(timer)
  };
}

async function fetchText(url, timeoutMs = 12000) {
  const { signal, cancel } = withTimeout(timeoutMs);
  try {
    const response = await fetch(url, {
      signal,
      headers: {
        'User-Agent': 'Mozilla/5.0 MentoristRecommendationBot/1.0',
        'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8'
      }
    });
    if (!response.ok) {
      throw new Error(`HTTP ${response.status}`);
    }
    return await response.text();
  } finally {
    cancel();
  }
}

function decodeDuckDuckGoLink(href) {
  if (!href) return '';
  try {
    const parsed = new URL(href, 'https://duckduckgo.com');
    const uddg = parsed.searchParams.get('uddg');
    if (uddg) return decodeURIComponent(uddg);
    return parsed.href;
  } catch {
    return href;
  }
}

function parseSearchResults(html) {
  if (!html) return [];
  const matches = [...html.matchAll(/<a[^>]+class="result__a"[^>]+href="([^"]+)"[^>]*>([\s\S]*?)<\/a>/gi)];
  const out = [];
  for (const match of matches) {
    const href = decodeDuckDuckGoLink(match[1]);
    const title = match[2]
      .replace(/<[^>]+>/g, ' ')
      .replace(/&nbsp;/g, ' ')
      .replace(/\s+/g, ' ')
      .trim();
    if (!href || !title) continue;
    out.push({ href, title });
  }
  return out;
}

function isLikelyCatalogUrl(url) {
  const raw = textSearch(url);
  return /catalog|course guide|program of studies|course catalog|registration|academic planning|school guide|curriculum|course offerings/.test(raw) || /\.pdf($|\?)/i.test(url);
}

function isLikelyCourseTitle(line) {
  const raw = line.trim();
  if (raw.length < 5 || raw.length > 140) return false;
  if (/^\d+$/.test(raw)) return false;
  if (/^page\s+\d+/i.test(raw)) return false;
  if (/^(course|catalog|program|school|district|registration|table of contents)$/i.test(raw)) return false;
  return /(AP|Honors|Dual Credit|Cyber|Computer Science|Robotics|Engineering|Mathematics|Calculus|Statistics|Physics|Chemistry|Biology|English|Writing|History|Government|Economics|Business|Marketing|Design|Art|Journalism|Debate|Theater|Theatre|Film|Music|Photography|Health|Anatomy|Psychology|Criminology|Forensics|Civics|CTE|Networking|Technology)/i.test(raw);
}

function extractCatalogCoursesFromText(text, sourceUrl = '') {
  if (!text) return [];
  const normalized = text
    .replace(/\r/g, '\n')
    .replace(/\n{3,}/g, '\n\n');
  const lines = normalized.split('\n').map((line) => line.trim()).filter(Boolean);
  const courses = [];

  for (let i = 0; i < lines.length; i += 1) {
    const line = lines[i];
    if (!isLikelyCourseTitle(line)) continue;

    const next = lines[i + 1] || '';
    const next2 = lines[i + 2] || '';
    const description = [next, next2]
      .filter(Boolean)
      .filter((segment) => !isLikelyCourseTitle(segment))
      .join(' ')
      .slice(0, 220);

    courses.push({
      name: line.replace(/\s+/g, ' ').trim(),
      description: description || line,
      category: /Cyber|Computer Science|Networking|Technology/i.test(line)
        ? 'CTE'
        : /Math|Calculus|Statistics/i.test(line)
          ? 'Math'
          : /Physics|Chemistry|Biology|Anatomy|Psychology|Health/i.test(line)
            ? 'Science'
            : /English|Writing|Journalism|Debate|History|Government|Economics|Business|Design|Art|Film|Music/i.test(line)
              ? 'Core'
              : 'Elective',
      gradeMin: /11|12|junior|senior/i.test(`${line} ${description}`) ? 11 : /10|sophomore/i.test(`${line} ${description}`) ? 10 : /9|freshman/i.test(`${line} ${description}`) ? 9 : null,
      gpaBoost: /AP|Honors|Dual Credit/i.test(line),
      keywords: [
        line,
        description
      ].join(' ')
    });
  }

  return courses;
}

async function searchSchoolCatalogCandidates(profile) {
  const schoolName = profile.schoolName || '';
  const schoolLocation = profile.schoolLocation || '';
  const queryBase = [schoolName, schoolLocation].filter(Boolean).join(' ').trim();
  const queries = [];

  if (profile.schoolCatalogUrl) {
    queries.push(profile.schoolCatalogUrl);
  }

  if (queryBase) {
    queries.push(
      `${queryBase} course catalog`,
      `${queryBase} program of studies`,
      `${queryBase} course guide`,
      `${queryBase} registration guide`,
      `${queryBase} academic planning guide`
    );
  }

  const urls = [];
  const titles = [];

  for (const query of queries) {
    // Only treat it as a direct URL if it actually looks like one
    if (/^https?:\/\//i.test(query) || /^www\./i.test(query) || /\.pdf$/i.test(query)) {
      if (isLikelyCatalogUrl(query)) {
        urls.push(query);
      }
      continue;
    }

    try {
      const searchUrl = `https://duckduckgo.com/html/?q=${encodeURIComponent(query)}`;
      const html = await fetchText(searchUrl, 10000);
      const results = parseSearchResults(html);
      for (const result of results.slice(0, 6)) {
        if (isLikelyCatalogUrl(result.href)) {
          urls.push(result.href);
          titles.push(result.title);
        }
      }
    } catch (error) {
      console.warn('[CATALOG] Search failed for query:', query, error?.message || error);
    }
  }

  return {
    urls: [...new Set(urls)].slice(0, 5),
    titles: [...new Set(titles)].slice(0, 5),
    queries
  };
}

async function fetchReadableCatalog(url) {
  if (!url) return null;

  const candidates = [];
  if (/^https?:\/\//i.test(url)) {
    candidates.push(url);
    const proto = url.toLowerCase().startsWith('https') ? 'https' : 'http';
    candidates.push(`https://r.jina.ai/${proto}://${url.replace(/^https?:\/\//i, '')}`);
  } else {
    candidates.push(`https://${url}`);
    candidates.push(`https://r.jina.ai/https://${url}`);
  }

  for (const candidate of candidates) {
    try {
      const text = await fetchText(candidate, 15000);
      if (text && text.length > 100) {
        return {
          sourceUrl: url,
          fetchedFrom: candidate,
          text,
          contentType: candidate.includes('r.jina.ai') ? 'proxy-text' : 'html'
        };
      }
    } catch (error) {
      console.warn('[CATALOG] Fetch failed for:', candidate, error?.message || error);
    }
  }

  return null;
}

function scoreCatalogText(text, profile) {
  const clean = textSearch(text);
  const keywords = [
    profile.interest,
    profile.careers.join(' '),
    profile.skills.join(' '),
    profile.goal,
    profile.currentCourses.join(' ')
  ].join(' ');

  let score = 0;
  const signals = [
    ['ap computer science a', 30],
    ['ap computer science principles', 26],
    ['cybersecurity', 28],
    ['robotics', 18],
    ['engineering', 12],
    ['calculus', 16],
    ['statistics', 14],
    ['biology', 12],
    ['chemistry', 12],
    ['physics', 12],
    ['english language', 10],
    ['government', 10],
    ['economics', 10],
    ['business', 10],
    ['art', 10],
    ['design', 10],
    ['debate', 10],
    ['journalism', 10]
  ];

  for (const [needle, points] of signals) {
    if (clean.includes(needle)) score += points;
  }

  if (keywords.includes('computer science') || keywords.includes('software') || keywords.includes('coding')) {
    if (clean.includes('computer science a')) score += 20;
    if (clean.includes('cybersecurity')) score += 12;
  }

  if (profile.schoolGradeNumber && clean.includes('grade 10') && profile.schoolGradeNumber === 10) score += 4;

  return score;
}

async function discoverSchoolCatalog(profile) {
  const cacheKey = `${textSearch(profile.schoolName)}|${textSearch(profile.schoolCatalogUrl)}`;
  const cached = catalogCache.get(cacheKey);
  if (cached && Date.now() - cached.timestamp < 6 * 60 * 60 * 1000) {
    return cached.value;
  }

  const search = await searchSchoolCatalogCandidates(profile);
  const candidates = [];

  if (profile.schoolCatalogUrl) {
    candidates.push(profile.schoolCatalogUrl);
  }
  candidates.push(...search.urls);

  const discovered = [];
  let best = null;

  for (const candidateUrl of [...new Set(candidates)].slice(0, 5)) {
    const readable = await fetchReadableCatalog(candidateUrl);
    if (!readable) continue;

    const courses = extractCatalogCoursesFromText(readable.text, candidateUrl);
    const score = scoreCatalogText(readable.text, profile) + courses.length * 4;
    const catalogEntry = {
      sourceUrl: candidateUrl,
      fetchedFrom: readable.fetchedFrom,
      sourceType: readable.contentType,
      courseCount: courses.length,
      score,
      courses,
      rawText: readable.text
    };

    discovered.push(catalogEntry);
    if (!best || catalogEntry.score > best.score) {
      best = catalogEntry;
    }
  }

  const value = best
    ? {
        schoolName: profile.schoolName || '',
        sourceUrl: best.sourceUrl,
        sourceType: best.sourceType,
        confidence: best.courseCount > 0 ? 'high' : 'medium',
        courses: best.courses,
        searchQueries: search.queries,
        candidateUrls: search.urls,
        titles: search.titles,
        fetchedFrom: best.fetchedFrom,
        rawText: best.rawText
      }
    : {
        schoolName: profile.schoolName || '',
        sourceUrl: profile.schoolCatalogUrl || '',
        sourceType: 'playbook',
        confidence: 'medium',
        courses: [],
        searchQueries: search.queries,
        candidateUrls: search.urls,
        titles: search.titles
      };

  catalogCache.set(cacheKey, { timestamp: Date.now(), value });
  return value;
}

async function loadPeerProfiles(profile) {
  const cacheKey = `${textSearch(profile.schoolName)}|${textSearch(profile.interest)}|${textSearch(profile.schoolGrade)}`;
  const cached = peerCache.get(cacheKey);
  if (cached && Date.now() - cached.timestamp < 10 * 60 * 1000) {
    return cached.value;
  }

  try {
    const { data, error } = await supabase
      .from('mentorist_profiles')
      .select('email,name,role,status,onboarded,profile,updated_at')
      .eq('role', 'student');

    if (error) throw error;

    const peers = (data || [])
      .map((row) => row.profile ? { ...row.profile, email: row.email, name: row.name } : null)
      .filter(Boolean)
      .filter((candidate) => candidate.email?.toLowerCase() !== profile.email)
      .map((candidate) => Core.normalizeProfile(candidate));

    peerCache.set(cacheKey, { timestamp: Date.now(), value: peers });
    return peers;
  } catch (error) {
    console.warn('[PEERS] Failed to load peer profiles:', error?.message || error);
    return [];
  }
}

async function generateRecommendations(studentProfile) {
  const profile = Core.normalizeProfile(studentProfile);
  const [schoolCatalog, peers] = await Promise.all([
    discoverSchoolCatalog(profile),
    loadPeerProfiles(profile)
  ]);

  if (ai && schoolCatalog && schoolCatalog.rawText) {
    try {
      console.log(`[AI] Generating recommendations via Gemini for ${profile.email}`);
      const prompt = `You are an expert academic advisor. The student profile is:
Name: ${profile.name}
Interests: ${profile.interest}
Careers: ${profile.careers.join(', ')}
Skills: ${profile.skills.join(', ')}
Goal: ${profile.goal}
Grade: ${profile.schoolGrade}

We have retrieved the following course catalog text for their school (or related to it):
---
${schoolCatalog.rawText.substring(0, 100000)}
---

Based heavily on the catalog text above, generate a highly personalized recommendation bundle. Return ONLY a valid JSON object matching this schema EXACTLY:
{
  "courses": [
    { "name": "Exact course name from catalog", "category": "Math|Science|Core|Elective|CTE", "description": "Brief description of why this fits their goals", "gpaBoost": true, "gradeMin": 9, "keywords": "" }
  ],
  "jobs": [
    { "title": "Job title", "category": "industry", "description": "Why it's relevant", "salaryRange": "$X - $Y" }
  ],
  "extracurriculars": [
    { "name": "Club/Activity name", "role": "Suggested role", "description": "Why they should join based on profile" }
  ],
  "projects": [
    { "name": "Project name", "description": "Why they should do it", "time": "Time estimate" }
  ],
  "tools": [
    { "name": "Tool name", "description": "Why it's useful", "resource": "Link or resource", "time": "Learning time" }
  ],
  "courseTracks": {
    "now": [{ "name": "Course name", "description": "Why take now" }],
    "next": [{ "name": "Course name", "description": "Why take next" }],
    "stretch": [{ "name": "Course name", "description": "Why stretch" }],
    "gpaBoost": [{ "name": "Course name", "description": "Why it boosts GPA" }]
  },
  "roadmap": {
    "now": ["Action 1", "Action 2"],
    "next": ["Action 1", "Action 2"],
    "stretch": ["Action 1", "Action 2"]
  },
  "gpaStrategy": {
    "headline": "Strategy headline",
    "recommendations": ["Strategy 1", "Strategy 2"],
    "caution": "Cautionary advice"
  },
  "mentorQuestions": ["Question 1", "Question 2"],
  "tips": ["Tip 1", "Tip 2"]
}
Include exactly 6 courses, 4 jobs, 4 extracurriculars, 3 projects, and 3 tools. Output only valid JSON.`;

      const response = await ai.models.generateContent({
        model: 'gemini-2.5-flash',
        contents: prompt,
        config: { responseMimeType: "application/json" }
      });
      
      const parsed = JSON.parse(response.text);
      parsed.generatedAt = new Date().toISOString();
      parsed.studentEmail = profile.email;
      
      return {
        success: true,
        data: parsed,
        meta: {
          schoolCatalog: { ...schoolCatalog, rawText: undefined },
          peerCount: peers.length,
          generatedAt: parsed.generatedAt,
          aiPowered: true
        }
      };
    } catch (e) {
      console.warn("[AI] Gemini generation failed, falling back to heuristics:", e.message || e);
    }
  }

  const bundle = Core.buildRecommendationBundle(profile, {
    schoolCatalog,
    peerStudents: peers
  });

  return {
    success: true,
    data: bundle,
    meta: {
      schoolCatalog: { ...schoolCatalog, rawText: undefined },
      peerCount: peers.length,
      generatedAt: bundle.generatedAt,
      aiPowered: false
    }
  };
}

function readBody(req) {
  return new Promise((resolve, reject) => {
    let body = '';
    req.on('data', (chunk) => {
      body += chunk.toString();
      if (body.length > 2 * 1024 * 1024) {
        reject(new Error('Request body too large'));
        req.destroy();
      }
    });
    req.on('end', () => resolve(body));
    req.on('error', reject);
  });
}

async function handleRecommend(req, res, origin, parsedUrl) {
  if (req.method === 'GET') {
    const query = Object.fromEntries(parsedUrl.searchParams);
    const profile = {
      name: query.name || 'Test Student',
      email: query.email || 'test@student.example',
      schoolName: query.school || query.schoolName || 'Rouse High School',
      schoolLocation: query.location || query.schoolLocation || '',
      schoolCatalogUrl: query.catalogUrl || '',
      grade: query.grade || 'highschool',
      schoolGrade: query.schoolGrade || '10',
      interest: query.interest || 'stem',
      workloadPreference: query.workload || 'balanced',
      goal: query.goal || 'Build a strong academic and career plan',
      careers: query.careers || 'software engineering',
      skills: query.skills || 'python, problem solving',
      extracurriculars: query.extracurriculars || 'robotics, coding club'
    };

    const result = await generateRecommendations(profile);
    return json(res, 200, result, origin);
  }

  if (req.method === 'POST') {
    const body = await readBody(req);
    const profile = JSON.parse(body || '{}');
    const result = await generateRecommendations(profile);
    return json(res, 200, result, origin);
  }

  return json(res, 405, { success: false, error: 'Method not allowed' }, origin);
}

async function handleRequest(req, res) {
  const parsedUrl = new URL(req.url, 'http://localhost');
  const origin = req.headers.origin || '*';

  if (req.method === 'OPTIONS') {
    res.writeHead(200, corsHeaders(origin));
    res.end();
    return;
  }

  if (parsedUrl.pathname === '/health' && req.method === 'GET') {
    return json(res, 200, { status: 'ok', timestamp: new Date().toISOString() }, origin);
  }

  if (parsedUrl.pathname === '/api/recommend') {
    try {
      return await handleRecommend(req, res, origin, parsedUrl);
    } catch (error) {
      console.error('[RECOMMEND] Error:', error);
      return json(res, 400, { success: false, error: error.message || 'Recommendation generation failed' }, origin);
    }
  }

  if (parsedUrl.pathname === '/api/school-catalog' && req.method === 'GET') {
    const profile = Core.normalizeProfile({
      schoolName: parsedUrl.searchParams.get('school') || '',
      schoolLocation: parsedUrl.searchParams.get('location') || '',
      schoolCatalogUrl: parsedUrl.searchParams.get('url') || ''
    });

    try {
      const catalog = await discoverSchoolCatalog(profile);
      return json(res, 200, { success: true, catalog }, origin);
    } catch (error) {
      return json(res, 500, { success: false, error: error.message || 'Catalog discovery failed' }, origin);
    }
  }


  return json(res, 404, {
    error: 'Not found',
    available: [
      'GET /health',
      'POST /api/recommend',
      'GET /api/recommend?school=Rouse%20High%20School&interest=stem',
      'GET /api/school-catalog?school=Rouse%20High%20School',
      'POST /api/auto-confirm-email'
    ]
  }, origin);
}

const server = http.createServer((req, res) => {
  handleRequest(req, res).catch((error) => {
    console.error('[SERVER] Unhandled error:', error);
    if (!res.headersSent) {
      json(res, 500, { success: false, error: error.message || 'Internal server error' });
    } else {
      res.end();
    }
  });
});

server.listen(PORT, () => {
  console.log(`Mentorist recommendation server running on http://localhost:${PORT}`);
});

server.on('error', (error) => {
  console.error('Server error:', error);
  process.exit(1);
});

process.on('SIGINT', () => {
  console.log('Shutting down recommendation server...');
  server.close(() => process.exit(0));
});

process.on('SIGTERM', () => {
  console.log('Shutting down recommendation server...');
  server.close(() => process.exit(0));
});
