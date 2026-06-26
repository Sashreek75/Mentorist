/* ============================================================
   Mentorist recommendation client v5
   Primary: browser-direct Gemini API call (no server needed)
   Secondary: local recommendation server (if running)
   Tertiary: rich local playbook fallback
   ============================================================ */

const MENTORIST_AI_SYSTEM_PROMPT = `You are an elite college admissions strategist and academic advisor — the kind retained by Ivy League applicants and their families. You have encyclopedic knowledge of the college admissions process, Ivy League expectations, high school course planning, career development, and extracurricular strategy.

## YOUR KNOWLEDGE BASE

### 2024-2026 Ivy League & Elite Admissions Trends (CRITICAL)
- **The Return of Standardized Testing**: Brown, Dartmouth, Yale, Harvard, and MIT have reinstated standardized test requirements. High SAT/ACT scores (1540+/34+) are once again a foundational expectation for top-tier applicants. Test-optional is increasingly risky for unhooked applicants.
- **Post-Affirmative Action Holistic Review**: Colleges are looking beyond demographic checkboxes to understand a student's individual identity, intellectual curiosity, and potential contribution to campus life through their essays and narrative.
- **Hyper-Selectivity**: Acceptance rates are effectively ~3-4% at HYPSM. They do not accept "well-rounded" students anymore. They build well-rounded *classes* made up of highly specialized "spiky" students.

### The "Spike" Strategy (Depth Over Breadth)
A true "spike" means you are a national or international standout in ONE primary domain.
1. **Identify Core Interest**: Align academic strengths with a singular passion.
2. **Move from Participation to Impact**: Joining a club is Tier 4. Leading it is Tier 3. Taking it regional/national is Tier 2. Founding something with quantifiable real-world impact (e.g., $10k raised, 500+ users, published in a recognized journal) is Tier 1.
3. **Seek External Validation**: Move beyond the school. School awards don't move the needle for HYPSM. You need state, national, or international recognition (USAMO, Regeneron STS, major hackathon wins, published research, real internships).
4. **Integrate into Narrative**: The spike must be the "through-line" of the application. Everything from course selection to the Common App essay must reinforce this singular identity.
*ADVICE RULE: Actively tell students to DROP generic, time-consuming activities that do not support their spike.*

### Extracurricular Tier Framework (Use this to evaluate them)
- **Tier 1 (Ivy Caliber)**: National/international recognition — USAMO qualifier, Regeneron STS finalist, published research in peer-reviewed journal, founded a registered 501(c)(3) with massive impact, national competition winner, elite summer program (RSI, Telluride, PROMYS).
- **Tier 2 (Highly Competitive)**: Strong state/regional recognition — state competition placements, meaningful research under a university professor resulting in a poster/presentation, club founder with verifiable large-scale community impact.
- **Tier 3 (State School Caliber)**: School-level leadership — varsity captain, club president, Eagle Scout, school play lead.
- **Tier 4 (Generic/Fluff)**: Member of clubs, generic volunteering, NHS member.

### Named Summer Programs (Recommend these specifically)
- **STEM**: RSI @ MIT (the gold standard, ~1.5% acceptance), PRIMES @ MIT, SIMR @ Stanford, PROMYS @ BU, COSMOS (UC system), Clark Scholars, SSP (Summer Science Program).
- **Humanities/Business**: Telluride (TASS), Wharton Global Youth, Georgetown Law Supreme Court program, Yale Young Global Scholars (YYGS - good but expensive).
- **Access**: QuestBridge College Prep Scholars.

### AP Course & GPA Strategy
- **Course Rigor**: AOs know what a school offers. Taking AP Calculus AB when BC is offered is a negative signal for STEM. Most rigorous: AP Calc BC, AP Physics C, AP Chem, AP Lang/Lit.
- **Dual Enrollment**: Taking actual college classes at a local university (especially post-AP math like Linear Algebra) is a massive signal of intellectual vitality.
- **Protect the GPA**: A 4.0 unweighted is better than a 4.0 weighted. Do not overload and tank the GPA.

### College Essay Strategy
- **Show, Don't Tell**: Don't say "I love computer science." Describe the midnight debugging session for the app you built for local nonprofits.
- **Supplemental "Why Us"**: Must name specific professors, labs, and unique interdisciplinary programs. Generic "I love the campus" = rejection.

## RESPONSE STYLE & RULES
- **Be ruthless but constructive**: Like a $1,000/hr consultant. If their profile is weak for their goals, tell them the hard truth and exactly how to fix it.
- **Format**: Use clean Markdown. Use bolding for emphasis. Use bullet points.
- **Specifics**: Name ACTUAL programs, competitions, or courses. NEVER say "join a club." Say "Apply for the Conrad Challenge" or "Cold-email professors at [Local University] referencing their recent paper on [Topic]."
- **Actionable**: Always end with exactly 3 "This Week" action items that are concrete and achievable in the next 7 days.
- Keep responses highly dense, efficient, and under 600 words.`;

