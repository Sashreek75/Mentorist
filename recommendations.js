/* ============================================================
   Mentorist recommendation client
   Fetches school-aware roadmap data, caches it, and renders
   course, job, project, extracurricular, and peer insights.
   ============================================================ */

const RecommendationEngine = {
  CACHE_TTL: 60 * 60 * 1000,
  API_BASE_URL: null,

  getApiBaseUrl() {
    if (this.API_BASE_URL) return this.API_BASE_URL;
    if (typeof window !== 'undefined' && window.__MENTORIST_RECOMMEND_API__) {
      this.API_BASE_URL = window.__MENTORIST_RECOMMEND_API__;
      return this.API_BASE_URL;
    }
    if (typeof window !== 'undefined') {
      const { protocol, hostname, origin } = window.location;
      if (protocol === 'file:' || hostname === 'localhost' || hostname === '127.0.0.1') {
        this.API_BASE_URL = 'http://localhost:3000';
      } else {
        this.API_BASE_URL = origin || '';
      }
    } else {
      this.API_BASE_URL = 'http://localhost:3000';
    }
    return this.API_BASE_URL;
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
      profile.schoolCatalogUrl || '',
      profile.goal || '',
      this.compactList(profile.careers || []),
      this.compactList(profile.skills || []),
      this.compactList(profile.currentCourses || []),
      this.compactList(profile.extracurriculars || []),
      this.compactList(profile.passionProjects || []),
      this.compactList(profile.targetColleges || [])
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
      localStorage.setItem(`mn_${key}`, JSON.stringify({
        timestamp: Date.now(),
        value
      }));
    } catch (error) {
      console.warn('[RECOMMENDATIONS] Cache write failed:', error?.message || error);
    }
  },

  normalizeStudentProfile(student = {}) {
    const source = student.profile || student;
    const normalizeList = (value) => {
      if (!value) return [];
      if (Array.isArray(value)) return value.filter(Boolean);
      return String(value)
        .split(/[\n,;/|]+/)
        .map((part) => part.trim())
        .filter(Boolean);
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

  normalizeRecommendations(raw) {
    const payload = raw?.data || raw?.recommendations || raw || {};
    const emptyTracks = { now: [], next: [], stretch: [], gpaBoost: [] };
    return {
      ...payload,
      success: raw?.success ?? true,
      profile: payload.profile || raw?.profile || null,
      schoolContext: payload.schoolContext || raw?.meta?.schoolCatalog || payload.schoolContext || null,
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

  async fetchRecommendations(studentProfile) {
    const profile = this.normalizeStudentProfile(studentProfile);
    const base = this.getApiBaseUrl();
    const response = await fetch(`${base}/api/recommend`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(profile)
    });

    if (!response.ok) {
      throw new Error(`API returned ${response.status}`);
    }

    const result = await response.json();
    if (!result?.success) {
      throw new Error(result?.error || 'Recommendation API error');
    }

    return this.normalizeRecommendations(result);
  },

  async getInteractiveRecommendations(studentProfile, requestType, userQuery) {
    const profile = this.normalizeStudentProfile(studentProfile);
    const base = this.getApiBaseUrl();
    
    const response = await fetch(`${base}/api/recommend-interactive`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        profile,
        requestType,
        userQuery
      })
    });

    if (!response.ok) {
      throw new Error(`API returned ${response.status}`);
    }

    const result = await response.json();
    if (!result?.success) {
      throw new Error(result?.error || 'Recommendation API error');
    }

    return result.data;
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
        success: true,
        profile,
        courses: [],
        jobs: [],
        opportunities: [],
        projects: [],
        extracurriculars: [],
        tools: [],
        courseTracks: { now: [], next: [], stretch: [], gpaBoost: [] },
        roadmap: { now: [], next: [], stretch: [] },
        peerPatterns: { sampleSize: 0, summary: '', schoolFocus: '', commonThemes: [], topActivities: [] },
        gpaStrategy: { headline: 'GPA strategy', recommendations: [], caution: '', notes: '' },
        tips: ['Add the recommendation core module for richer offline fallback.'],
        mentorQuestions: [],
        summary: 'Recommendations are unavailable right now.'
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
      if (options?.rethrow) {
        throw error;
      }
      return fallback;
    }
  },

  getGradeLabel(profile) {
    const grade = String(profile.schoolGrade || profile.grade || '').trim();
    const raw = grade.toLowerCase();
    if (!grade) return 'Unspecified';
    if (raw.includes('grade') || raw.includes('freshman') || raw.includes('sophomore') || raw.includes('junior') || raw.includes('senior')) {
      return grade;
    }
    if (/^\d{1,2}$/.test(raw)) {
      const n = Number(raw);
      const suffix = n === 11 || n === 12 ? 'th' : 'th';
      return `${n}${suffix} Grade`;
    }
    return grade;
  },

  compactList(values) {
    return (values || [])
      .map((value) => String(value).trim())
      .filter(Boolean)
      .join(', ');
  },

  renderCard(item, kind = 'course') {
    const esc = this.getEscapeFn();
    if (!item) return '';

    if (kind === 'job') {
      return `
        <div class="rec-item">
          <div class="rec-item-title">${esc(item.title || 'Opportunity')}</div>
          <div class="rec-item-desc">${esc(item.description || item.why || '')}</div>
          <div class="rec-item-meta">${esc(item.readiness || '')}</div>
          <div class="rec-item-salary">${esc(item.salary || '')}</div>
        </div>
      `;
    }

    if (kind === 'project') {
      return `
        <div class="rec-item">
          <div class="rec-item-title">${esc(item.name || 'Project')}</div>
          <div class="rec-item-desc">${esc(item.description || item.why || '')}</div>
          <div class="rec-item-value">${esc(item.time || item.portfolioValue || '')}</div>
        </div>
      `;
    }

    if (kind === 'activity') {
      return `
        <div class="rec-item">
          <div class="rec-item-title">${esc(item.name || 'Activity')}</div>
          <div class="rec-item-desc">${esc(item.description || item.why || '')}</div>
          <div class="rec-item-meta">${esc(item.time || item.impact || '')}</div>
        </div>
      `;
    }

    if (kind === 'tool') {
      return `
        <div class="rec-item">
          <div class="rec-item-title">${esc(item.name || 'Tool')}</div>
          <div class="rec-item-desc">${esc(item.description || item.why || '')}</div>
          <div class="rec-item-meta">${esc(item.time || '')}</div>
          <div class="rec-item-value">${esc(item.resource || '')}</div>
        </div>
      `;
    }

    return `
      <div class="rec-item">
        <div class="rec-item-title">${esc(item.name || 'Course')}</div>
        <div class="rec-item-desc">${esc(item.description || item.why || '')}</div>
        <div class="rec-item-meta">${esc(item.difficulty || item.category || '')}</div>
      </div>
    `;
  },

  renderCourseTrack(title, items) {
    const esc = this.getEscapeFn();
    const cards = (items || []).map((item) => this.renderCard(item, 'course')).join('');
    return `
      <section class="rec-section">
        <h2 class="rec-section-title">${esc(title)}</h2>
        <div class="rec-items">
          ${cards || '<div class="rec-item"><div class="rec-item-desc">No items yet.</div></div>'}
        </div>
      </section>
    `;
  },

  renderSection(title, items, kind) {
    const esc = this.getEscapeFn();
    const cards = (items || []).map((item) => this.renderCard(item, kind)).join('');
    return `
      <section class="rec-section">
        <h2 class="rec-section-title">${esc(title)}</h2>
        <div class="rec-items">
          ${cards || '<div class="rec-item"><div class="rec-item-desc">No items yet.</div></div>'}
        </div>
      </section>
    `;
  },

  renderListSection(title, items) {
    const esc = this.getEscapeFn();
    const list = (items || [])
      .map((item) => `<li>${esc(typeof item === 'string' ? item : item.body || item.title || item.name || '')}</li>`)
      .join('');

    return `
      <section class="rec-tips">
        <h3>${esc(title)}</h3>
        <ul>${list || '<li>No items yet.</li>'}</ul>
      </section>
    `;
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
    let html = `
      <div class="rec-tips">
        <h3>School-Aware Strategy</h3>
        ${isFallback 
          ? `<div style="padding:12px;background:rgba(255,170,0,0.1);border:1px solid rgba(255,170,0,0.3);border-radius:8px;margin-bottom:16px;color:#ffaa00;font-size:14px;"><strong>Notice:</strong> We couldn't fetch your exact school's course catalog online, but we've generated some tailored fallback recommendations based on your onboarding quiz answers!</div>` 
          : ''}
        <p>${esc(recommendations.summary || schoolContext.summary || 'Personalized recommendations')}</p>
        <div style="display:flex;flex-wrap:wrap;gap:10px;margin-top:18px;">
          <span class="qtag-premium">${esc(profile.schoolName || 'School not set')}</span>
          <span class="qtag-premium">${esc(this.getGradeLabel(profile))}</span>
          <span class="qtag-premium">${esc(profile.interest || 'undecided')}</span>
          <span class="qtag-premium">${esc(profile.workloadPreference || 'balanced')}</span>
        </div>
      </div>
    `;

    if (schoolContext?.summary) {
      html += `
        <section class="rec-section">
          <h2 class="rec-section-title">School Catalog Signal</h2>
          <div class="rec-item">
            <div class="rec-item-title">${esc(schoolContext.name || profile.schoolName || 'School')}</div>
            <div class="rec-item-desc">${esc(schoolContext.summary)}</div>
            <div class="rec-item-meta">
              ${schoolContext.sourceUrl
                ? `<a href="${esc(schoolContext.sourceUrl)}" target="_blank" rel="noreferrer" style="color:var(--green);text-decoration:none;">Open school catalog</a>`
                : 'Using playbook fallback'}
            </div>
          </div>
        </section>
      `;
    }

    html += this.renderCourseTrack('Take Now', courseTracks.now);
    html += this.renderCourseTrack('Next Up', courseTracks.next);
    html += this.renderCourseTrack('Stretch Options', courseTracks.stretch);
    html += this.renderCourseTrack('Weighted GPA Boosters', courseTracks.gpaBoost);

    if (gpaStrategy?.recommendations?.length) {
      html += `
        <section class="rec-tips">
          <h3>GPA Strategy</h3>
          <p>${esc(gpaStrategy.caution || '')}</p>
          <ul>${gpaStrategy.recommendations.map((item) => `<li>${esc(item)}</li>`).join('')}</ul>
        </section>
      `;
    }

    html += this.renderSection('Job and Internship Targets', recommendations.jobs, 'job');
    html += this.renderSection('Passion Projects', recommendations.projects, 'project');
    html += this.renderSection('Extracurriculars', recommendations.extracurriculars, 'activity');
    html += this.renderSection('Tools and Systems', recommendations.tools, 'tool');

    if (peerPatterns?.summary || (peerPatterns?.topActivities || []).length) {
      html += `
        <section class="rec-tips">
          <h3>What Similar Students Do</h3>
          <p>${esc(peerPatterns.summary || '')}</p>
          ${peerPatterns.schoolFocus ? `<p>${esc(peerPatterns.schoolFocus)}</p>` : ''}
          <ul>${(peerPatterns.topActivities || []).map((item) => `<li>${esc(item)}</li>`).join('')}</ul>
        </section>
      `;
    }

    if ((recommendations.tips || []).length) {
      html += this.renderListSection('Strategic Tips', recommendations.tips);
    }

    if ((recommendations.mentorQuestions || []).length) {
      html += this.renderListSection('Questions to Ask Your Mentor', recommendations.mentorQuestions);
    }

    if (roadmap?.now?.length || roadmap?.next?.length || roadmap?.stretch?.length) {
      html += `
        <section class="rec-section">
          <h2 class="rec-section-title">90-Day Roadmap</h2>
          <div class="rec-items">
            <div class="rec-item">
              <div class="rec-item-title">This month</div>
              <div class="rec-item-desc">${esc(roadmap.now?.join(', ') || 'Lock in the course sequence')}</div>
            </div>
            <div class="rec-item">
              <div class="rec-item-title">Next semester</div>
              <div class="rec-item-desc">${esc(roadmap.next?.join(', ') || 'Build the next layer')}</div>
            </div>
            <div class="rec-item">
              <div class="rec-item-title">Stretch goal</div>
              <div class="rec-item-desc">${esc(roadmap.stretch?.join(', ') || 'Pick one ambitious proof-of-work project')}</div>
            </div>
          </div>
        </section>
      `;
    }

    return html;
  },

  formatPreview(recommendations) {
    if (!recommendations) return '';
    const esc = this.getEscapeFn();
    const course = (recommendations.courseTracks?.now || recommendations.courses || [])[0];
    const job = (recommendations.jobs || recommendations.opportunities || [])[0];
    const project = (recommendations.projects || [])[0];
    const peer = recommendations.peerPatterns || {};

    return `
      <div style="display:grid;grid-template-columns:repeat(auto-fit,minmax(240px,1fr));gap:18px;">
        <div style="background:var(--bg-2);border:1px solid var(--b1);border-radius:var(--r-2xl);padding:20px;">
          <div style="font-size:11px;color:var(--green);font-weight:800;text-transform:uppercase;letter-spacing:0.08em;margin-bottom:8px;">Best Course</div>
          <div style="font-size:16px;font-weight:800;color:var(--t1);margin-bottom:8px;">${esc(course?.name || 'No course yet')}</div>
          <div style="font-size:13px;color:var(--t3);line-height:1.5;">${esc(course?.why || course?.description || 'Awaiting data')}</div>
        </div>
        <div style="background:var(--bg-2);border:1px solid var(--b1);border-radius:var(--r-2xl);padding:20px;">
          <div style="font-size:11px;color:var(--amber);font-weight:800;text-transform:uppercase;letter-spacing:0.08em;margin-bottom:8px;">Best Opportunity</div>
          <div style="font-size:16px;font-weight:800;color:var(--t1);margin-bottom:8px;">${esc(job?.title || 'No job yet')}</div>
          <div style="font-size:13px;color:var(--t3);line-height:1.5;">${esc(job?.why || job?.description || 'Awaiting data')}</div>
        </div>
        <div style="background:var(--bg-2);border:1px solid var(--b1);border-radius:var(--r-2xl);padding:20px;">
          <div style="font-size:11px;color:var(--green);font-weight:800;text-transform:uppercase;letter-spacing:0.08em;margin-bottom:8px;">Best Project</div>
          <div style="font-size:16px;font-weight:800;color:var(--t1);margin-bottom:8px;">${esc(project?.name || 'No project yet')}</div>
          <div style="font-size:13px;color:var(--t3);line-height:1.5;">${esc(project?.why || project?.description || 'Awaiting data')}</div>
        </div>
      </div>
      <div style="margin-top:18px;background:var(--green-dim);border:1px solid rgba(0,232,122,0.2);border-radius:var(--r-2xl);padding:18px 20px;">
        <div style="font-size:11px;color:var(--green);font-weight:800;text-transform:uppercase;letter-spacing:0.08em;margin-bottom:8px;">Peer Signal</div>
        <div style="font-size:14px;color:var(--t2);line-height:1.6;">${esc(peer.summary || 'No peer cluster found yet.')}</div>
      </div>
    `;
  }
};

document.addEventListener('DOMContentLoaded', () => {
  if (typeof window !== 'undefined') {
    window.RecommendationEngine = RecommendationEngine;
  }
});

if (typeof module !== 'undefined' && module.exports) {
  module.exports = { RecommendationEngine };
}
