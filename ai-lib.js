/* ============================================================
   MENTORIST — shared AI library
   Used by the Vercel serverless functions in /api and safe to
   reuse anywhere. Self-contained: relies only on global fetch
   (Node 18+). The Gemini key is read by the caller from env and
   passed in — it is NEVER shipped to the browser.
   ============================================================ */

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
    `- Long-term goal: ${profile?.goal || 'Not specified'}`,
    profile?.schoolCatalogUrl ? `- School course catalog URL: ${profile.schoolCatalogUrl}` : null
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
  return parts.length ? parts.join('\n') : '';
}

function sanitizeUserText(text) {
  return String(text || '').replace(/```/g, '').slice(0, 800).trim();
}

const DEFAULT_SYSTEM_PROMPT = `You are Mentorist's Strategy Engine — an elite, no-nonsense college and career mentor for a nonprofit that guides ambitious students from middle school through college.

Your job is to turn a student's onboarding profile into SPECIFIC, PROVEN, ACTIONABLE guidance — never vague platitudes.

Use the Google Search tool you have been given to ground your answer in REAL, CURRENT information:
- When the student names a school, search for that school's OFFICIAL course catalog / program of studies and recommend courses that ACTUALLY EXIST there (e.g. "Rouse High School course catalog"). Name the real courses.
- For college students seeking internships/jobs, search for REAL, currently-relevant roles and name REAL companies/programs that hire for them.
- Prefer primary sources (school/district sites, official program pages, company careers pages).

Rules:
- Tailor everything to the student's EXACT profile, grade, interest, and question. No generic club advice.
- Recommend specific, NAMED courses / programs / internships / competitions / projects.
- For each recommendation add a one-line "Why this fits you" tied to their profile.
- Flag GPA and workload risk honestly for any ambitious/stretch choice.
- When you used a real source, briefly cite it inline (e.g. "— from the Rouse HS catalog").
- If you genuinely could not verify something, say so and give the best proven general guidance instead of inventing specifics.
- Format in clean, scannable Markdown (short headers, tight bullets). End with exactly 3 "This Week" action items.`;

function buildPrompt(profile, requestType, userQuery, ctx = {}) {
  const { block: profileBlock, missing } = buildStudentProfileBlock(profile);
  const inventory = buildInventoryBlock(ctx.mentors, ctx.opportunities);
  const resolvedQuery = sanitizeUserText(userQuery) ||
    `Give the most useful ${(requestType || 'academic strategy').toLowerCase()} based on the profile.`;

  // Build concrete web-search directives from the profile so the model
  // grounds its answer in REAL catalogs / roles rather than inventing them.
  const searchTargets = [];
  const school = profile?.schoolName;
  const grade = profile?.schoolGrade || profile?.grade || '';
  const interest = profile?.interest && profile.interest !== 'undecided' ? profile.interest : '';
  const isCollege = /college|university|undergrad|sophomore|junior|senior/i.test(String(grade)) ||
    /college|university|undergrad/i.test(String(profile?.goal || ''));
  if (school) {
    searchTargets.push(`Search: "${school} course catalog" (or "program of studies") and recommend ONLY courses that actually appear there${interest ? `, prioritizing the ${interest} pathway` : ''}. Cite the catalog.`);
  }
  if (isCollege || (profile?.careers || []).length) {
    const focus = interest || (profile?.careers || [])[0] || "the student's field";
    searchTargets.push(`Search for REAL, currently-relevant internships/roles in ${focus} and name specific companies/programs that hire for them, with how to apply.`);
  }
  if (profile?.targetColleges?.length) {
    searchTargets.push(`Search each target college (${profile.targetColleges.join(', ')}) for what they actually value in ${interest || 'this'} applicants and align the plan to it.`);
  }

  return [
    `REQUEST TYPE: ${requestType || 'General strategy'}`,
    `STUDENT QUESTION: ${resolvedQuery}`,
    '',
    profileBlock,
    '',
    inventory,
    inventory ? '' : null,
    `KNOWN GAPS: ${missing.length ? missing.join(', ') : 'No obvious gaps'}`,
    '',
    searchTargets.length ? 'WEB SEARCH DIRECTIVES (use your Google Search tool):' : null,
    ...(searchTargets.length ? searchTargets.map((t) => `- ${t}`) : []),
    searchTargets.length ? '' : null,
    'INSTRUCTIONS',
    '- Ground answers in REAL, verifiable data via search; name real courses, programs, companies, and competitions.',
    '- Recommend specific, named mentors/opportunities/programs/courses/projects.',
    '- Prefer the INTERNAL MENTORIST INVENTORY items above when they fit the student.',
    '- For every course-related question, provide a prioritized course plan and include at least one lower-risk alternative.',
    '- For each recommendation include a one-line "Why this fits you" tied to the profile.',
    '- Include a clear note about GPA risk or workload impact for any ambitious course choices.',
    '- If planning is involved, include a short Now / Next / Later roadmap.',
    '- Cite real sources inline when used. If a specific fact cannot be verified, say so rather than inventing it.',
    '- Format in clean Markdown and end with exactly 3 "This Week" actions.'
  ].filter((x) => x !== null).join('\n');
}

function textFromGemini(data) {
  return data?.candidates?.[0]?.content?.parts?.map((p) => p?.text || '').join('').trim()
    || data?.candidates?.[0]?.content?.parts?.[0]?.text?.trim()
    || data?.text?.trim()
    || '';
}

async function fetchWithTimeout(url, options = {}, timeoutMs = 28000) {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), timeoutMs);
  try {
    return await fetch(url, { ...options, signal: controller.signal });
  } finally {
    clearTimeout(timeout);
  }
}

async function callGeminiOnce(model, prompt, systemPrompt, apiKey, useGrounding) {
  const requestBody = {
    systemInstruction: { parts: [{ text: systemPrompt || DEFAULT_SYSTEM_PROMPT }] },
    contents: [{ role: 'user', parts: [{ text: prompt }] }],
    generationConfig: { temperature: 0.45, topP: 0.92, maxOutputTokens: 2600, candidateCount: 1 }
  };
  if (useGrounding) requestBody.tools = [{ googleSearch: {} }];

  // Pass the key BOTH as a query param and as the x-goog-api-key header. The
  // header is required/more reliable for newer Gemini key formats (e.g. "AQ.*"),
  // while the query param keeps older AIza* keys working.
  const endpoint = `https://generativelanguage.googleapis.com/v1beta/models/${encodeURIComponent(model)}:generateContent?key=${encodeURIComponent(apiKey)}`;
  const response = await fetchWithTimeout(endpoint, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', 'x-goog-api-key': apiKey },
    body: JSON.stringify(requestBody)
  }, 30000);

  if (!response.ok) {
    const errBody = await response.text().catch(() => '');
    const error = new Error(`Gemini ${response.status}: ${errBody.slice(0, 160)}`);
    error.statusCode = response.status;
    throw error;
  }
  const data = await response.json();
  const text = textFromGemini(data);
  if (!text || text.length < 50) {
    const error = new Error('Gemini returned empty/insufficient response');
    error.statusCode = 502;
    throw error;
  }
  return { text, grounded: !!data?.candidates?.[0]?.groundingMetadata };
}

