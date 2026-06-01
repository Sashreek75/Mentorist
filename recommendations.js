/* ============================================================
   MENTORIST — recommendations.js
   AI-powered recommendations for courses, jobs, and projects
   ============================================================ */

/* ===== RECOMMENDATION DATA ===== */
const RECOMMENDATIONS_DB = {
  /* High-quality course recommendations by interest & grade */
  courses: [
    // STEM - High School
    { id: 'cs1', name: 'AP Computer Science Principles', interest: 'stem', grade: ['9', '10', '11', '12'], description: 'Foundation in computational thinking, algorithms, and programming', value: 'builds problem-solving and logic skills' },
    { id: 'cs2', name: 'AP Computer Science A', interest: 'stem', grade: ['10', '11', '12'], description: 'Object-oriented programming and data structures', value: 'essential for tech careers' },
    { id: 'math1', name: 'AP Calculus AB', interest: 'stem', grade: ['11', '12'], description: 'Advanced mathematics covering limits, derivatives, integrals', value: 'foundation for engineering and physics' },
    { id: 'math2', name: 'AP Statistics', interest: 'stem', grade: ['10', '11', '12'], description: 'Data analysis and statistical methods', value: 'crucial for data science and research' },
    { id: 'phys1', name: 'AP Physics C: Mechanics', interest: 'stem', grade: ['11', '12'], description: 'Classical mechanics and calculus-based physics', value: 'critical for engineering paths' },
    { id: 'bio1', name: 'AP Biology', interest: 'stem', grade: ['10', '11', '12'], description: 'Comprehensive biology covering genetics, ecology, evolution', value: 'essential for pre-med students' },
    { id: 'chem1', name: 'AP Chemistry', interest: 'stem', grade: ['10', '11', '12'], description: 'Chemical reactions, kinetics, and equilibrium', value: 'foundation for medicine and engineering' },
    { id: 'robotics1', name: 'Robotics & Automation', interest: 'stem', grade: ['9', '10', '11', '12'], description: 'Build and program robots, learn engineering principles', value: 'hands-on STEM application' },

    // STEM - College
    { id: 'coll_cs1', name: 'Data Structures & Algorithms', interest: 'stem', grade: ['college'], description: 'Advanced algorithms and computational complexity', value: 'prepare for tech interviews' },
    { id: 'coll_ai1', name: 'Introduction to AI/Machine Learning', interest: 'stem', grade: ['college'], description: 'Neural networks, supervised learning, real-world AI applications', value: 'cutting-edge field with high demand' },
    { id: 'coll_web1', name: 'Full Stack Web Development', interest: 'stem', grade: ['college'], description: 'Frontend, backend, databases, deployment', value: 'build production applications' },

    // Medicine
    { id: 'med1', name: 'AP Biology', interest: 'medicine', grade: ['10', '11', '12'], description: 'Essential foundation for pre-med track', value: 'required for medical schools' },
    { id: 'med2', name: 'AP Chemistry', interest: 'medicine', grade: ['10', '11', '12'], description: 'Chemical fundamentals for biochemistry', value: 'required for medical schools' },
    { id: 'med3', name: 'Organic Chemistry Honors', interest: 'medicine', grade: ['11', '12'], description: 'Organic chemistry fundamentals', value: 'one of the hardest courses, shows dedication' },
    { id: 'med4', name: 'Biochemistry (College)', interest: 'medicine', grade: ['college'], description: 'Molecular biology and protein chemistry', value: 'directly relevant to medical education' },
    { id: 'med5', name: 'Anatomy & Physiology', interest: 'medicine', grade: ['college'], description: 'Human body systems and functions', value: 'prepare for medical school anatomy' },

    // Business
    { id: 'bus1', name: 'AP Economics (Macro & Micro)', interest: 'business', grade: ['10', '11', '12'], description: 'Economic principles and market dynamics', value: 'foundation for business studies' },
    { id: 'bus2', name: 'AP Statistics', interest: 'business', grade: ['10', '11', '12'], description: 'Data analysis and business analytics', value: 'essential for data-driven decisions' },
    { id: 'bus3', name: 'Business Management', interest: 'business', grade: ['10', '11', '12'], description: 'Leadership, strategy, organizational behavior', value: 'practical business skills' },
    { id: 'bus4', name: 'Accounting I & II', interest: 'business', grade: ['11', '12'], description: 'Financial accounting and reporting', value: 'core business skill' },
    { id: 'bus5', name: 'Entrepreneurship', interest: 'business', grade: ['10', '11', '12'], description: 'Start a business, business plan development', value: 'hands-on startup experience' },
    { id: 'bus6', name: 'Finance (College)', interest: 'business', grade: ['college'], description: 'Investment analysis, corporate finance, valuations', value: 'prepare for finance careers' },
    { id: 'bus7', name: 'Marketing Strategy (College)', interest: 'business', grade: ['college'], description: 'Brand building, digital marketing, consumer behavior', value: 'high-demand skill' },

    // Humanities
    { id: 'hum1', name: 'AP English Language & Composition', interest: 'humanities', grade: ['10', '11', '12'], description: 'Rhetoric, argumentation, persuasive writing', value: 'master communication skills' },
    { id: 'hum2', name: 'AP English Literature', interest: 'humanities', grade: ['10', '11', '12'], description: 'Literary analysis and interpretation', value: 'deep reading and critical thinking' },
    { id: 'hum3', name: 'AP US History', interest: 'humanities', grade: ['10', '11', '12'], description: 'American history and political development', value: 'understand historical context' },
    { id: 'hum4', name: 'AP World History', interest: 'humanities', grade: ['10', '11', '12'], description: 'Global history and cultural perspectives', value: 'international awareness' },
    { id: 'hum5', name: 'Philosophy (College)', interest: 'humanities', grade: ['college'], description: 'Critical thinking, ethics, metaphysics', value: 'develop analytical abilities' },
    { id: 'hum6', name: 'Creative Writing (College)', interest: 'humanities', grade: ['college'], description: 'Fiction, poetry, storytelling', value: 'express ideas creatively' },

    // Law
    { id: 'law1', name: 'Government & Civics', interest: 'law', grade: ['9', '10'], description: 'Constitutional law and government systems', value: 'foundation for law studies' },
    { id: 'law2', name: 'AP US Government & Politics', interest: 'law', grade: ['11', '12'], description: 'Political institutions and policy', value: 'prepare for law school' },
    { id: 'law3', name: 'Debate & Forensics', interest: 'law', grade: ['9', '10', '11', '12'], description: 'Argumentation and public speaking', value: 'critical for lawyers' },
    { id: 'law4', name: 'Mock Trial', interest: 'law', grade: ['10', '11', '12'], description: 'Simulate real courtroom proceedings', value: 'hands-on legal experience' },
    { id: 'law5', name: 'Introduction to Law (College)', interest: 'law', grade: ['college'], description: 'Legal systems, contracts, torts', value: 'law school preparation' },

    // Arts
    { id: 'art1', name: 'AP Art & Design', interest: 'arts', grade: ['10', '11', '12'], description: 'Visual design principles and portfolio development', value: 'build competitive portfolio' },
    { id: 'art2', name: 'Digital Art & Animation', interest: 'arts', grade: ['9', '10', '11', '12'], description: 'Adobe Creative Suite, motion graphics', value: 'industry-standard tools' },
    { id: 'art3', name: 'Graphic Design', interest: 'arts', grade: ['10', '11', '12'], description: 'UI/UX design, branding, visual communication', value: 'in-demand creative skill' },
    { id: 'art4', name: 'Music Theory & Composition', interest: 'arts', grade: ['10', '11', '12'], description: 'Advanced music theory and composition', value: 'foundation for music careers' },
    { id: 'art5', name: 'Film & Video Production', interest: 'arts', grade: ['10', '11', '12'], description: 'Cinematography, editing, storytelling', value: 'creative storytelling skill' },
  ],

  /* Job and internship opportunities */
  opportunities: [
    // STEM Jobs & Internships
    { id: 'job_swe', title: 'Software Engineer Internship', interest: 'stem', companies: ['Google', 'Meta', 'Apple', 'Microsoft', 'Amazon', 'Netflix', 'Stripe', 'Airbnb'], description: 'Build software products used by millions', salary: '$20-35/hr', value: 'launch your tech career' },
    { id: 'job_ds', title: 'Data Science Internship', interest: 'stem', companies: ['Google', 'Meta', 'Amazon', 'Uber', 'Airbnb', 'Goldman Sachs'], description: 'Work with big data and machine learning', salary: '$22-40/hr', value: 'solve real business problems' },
    { id: 'job_ai', title: 'AI/ML Research Internship', interest: 'stem', companies: ['OpenAI', 'DeepMind', 'Google AI', 'Meta AI', 'Microsoft Research'], description: 'Push the boundaries of AI technology', salary: '$25-45/hr', value: 'cutting-edge research' },
    { id: 'job_hardware', title: 'Hardware Engineering', interest: 'stem', companies: ['Tesla', 'SpaceX', 'Apple', 'Intel', 'NVIDIA', 'Qualcomm'], description: 'Design chips and hardware systems', salary: '$20-35/hr', value: 'build physical technology' },
    { id: 'job_robotics', title: 'Robotics Engineering', interest: 'stem', companies: ['Boston Dynamics', 'Tesla', 'iRobot', 'Roomba'], description: 'Develop cutting-edge robots', salary: '$22-38/hr', value: 'innovative field' },
    
    // Medicine
    { id: 'job_research', title: 'Medical Research Internship', interest: 'medicine', companies: ['NIH', 'Mayo Clinic', 'Stanford Medical', 'Johns Hopkins', 'Harvard Medical School'], description: 'Participate in groundbreaking medical research', salary: '$16-22/hr', value: 'medical school application boost' },
    { id: 'job_clinical', title: 'Clinical Shadowing', interest: 'medicine', companies: ['Hospital Systems', 'Clinics', 'Emergency Departments'], description: 'Observe real patient care', salary: 'volunteer', value: 'exposure to medicine' },
    { id: 'job_biotech', title: 'Biotech Company Internship', interest: 'medicine', companies: ['Moderna', 'Pfizer', 'Genentech', 'Amgen'], description: 'Work on next-generation therapeutics', salary: '$18-28/hr', value: 'bridge to medical field' },

    // Business
    { id: 'job_consulting', title: 'Management Consulting', interest: 'business', companies: ['McKinsey', 'BCG', 'Bain', 'Deloitte', 'EY'], description: 'Advise Fortune 500 companies', salary: '$20-35/hr', value: 'premium experience' },
    { id: 'job_finance', title: 'Investment Banking Internship', interest: 'business', companies: ['Goldman Sachs', 'JPMorgan', 'Morgan Stanley', 'Citigroup', 'Bank of America'], description: 'Learn high finance and M&A', salary: '$25-40/hr', value: 'lucrative career path' },
    { id: 'job_pm', title: 'Product Management Internship', interest: 'business', companies: ['Google', 'Meta', 'Microsoft', 'Amazon', 'Apple'], description: 'Drive product strategy and features', salary: '$20-35/hr', value: 'shape product direction' },
    { id: 'job_marketing', title: 'Marketing & Growth', interest: 'business', companies: ['Nike', 'Coca-Cola', 'LVMH', 'Procter & Gamble'], description: 'Build brand awareness and user growth', salary: '$18-28/hr', value: 'creative + analytical' },
    { id: 'job_startup', title: 'Early-Stage Startup Internship', interest: 'business', companies: ['Y Combinator companies', 'Seed-stage startups'], description: 'Wear multiple hats in fast-moving environment', salary: '$15-25/hr', value: 'entrepreneurial experience' },

    // Humanities
    { id: 'job_journalism', title: 'Journalism/Media Internship', interest: 'humanities', companies: ['The New York Times', 'CNN', 'The Washington Post', 'NPR', 'Podcasts'], description: 'Report and tell compelling stories', salary: '$15-25/hr', value: 'investigative journalism' },
    { id: 'job_content', title: 'Content Strategy Internship', interest: 'humanities', companies: ['Medium', 'Substack', 'Major Publications'], description: 'Create engaging written content', salary: '$16-24/hr', value: 'build audience' },
    { id: 'job_nonprofit', title: 'Nonprofit Leadership', interest: 'humanities', companies: ['Teach for America', 'Doctors Without Borders', 'Charity Navigator'], description: 'Drive social impact', salary: 'varies', value: 'make a difference' },

    // Law
    { id: 'job_legal', title: 'Legal Internship', interest: 'law', companies: ['Law Firms', 'District Attorney', 'Legal Aid Society'], description: 'Experience real legal work', salary: '$16-25/hr', value: 'law school preparation' },
    { id: 'job_policy', title: 'Government Policy Internship', interest: 'law', companies: ['Congress', 'State Legislature', 'Senate'], description: 'Shape policy at the highest levels', salary: 'unpaid or small stipend', value: 'connections and experience' },
    { id: 'job_nonprofit_legal', title: 'Civil Rights Organization', interest: 'law', companies: ['ACLU', 'Southern Poverty Law Center', 'EFF'], description: 'Fight for justice and civil rights', salary: '$14-22/hr', value: 'meaningful legal work' },

    // Arts
    { id: 'job_design', title: 'UX/UI Design Internship', interest: 'arts', companies: ['Google', 'Apple', 'Meta', 'Adobe', 'Figma'], description: 'Design user interfaces millions use daily', salary: '$18-32/hr', value: 'bridge art and technology' },
    { id: 'job_animation', title: 'Animation Studio Internship', interest: 'arts', companies: ['Pixar', 'Disney', 'DreamWorks', 'Studio Ghibli'], description: 'Create animation for films and shows', salary: '$16-28/hr', value: 'bring stories to life' },
    { id: 'job_music', title: 'Music Production Internship', interest: 'arts', companies: ['Record Labels', 'Studios', 'Music Tech Companies'], description: 'Produce and engineer music', salary: '$14-24/hr', value: 'launch music career' },
    { id: 'job_creative', title: 'Creative Agency Internship', interest: 'arts', companies: ['Wieden+Kennedy', 'BBDO', 'Ogilvy', 'Grey'], description: 'Create advertising and branding campaigns', salary: '$16-26/hr', value: 'creative expression' },
  ],

  /* Passion projects and extracurriculars */
  projects: [
    // STEM Projects
    { id: 'proj_app', name: 'Build a Mobile App', interest: 'stem', description: 'Create an iOS or Android app solving a real problem', skills: ['Swift/Kotlin', 'UI/UX', 'Problem-solving'], portfolio_value: 'excellent', impact: 'users worldwide', effort: '100+ hours' },
    { id: 'proj_website', name: 'Launch a Startup Website', interest: 'stem', description: 'Build a full-stack web app for a social venture', skills: ['Full-stack development', 'Databases', 'Deployment'], portfolio_value: 'excellent', impact: 'real customers', effort: '80+ hours' },
    { id: 'proj_ai', name: 'AI Project (Kaggle Competition)', interest: 'stem', description: 'Compete in ML competitions and showcase your model', skills: ['Python', 'ML', 'Data analysis'], portfolio_value: 'excellent', impact: 'public leaderboard recognition', effort: '60+ hours' },
    { id: 'proj_robotics', name: 'Robotics Competition', interest: 'stem', description: 'Join FIRST Robotics or IGEM competition', skills: ['Engineering', 'Programming', 'Teamwork'], portfolio_value: 'very good', impact: 'national/international recognition', effort: '200+ hours' },
    { id: 'proj_game', name: 'Create an Indie Video Game', interest: 'stem', description: 'Make a game using Unity or Unreal Engine', skills: ['Game development', 'Graphics', 'Game design'], portfolio_value: 'excellent', impact: 'creative expression', effort: '120+ hours' },
    { id: 'proj_research', name: 'Independent Research Project', interest: 'stem', description: 'Conduct original research in your field of interest', skills: ['Research methodology', 'Analysis', 'Writing'], portfolio_value: 'excellent', impact: 'publishable results', effort: '150+ hours' },
    { id: 'proj_hackathon', name: 'Hackathon Projects', interest: 'stem', description: 'Build cool projects in 24-48 hour hackathon events', skills: ['Rapid prototyping', 'Teamwork', 'Pitching'], portfolio_value: 'good', impact: 'awards and recognition', effort: '40+ hours per hackathon' },

    // Medicine Projects
    { id: 'proj_med_research', name: 'Medical Research Initiative', interest: 'medicine', description: 'Conduct research at a hospital or university lab', skills: ['Research design', 'Data collection', 'Analysis'], portfolio_value: 'excellent', impact: 'publication in medical journal', effort: '200+ hours' },
    { id: 'proj_health_app', name: 'Health Tech Project', interest: 'medicine', description: 'Build an app to help patients or providers', skills: ['Tech + Medical knowledge', 'User research'], portfolio_value: 'very good', impact: 'help patients', effort: '100+ hours' },
    { id: 'proj_volunteer_clinic', name: 'Community Health Clinic', interest: 'medicine', description: 'Volunteer at free clinics serving underserved populations', skills: ['Patient care', 'Empathy', 'Communication'], portfolio_value: 'excellent', impact: 'serve community', effort: '100+ hours' },

    // Business Projects
    { id: 'proj_startup', name: 'Launch Your Own Startup', interest: 'business', description: 'Build and validate a real business idea', skills: ['Entrepreneurship', 'Sales', 'Operations'], portfolio_value: 'excellent', impact: 'revenue and growth', effort: '200+ hours' },
    { id: 'proj_consulting', name: 'Pro Bono Consulting Project', interest: 'business', description: 'Consult for a nonprofit or small business', skills: ['Business strategy', 'Analysis', 'Recommendations'], portfolio_value: 'very good', impact: 'help business grow', effort: '80+ hours' },
    { id: 'proj_investment', name: 'Investment Research Project', interest: 'business', description: 'Analyze companies and make investment recommendations', skills: ['Financial analysis', 'Research', 'Valuation'], portfolio_value: 'good', impact: 'investment insights', effort: '60+ hours' },
    { id: 'proj_case_competition', name: 'Business Case Competition', interest: 'business', description: 'Compete in case competitions against other schools', skills: ['Problem-solving', 'Presentation', 'Teamwork'], portfolio_value: 'very good', impact: 'prizes and recognition', effort: '100+ hours' },

    // Humanities Projects
    { id: 'proj_publication', name: 'Write and Publish Essays', interest: 'humanities', description: 'Write thoughtful essays and submit to publications', skills: ['Writing', 'Research', 'Critical thinking'], portfolio_value: 'excellent', impact: 'published author', effort: '80+ hours' },
    { id: 'proj_podcast', name: 'Start a Podcast or YouTube Channel', interest: 'humanities', description: 'Create regular content sharing your ideas', skills: ['Storytelling', 'Production', 'Audience building'], portfolio_value: 'very good', impact: '1000+ followers', effort: '100+ hours' },
    { id: 'proj_debate', name: 'Debate & Model UN', interest: 'humanities', description: 'Compete in debate or represent your school at conferences', skills: ['Argumentation', 'Public speaking', 'Research'], portfolio_value: 'very good', impact: 'awards and recognition', effort: '150+ hours' },
    { id: 'proj_history', name: 'History Research Project', interest: 'humanities', description: 'Deep dive research on a historical topic', skills: ['Research', 'Analysis', 'Writing'], portfolio_value: 'good', impact: 'publishable research', effort: '100+ hours' },

    // Law Projects
    { id: 'proj_mock_trial', name: 'Mock Trial Competition', interest: 'law', description: 'Compete in mock trial competitions', skills: ['Argumentation', 'Evidence rules', 'Courtroom procedure'], portfolio_value: 'very good', impact: 'awards and recognition', effort: '150+ hours' },
    { id: 'proj_legal_aid', name: 'Legal Aid Clinic Volunteer', interest: 'law', description: 'Help provide free legal services to underserved communities', skills: ['Legal research', 'Client service', 'Advocacy'], portfolio_value: 'excellent', impact: 'serve justice', effort: '150+ hours' },
    { id: 'proj_policy_paper', name: 'Policy White Paper', interest: 'law', description: 'Write and publish policy recommendations', skills: ['Legal writing', 'Policy analysis', 'Research'], portfolio_value: 'excellent', impact: 'influence policy', effort: '120+ hours' },

    // Arts Projects
    { id: 'proj_portfolio', name: 'Build Professional Art Portfolio', interest: 'arts', description: 'Create 15-20 professional pieces showcasing your best work', skills: ['Design fundamentals', 'Digital tools', 'Visual storytelling'], portfolio_value: 'excellent', impact: 'accept to top art schools', effort: '200+ hours' },
    { id: 'proj_design_project', name: 'Rebrand a Company/Organization', interest: 'arts', description: 'Complete rebrand including logo, colors, typography', skills: ['Brand strategy', 'Design', 'Communication'], portfolio_value: 'excellent', impact: 'showcase real-world work', effort: '100+ hours' },
    { id: 'proj_animation_short', name: 'Create an Animated Short Film', interest: 'arts', description: 'Produce a 2-5 minute animated short', skills: ['Animation', 'Storytelling', 'Motion graphics'], portfolio_value: 'excellent', impact: 'festival submissions', effort: '150+ hours' },
    { id: 'proj_music_production', name: 'Produce and Release Original Music', interest: 'arts', description: 'Produce original songs and release on Spotify/Apple Music', skills: ['Production', 'Mixing', 'Mastering'], portfolio_value: 'excellent', impact: '1000+ streams', effort: '100+ hours' },
    { id: 'proj_exhibition', name: 'Art Exhibition or Gallery Show', interest: 'arts', description: 'Organize and display your artwork in a gallery', skills: ['Curation', 'Installation', 'Promotion'], portfolio_value: 'excellent', impact: 'artist recognition', effort: '120+ hours' },
  ]
};

