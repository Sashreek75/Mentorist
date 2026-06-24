#!/usr/bin/env node

const http = require('http');
const { URL } = require('url');
const dotenv = require('dotenv');
const { buildRecommendationBundle } = require('./recommendation-core.js');

dotenv.config();

const PORT = Number(process.env.PORT || 3000);
const HOST = process.env.HOST || '127.0.0.1';
const GEMINI_API_KEY = process.env.GEMINI_API_KEY || process.env.MENTORIST_GEMINI_KEY || '';
const GEMINI_MODEL = process.env.GEMINI_MODEL || 'gemini-3.1-flash-lite';

const SYSTEM_PROMPT = `You are an elite college admissions strategist and academic advisor. Give direct, highly specific, actionable recommendations.

Rules:
- Tailor advice to the student's exact situation and question.
- Mention actual courses, programs, competitions, internships, and projects by name when useful.
- If important information is missing, ask up to 2 short follow-up questions.
- Do not give generic advice or tell the student to "join a club."
- Format in clean Markdown.
- End with exactly 3 "This Week" action items.`;

function getGeminiModelCandidates() {
  const candidates = [
    'gemini-3.1-flash-lite',
    process.env.GEMINI_MODEL || 'gemini-2.5-flash',
    'gemini-flash-latest'
  ];
  return [...new Set(candidates.filter(Boolean))];
}

function buildTargetedAIContext(profile, requestType, userQuery) {
  const bigPicture = [
    profile?.goal,
    profile?.targetColleges?.length ? `Target schools: ${profile.targetColleges.join(', ')}` : '',
    profile?.careers?.length ? `Career interests: ${profile.careers.join(', ')}` : ''
  ].filter(Boolean).join(' | ');

  const missing = [];
  if (!profile?.schoolName) missing.push('school name');
  if (!profile?.schoolGrade && !profile?.grade) missing.push('grade level');
  if (!profile?.interest || profile.interest === 'undecided') missing.push('primary interest');
  if (!profile?.currentCourses?.length) missing.push('current courses');
  if (!profile?.targetColleges?.length && !profile?.goal) missing.push('target colleges or goal');

  return [
    `REQUEST TYPE: ${requestType || 'General strategy'}`,
    `USER QUESTION: ${userQuery || 'No extra context provided.'}`,
    '',
    'STUDENT PROFILE',
    `- Name: ${profile?.name || 'Student'}`,
    `- School: ${profile?.schoolName || 'Unknown school'}`,
    `- Location: ${profile?.schoolLocation || 'Unknown location'}`,
    `- Grade: ${profile?.schoolGrade || profile?.grade || 'Unknown'}`,
    `- Interest: ${profile?.interest || 'Undecided'}`,
    `- Workload preference: ${profile?.workloadPreference || 'balanced'}`,
    `- GPA: ${profile?.currentGpa || 'Not specified'}`,
    `- Courses: ${(profile?.currentCourses || []).join(', ') || 'Not specified'}`,
    `- Skills: ${(profile?.skills || []).join(', ') || 'Not specified'}`,
    `- Extracurriculars: ${(profile?.extracurriculars || []).join(', ') || 'Not specified'}`,
    `- Projects: ${(profile?.passionProjects || []).join(', ') || 'Not specified'}`,
    `- Target colleges: ${(profile?.targetColleges || []).join(', ') || 'Not specified'}`,
    `- Career goals: ${(profile?.careers || []).join(', ') || 'Not specified'}`,
    `- Long-term goal: ${profile?.goal || 'Not specified'}`,
    '',
    `KNOWN GAPS: ${missing.length ? missing.join(', ') : 'No obvious gaps'}`,
    bigPicture ? `BIG PICTURE: ${bigPicture}` : '',
    '',
    'INSTRUCTIONS',
    '- Give targeted recommendations tied to the student\'s exact inquiry.',
    '- If the profile is missing a key detail, ask up to 2 concise follow-up questions before advising.',
    '- Otherwise, answer directly with specific courses, programs, projects, internships, or next steps by name.',
    '- Be honest about tradeoffs and avoid generic club advice.',
    '- Format in clean Markdown and end with exactly 3 "This Week" actions.'
  ].filter(Boolean).join('\n');
}

function json(res, statusCode, payload) {
  const body = Buffer.from(JSON.stringify(payload));
  res.writeHead(statusCode, {
    'Content-Type': 'application/json; charset=utf-8',
    'Content-Length': body.length,
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Methods': 'GET,POST,OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type'
  });
  res.end(body);
}