async function generateGeminiStrategy(prompt, systemPrompt, apiKey, preferredModel) {
  if (!apiKey) {
    const error = new Error('GEMINI_API_KEY is not configured');
    error.statusCode = 503;
    throw error;
  }
  const models = [...new Set([preferredModel, 'gemini-2.5-flash', 'gemini-flash-latest', 'gemini-2.0-flash', 'gemini-2.5-flash-lite'].filter(Boolean))];
  let lastError = null;
  for (const model of models) {
    for (const useGrounding of [true, false]) {
      try {
        const { text, grounded } = await callGeminiOnce(model, prompt, systemPrompt, apiKey, useGrounding);
        return { text, grounded, model };
      } catch (error) {
        lastError = error;
        const toolIssue = useGrounding && /tool|google_search|googleSearch|INVALID_ARGUMENT|400/i.test(error.message || '');
        if (useGrounding && !toolIssue) break; // non-tool failure -> next model
      }
    }
  }
  throw lastError || new Error('Gemini unavailable');
}

/* Optional grounding: pull Mentorist's own active mentors + broadcast
   opportunities via the Supabase REST API (no client library needed).
   Any failure is swallowed — grounding is a bonus, not a requirement. */
async function fetchInventory(supabaseUrl, supabaseKey) {
  const out = { mentors: [], opportunities: [] };
  if (!supabaseUrl || !supabaseKey) return out;
  const headers = { apikey: supabaseKey, Authorization: `Bearer ${supabaseKey}` };
  try {
    const r = await fetchWithTimeout(
      `${supabaseUrl}/rest/v1/mentorist_profiles?role=eq.mentor&status=eq.active&select=name,profile,application_data&limit=12`,
      { headers }, 6000);
    if (r.ok) {
      const rows = await r.json();
      out.mentors = (rows || []).map((m) => ({
        name: m.name || m.profile?.name || 'Mentor',
        expertise: m.application_data?.major || m.profile?.interest || 'general guidance'
      }));
    }
  } catch { /* ignore */ }
  try {
    const r = await fetchWithTimeout(
      `${supabaseUrl}/rest/v1/mentorist_alerts?select=title,tag,body&order=created_at.desc&limit=8`,
      { headers }, 6000);
    if (r.ok) {
      const rows = await r.json();
      out.opportunities = (rows || []).map((o) => ({ title: o.title, tag: o.tag || 'Update', body: (o.body || '').slice(0, 160) }));
    }
  } catch { /* ignore */ }
  return out;
}

async function generateStrategy(opts = {}) {
  const { profile = {}, requestType, userQuery, systemPrompt, apiKey, model, supabaseUrl, supabaseKey } = opts;
  const inventory = await fetchInventory(supabaseUrl, supabaseKey);
  const prompt = buildPrompt(profile, requestType, userQuery, inventory);
  const { text, grounded, model: usedModel } = await generateGeminiStrategy(prompt, systemPrompt, apiKey, model);
  return { text, grounded, model: usedModel };
}

module.exports = { buildPrompt, generateStrategy, generateGeminiStrategy, fetchInventory, DEFAULT_SYSTEM_PROMPT };