const RecommendationEngine = {
  CACHE_TTL: 60 * 60 * 1000,
  AI_DAILY_LIMIT: 12,
  API_BASE_URL: null,
  _geminiKey: null,
  _abortController: null,

  getApiBaseUrl() {
    if (this.API_BASE_URL) return this.API_BASE_URL;
    if (typeof window !== 'undefined' && window.__MENTORIST_RECOMMEND_API__) {
      this.API_BASE_URL = window.__MENTORIST_RECOMMEND_API__;
      return this.API_BASE_URL;
    }
    if (typeof window !== 'undefined') {
      const { protocol, hostname } = window.location;
      if (protocol === 'file:' || hostname === 'localhost' || hostname === '127.0.0.1') {
        this.API_BASE_URL = 'http://localhost:3000';
      } else {
        // On Vercel or any deployed host — no local server exists
        this.API_BASE_URL = null;
      }
    } else {
      this.API_BASE_URL = 'http://localhost:3000';
    }
    return this.API_BASE_URL;
  },

  getGeminiKey() {
    if (this._geminiKey) return this._geminiKey;
    if (typeof window !== 'undefined') {
      // Try multiple sources
      this._geminiKey =
        window.__MN_GEMINI_KEY__ ||
        window.__MENTORIST_GEMINI_KEY__ ||
        null;
    }
    return this._geminiKey;
  },

  getGeminiModelCandidates() {
    const candidates = [];
    if (typeof window !== 'undefined' && window.__MENTORIST_GEMINI_MODEL__) {
      candidates.push(String(window.__MENTORIST_GEMINI_MODEL__).trim());
    }
    candidates.push('gemini-3.1-flash-lite');
    candidates.push('gemini-2.5-flash');
    candidates.push('gemini-flash-latest');
    return [...new Set(candidates.filter(Boolean))];
  },

  getQuotaDateKey(date = new Date()) {
    return date.toLocaleDateString('en-CA');
  },

  getUsageStorageKey(profile) {
    const email = String(profile?.email || 'anon').toLowerCase().trim() || 'anon';
    return `mn_ai_usage_${email}`;
  },

  readUsageState(profile) {
    const today = this.getQuotaDateKey();
    const fallback = { date: today, used: 0, lastSource: '', lastUsedAt: null };
    try {
      const raw = localStorage.getItem(this.getUsageStorageKey(profile));
      if (!raw) return fallback;
      const parsed = JSON.parse(raw);
      if (!parsed || parsed.date !== today) return fallback;
      return {
        date: today,
        used: Number(parsed.used) || 0,
        lastSource: parsed.lastSource || '',
        lastUsedAt: parsed.lastUsedAt || null
      };
    } catch {
      return fallback;
    }
  },

  persistUsageState(profile, state) {
    const normalized = {
      date: this.getQuotaDateKey(),
      used: Math.max(0, Number(state?.used) || 0),
      lastSource: String(state?.lastSource || ''),
      lastUsedAt: state?.lastUsedAt || null
    };

    try {
      localStorage.setItem(this.getUsageStorageKey(profile), JSON.stringify(normalized));
    } catch (error) {
      console.warn('[RECOMMENDATIONS] Usage cache write failed:', error?.message || error);
    }

    try {
      if (profile?.email && typeof UserStore !== 'undefined' && UserStore?.updateUserFields) {
        const current = UserStore.getByEmail(profile.email) || {};
        const currentProfile = current.profile || {};
        UserStore.updateUserFields(profile.email, {
          profile: {
            ...currentProfile,
            aiRecommendationUsage: normalized
          }
        });
      }
    } catch (error) {
      console.warn('[RECOMMENDATIONS] Usage sync failed:', error?.message || error);
    }
  },

  getUsageSummary(profile) {
    const state = this.readUsageState(profile);
    const quota = this.AI_DAILY_LIMIT;
    return {
      quota,
      used: state.used,
      remaining: Math.max(0, quota - state.used),
      resetAt: this.getQuotaDateKey(),
      date: state.date
    };
  },

  canUseLiveAI(profile) {
    const summary = this.getUsageSummary(profile);
    return {
      allowed: summary.used < summary.quota,
      ...summary
    };
  },

  recordLiveAIUsage(profile, source = 'gemini-ai') {
    const state = this.readUsageState(profile);
    const next = {
      date: this.getQuotaDateKey(),
      used: (Number(state.used) || 0) + 1,
      lastSource: source,
      lastUsedAt: new Date().toISOString()
    };
    this.persistUsageState(profile, next);
    return next;
  },

  formatUsageHint(profile) {
    const summary = this.getUsageSummary(profile);
    if (!profile?.email) {
      return `Live AI uses today: ${summary.remaining} of ${summary.quota} remaining. Sign in to save your own quota.`;
    }
    return `Live AI uses today: ${summary.remaining} of ${summary.quota} remaining. Resets daily per account.`;
  },

  getEscapeFn() {
    if (typeof Utils !== 'undefined' && Utils?.escapeHtml) return Utils.escapeHtml;
    return (value) => String(value ?? '')
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&#039;');
  },

  sleep(ms) {
    return new Promise((resolve) => setTimeout(resolve, ms));
  },

  async fetchWithTimeout(url, options = {}, timeoutMs = 25000) {
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
  },

  makeCacheKey(profile) {
    const bits = [
      profile.email || 'anon',
      profile.schoolName || '',
      profile.schoolGrade || '',
      profile.interest || '',
      profile.workloadPreference || '',
      profile.goal || '',
      this.compactList(profile.careers || []),
      this.compactList(profile.skills || []),
      this.compactList(profile.currentCourses || []),
      this.compactList(profile.extracurriculars || []),
    ];
    return `rec_cache_${bits.map((bit) => String(bit).toLowerCase().trim()).join('|')}`;
  },

  getFromCache(key) {
    try {
      const raw = localStorage.getItem(`mn_${key}`);
      if (!raw) return null;
      const parsed = JSON.parse(raw);
      if (!parsed || Date.now() - parsed.timestamp > this.CACHE_TTL) {
        localStorage.removeItem(`mn_${key}`);
        return null;
      }
      return parsed.value || null;
    } catch {
      return null;
    }
  },

  setCache(key, value) {
    try {
      localStorage.setItem(`mn_${key}`, JSON.stringify({ timestamp: Date.now(), value }));
    } catch (error) {
      console.warn('[RECOMMENDATIONS] Cache write failed:', error?.message || error);
    }
  },

  normalizeStudentProfile(student = {}) {
    const source = student.profile || student;
    const normalizeList = (value) => {
      if (!value) return [];
      if (Array.isArray(value)) return value.filter(Boolean);
      return String(value).split(/[\n,;/|]+/).map((part) => part.trim()).filter(Boolean);
    };
    return {
      ...source,
      email: String(student.email || source.email || '').toLowerCase(),
      name: student.name || source.name || 'Student',
      schoolName: source.schoolName || source.school || '',
      schoolLocation: source.schoolLocation || source.schoolDistrict || source.location || '',
      schoolCatalogUrl: source.schoolCatalogUrl || source.catalogUrl || '',
      grade: source.grade || student.grade || 'highschool',
      schoolGrade: source.schoolGrade || source.gradeLevel || source.schoolYear || '',
      interest: source.interest || 'undecided',
      workloadPreference: source.workloadPreference || source.workload || source.rigor || 'balanced',
      currentGpa: source.currentGpa || source.gpa || '',
      targetGpa: source.targetGpa || source.goalGpa || '',
      goal: source.goal || '',
      careers: normalizeList(source.careers || source.careerInterests || ''),
      skills: normalizeList(source.skills || ''),
      extracurriculars: normalizeList(source.extracurriculars || source.activities || ''),
      currentCourses: normalizeList(source.currentCourses || source.courseLoad || ''),
      passionProjects: normalizeList(source.passionProjects || source.projects || ''),
      internshipTimeline: source.internshipTimeline || source.internshipReadiness || '',
      timeAvailability: source.timeAvailability || source.weeklyAvailability || source.hoursPerWeek || '',
      targetColleges: normalizeList(source.targetColleges || source.colleges || ''),
      learningStyle: source.learningStyle || source.learning_style || '',
      supportNeeds: normalizeList(source.supportNeeds || source.support_needs || ''),
      specificConditions: normalizeList(source.specificConditions || source.specific_conditions || ''),
      challenges: normalizeList(source.challenges || source.challengeAreas || ''),
      additionalContext: source.additionalContext || source.additional_context || '',
      brainTypeIdentity: source.brainTypeIdentity || source.brain_type_identity || ''
    };
  },

  buildDefaultQuestion(profile, requestType) {
    const topic = requestType || 'Academic strategy';
    const grade = profile.schoolGrade || profile.grade || 'high school';
    const school = profile.schoolName ? ` at ${profile.schoolName}` : '';
    const interest = profile.interest && profile.interest !== 'undecided' ? profile.interest : 'their goals';
    return `Based on the onboarding profile${school}, give the most useful ${topic.toLowerCase()} for a ${grade} student focused on ${interest}.`;
  },

  buildTargetedAIContext(profile, requestType, userQuery) {
    const resolvedQuery = String(userQuery || '').trim() || this.buildDefaultQuestion(profile, requestType);
    const bigPicture = [
      profile.goal,
      profile.targetColleges?.length ? `Target schools: ${profile.targetColleges.join(', ')}` : '',
      profile.careers?.length ? `Career interests: ${profile.careers.join(', ')}` : '',
      profile.learningStyle ? `Learning style: ${profile.learningStyle}` : '',
      profile.supportNeeds?.length ? `Support needs: ${profile.supportNeeds.join(', ')}` : '',
      profile.challenges?.length ? `Challenges: ${profile.challenges.join(', ')}` : '',
      profile.additionalContext ? `Additional context: ${profile.additionalContext}` : ''
    ].filter(Boolean).join(' | ');

    const missing = [];
    if (!profile.schoolName) missing.push('school name');
    if (!profile.schoolGrade && !profile.grade) missing.push('grade level');
    if (!profile.interest || profile.interest === 'undecided') missing.push('primary interest');
    if (!profile.currentCourses?.length) missing.push('current courses');
    if (!profile.targetColleges?.length && !profile.goal) missing.push('target colleges or goal');

    return [
      `REQUEST TYPE: ${requestType || 'General strategy'}`,
      `USER QUESTION: ${resolvedQuery}`,
      '',
      'STUDENT PROFILE',
      `- Name: ${profile.name || 'Student'}`,
      `- School: ${profile.schoolName || 'Unknown school'}`,
      `- Location: ${profile.schoolLocation || 'Unknown location'}`,
      `- Grade: ${profile.schoolGrade || profile.grade || 'Unknown'}`,
      `- Interest: ${profile.interest || 'Undecided'}`,
      `- Workload preference: ${profile.workloadPreference || 'balanced'}`,
      `- GPA: ${profile.currentGpa || 'Not specified'}`,
      `- Courses: ${(profile.currentCourses || []).join(', ') || 'Not specified'}`,
      `- Skills: ${(profile.skills || []).join(', ') || 'Not specified'}`,
      `- Extracurriculars: ${(profile.extracurriculars || []).join(', ') || 'Not specified'}`,
      `- Projects: ${(profile.passionProjects || []).join(', ') || 'Not specified'}`,
      `- Target colleges: ${(profile.targetColleges || []).join(', ') || 'Not specified'}`,
      `- Career goals: ${(profile.careers || []).join(', ') || 'Not specified'}`,
      `- Long-term goal: ${profile.goal || 'Not specified'}`,
      profile.brainTypeIdentity ? `- Brain type / identity: ${profile.brainTypeIdentity}` : '',
      profile.learningStyle ? `- Learning style: ${profile.learningStyle}` : '',
      profile.supportNeeds?.length ? `- Support needs: ${profile.supportNeeds.join(', ')}` : '',
      profile.challenges?.length ? `- Challenges: ${profile.challenges.join(', ')}` : '',
      profile.additionalContext ? `- Additional context: ${profile.additionalContext}` : '',
      '',
      `KNOWN GAPS: ${missing.length ? missing.join(', ') : 'No obvious gaps'}`,
      bigPicture ? `BIG PICTURE: ${bigPicture}` : '',
      '',
      'INSTRUCTIONS',
      '- Give targeted recommendations tied to the student\'s exact inquiry.',
      '- If no freeform prompt was provided, infer the highest-value plan from the onboarding profile and current topic.',
      '- If the profile is missing a key detail, ask up to 2 concise follow-up questions before advising.',
      '- Otherwise, answer directly with specific courses, programs, projects, internships, or next steps by name.',
      '- Be honest about tradeoffs and avoid generic club advice.',
      '- Format in clean Markdown and end with exactly 3 "This Week" actions.'
    ].filter(Boolean).join('\n');
  },

  parseAITextResponse(data) {
    if (!data) return '';
    if (typeof data === 'string') return data.trim();

    const candidates = [
      data?.text,
      data?.output_text,
      data?.response,
      data?.choices?.[0]?.message?.content,
      data?.choices?.[0]?.text,
      data?.candidates?.[0]?.content?.parts?.map?.((part) => part?.text || '').join(''),
      data?.candidates?.[0]?.content?.parts?.[0]?.text
    ];

    return candidates.find((value) => typeof value === 'string' && value.trim().length > 0)?.trim() || '';
  },

  // ─── PATH 1: Free Browser-direct AI via Pollinations ───────────────────────
  async _tryFreeAI(profile, requestType, userQuery, onProgress) {
    const studentContext = this.buildTargetedAIContext(profile, requestType, userQuery);
    /*
STUDENT PROFILE:
- Name: ${profile.name || 'Student'}
- School: ${profile.schoolName || 'Unknown school'}, ${profile.schoolLocation || ''}
- Grade Level: ${profile.schoolGrade || profile.grade || 'Unknown'}
- Primary Interest / Major Focus: ${profile.interest || 'Undecided'}
- Career Goals: ${(profile.careers || []).join(', ') || 'Not specified'}
- Current Courses: ${(profile.currentCourses || []).join(', ') || 'Not specified'}
- Current Skills: ${(profile.skills || []).join(', ') || 'Not specified'}
- Extracurriculars: ${(profile.extracurriculars || []).join(', ') || 'Not specified'}
- Passion Projects: ${(profile.passionProjects || []).join(', ') || 'Not specified'}
- Target Colleges: ${(profile.targetColleges || []).join(', ') || 'Not specified'}
- Long-term Goal: ${profile.goal || 'Not specified'}
- Current GPA: ${profile.currentGpa || 'Not specified'}
- Workload Preference: ${profile.workloadPreference || 'balanced'}

STUDENT'S REQUEST:
Topic: "${requestType}"
Their question/context: "${userQuery || 'No additional context provided'}"

Provide highly specific, actionable advice for this exact student. Reference specific programs, courses, competitions, or opportunities by name. Be direct and honest — if something won't help them, say so. Format in clean Markdown. End with exactly 3 "This Week" action items.`;

    */
    const requestBody = {
      model: 'openai',
      messages: [
        { role: 'system', content: MENTORIST_AI_SYSTEM_PROMPT },
        { role: 'user', content: studentContext }
      ],
      temperature: 0.55
    };

    let lastError = null;
    for (let attempt = 1; attempt <= 3; attempt++) {
      const controller = new AbortController();
      const timeout = setTimeout(() => controller.abort(), 35000);

      try {
        if (onProgress) onProgress(`Consulting elite admissions strategies... (Attempt ${attempt}/3)`);
        
        const response = await this.fetchWithTimeout('https://text.pollinations.ai/openai', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(requestBody)
        }, 18000);

        if (!response.ok) {
          const errBody = await response.text().catch(() => '');
          throw new Error(`AI error ${response.status}: ${errBody.slice(0, 200)}`);
        }

        const rawText = await response.text();
        let data = rawText;
        try {
          data = JSON.parse(rawText);
        } catch {
          // plain text responses are fine
        }
        const text = this.parseAITextResponse(data);
        
        if (!text || text.trim().length < 50) {
          throw new Error('AI returned empty or insufficient response');
        }

        console.log(`[AI] Used free AI path ✓ (Attempt ${attempt})`);
        return {
          markdown: text.trim(),
          generatedAt: new Date().toISOString(),
          source: 'free-ai'
        };
      } catch (e) {
        clearTimeout(timeout);
        lastError = e;
        console.warn(`[AI] AI Attempt ${attempt} failed:`, e.message);
        if (attempt < 3) {
          await new Promise(resolve => setTimeout(resolve, attempt * 1500));
        }
      }
    }
    
    // If we exhaust all retries, throw the last error to fall back to playbook
    if (lastError.name === 'AbortError') throw new Error('AI request timed out after 35 seconds (all retries failed)');
    throw lastError;
  },

  // ─── PATH 2: Direct Gemini browser call ───────────────────────────────────
  async _tryGeminiAI(profile, requestType, userQuery, onProgress) {
    const apiKey = this.getGeminiKey();
    if (!apiKey) throw new Error('Missing Gemini API key');

    const prompt = this.buildTargetedAIContext(profile, requestType, userQuery);
    const requestBody = {
      systemInstruction: {
        parts: [{ text: MENTORIST_AI_SYSTEM_PROMPT }]
      },
      contents: [
        {
          role: 'user',
          parts: [{ text: prompt }]
        }
      ],
      generationConfig: {
        temperature: 0.55,
        topP: 0.95,
        maxOutputTokens: 1400
      }
    };

    let lastError = null;
    for (const model of this.getGeminiModelCandidates()) {
      const endpoint = `https://generativelanguage.googleapis.com/v1beta/models/${encodeURIComponent(model)}:generateContent?key=${encodeURIComponent(apiKey)}`;
      try {
        if (onProgress) onProgress(`Contacting Gemini directly... (${model})`);
        const response = await this.fetchWithTimeout(endpoint, {
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
        const text = this.parseAITextResponse(data);
        if (!text || text.trim().length < 50) {
          throw new Error('Gemini returned empty or insufficient response');
        }

        console.log(`[AI] Used Gemini browser path ✓ (${model})`);
        return {
          markdown: text.trim(),
          generatedAt: new Date().toISOString(),
          source: 'gemini-ai',
          provider: 'gemini',
          model
        };
      } catch (error) {
        lastError = error;
        console.warn(`[AI] Gemini model ${model} failed:`, error.message);
        if (![429, 503, 404].includes(error.statusCode)) {
          // For non-transient failures, continue trying remaining models but keep the latest error.
        }
      }
    }

    throw lastError || new Error('Gemini unavailable');
  },

  // ─── PATH 2b: Local/remote API proxy ──────────────────────────────────────
  async _tryServerAI(profile, requestType, userQuery, onProgress) {
    const base = this.getApiBaseUrl();
    if (!base) throw new Error('No API proxy available');

    if (onProgress) onProgress('Connecting to the Mentorist AI service...');
    const response = await this.fetchWithTimeout(`${base}/api/ai-strategy`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        profile,
        requestType,
        userQuery,
        systemPrompt: MENTORIST_AI_SYSTEM_PROMPT
      })
    }, 22000);

    if (!response.ok) {
      const errBody = await response.text().catch(() => '');
      throw new Error(`Strategy API ${response.status}: ${errBody.slice(0, 200)}`);
    }

    const data = await response.json();
    const text = this.parseAITextResponse(data);
    if (!text || text.trim().length < 50) {
      throw new Error('Strategy API returned empty or insufficient response');
    }

    console.log('[AI] Used API proxy path ✓');
    return {
      markdown: text.trim(),
      generatedAt: new Date().toISOString(),
      source: 'api-proxy',
      provider: 'server'
    };
  },



  // ─── PATH 3: Rich local playbook fallback ─────────────────────────────────
  generateLocalFallback(profile, requestType, userQuery) {
    const interest = profile.interest || 'your area of interest';
    const grade = profile.schoolGrade || profile.grade || 'your current grade';
    const school = profile.schoolName || 'your school';
    const careers = (profile.careers || []).slice(0, 3).join(', ') || 'your target field';
    const targetColleges = (profile.targetColleges || []).slice(0, 2).join(', ');
    const isIvyTargeting = (targetColleges + profile.goal + '').toLowerCase().match(/ivy|harvard|yale|princeton|mit|stanford|columbia|penn|brown|dartmouth|cornell/);

    let coreAdvice = '';
    const rt = (requestType || '').toLowerCase();

    if (rt.includes('course') || rt.includes('gpa')) {
      coreAdvice = `## Elite Course & GPA Strategy for ${interest}

### Highest-Priority Courses to Take
${interest.toLowerCase().includes('stem') || interest.toLowerCase().includes('computer') ? `
- **AP Computer Science A** — The strongest CS signal for college apps. Learn Java, OOP, algorithms.
- **AP Calculus BC** (not AB) — BC shows ambition; skips a full semester of college math. Taking AB when BC is offered is a negative signal for elite STEM.
- **AP Physics C: Mechanics & E&M** — Calculus-based; the top engineering signal for selective schools.
- **AP Chemistry / AP Biology** — Essential core sciences.
- **Dual Enrollment Math** — Taking post-AP math (Linear Algebra, Multivariable Calculus) at a local university is a massive differentiator.
` : interest.toLowerCase().includes('medicine') || interest.toLowerCase().includes('health') ? `
- **AP Biology & AP Chemistry** — The core pre-med signals. AOs expect to see these.
- **AP Calculus BC** — Top medical programs still want to see high-end quantitative rigor.
- **AP Statistics** — Critical for medical research literacy.
- **Anatomy & Physiology / Dual Enrollment** — Practical healthcare knowledge.
` : interest.toLowerCase().includes('business') || interest.toLowerCase().includes('entrepreneur') ? `
- **AP Economics (Macro + Micro)** — Foundational for business schools like Wharton, Ross, Stern.
- **AP Statistics & AP Calculus BC** — Elite business programs require heavy quant skills.
- **AP English Language** — Business writing and rhetoric are lifelong career assets.
` : `
- **AP English Language AND AP English Lit** — Two APs show depth in writing and analysis.
- **AP US History + AP World History** — Strong humanities narrative.
- **AP Government and Politics** — Required for law/policy-focused students.
- **AP Seminar + AP Research (Capstone)** — Shows independent intellectual work.
`}

### GPA Rules That Actually Matter
- **Protect the unweighted GPA**: A 4.0 unweighted is significantly better than a 4.0 weighted loaded with easy classes.
- **Rigor Context**: AOs know what your school offers. If your school offers 15 APs and you take 3, you are not taking the "most rigorous" schedule.
- **Trajectory**: An upward trend (3.5 -> 3.9) shows maturity. Stagnation or decline is a red flag.`;

    } else if (rt.includes('ivy') || rt.includes('college') || rt.includes('admissions')) {
      coreAdvice = `## Ivy League & Elite College Strategy (2024-2026 Trends)

### The Honest Truth About Elite Admissions
Elite schools (HYPSM) accept 3-5% of applicants. What separates accepted students:
1. **The "Spike"** — Being nationally recognized in ONE thing. They do not want "well-rounded" students; they want a well-rounded class of hyper-specialized individuals.
2. **Standardized Testing is Back** — Brown, Dartmouth, Yale, Harvard, and MIT require test scores again. Target 1540+ SAT or 34+ ACT.
3. **A Cohesive Narrative** — Everything in your application (courses, activities, essays) must tell ONE undeniable story.

### Extracurricular Tier Framework
- **Tier 1 (Target)**: National/international recognition — USAMO qualifier, Regeneron STS finalist, published research in peer-reviewed journal, founded a registered 501(c)(3) with massive, quantifiable impact, elite summer program (RSI, Telluride).
- **Tier 2 (Strong)**: State competition placements, meaningful research under a university professor resulting in a poster/presentation, club founder with verifiable large-scale impact.
- **Tier 3 (Average)**: School-level leadership — varsity captain, club president, Eagle Scout. (Fine for state schools, not enough for HYPSM).
- **Tier 4 (Fluff)**: Member of clubs, generic volunteering. DROP THESE.

### Summer Programs That Move the Needle
- **STEM**: RSI @ MIT (~1.5% acceptance), PRIMES @ MIT, SIMR @ Stanford, PROMYS, COSMOS, Clark Scholars.
- **Humanities/Business**: Telluride TASS, Wharton Global Youth.
- **Access**: QuestBridge College Prep Scholars.`;

    } else if (rt.includes('internship') || rt.includes('job') || rt.includes('career')) {
      coreAdvice = `## Breaking Into Internships & Elite Research

### The Fastest Path to Real Experience
Internships at this level require initiative, not just applications:

1. **Cold Emailing Professors** — Find a professor at a local university whose research aligns with your "spike." Email them: "I'm a [grade] student passionate about [field]. I read your paper on [specific topic]. Could I assist your lab by doing [specific task]?"
2. **Proof of Work over Resumes** — A resume says you can do something. Proof of work *shows* it. Build a GitHub portfolio, publish a case study, or run a verifiable pilot program.
3. **Local Startups over Big Tech** — A real role at a 20-person startup where you write production code or run real campaigns > a "shadow day" at Google.
4. **Leverage LinkedIn** — Message alumni from your high school who are now at target colleges or companies. Ask for 15-minute informational interviews.

### High-Value Targets
${interest.toLowerCase().includes('stem') || interest.toLowerCase().includes('computer') ? `
- **University Labs** — Best for research experience and recommendation letters.
- **Local Tech Startups** — Best for shipping real code and product experience.
- **Open Source Contributions** — Fixing bugs in public repos is verifiable proof of skill.` : `
- **Think Tanks & Policy Orgs** — Offer to do data entry or constituent research.
- **Local Political Campaigns** — Easiest way to get real-world organizing experience quickly.
- **University Labs (Humanities/Social Science)** — Professors need help analyzing texts and data too.`}`;

    } else if (rt.includes('extracurricular') || rt.includes('project')) {
      coreAdvice = `## Extracurricular Strategy: Building a Spike

### Stop Collecting Clubs. Build Depth.
Admissions officers see thousands of NHS members and student body presidents. You must move from **Participation to Impact**.

### The 4 Steps to an Elite Spike
1. **Identify a Niche**: Combine a hard skill (e.g., coding, data analysis) with a domain you care about (e.g., climate, local policy).
2. **Build Something Tangible**: Do not just "start a club." Build an app with 500+ users. Raise $10,000 for a specific cause. Publish a policy paper.
3. **Seek External Validation**: Your school is too small of a pond. Win a state or national competition. Get your work featured in local news.
4. **Drop the Fluff**: Actively drop time-consuming Tier 3/4 activities (generic volunteering, random club memberships) that do not support your main narrative.

### High-Impact Projects for Your Profile
${interest.toLowerCase().includes('stem') || interest.toLowerCase().includes('computer') ? `
- **Develop and Deploy an App**: Solve a problem for a local business or nonprofit.
- **Competitive STEM**: USAMO, Science Olympiad, Regeneron STS, Conrad Challenge.
- **Publish Research**: Co-author a paper with a local professor.` : `
- **Publish Writing**: Submit to national youth journals, The Concord Review, or start a hyper-niche Substack.
- **Organize a Large-Scale Event**: A city-wide hackathon, a regional debate tournament, or a major fundraising gala.
- **Competitive Humanities**: National Speech & Debate (TOC), Model UN (Best Delegate).`}`;

    } else {
      coreAdvice = `## Strategic Advice: ${requestType}

### Your Situation at a Glance
You're a ${grade} student at ${school} with interest in ${interest} ${targetColleges ? `targeting ${targetColleges}` : ''}. Here is the elite playbook:

### The Most Important Thing Right Now
${isIvyTargeting ? `
**You are targeting HYPSM/Elite schools.** The gap between "smart student" and "admitted student" is the "Spike." You must be exceptionally good at ONE thing, with national or international validation. Drop the "well-rounded" approach. Identify your spike today, and align your courses, summers, and projects to support it.
` : `
**Focus on building depth, not breadth.** Choose 1-2 activities you genuinely care about and push them as far as you can (regional/state impact). Meanwhile, protect your GPA while taking the hardest AP/IB courses your school offers.
`}

### Three Priority Areas
1. **Academic Rigor** — Are you taking the hardest relevant courses at your school? (e.g., AP Calc BC, AP Physics C).
2. **A Primary Activity (The Spike)** — What is the one quantifiable, high-impact thing you are building?
3. **Test Preparation** — Standardized testing is back. Start preparing for the SAT/ACT early to hit the 1540+/34+ benchmark.`;
    }

    return `# ${requestType} — Strategic Advice

${coreAdvice}

---

## This Week: 3 Concrete Actions

1. **Audit your Extracurriculars**: Identify 1-2 generic "fluff" activities you can drop this week to free up time for your Spike.
2. **Research an Elite Program**: Look up the application requirements for RSI, Telluride, or a top university lab program. Add the deadline to your calendar.
3. **Initiate Proof-of-Work**: Draft a cold email to a local professor or start the GitHub repo for your primary project. Do not wait for permission to start building.

---

*⚡ This advice is generated from Mentorist's offline playbook. For real-time, dynamic AI analysis tailored to your specific context, check your internet connection and try again.*`;
  },

  // ─── Main method: tri-path with smart fallback ───────────────────────────
  async getInteractiveRecommendations(studentProfile, requestType, userQuery, onStatusUpdate) {
    const profile = this.normalizeStudentProfile(studentProfile);

    const updateStatus = (msg) => {
      if (typeof onStatusUpdate === 'function') onStatusUpdate(msg);
    };

    // Try the strongest live AI paths first, then degrade gracefully.
    const liveAI = this.canUseLiveAI(profile);
    let fallbackReason = liveAI.allowed
      ? 'AI engine unavailable'
      : `You’ve reached your live AI limit for today. The offline playbook is still available and resets daily.`;
    updateStatus('Consulting Ivy League admissions data and building your strategy...');

    const pathAttempts = [];
    if (liveAI.allowed) {
      if (this.getApiBaseUrl()) pathAttempts.push(() => this._tryServerAI(profile, requestType, userQuery, updateStatus));
      pathAttempts.push(() => this._tryGeminiAI(profile, requestType, userQuery, updateStatus));
    }

    for (const attempt of pathAttempts) {
      try {
        const result = await attempt();
        if (result?.markdown) {
          if (!result.fallback && result.source !== 'local-playbook') {
            this.recordLiveAIUsage(profile, result.source || 'live-ai');
          }
          return {
            ...result,
            usage: this.getUsageSummary(profile)
          };
        }
      } catch (e) {
        console.warn('[AI] Live AI path failed:', e.message);
        fallbackReason = e?.message || 'AI is experiencing high demand. Please try again later.';
      }
    }

    // Rich local fallback
    console.log('[AI] Using rich local playbook fallback');
    updateStatus('Loading your personalized playbook...');
    const fallbackMarkdown = this.generateLocalFallback(profile, requestType, userQuery);
    return {
      markdown: fallbackMarkdown,
      generatedAt: new Date().toISOString(),
      fallback: true,
      fallbackReason: fallbackReason,
      source: 'local-playbook',
      usage: this.getUsageSummary(profile)
    };
  },

  // Legacy method kept for backward compatibility
  async fetchRecommendations(studentProfile) {
    const profile = this.normalizeStudentProfile(studentProfile);
    const base = this.getApiBaseUrl();
    if (!base) throw new Error('No server available');
    const response = await fetch(`${base}/api/recommend`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(profile)
    });
    if (!response.ok) throw new Error(`API returned ${response.status}`);
    const result = await response.json();
    if (!result?.success) throw new Error(result?.error || 'Recommendation API error');
    return this.normalizeRecommendations(result);
  },

  normalizeRecommendations(raw) {
    const payload = raw?.data || raw?.recommendations || raw || {};
    const emptyTracks = { now: [], next: [], stretch: [], gpaBoost: [] };
    return {
      ...payload,
      success: raw?.success ?? true,
      profile: payload.profile || raw?.profile || null,
      schoolContext: payload.schoolContext || raw?.meta?.schoolCatalog || null,
      courses: payload.courses || [],
      jobs: payload.jobs || payload.opportunities || [],
      opportunities: payload.opportunities || payload.jobs || [],
      projects: payload.projects || [],
      extracurriculars: payload.extracurriculars || [],
      tools: payload.tools || [],
      courseTracks: payload.courseTracks || emptyTracks,
      roadmap: payload.roadmap || { now: [], next: [], stretch: [] },
      peerPatterns: payload.peerPatterns || { sampleSize: 0, summary: '', schoolFocus: '', commonThemes: [], topActivities: [] },
      gpaStrategy: payload.gpaStrategy || { headline: 'GPA strategy', recommendations: [], caution: '', notes: '' },
      tips: payload.tips || [],
      mentorQuestions: payload.mentorQuestions || [],
      summary: payload.summary || raw?.summary || '',
      generatedAt: payload.generatedAt || raw?.generatedAt || new Date().toISOString()
    };
  },

  getLocalPeerProfiles(profile) {
    try {
      if (typeof UserStore === 'undefined' || !UserStore?.getAll) return [];
      const users = UserStore.getAll();
      return users
        .filter((user) => user && user.role === 'student')
        .map((user) => this.normalizeStudentProfile(user))
        .filter((peer) => peer.email !== profile.email)
        .filter((peer) => {
          const sameSchool = (peer.schoolName || '').toLowerCase() === (profile.schoolName || '').toLowerCase();
          const sameInterest = (peer.interest || '').toLowerCase() === (profile.interest || '').toLowerCase();
          return sameSchool || sameInterest;
        });
    } catch {
      return [];
    }
  },

  buildFallbackRecommendations(profile) {
    if (typeof MentoristRecommendationCore === 'undefined') {
      return {
        success: true, profile, courses: [], jobs: [], opportunities: [], projects: [],
        extracurriculars: [], tools: [], courseTracks: { now: [], next: [], stretch: [], gpaBoost: [] },
        roadmap: { now: [], next: [], stretch: [] },
        peerPatterns: { sampleSize: 0, summary: '', schoolFocus: '', commonThemes: [], topActivities: [] },
        gpaStrategy: { headline: 'GPA strategy', recommendations: [], caution: '', notes: '' },
        tips: ['Add the recommendation core module for richer offline fallback.'],
        mentorQuestions: [], summary: 'Recommendations are unavailable right now.'
      };
    }
    const peerStudents = this.getLocalPeerProfiles(profile);
    return this.normalizeRecommendations(
      MentoristRecommendationCore.buildRecommendationBundle(profile, { peerStudents })
    );
  },

  async getRecommendations(student, options = {}) {
    if (!student) return null;
    const profile = this.normalizeStudentProfile(student);
    const cacheKey = this.makeCacheKey(profile);
    const cached = this.getFromCache(cacheKey);
    if (cached) return cached;
    try {
      const result = await this.fetchRecommendations(profile);
      this.setCache(cacheKey, result);
      return result;
    } catch (error) {
      console.warn('[RECOMMENDATIONS] Falling back to local generation:', error?.message || error);
      const fallback = this.buildFallbackRecommendations(profile);
      this.setCache(cacheKey, fallback);
      if (options?.rethrow) throw error;
      return fallback;
    }
  },

  getGradeLabel(profile) {
    const grade = String(profile.schoolGrade || profile.grade || '').trim();
    const raw = grade.toLowerCase();
    if (!grade) return 'Unspecified';
    if (raw.includes('grade') || raw.includes('freshman') || raw.includes('sophomore') || raw.includes('junior') || raw.includes('senior')) return grade;
    if (/^\d{1,2}$/.test(raw)) {
      const n = Number(raw);
      return `${n}th Grade`;
    }
    return grade;
  },

  compactList(values) {
    return (values || []).map((value) => String(value).trim()).filter(Boolean).join(', ');
  },

  renderCard(item, kind = 'course') {
    const esc = this.getEscapeFn();
    if (!item) return '';
    if (kind === 'job') {
      return `<div class="rec-item"><div class="rec-item-title">${esc(item.title || 'Opportunity')}</div><div class="rec-item-desc">${esc(item.description || item.why || '')}</div><div class="rec-item-meta">${esc(item.readiness || '')}</div><div class="rec-item-salary">${esc(item.salary || '')}</div></div>`;
    }
    if (kind === 'project') {
      return `<div class="rec-item"><div class="rec-item-title">${esc(item.name || 'Project')}</div><div class="rec-item-desc">${esc(item.description || item.why || '')}</div><div class="rec-item-value">${esc(item.time || item.portfolioValue || '')}</div></div>`;
    }
    if (kind === 'activity') {
      return `<div class="rec-item"><div class="rec-item-title">${esc(item.name || 'Activity')}</div><div class="rec-item-desc">${esc(item.description || item.why || '')}</div><div class="rec-item-meta">${esc(item.time || item.impact || '')}</div></div>`;
    }
    if (kind === 'tool') {
      return `<div class="rec-item"><div class="rec-item-title">${esc(item.name || 'Tool')}</div><div class="rec-item-desc">${esc(item.description || item.why || '')}</div><div class="rec-item-meta">${esc(item.time || '')}</div><div class="rec-item-value">${esc(item.resource || '')}</div></div>`;
    }
    return `<div class="rec-item"><div class="rec-item-title">${esc(item.name || 'Course')}</div><div class="rec-item-desc">${esc(item.description || item.why || '')}</div><div class="rec-item-meta">${esc(item.difficulty || item.category || '')}</div></div>`;
  },

  renderCourseTrack(title, items) {
    const esc = this.getEscapeFn();
    const cards = (items || []).map((item) => this.renderCard(item, 'course')).join('');
    return `<section class="rec-section"><h2 class="rec-section-title">${esc(title)}</h2><div class="rec-items">${cards || '<div class="rec-item"><div class="rec-item-desc">No items yet.</div></div>'}</div></section>`;
  },

  renderSection(title, items, kind) {
    const esc = this.getEscapeFn();
    const cards = (items || []).map((item) => this.renderCard(item, kind)).join('');
    return `<section class="rec-section"><h2 class="rec-section-title">${esc(title)}</h2><div class="rec-items">${cards || '<div class="rec-item"><div class="rec-item-desc">No items yet.</div></div>'}</div></section>`;
  },

  renderListSection(title, items) {
    const esc = this.getEscapeFn();
    const list = (items || []).map((item) => `<li>${esc(typeof item === 'string' ? item : item.body || item.title || item.name || '')}</li>`).join('');
    return `<section class="rec-tips"><h3>${esc(title)}</h3><ul>${list || '<li>No items yet.</li>'}</ul></section>`;
  },

  formatRecommendations(recommendations) {
    if (!recommendations) return '';
    const esc = this.getEscapeFn();
    const courseTracks = recommendations.courseTracks || { now: [], next: [], stretch: [], gpaBoost: [] };
    const profile = recommendations.profile || {};
    const schoolContext = recommendations.schoolContext || {};
    const peerPatterns = recommendations.peerPatterns || {};
    const roadmap = recommendations.roadmap || {};
    const gpaStrategy = recommendations.gpaStrategy || {};
    const isFallback = schoolContext?.sourceType === 'playbook' || recommendations.aiPowered === false;

    let html = `<div class="rec-tips"><h3>School-Aware Strategy</h3>${isFallback ? `<div style="padding:12px;background:rgba(255,170,0,0.1);border:1px solid rgba(255,170,0,0.3);border-radius:8px;margin-bottom:16px;color:#ffaa00;font-size:14px;"><strong>Notice:</strong> Using tailored fallback recommendations based on your profile.</div>` : ''}<p>${esc(recommendations.summary || schoolContext.summary || 'Personalized recommendations')}</p><div style="display:flex;flex-wrap:wrap;gap:10px;margin-top:18px;"><span class="qtag-premium">${esc(profile.schoolName || 'School not set')}</span><span class="qtag-premium">${esc(this.getGradeLabel(profile))}</span><span class="qtag-premium">${esc(profile.interest || 'undecided')}</span><span class="qtag-premium">${esc(profile.workloadPreference || 'balanced')}</span></div></div>`;

    html += this.renderCourseTrack('Take Now', courseTracks.now);
    html += this.renderCourseTrack('Next Up', courseTracks.next);
    html += this.renderCourseTrack('Stretch Options', courseTracks.stretch);
    html += this.renderCourseTrack('Weighted GPA Boosters', courseTracks.gpaBoost);
    if (gpaStrategy?.recommendations?.length) {
      html += `<section class="rec-tips"><h3>GPA Strategy</h3><p>${esc(gpaStrategy.caution || '')}</p><ul>${gpaStrategy.recommendations.map((item) => `<li>${esc(item)}</li>`).join('')}</ul></section>`;
    }
    html += this.renderSection('Job and Internship Targets', recommendations.jobs, 'job');
    html += this.renderSection('Passion Projects', recommendations.projects, 'project');
    html += this.renderSection('Extracurriculars', recommendations.extracurriculars, 'activity');
    html += this.renderSection('Tools and Systems', recommendations.tools, 'tool');
    if (peerPatterns?.summary || (peerPatterns?.topActivities || []).length) {
      html += `<section class="rec-tips"><h3>What Similar Students Do</h3><p>${esc(peerPatterns.summary || '')}</p>${peerPatterns.schoolFocus ? `<p>${esc(peerPatterns.schoolFocus)}</p>` : ''}<ul>${(peerPatterns.topActivities || []).map((item) => `<li>${esc(item)}</li>`).join('')}</ul></section>`;
    }
    if ((recommendations.tips || []).length) html += this.renderListSection('Strategic Tips', recommendations.tips);
    if ((recommendations.mentorQuestions || []).length) html += this.renderListSection('Questions to Ask Your Mentor', recommendations.mentorQuestions);
    return html;
  },

  formatPreview(recommendations) {
    if (!recommendations) return '';
    const esc = this.getEscapeFn();
    const course = (recommendations.courseTracks?.now || recommendations.courses || [])[0];
    const job = (recommendations.jobs || recommendations.opportunities || [])[0];
    const project = (recommendations.projects || [])[0];
    const peer = recommendations.peerPatterns || {};
    return `<div style="display:grid;grid-template-columns:repeat(auto-fit,minmax(200px,1fr));gap:18px;"><div style="background:var(--bg-2);border:1px solid var(--b1);border-radius:var(--r-2xl);padding:20px;"><div style="font-size:11px;color:var(--green);font-weight:800;text-transform:uppercase;letter-spacing:0.08em;margin-bottom:8px;">Best Course</div><div style="font-size:16px;font-weight:800;color:var(--t1);margin-bottom:8px;">${esc(course?.name || 'No course yet')}</div><div style="font-size:13px;color:var(--t3);line-height:1.5;">${esc(course?.why || course?.description || 'Awaiting data')}</div></div><div style="background:var(--bg-2);border:1px solid var(--b1);border-radius:var(--r-2xl);padding:20px;"><div style="font-size:11px;color:var(--amber);font-weight:800;text-transform:uppercase;letter-spacing:0.08em;margin-bottom:8px;">Best Opportunity</div><div style="font-size:16px;font-weight:800;color:var(--t1);margin-bottom:8px;">${esc(job?.title || 'No job yet')}</div><div style="font-size:13px;color:var(--t3);line-height:1.5;">${esc(job?.why || job?.description || 'Awaiting data')}</div></div><div style="background:var(--bg-2);border:1px solid var(--b1);border-radius:var(--r-2xl);padding:20px;"><div style="font-size:11px;color:var(--green);font-weight:800;text-transform:uppercase;letter-spacing:0.08em;margin-bottom:8px;">Best Project</div><div style="font-size:16px;font-weight:800;color:var(--t1);margin-bottom:8px;">${esc(project?.name || 'No project yet')}</div><div style="font-size:13px;color:var(--t3);line-height:1.5;">${esc(project?.why || project?.description || 'Awaiting data')}</div></div></div><div style="margin-top:18px;background:var(--green-dim);border:1px solid rgba(0,232,122,0.2);border-radius:var(--r-2xl);padding:18px 20px;"><div style="font-size:11px;color:var(--green);font-weight:800;text-transform:uppercase;letter-spacing:0.08em;margin-bottom:8px;">Peer Signal</div><div style="font-size:14px;color:var(--t2);line-height:1.6;">${esc(peer.summary || 'No peer cluster found yet.')}</div></div>`;
  }
};

if (typeof document !== 'undefined') {
  document.addEventListener('DOMContentLoaded', () => {
    if (typeof window !== 'undefined') {
      window.RecommendationEngine = RecommendationEngine;
    }
  });
}

if (typeof module !== 'undefined' && module.exports) {
  module.exports = { RecommendationEngine };
}