/* ===== RECOMMENDATION ENGINE ===== */
const RecommendationEngine = {
  /**
   * Get personalized recommendations for a student
   * @param {Object} student - Student profile with interest, grade, goals
   * @returns {Object} Personalized recommendations
   */
  getRecommendations(student) {
    if (!student) return null;

    const interest = student.profile?.interest || 'undecided';
    const grade = student.profile?.grade || '9';
    const rigor = student.profile?.rigor || 'standard';

    return {
      courses: this.recommendCourses(interest, grade, rigor),
      opportunities: this.recommendOpportunities(interest, grade),
      projects: this.recommendProjects(interest),
      summary: this.generateSummary(student, interest)
    };
  },

  /**
   * Recommend relevant courses
   */
  recommendCourses(interest, grade, rigor) {
    const courses = RECOMMENDATIONS_DB.courses
      .filter(c => c.interest === interest || (interest === 'undecided' && c.interest === 'stem'))
      .filter(c => c.grade.includes(grade) || c.grade.includes('college'))
      .sort((a, b) => {
        // Prioritize AP courses if rigorous student, also sort by relevance
        const aIsAP = a.name.includes('AP') ? 0 : 1;
        const bIsAP = b.name.includes('AP') ? 0 : 1;
        if (rigor === 'extreme') return aIsAP - bIsAP;
        return 0;
      });

    return courses.slice(0, 8);
  },

  /**
   * Recommend jobs and internships
   */
  recommendOpportunities(interest, grade) {
    const gradeNum = parseInt(grade);
    const opportunities = RECOMMENDATIONS_DB.opportunities
      .filter(o => o.interest === interest || interest === 'undecided')
      .map(opp => ({
        ...opp,
        readiness: gradeNum >= 10 ? 'ready' : 'prepare-for'
      }))
      .sort((a, b) => {
        if (a.readiness !== b.readiness) {
          return a.readiness === 'ready' ? -1 : 1;
        }
        return 0;
      });

    return opportunities.slice(0, 6);
  },

  /**
   * Recommend passion projects and extracurriculars
   */
  recommendProjects(interest) {
    const projects = RECOMMENDATIONS_DB.projects
      .filter(p => p.interest === interest)
      .sort((a, b) => {
        // Prioritize excellent portfolio value projects
        const aScore = a.portfolio_value === 'excellent' ? 0 : a.portfolio_value === 'very good' ? 1 : 2;
        const bScore = b.portfolio_value === 'excellent' ? 0 : b.portfolio_value === 'very good' ? 1 : 2;
        return aScore - bScore;
      });

    return projects.slice(0, 6);
  },

  /**
   * Generate a personalized summary/guidance
   */
  generateSummary(student, interest) {
    const gradeMap = { '9': '9th', '10': '10th', '11': '11th', '12': '12th', 'college': 'College', 'gap': 'Gap Year' };
    const interestMap = {
      stem: 'STEM & Technology',
      medicine: 'Medicine & Healthcare',
      business: 'Business & Entrepreneurship',
      humanities: 'Humanities & Communication',
      law: 'Law & Public Service',
      arts: 'Arts & Design'
    };

    const grade = gradeMap[student.profile?.grade] || 'unknown';
    const path = interestMap[interest] || 'Your chosen path';

    return {
      headline: `Your ${path} Roadmap`,
      message: `Based on your profile as a ${grade} student interested in ${path.toLowerCase()}, we've curated courses, opportunities, and projects that will help you build a competitive portfolio and gain real-world experience. Focus on depth over breadth—pick 2-3 courses and 1-2 major projects this year.`,
      tips: [
        'Start with foundational courses before advanced ones',
        'Aim for at least one internship or project per year',
        'Build a portfolio to showcase your best work',
        'Network with professionals in your field of interest',
        'Don\'t wait for opportunities—create your own projects'
      ]
    };
  },

  /**
   * Get quick recommendations as a formatted string (for display)
   */
  formatRecommendations(recommendations) {
    if (!recommendations) return '';

    const { courses, opportunities, projects, summary } = recommendations;

    let html = `<div class="recommendations-container">
      <div class="rec-header">
        <h2 class="rec-title">${Utils.escapeHtml(summary.headline)}</h2>
        <p class="rec-intro">${Utils.escapeHtml(summary.message)}</p>
      </div>

      <div class="recommendations-grid">
        <!-- Courses Section -->
        <section class="rec-section">
          <h3 class="rec-section-title">📚 Recommended Courses</h3>
          <div class="rec-items">
            ${courses.map(c => `
              <div class="rec-item">
                <h4 class="rec-item-title">${Utils.escapeHtml(c.name)}</h4>
                <p class="rec-item-desc">${Utils.escapeHtml(c.description)}</p>
                <p class="rec-item-value">💡 ${Utils.escapeHtml(c.value)}</p>
              </div>
            `).join('')}
          </div>
        </section>

        <!-- Opportunities Section -->
        <section class="rec-section">
          <h3 class="rec-section-title">💼 Jobs & Internships</h3>
          <div class="rec-items">
            ${opportunities.map(o => `
              <div class="rec-item">
                <h4 class="rec-item-title">${Utils.escapeHtml(o.title)}</h4>
                <p class="rec-item-meta">Companies: ${o.companies.slice(0, 3).join(', ')}</p>
                <p class="rec-item-desc">${Utils.escapeHtml(o.description)}</p>
                <p class="rec-item-salary">💰 ${Utils.escapeHtml(o.salary)}</p>
              </div>
            `).join('')}
          </div>
        </section>

        <!-- Projects Section -->
        <section class="rec-section">
          <h3 class="rec-section-title">🚀 Passion Projects & Extracurriculars</h3>
          <div class="rec-items">
            ${projects.map(p => `
              <div class="rec-item">
                <h4 class="rec-item-title">${Utils.escapeHtml(p.name)}</h4>
                <p class="rec-item-desc">${Utils.escapeHtml(p.description)}</p>
                <p class="rec-item-skills">Skills: ${p.skills.join(', ')}</p>
                <p class="rec-item-meta">Portfolio Value: ${p.portfolio_value.toUpperCase()} | Effort: ${p.effort}</p>
              </div>
            `).join('')}
          </div>
        </section>
      </div>

      <div class="rec-tips">
        <h3>🎯 Key Strategies</h3>
        <ul>
          ${summary.tips.map(t => `<li>${Utils.escapeHtml(t)}</li>`).join('')}
        </ul>
      </div>
    </div>`;

    return html;
  }
};

// Export for use in other modules
if (typeof module !== 'undefined' && module.exports) {
  module.exports = { RecommendationEngine, RECOMMENDATIONS_DB };
}
