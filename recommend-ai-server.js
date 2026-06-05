#!/usr/bin/env node
/**
 * Mentorist recommendation API server.
 * Uses Gemini with Google Search grounding to discover school catalogs
 * and provide interactive, targeted recommendations for courses, GPA, etc.
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
    console.log("Gemini AI initialized with Google Search tool capabilities.");
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

async function handleRecommendInteractive(req, res, origin) {
  if (req.method !== 'POST') {
    return json(res, 405, { success: false, error: 'Method not allowed' }, origin);
  }

  const body = await readBody(req);
  const payload = JSON.parse(body || '{}');
  
  const profile = Core.normalizeProfile(payload.profile || {});
  const requestType = payload.requestType || 'General';
  const userQuery = payload.userQuery || '';

  if (!ai) {
    return json(res, 500, { success: false, error: 'AI not configured on server.' }, origin);
  }

  let lastError = null;
  const maxRetries = 3;
  
  for (let attempt = 0; attempt < maxRetries; attempt++) {
    try {
      console.log(`[AI] Generating interactive recommendations for ${profile.email} - Type: ${requestType} (Attempt ${attempt + 1}/${maxRetries})`);
      
      const prompt = `You are an expert academic and career advisor for high school and college students.
The student profile is:
Name: ${profile.name}
School: ${profile.schoolName || 'Unknown'} (Location: ${profile.schoolLocation || 'Unknown'})
Grade: ${profile.schoolGrade || 'Unknown'}
Interests: ${profile.interest}
Careers of interest: ${profile.careers.join(', ')}
Skills: ${profile.skills.join(', ')}
Goal: ${profile.goal}

The student has requested advice specifically regarding: "${requestType}".
Their specific elaboration/question is: "${userQuery}"

Your task is to search the web using the Google Search tool for the course catalog or specific offerings at their school ("${profile.schoolName || 'Unknown'}"), and then provide highly tailored advice answering their query based on what you find. If their school cannot be found, provide general best-practices for a student with their profile.

Format your response in clean Markdown. Use headings, bullet points, and bold text to make it easy to read. Do not output raw JSON. Speak directly to the student in a supportive, strategic, and professional tone. Keep your response concise but deeply insightful. Do not output a generic preamble, jump straight into the advice. Make sure to specifically list at least 3-4 actionable items (courses, clubs, or strategies) grounded in reality.`;

      const response = await ai.models.generateContent({
        model: 'gemini-2.5-flash',
        contents: prompt,
        config: { 
          tools: [{ googleSearch: {} }],
          temperature: 0.7
        }
      });
      
      if (!response || !response.text) {
        throw new Error('AI returned empty response');
      }
      
      return json(res, 200, {
        success: true,
        data: {
          markdown: response.text,
          generatedAt: new Date().toISOString()
        }
      }, origin);
    } catch (e) {
      lastError = e;
      console.warn(`[AI] Attempt ${attempt + 1} failed:`, e.message || e);
      
      if (attempt < maxRetries - 1) {
        const delay = Math.pow(2, attempt) * 1000; // Exponential backoff: 1s, 2s, 4s
        console.log(`[AI] Retrying in ${delay}ms...`);
        await new Promise(resolve => setTimeout(resolve, delay));
      }
    }
  }
  
  // All retries failed, return fallback response
  console.error("[AI] All retries failed, returning fallback:", lastError?.message);
  
  const fallbackResponse = generateFallbackResponse(profile, requestType, userQuery);
  
  return json(res, 200, {
    success: true,
    data: {
      markdown: fallbackResponse,
      generatedAt: new Date().toISOString(),
      fallback: true
    }
  }, origin);
}

function generateFallbackResponse(profile, requestType, userQuery) {
  const interest = profile.interest || 'your interests';
  const grade = profile.schoolGrade || 'your grade level';
  const school = profile.schoolName || 'your school';
  
  return `# Strategic Recommendations for ${requestType}

Based on your profile as a ${grade} student interested in ${interest} at ${school}, here are targeted recommendations:

## Course Strategy
- Focus on core classes that align with ${interest}
- Consider AP or Honors courses if your GPA allows
- Balance rigor with manageable workload

## Key Actions
1. **Research your school's catalog** - Look for courses specifically in ${interest}
2. **Build proof-of-work** - Create a project that demonstrates your skills
3. **Find leadership opportunities** - Join clubs or start an initiative
4. **Connect with mentors** - Reach out to teachers or professionals in ${interest}

## Next Steps
- Meet with your counselor to plan next year's schedule
- Talk to teachers about ${interest} opportunities at ${school}
- Start a small project this semester to build momentum

*Note: AI-powered search was temporarily unavailable, so these recommendations are based on general best practices for your profile. For more specific advice, try again in a moment.*`;
}

// Keep the old endpoint for fallback just in case it's still hit somewhere else
async function handleRecommendOld(req, res, origin, parsedUrl) {
  // Return a simplified dummy or basic fallback, as the UI should now use interactive
  return json(res, 200, { 
    success: true, 
    data: { message: "Please use the new interactive AI Strategy Engine." } 
  }, origin);
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

  if (parsedUrl.pathname === '/api/recommend-interactive') {
    try {
      return await handleRecommendInteractive(req, res, origin);
    } catch (error) {
      console.error('[RECOMMEND] Error:', error);
      return json(res, 400, { success: false, error: error.message || 'Generation failed' }, origin);
    }
  }
  
  if (parsedUrl.pathname === '/api/recommend') {
    return await handleRecommendOld(req, res, origin, parsedUrl);
  }

  return json(res, 404, {
    error: 'Not found',
    available: [
      'GET /health',
      'POST /api/recommend-interactive'
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
