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
      targetColleges: normalizeList(source.targetColleges || source.colleges || '')
    };
  },

  // ─── PATH 1: Free Browser-direct AI via Pollinations ───────────────────────
  async _tryFreeAI(profile, requestType, userQuery, onProgress) {
    const studentContext = `
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
        
        const response = await fetch('https://text.pollinations.ai/openai', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(requestBody),
          signal: controller.signal
        });
        clearTimeout(timeout);

        if (!response.ok) {
          const errBody = await response.text().catch(() => '');
          throw new Error(`AI error ${response.status}: ${errBody.slice(0, 200)}`);
        }

        const data = await response.json();
        const text = data?.choices?.[0]?.message?.content;
        
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
      coreAdvice = `## Course & GPA Strategy for ${interest}

### Highest-Priority Courses to Take
${interest.toLowerCase().includes('stem') || interest.toLowerCase().includes('computer') ? `
- **AP Computer Science A** — The strongest CS signal for college apps. Learn Java, OOP, algorithms.
- **AP Calculus BC** (not AB) — BC shows ambition; skips a full semester of college math.
- **AP Physics C: Mechanics** — Calculus-based; top engineering signal for selective schools.
- **AP Chemistry** — If targeting premed or chemical engineering.
- **Dual Enrollment Math** — If your school allows it, taking Calc III or Linear Algebra at a local college is a massive differentiator.
` : interest.toLowerCase().includes('medicine') || interest.toLowerCase().includes('health') ? `
- **AP Biology** — Core pre-med signal. Study hard; it's foundational.
- **AP Chemistry** — Essential for pre-med. Pairs with AP Bio for strong science narrative.
- **AP Statistics** — Helps with medical research literacy and is a solid GPA class.
- **Anatomy & Physiology** — Practical healthcare vocab for hospital work and interviews.
- **AP Psychology** — Useful for patient empathy; often a GPA booster if managed well.
` : interest.toLowerCase().includes('business') || interest.toLowerCase().includes('entrepreneur') ? `
- **AP Economics (Macro + Micro)** — Foundational for business schools like Wharton, Ross, Stern.
- **AP Statistics** — Essential for finance and analytics work.
- **AP English Language** — Business writing and rhetoric are lifelong career assets.
- **Accounting or Entrepreneurship** (CTE) — Real-world skills that differentiate you.
` : `
- **AP English Language AND AP English Lit** — Two APs show depth in writing.
- **AP US History + AP World History** — Strong humanities narrative.
- **AP Government and Politics** — Required for law/policy-focused students.
- **AP Seminar + AP Research (Capstone)** — Shows independent intellectual work.
`}

### GPA Rules That Actually Matter
- A 95 in AP Calc BC > 100 in regular math. Rigor signals > easy perfect scores.
- If your GPA is above 3.7 unweighted, prioritize rigor. Below 3.5, prioritize protecting grades.
- One B in a very hard AP is forgivable. Consistent Bs across all APs is a red flag.`;

    } else if (rt.includes('ivy') || rt.includes('college') || rt.includes('admissions')) {
      coreAdvice = `## Ivy League & Elite College Strategy

### The Honest Truth About Ivy Admissions
Elite schools accept 3-8% of applicants. What separates accepted students:
1. **A "spike"** — Being nationally recognized in ONE thing (not being okay at many)
2. **Strong academics** — Hardest courses available + high grades
3. **A compelling narrative** — Your application tells ONE coherent story

### What Actually Matters (In Order)
1. **Tier 1 extracurricular** — National competition winner, published research, real company internship, RSI/Telluride acceptance, founded org with genuine impact
2. **Course rigor** — AP/IB in all core subjects; no "easy senior year"
3. **GPA** — 3.9+ unweighted preferred; 4.5+ weighted common
4. **Essays** — Specific, scene-driven, reveal your actual personality
5. **Recs** — Teachers who know you as a thinker, not just a student
6. **Test scores** — SAT 1500+/ACT 33+ for most ivies; 1550+ for HYP/MIT/Stanford

### Summer Programs That Move the Needle
- **RSI** (MIT, rising seniors) — The gold standard STEM research program
- **Telluride TASS** (humanities) — Extremely selective, full scholarship
- **PRIMES** (MIT, year-round math) — For math-focused students
- **QuestBridge** — Critical if you need financial aid; partnered with all top schools
- **Clark Scholars** (Texas Tech STEM research) — More accessible than RSI, still prestigious`;

    } else if (rt.includes('internship') || rt.includes('job') || rt.includes('career')) {
      coreAdvice = `## Breaking Into Internships & Real Career Experience

### The Fastest Path to Real Experience
Most students think internships require connections. They don't — they require initiative:

1. **Cold email professors** — Find a professor at a local university whose research interests you. Email them: "I'm a [grade] student passionate about [field]. I read your paper on [specific paper]. Could I assist your lab in any capacity?" 70% will say yes to free help.

2. **Local companies over big ones** — A real role at a 20-person startup > "shadow day" at a Fortune 500. Small companies will give you actual work.

3. **Build your portfolio first** — For tech: GitHub with 2-3 real projects. For business: a case study or micro-business. For medicine: verified volunteer hours + any shadowing.

4. **LinkedIn before you need it** — Set up a professional profile now. Connect with 50 people in your field. Message 5 people per week asking for a 15-minute conversation about their career.

### Best Opportunities by Interest
${interest.toLowerCase().includes('stem') || interest.toLowerCase().includes('computer') ? `
- **Google CSSI** (CS summer institute for rising seniors) — Competitive but prestigious
- **Microsoft TEALS** — Get involved as a student leader
- **Local startups** — Search "[your city] startup internship high school"
- **Your school district IT** — Often hire student techs` : `
- **Hospital volunteer programs** — Apply through hospital portals
- **Nonprofit communications** — Easy to get; valuable for humanities/business students
- **Research assistant positions** — Contact university professors directly
- **Local elected officials** — Offer to help with constituent research or communications`}`;

    } else if (rt.includes('extracurricular') || rt.includes('project')) {
      coreAdvice = `## Extracurricular Strategy & Projects That Actually Matter

### Stop Collecting Clubs. Build a Spike.
AOs from selective schools have seen 10,000 student government presidents and National Honor Society members. What they haven't seen enough of:
- A student who built an app solving a real problem with 1,000+ users
- A researcher who co-authored a published paper
- A founder whose nonprofit served 500 people
- A competitor who placed at nationals

### Tier Framework (Know Where You Stand)
- **Tier 1** (national/international impact): USAMO, Science Olympiad nationals, Intel/Regeneron STS, RSI acceptance, real startup, published work
- **Tier 2** (regional/strong school): State competition, professor research, club founder with real results, paid internship
- **Tier 3** (school-level): Varsity, club officer, editor, student government
- **Right now, aim to move one tier up in your PRIMARY activity.**

### High-Impact Projects for Your Profile
${interest.toLowerCase().includes('stem') || interest.toLowerCase().includes('computer') ? `
- Build a real app that solves a problem you personally face — deploy it, get users
- Contribute to an open-source project on GitHub (start with good-first-issue tags)
- Enter Science Olympiad, MATHCOUNTS, AMC/AIME, or a regional hackathon
- Write a technical blog explaining complex concepts — shows communication + depth` : `
- Start a newsletter/blog with a specific angle; pitch it to local publications
- Enter Model UN (aim for Best Delegate at a national conference)
- Write a policy white paper on an issue you care about; submit to youth policy journals
- Organize a community event with measurable impact (attendance, funds raised)`}`;

    } else {
      coreAdvice = `## Strategic Advice: ${requestType}

### Your Situation at a Glance
You're a ${grade} student at ${school} with interest in ${interest} ${targetColleges ? `targeting ${targetColleges}` : ''}. Here's the honest playbook:

### The Most Important Thing Right Now
${isIvyTargeting ? `
You're targeting elite schools. The gap between "good applicant" and "accepted applicant" is almost always ONE thing: a genuine spike. Start asking yourself: "What am I building toward that almost no one my age could do?" That's your north star for every decision — courses, activities, summer, even your essays.
` : `
Focus on building depth, not breadth. Choose 2-3 activities you genuinely care about and go all-in. Schools want to see commitment and growth — not a laundry list of clubs. Meanwhile, protect your GPA in the hardest courses you can handle.
`}

### Three Priority Areas
1. **Academic Rigor** — Are you taking the hardest relevant courses at your school? If not, that's the first fix.
2. **A Primary Activity** — What's the one thing you're building that's distinctly yours?
3. **Early Planning** — Junior year is when everything accelerates. Start any application processes (summer programs, research, competitions) at least 6 months early.`;
    }

    return `# ${requestType} — Strategic Advice

${coreAdvice}

---

## This Week: 3 Concrete Actions

1. **Research one named program** relevant to your interest (RSI, TASS, SIMR, QuestBridge, Clark Scholars) — check the deadline and add it to your calendar
2. **Talk to your school counselor** this week about the course catalog for next year — ask specifically which AP/honors options are available in ${interest}
3. **Start one tangible proof-of-work** — a GitHub repo, a draft blog post, an email to a professor, or a competition registration

---

*⚡ This advice is generated from Mentorist's offline knowledge base. For real-time personalized AI analysis including your school's course catalog, check your internet connection and try again — or reach out to a Mentorist peer mentor directly.*`;
  },

  // ─── Main method: tri-path with smart fallback ───────────────────────────
  async getInteractiveRecommendations(studentProfile, requestType, userQuery, onStatusUpdate) {
    const profile = this.normalizeStudentProfile(studentProfile);

    const updateStatus = (msg) => {
      if (typeof onStatusUpdate === 'function') onStatusUpdate(msg);
    };

    // Path 1: Free Browser-direct AI via Pollinations
    let fallbackReason = 'AI engine unavailable';
    updateStatus('Consulting Ivy League admissions data and building your strategy...');
    try {
      const result = await this._tryFreeAI(profile, requestType, userQuery, updateStatus);
      if (result?.markdown) return result;
    } catch (e) {
      console.warn('[AI] Free AI call failed:', e.message);
      fallbackReason = 'AI is experiencing high demand. Please try again later.';
    }

    // Path 3: Rich local fallback
    console.log('[AI] Using rich local playbook fallback');
    updateStatus('Loading your personalized playbook...');
    const fallbackMarkdown = this.generateLocalFallback(profile, requestType, userQuery);
    return {
      markdown: fallbackMarkdown,
      generatedAt: new Date().toISOString(),
      fallback: true,
      fallbackReason: fallbackReason,
      source: 'local-playbook'
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