function textFromGemini(data) {
  return data?.candidates?.[0]?.content?.parts?.map((part) => part?.text || '').join('').trim()
    || data?.candidates?.[0]?.content?.parts?.[0]?.text?.trim()
    || data?.text?.trim()
    || '';
}

function readBody(req) {
  return new Promise((resolve, reject) => {
    let raw = '';
    req.on('data', (chunk) => {
      raw += chunk;
      if (raw.length > 1_000_000) {
        reject(new Error('Request body too large'));
        req.destroy();
      }
    });
    req.on('end', () => {
      if (!raw) return resolve({});
      try {
        resolve(JSON.parse(raw));
      } catch (error) {
        reject(new Error('Invalid JSON body'));
      }
    });
    req.on('error', reject);
  });
}

async function fetchWithTimeout(url, options = {}, timeoutMs = 20000) {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), timeoutMs);
  try {
    return await fetch(url, {
      ...options,
      signal: options.signal || controller.signal
    });
  } finally {
    clearTimeout(timeout);
  }
}

async function generateGeminiStrategy(profile, requestType, userQuery, systemPrompt = SYSTEM_PROMPT) {
  if (!GEMINI_API_KEY) {
    const error = new Error('GEMINI_API_KEY is not configured');
    error.statusCode = 503;
    throw error;
  }

  const prompt = buildTargetedAIContext(profile, requestType, userQuery);
  const requestBody = {
    systemInstruction: { parts: [{ text: systemPrompt }] },
    contents: [{ role: 'user', parts: [{ text: prompt }] }],
    generationConfig: {
      temperature: 0.55,
      topP: 0.95,
      maxOutputTokens: 1400
    }
  };

  let lastError = null;
  for (const model of getGeminiModelCandidates()) {
    const endpoint = `https://generativelanguage.googleapis.com/v1beta/models/${encodeURIComponent(model)}:generateContent?key=${encodeURIComponent(GEMINI_API_KEY)}`;
    try {
      const response = await fetchWithTimeout(endpoint, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(requestBody)
      }, 22000);

      if (!response.ok) {
        const errBody = await response.text().catch(() => '');
        const error = new Error(`Gemini error ${response.status}: ${errBody.slice(0, 200)}`);
        error.statusCode = response.status;
        throw error;
      }

      const data = await response.json();
      const text = textFromGemini(data);
      if (!text || text.length < 50) {
        const error = new Error('Gemini returned empty or insufficient response');
        error.statusCode = 502;
        throw error;
      }
      return text;
    } catch (error) {
      lastError = error;
      console.warn(`[recommend-ai-server] Gemini model ${model} failed:`, error.message);
    }
  }

  throw lastError || new Error('Gemini unavailable');
}

const server = http.createServer(async (req, res) => {
  if (req.method === 'OPTIONS') {
    res.writeHead(204, {
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Methods': 'GET,POST,OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type'
    });
    res.end();
    return;
  }

  const url = new URL(req.url, `http://${req.headers.host || `${HOST}:${PORT}`}`);

  try {
    if (req.method === 'GET' && url.pathname === '/health') {
      json(res, 200, { ok: true, service: 'mentorist-recommend-ai', model: GEMINI_MODEL });
      return;
    }

    if (req.method === 'POST' && url.pathname === '/api/ai-strategy') {
      const body = await readBody(req);
      const text = await generateGeminiStrategy(body.profile || {}, body.requestType || 'General strategy', body.userQuery || '', body.systemPrompt || SYSTEM_PROMPT);
      json(res, 200, {
        success: true,
        source: 'gemini',
        markdown: text,
        generatedAt: new Date().toISOString()
      });
      return;
    }

    if (req.method === 'POST' && url.pathname === '/api/recommend') {
      const profile = await readBody(req);
      const bundle = buildRecommendationBundle(profile, {});
      json(res, 200, {
        success: true,
        data: bundle,
        source: 'core',
        generatedAt: new Date().toISOString()
      });
      return;
    }

    json(res, 404, { success: false, error: 'Not found' });
  } catch (error) {
    console.error('[recommend-ai-server]', error.message);
    json(res, error.statusCode || 500, { success: false, error: error.message });
  }
});

server.listen(PORT, HOST, () => {
  console.log(`Mentorist recommendation server running on http://${HOST}:${PORT}`);
});
