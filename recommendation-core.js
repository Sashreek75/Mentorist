(function (root, factory) {
  if (typeof module !== 'undefined' && module.exports) {
    module.exports = factory();
  } else {
    root.MentoristRecommendationCore = factory();
  }
})(typeof globalThis !== 'undefined' ? globalThis : window, function () {
  const STEM_CORE_COURSES = [
    {
      name: 'AP Computer Science Principles',
      keywords: ['computer', 'science', 'cs', 'coding', 'programming', 'tech', 'software'],
      gradeMin: 9,
      category: 'CS',
      track: 'foundation',
      priority: 98,
      gpaBoost: false,
      difficulty: 'AP',
      description: 'Intro to computational thinking, problem solving, and the big ideas behind software.',
      why: 'Best first step if the student has not yet taken a CS course or needs a lighter on-ramp before AP CSA.',
      skills: ['Computational thinking', 'Digital literacy', 'Problem solving']
    },
    {
      name: 'AP Computer Science A',
      keywords: ['computer', 'science', 'cs', 'coding', 'software', 'java', 'programming'],
      gradeMin: 10,
      category: 'CS',
      track: 'core',
      priority: 110,
      gpaBoost: false,
      difficulty: 'AP',
      description: 'Object-oriented programming, algorithms, and structured problem solving.',
      why: 'This is the cleanest major signal for a computer science student and a strong school-catalog recommendation.',
      skills: ['Java', 'Object-oriented programming', 'Algorithms']
    },
    {
      name: 'Cybersecurity / Networking',
      keywords: ['cyber', 'security', 'network', 'it', 'systems', 'defense'],
      gradeMin: 9,
      category: 'CTE',
      track: 'specialty',
      priority: 104,
      gpaBoost: false,
      difficulty: 'Honors / CTE',
      description: 'Network fundamentals, digital safety, and practical cyber defense work.',
      why: 'Great if the school offers a cybersecurity pathway or CTE track, especially for students who want a technical niche.',
      skills: ['Networking', 'Security awareness', 'Systems thinking']
    },
    {
      name: 'AP Calculus AB',
      keywords: ['math', 'calculus', 'engineering', 'science', 'cs', 'stem'],
      gradeMin: 11,
      category: 'Math',
      track: 'gpa',
      priority: 96,
      gpaBoost: true,
      difficulty: 'AP',
      description: 'Limits, derivatives, integrals, and the calculus foundation for engineering and CS.',
      why: 'One of the strongest weighted core APs if the student can keep the grade high.',
      skills: ['Mathematical reasoning', 'Calculus', 'Problem solving']
    },
    {
      name: 'AP Statistics',
      keywords: ['data', 'stats', 'research', 'cs', 'analysis', 'business'],
      gradeMin: 10,
      category: 'Math',
      track: 'gpa',
      priority: 94,
      gpaBoost: true,
      difficulty: 'AP',
      description: 'Data analysis, probability, and statistical thinking.',
      why: 'Useful for CS, data science, business, medicine, and a GPA boost when handled well.',
      skills: ['Data analysis', 'Statistical reasoning', 'Research literacy']
    },
    {
      name: 'AP Physics 1',
      keywords: ['physics', 'engineering', 'stem', 'mechanics'],
      gradeMin: 10,
      category: 'Science',
      track: 'gpa',
      priority: 92,
      gpaBoost: true,
      difficulty: 'AP',
      description: 'Mechanics, forces, energy, and modeling physical systems.',
      why: 'A strong core AP for engineering-minded students and a solid rigor signal.',
      skills: ['Physics', 'Modeling', 'Scientific reasoning']
    },
    {
      name: 'AP Physics C: Mechanics',
      keywords: ['physics', 'engineering', 'math', 'calculus', 'stem'],
      gradeMin: 11,
      category: 'Science',
      track: 'stretch',
      priority: 90,
      gpaBoost: true,
      difficulty: 'AP',
      description: 'Calculus-based mechanics for students ready for a harder physics course.',
      why: 'A top-end option if the student is already strong in math and wants an elite STEM course sequence.',
      skills: ['Physics', 'Calculus', 'Engineering thinking']
    },
    {
      name: 'AP English Language and Composition',
      keywords: ['english', 'writing', 'essay', 'communication', 'humanities', 'law'],
      gradeMin: 10,
      category: 'Core',
      track: 'gpa',
      priority: 93,
      gpaBoost: true,
      difficulty: 'AP',
      description: 'Argument, rhetoric, synthesis, and college-style writing.',
      why: 'Weighted core AP that helps nearly every applicant profile when they can protect the grade.',
      skills: ['Writing', 'Argumentation', 'Rhetoric']
    },
    {
      name: 'Robotics / Engineering',
      keywords: ['robot', 'robotics', 'engineering', 'maker', 'tinkering', 'stem'],
      gradeMin: 9,
      category: 'CTE',
      track: 'specialty',
      priority: 88,
      gpaBoost: false,
      difficulty: 'Honors / CTE',
      description: 'Hands-on design, prototyping, and systems building.',
      why: 'Useful for students who want proof-of-work and a team-based technical extracurricular.',
      skills: ['Design thinking', 'Prototyping', 'Teamwork']
    }
  ];

  const STEM_PLAYBOOK = {
    courses: STEM_CORE_COURSES,
    jobs: [
      {
        title: 'Software Engineering Intern',
        keywords: ['software', 'coding', 'programming', 'cs', 'tech'],
        gradeMin: 11,
        priority: 100,
        readiness: 'Prepare for 1 year or target selective summer programs now',
        companies: ['Local startups', 'Google', 'Microsoft', 'H-E-B digital', 'school district IT'],
        description: 'Build features, fix bugs, and ship code in a real software workflow.',
        why: 'Best fit for a student building toward computer science or product engineering.',
        salary: '$15-35/hour',
        howToBreakIn: 'Build one polished app, keep a GitHub portfolio, and ask mentors for referrals or local startup intros.',
        skillsBuild: ['Programming', 'Collaboration', 'Debugging']
      },
      {
        title: 'Cybersecurity or IT Support Intern',
        keywords: ['cyber', 'security', 'network', 'systems', 'it'],
        gradeMin: 10,
        priority: 98,
        readiness: 'Prepare for 6-12 months',
        companies: ['School district IT', 'City IT departments', 'regional MSPs', 'security firms'],
        description: 'Support systems, security checks, and digital safety workflows.',
        why: 'Matches a cybersecurity track or networking pathway and is very strong for a school catalog roadmap.',
        salary: '$14-28/hour',
        howToBreakIn: 'Take the school cybersecurity class, earn basic certs if available, and document a home lab or security project.',
        skillsBuild: ['Networking', 'Security awareness', 'Troubleshooting']
      },
      {
        title: 'Data / Analytics Intern',
        keywords: ['data', 'stats', 'analysis', 'research'],
        gradeMin: 11,
        priority: 90,
        readiness: 'Prepare for 1 year',
        companies: ['Local companies', 'nonprofits', 'university labs', 'startups'],
        description: 'Analyze data, build dashboards, and support decision-making.',
        why: 'Great bridge between AP Statistics, CS, and business-minded technical work.',
        salary: '$15-30/hour',
        howToBreakIn: 'Build a small dashboard project and show that you can clean data and explain insights clearly.',
        skillsBuild: ['Excel', 'Python', 'Data storytelling']
      },
      {
        title: 'Research Assistant',
        keywords: ['research', 'science', 'lab', 'engineering'],
        gradeMin: 10,
        priority: 88,
        readiness: 'Prepare for 1 year or start with volunteer lab work',
        companies: ['University labs', 'STEM mentors', 'community science programs'],
        description: 'Support experiments, data logging, and literature review.',
        why: 'Strong if the student wants academic depth and a more Ivy-style research narrative.',
        salary: '$0-18/hour',
        howToBreakIn: 'Ask teachers for lab opportunities and pair the experience with a science fair or independent project.',
        skillsBuild: ['Research', 'Documentation', 'Scientific reasoning']
      }
    ],
    projects: [
      {
        name: 'School Scheduler or GPA Planner',
        keywords: ['school', 'schedule', 'gpa', 'planner', 'app'],
        gradeMin: 9,
        priority: 100,
        difficulty: 'Intermediate',
        time: '2-4 weeks',
        description: 'Build a tool that helps students compare course options, GPA weighting, and prerequisites.',
        why: 'Directly mirrors the Mentorist value proposition and shows product thinking.',
        skills: ['Product thinking', 'UI design', 'Data modeling'],
        portfolioValue: 'High'
      },
      {
        name: 'Cybersecurity Lab or CTF Journal',
        keywords: ['cyber', 'security', 'network', 'lab', 'ctf'],
        gradeMin: 9,
        priority: 96,
        difficulty: 'Intermediate',
        time: '3-6 weeks',
        description: 'Document a home lab, capture-the-flag challenges, or basic security hardening work.',
        why: 'Creates a proof-of-work trail for cybersecurity internships and track applications.',
        skills: ['Security basics', 'Writing', 'Systems analysis'],
        portfolioValue: 'High'
      },
      {
        name: 'Portfolio Website With Case Studies',
        keywords: ['portfolio', 'website', 'design', 'projects'],
        gradeMin: 9,
        priority: 94,
        difficulty: 'Beginner',
        time: '1-3 weeks',
        description: 'Show who you are, what you built, and what you learned in a clean online portfolio.',
        why: 'Required proof-of-work for nearly every top student profile.',
        skills: ['HTML/CSS', 'Storytelling', 'Presentation'],
        portfolioValue: 'High'
      },
      {
        name: 'Automate a Club or Class Workflow',
        keywords: ['automation', 'club', 'class', 'dashboard', 'workflow'],
        gradeMin: 10,
        priority: 92,
        difficulty: 'Intermediate',
        time: '2-5 weeks',
        description: 'Build a small internal tool for a school club, team, or organization.',
        why: 'Shows impact, leadership, and product usefulness all at once.',
        skills: ['Problem solving', 'Stakeholder communication', 'Iteration'],
        portfolioValue: 'High'
      },
      {
        name: 'Open Source or Hackathon Build',
        keywords: ['open source', 'hackathon', 'github', 'software'],
        gradeMin: 10,
        priority: 90,
        difficulty: 'Intermediate',
        time: 'Weekend to 4 weeks',
        description: 'Contribute to an open-source repo or build a hackathon prototype.',
        why: 'Great signal for technical ambition and collaboration.',
        skills: ['GitHub', 'Teamwork', 'Rapid prototyping'],
        portfolioValue: 'High'
      }
    ],
    extracurriculars: [
      {
        name: 'Robotics Team or Engineering Club',
        keywords: ['robot', 'engineering', 'stem'],
        gradeMin: 9,
        priority: 98,
        description: 'Build physical systems, compete, and learn team engineering workflows.',
        why: 'Strong if the school has a robotics track or engineering club.',
        time: '2-6 hours per week',
        impact: 'High'
      },
      {
        name: 'Programming Club / CyberPatriot / CTF Team',
        keywords: ['programming', 'cyber', 'security', 'coding'],
        gradeMin: 9,
        priority: 100,
        description: 'Practice technical depth in a competitive or collaborative setting.',
        why: 'Creates both skill and narrative for CS and cybersecurity admissions.',
        time: '2-5 hours per week',
        impact: 'High'
      },
      {
        name: 'Math Team or Competition Prep',
        keywords: ['math', 'problem solving', 'competition'],
        gradeMin: 9,
        priority: 88,
        description: 'Strengthen quantitative reasoning through contests and practice.',
        why: 'Pairs extremely well with AP Calc and AP Stats.',
        time: '1-4 hours per week',
        impact: 'Medium'
      },
      {
        name: 'Peer Tutoring or Tech Help Desk',
        keywords: ['tutoring', 'help', 'service', 'tech'],
        gradeMin: 9,
        priority: 84,
        description: 'Help classmates or community members with academics or tech issues.',
        why: 'A strong service signal while building communication skills.',
        time: '1-3 hours per week',
        impact: 'Medium'
      }
    ],
    tools: [
      {
        name: 'Python',
        keywords: ['python', 'data', 'automation'],
        priority: 100,
        description: 'Flexible language for scripting, automation, and data work.',
        why: 'Best general-purpose tool for high school CS students.',
        time: '2-4 weeks',
        resource: 'python.org and freeCodeCamp'
      },
      {
        name: 'GitHub',
        keywords: ['github', 'version control', 'open source'],
        priority: 98,
        description: 'Version control, collaboration, and public proof-of-work.',
        why: 'Every serious technical student should have a clean GitHub trail.',
        time: '1 week',
        resource: 'GitHub Docs'
      },
      {
        name: 'Java',
        keywords: ['java', 'object oriented', 'ap computer science a'],
        priority: 96,
        description: 'The language behind many AP CS A courses and intro CS classes.',
        why: 'Important if the school uses Java for AP CSA.',
        time: '2-4 weeks',
        resource: 'Oracle Java tutorials and AP CSA practice'
      },
      {
        name: 'Figma',
        keywords: ['design', 'ui', 'ux', 'prototype'],
        priority: 86,
        description: 'Quickly mock up interfaces before building them.',
        why: 'Useful for project planning, app design, and stakeholder feedback.',
        time: '1-2 weeks',
        resource: 'Figma Learn'
      }
    ],
    tips: [
      'If your school weights APs, one or two hard core classes can help your GPA more than stacking easy electives.',
      'For a sophomore, AP CS A or the cybersecurity track is a better signal than another random elective if the schedule allows it.',
      'Protect the GPA. A smaller number of weighted classes with strong grades is better than too many APs that crush performance.',
      'One polished project beats five half-finished ideas. Ship proof-of-work.',
      'Ask your counselor for the actual course catalog and prerequisites before building next year’s schedule.',
      'Keep one activity that shows leadership, one that shows technical depth, and one that shows service.'
    ],
    gpaCourses: ['AP English Language and Composition', 'AP Calculus AB', 'AP Statistics', 'AP Physics 1', 'AP US History', 'AP Government']
  };

  const MEDICINE_PLAYBOOK = {
    courses: [
      { name: 'AP Biology', keywords: ['medicine', 'bio', 'health', 'pre-med'], gradeMin: 10, category: 'Science', track: 'core', priority: 100, gpaBoost: true, difficulty: 'AP', description: 'Biology and genetics foundation.', why: 'Best core course for pre-med minded students.', skills: ['Biology', 'Science literacy'] },
      { name: 'AP Chemistry', keywords: ['medicine', 'chemistry', 'bio', 'health'], gradeMin: 10, category: 'Science', track: 'core', priority: 98, gpaBoost: true, difficulty: 'AP', description: 'Chemical systems and lab work.', why: 'A major pre-med signal and a strong rigor class.', skills: ['Chemistry', 'Lab reasoning'] },
      { name: 'AP Statistics', keywords: ['medicine', 'research', 'data', 'health'], gradeMin: 10, category: 'Math', track: 'gpa', priority: 94, gpaBoost: true, difficulty: 'AP', description: 'Statistics and data interpretation.', why: 'Useful for medical research and a weighted core boost.', skills: ['Data analysis', 'Research'] },
      { name: 'Anatomy and Physiology', keywords: ['medicine', 'health', 'body'], gradeMin: 10, category: 'Science', track: 'specialty', priority: 92, gpaBoost: false, difficulty: 'Honors', description: 'Body systems and how they work together.', why: 'A practical bridge to healthcare work and shadowing.', skills: ['Human anatomy', 'Medical vocabulary'] },
      { name: 'AP Psychology', keywords: ['medicine', 'health', 'psychology'], gradeMin: 10, category: 'Social Science', track: 'gpa', priority: 90, gpaBoost: true, difficulty: 'AP', description: 'Behavior, cognition, and clinical concepts.', why: 'Useful for patient understanding and research literacy.', skills: ['Behavioral science', 'Reading'] },
      { name: 'AP English Language and Composition', keywords: ['medicine', 'writing', 'communication'], gradeMin: 10, category: 'Core', track: 'gpa', priority: 88, gpaBoost: true, difficulty: 'AP', description: 'Argument and writing.', why: 'Strong GPA and communication signal for a future doctor.', skills: ['Writing', 'Communication'] }
    ],
    jobs: [
      { title: 'Medical Scribe', keywords: ['medicine', 'health', 'doctor'], gradeMin: 10, priority: 100, readiness: 'Ready now in many markets', companies: ['Hospitals', 'Clinics', 'Private practices'], description: 'Document visits and learn clinical workflow.', why: 'Great exposure and real-world med vocabulary.', salary: '$14-20/hour', howToBreakIn: 'Ask local clinics, family doctors, and hospitals for entry-level scribe openings or training programs.', skillsBuild: ['Attention to detail', 'Medical language'] },
      { title: 'Hospital Volunteer or Patient Ambassador', keywords: ['medicine', 'health', 'service'], gradeMin: 9, priority: 96, readiness: 'Ready now', companies: ['Hospitals', 'Community health systems'], description: 'Support staff and patients in service roles.', why: 'A classic service and shadowing bridge.', salary: 'Volunteer', howToBreakIn: 'Apply through hospital volunteer portals and keep a consistent schedule.', skillsBuild: ['Service', 'Empathy'] },
      { title: 'Research Assistant', keywords: ['medicine', 'research', 'science'], gradeMin: 10, priority: 94, readiness: 'Prepare for 6-12 months', companies: ['University labs', 'medical schools', 'research hospitals'], description: 'Help with data, literature review, or lab support.', why: 'Ideal if the student wants an Ivy-style research narrative.', salary: '$0-18/hour', howToBreakIn: 'Ask science teachers about lab mentors and lead with a science fair or poster project.', skillsBuild: ['Research', 'Analysis'] },
      { title: 'Pharmacy Tech Trainee', keywords: ['medicine', 'pharmacy', 'health'], gradeMin: 11, priority: 88, readiness: 'Prepare for 6-12 months', companies: ['Pharmacies', 'clinic pharmacies'], description: 'Learn medication workflow and patient interaction basics.', why: 'Good healthcare exposure and practical experience.', salary: '$14-20/hour', howToBreakIn: 'Check local certification requirements and nearby pharmacies with teen-friendly openings.', skillsBuild: ['Accuracy', 'Customer service'] }
    ],
    projects: [
      { name: 'Public Health Campaign', keywords: ['medicine', 'health', 'service'], gradeMin: 9, priority: 100, difficulty: 'Beginner', time: '2-4 weeks', description: 'Create a school or community campaign on a real health issue.', why: 'Shows service, communication, and initiative.', skills: ['Communication', 'Design', 'Research'], portfolioValue: 'High' },
      { name: 'Health Education Resource', keywords: ['medicine', 'health', 'content'], gradeMin: 9, priority: 96, difficulty: 'Beginner', time: '2-3 weeks', description: 'Build a guide, site, or video series that explains a health topic clearly.', why: 'Demonstrates patient-friendly communication.', skills: ['Writing', 'Visual storytelling'], portfolioValue: 'High' },
      { name: 'Research Poster or Mini Study', keywords: ['medicine', 'research', 'science'], gradeMin: 10, priority: 94, difficulty: 'Intermediate', time: '3-6 weeks', description: 'Run a small research question or analysis project and present findings.', why: 'Perfect for science fair, AP Research, or lab work.', skills: ['Research design', 'Analysis'], portfolioValue: 'High' },
      { name: 'CPR / First Aid Training Drive', keywords: ['medicine', 'service', 'community'], gradeMin: 9, priority: 88, difficulty: 'Beginner', time: '2-4 weeks', description: 'Organize a training or awareness drive for classmates and families.', why: 'Shows leadership plus real community value.', skills: ['Leadership', 'Event planning'], portfolioValue: 'Medium' }
    ],
    extracurriculars: [
      { name: 'HOSA or Health Occupations Club', keywords: ['medicine', 'health', 'club'], gradeMin: 9, priority: 100, description: 'Career and leadership exposure in health fields.', why: 'A perfect extracurricular anchor for med students.', time: '2-5 hours per week', impact: 'High' },
      { name: 'Hospital Volunteer Program', keywords: ['medicine', 'service'], gradeMin: 9, priority: 98, description: 'Consistent service in a healthcare setting.', why: 'Shows commitment to serving patients and staff.', time: '2-4 hours per week', impact: 'High' },
      { name: 'Science Fair or Research Club', keywords: ['medicine', 'research', 'science'], gradeMin: 9, priority: 94, description: 'A path to original science work.', why: 'Strong for pre-med research narrative.', time: '2-6 hours per week', impact: 'High' },
      { name: 'Red Cross / Public Health Outreach', keywords: ['medicine', 'health', 'service'], gradeMin: 9, priority: 90, description: 'Community health and service projects.', why: 'Creates impact beyond the classroom.', time: '1-4 hours per week', impact: 'Medium' }
    ],
    tools: [
      { name: 'Google Sheets / Excel', keywords: ['medicine', 'research', 'data'], priority: 100, description: 'Track data, volunteer hours, and research outputs.', why: 'Useful for research and leadership tracking.', time: '1-2 weeks', resource: 'Google Workspace tutorials' },
      { name: 'Citation manager or note system', keywords: ['medicine', 'research', 'writing'], priority: 96, description: 'Organize sources and research notes.', why: 'Helps with science papers and poster projects.', time: '1 week', resource: 'Zotero or Notion' },
      { name: 'Canva', keywords: ['medicine', 'design', 'health'], priority: 88, description: 'Create polished health education materials.', why: 'Great for campaigns and outreach.', time: '1 week', resource: 'Canva Learn' }
    ],
    tips: [
      'A medical profile gets much stronger when service, shadowing, and research all point in the same direction.',
      'Pick one weighted core AP and one healthcare-focused class if your schedule can support it.',
      'Volunteer consistently instead of doing one-off hours with no narrative.',
      'A small research or health education project can be more valuable than a generic club line.',
      'Shadow early, but also show that you can create impact, not just observe.'
    ],
    gpaCourses: ['AP Biology', 'AP Chemistry', 'AP Statistics', 'AP Psychology', 'AP English Language and Composition', 'AP US History']
  };

  const BUSINESS_PLAYBOOK = {
    courses: [
      { name: 'AP Economics (Macro and Micro)', keywords: ['business', 'finance', 'economics', 'entrepreneurship'], gradeMin: 10, category: 'Social Science', track: 'core', priority: 100, gpaBoost: true, difficulty: 'AP', description: 'Markets, incentives, and economic systems.', why: 'Foundational for business-minded students.', skills: ['Economics', 'Decision making'] },
      { name: 'AP Statistics', keywords: ['business', 'finance', 'data', 'analytics'], gradeMin: 10, category: 'Math', track: 'gpa', priority: 96, gpaBoost: true, difficulty: 'AP', description: 'Statistics for decision making and analysis.', why: 'Useful for finance, marketing, and analytics.', skills: ['Data analysis', 'Statistics'] },
      { name: 'Accounting', keywords: ['business', 'finance', 'accounting', 'money'], gradeMin: 9, category: 'CTE', track: 'specialty', priority: 94, gpaBoost: false, difficulty: 'Honors / CTE', description: 'Financial records and reporting.', why: 'A practical business foundation course.', skills: ['Accounting', 'Financial literacy'] },
      { name: 'Entrepreneurship', keywords: ['business', 'startup', 'entrepreneurship'], gradeMin: 9, category: 'CTE', track: 'specialty', priority: 92, gpaBoost: false, difficulty: 'Honors / CTE', description: 'Start, test, and pitch an idea.', why: 'Perfect if the student wants a startup story.', skills: ['Pitching', 'Business planning'] },
      { name: 'AP English Language and Composition', keywords: ['business', 'communication', 'writing'], gradeMin: 10, category: 'Core', track: 'gpa', priority: 90, gpaBoost: true, difficulty: 'AP', description: 'Writing and persuasion.', why: 'A strong weighted class for communication and GPA.', skills: ['Writing', 'Persuasion'] },
      { name: 'Marketing or Business Management', keywords: ['business', 'marketing', 'management'], gradeMin: 9, category: 'CTE', track: 'specialty', priority: 88, gpaBoost: false, difficulty: 'Honors / CTE', description: 'Branding, operations, and organization.', why: 'Good if the school has a business pathway.', skills: ['Marketing', 'Leadership'] }
    ],
    jobs: [
      { title: 'Business Operations Intern', keywords: ['business', 'ops', 'operations', 'finance'], gradeMin: 11, priority: 100, readiness: 'Prepare for 6-12 months', companies: ['Local businesses', 'startups', 'nonprofits'], description: 'Support operations and improve processes.', why: 'Good for learning how businesses actually work.', salary: '$14-25/hour', howToBreakIn: 'Build a small project that shows process improvement or analytics and ask for local connections.', skillsBuild: ['Organization', 'Operations'] },
      { title: 'Marketing Intern', keywords: ['business', 'marketing', 'brand', 'social'], gradeMin: 10, priority: 96, readiness: 'Ready now or prepare for 6 months', companies: ['Retail brands', 'startups', 'community organizations'], description: 'Help with campaigns, social media, and content.', why: 'Great for student entrepreneurs and brand builders.', salary: '$14-24/hour', howToBreakIn: 'Create a sample campaign or a social media case study.', skillsBuild: ['Content creation', 'Analytics'] },
      { title: 'Finance Club or Investment Program Assistant', keywords: ['business', 'finance', 'investing'], gradeMin: 10, priority: 90, readiness: 'Ready now', companies: ['School programs', 'community finance groups'], description: 'Assist with student investing or finance education work.', why: 'Builds finance vocabulary and a credible business narrative.', salary: 'Volunteer or stipend', howToBreakIn: 'Join finance competitions or local youth finance groups.', skillsBuild: ['Financial literacy', 'Presentation'] },
      { title: 'Startup or E-commerce Assistant', keywords: ['business', 'startup', 'entrepreneurship'], gradeMin: 10, priority: 88, readiness: 'Prepare for 6-12 months', companies: ['Founder-led startups', 'small businesses'], description: 'Wear multiple hats in a small company setting.', why: 'Excellent if the student wants entrepreneurial exposure.', salary: '$0-20/hour', howToBreakIn: 'Start a side project or small business and use that as the entry credential.', skillsBuild: ['Sales', 'Execution'] }
    ],
    projects: [
      { name: 'Micro-Business or E-Commerce Shop', keywords: ['business', 'startup', 'sales'], gradeMin: 9, priority: 100, difficulty: 'Intermediate', time: '3-8 weeks', description: 'Launch a small product or service business with real customers.', why: 'Direct proof of execution and entrepreneurship.', skills: ['Sales', 'Operations', 'Marketing'], portfolioValue: 'High' },
      { name: 'Business Case Competition Entry', keywords: ['business', 'case', 'finance'], gradeMin: 9, priority: 96, difficulty: 'Intermediate', time: '2-4 weeks', description: 'Solve a real company or nonprofit problem in a case format.', why: 'Great for business schools and leadership narratives.', skills: ['Analysis', 'Presentation'], portfolioValue: 'High' },
      { name: 'Community Consulting Project', keywords: ['business', 'consulting', 'operations'], gradeMin: 10, priority: 94, difficulty: 'Intermediate', time: '3-6 weeks', description: 'Help a club or nonprofit improve a process, workflow, or campaign.', why: 'Shows value creation and leadership.', skills: ['Problem solving', 'Communication'], portfolioValue: 'High' },
      { name: 'Finance Tracker or Budget Tool', keywords: ['business', 'finance', 'money'], gradeMin: 9, priority: 88, difficulty: 'Beginner', time: '1-3 weeks', description: 'Track spending, savings, or student org budgets in a clean tool.', why: 'Useful and easy to explain in interviews.', skills: ['Excel', 'Budgeting'], portfolioValue: 'Medium' }
    ],
    extracurriculars: [
      { name: 'DECA or FBLA', keywords: ['business', 'marketing', 'finance'], gradeMin: 9, priority: 100, description: 'Competitive business and leadership pathways.', why: 'One of the best extracurricular anchors for a business profile.', time: '2-6 hours per week', impact: 'High' },
      { name: 'Student Government or Leadership Board', keywords: ['business', 'leadership'], gradeMin: 9, priority: 96, description: 'Practice leadership, operations, and event planning.', why: 'Shows organizational skill and influence.', time: '2-5 hours per week', impact: 'High' },
      { name: 'Entrepreneurship Club', keywords: ['business', 'startup'], gradeMin: 9, priority: 92, description: 'Build and pitch ideas with peers.', why: 'Great if the student wants a founder story.', time: '1-4 hours per week', impact: 'Medium' },
      { name: 'Debate or Public Speaking', keywords: ['business', 'communication'], gradeMin: 9, priority: 90, description: 'Build persuasive speaking and quick thinking.', why: 'Helps in every business context from pitching to interviews.', time: '1-4 hours per week', impact: 'Medium' }
    ],
    tools: [
      { name: 'Excel / Google Sheets', keywords: ['business', 'finance', 'data'], priority: 100, description: 'Budgeting, modeling, and simple analytics.', why: 'The most important technical tool for business students.', time: '1-2 weeks', resource: 'Google Sheets and Excel tutorials' },
      { name: 'Canva', keywords: ['business', 'marketing', 'brand'], priority: 96, description: 'Design decks, flyers, and social media assets.', why: 'Essential for pitch decks and marketing work.', time: '1 week', resource: 'Canva Learn' },
      { name: 'Notion', keywords: ['business', 'organization', 'startup'], priority: 88, description: 'Organize a business plan, project pipeline, and notes.', why: 'Good for execution and planning.', time: '1 week', resource: 'Notion templates' }
    ],
    tips: [
      'Business profiles get much stronger when the student can point to measurable results, not just participation.',
      'Take at least one weighted core AP if your schedule allows it, especially AP Economics, AP Stats, or AP English Language.',
      'Build one business project that has real customers, users, or clear metrics.',
      'Leadership and execution matter more than collecting generic clubs.',
      'Show both creative thinking and spreadsheet thinking.'
    ],
    gpaCourses: ['AP Economics (Macro and Micro)', 'AP Statistics', 'AP English Language and Composition', 'AP Government', 'Accounting', 'Business Management']
  };

  const HUMANITIES_PLAYBOOK = {
    courses: [
      { name: 'AP English Language and Composition', keywords: ['humanities', 'writing', 'essay', 'communication', 'law'], gradeMin: 10, category: 'Core', track: 'core', priority: 100, gpaBoost: true, difficulty: 'AP', description: 'Rhetoric, argument, and writing.', why: 'The most direct humanities signal and an important weighted class.', skills: ['Writing', 'Argumentation'] },
      { name: 'AP English Literature and Composition', keywords: ['humanities', 'writing', 'literature', 'essay'], gradeMin: 10, category: 'Core', track: 'core', priority: 98, gpaBoost: true, difficulty: 'AP', description: 'Close reading and literary analysis.', why: 'Great for deep reading and college-level writing.', skills: ['Literary analysis', 'Writing'] },
      { name: 'AP US History', keywords: ['humanities', 'history', 'politics', 'law'], gradeMin: 10, category: 'Social Science', track: 'gpa', priority: 94, gpaBoost: true, difficulty: 'AP', description: 'American history and political development.', why: 'Strong weighted core and excellent narrative builder.', skills: ['Historical thinking', 'Evidence use'] },
      { name: 'AP Government and Politics', keywords: ['humanities', 'government', 'law', 'politics'], gradeMin: 11, category: 'Social Science', track: 'gpa', priority: 92, gpaBoost: true, difficulty: 'AP', description: 'Government systems and civic structures.', why: 'Perfect for civics, law, and public service-minded students.', skills: ['Civics', 'Policy analysis'] },
      { name: 'AP Seminar / Research', keywords: ['humanities', 'research', 'writing', 'analysis'], gradeMin: 10, category: 'Core', track: 'stretch', priority: 90, gpaBoost: true, difficulty: 'AP', description: 'Research, writing, and presentation.', why: 'Excellent for research, debate, and writing-heavy profiles.', skills: ['Research', 'Presentation'] },
      { name: 'Journalism or Creative Writing', keywords: ['humanities', 'writing', 'journalism', 'storytelling'], gradeMin: 9, category: 'Elective', track: 'specialty', priority: 88, gpaBoost: false, difficulty: 'Honors', description: 'News writing, storytelling, and editorial work.', why: 'Provides output and a portfolio beyond class assignments.', skills: ['Writing', 'Editing'] }
    ],
    jobs: [
      { title: 'Editorial or Writing Intern', keywords: ['humanities', 'writing', 'journalism'], gradeMin: 10, priority: 100, readiness: 'Ready now for many local outlets', companies: ['Local papers', 'nonprofits', 'student publications'], description: 'Write, edit, and publish content.', why: 'Strong direct fit for a student writer or journalist.', salary: '$0-18/hour', howToBreakIn: 'Build a writing portfolio, pitch stories, and start with local publications or student media.', skillsBuild: ['Writing', 'Editing'] },
      { title: 'Nonprofit Communications Intern', keywords: ['humanities', 'communication', 'nonprofit'], gradeMin: 10, priority: 96, readiness: 'Ready now or in 6 months', companies: ['Nonprofits', 'advocacy groups', 'museums'], description: 'Help with social media, blogs, and campaigns.', why: 'Good for students who want mission-driven storytelling.', salary: '$0-18/hour', howToBreakIn: 'Show sample posts, articles, or design work for a cause you care about.', skillsBuild: ['Communication', 'Campaign planning'] },
      { title: 'Museum or Archive Assistant', keywords: ['humanities', 'history', 'museum'], gradeMin: 10, priority: 92, readiness: 'Ready now', companies: ['Museums', 'archives', 'local history groups'], description: 'Assist with exhibits, research, or visitor support.', why: 'Great for history-focused students.', salary: '$0-15/hour', howToBreakIn: 'Volunteer first and ask about research, curation, or writing tasks.', skillsBuild: ['Research', 'Curation'] },
      { title: 'Policy or Civic Intern', keywords: ['humanities', 'law', 'government', 'policy'], gradeMin: 11, priority: 90, readiness: 'Prepare for 6-12 months', companies: ['Elected officials', 'advocacy groups', 'public policy orgs'], description: 'Support civic engagement or policy research.', why: 'Strong for law and public service narratives.', salary: '$0-18/hour', howToBreakIn: 'Write a policy memo or civic project and connect through local organizations.', skillsBuild: ['Policy writing', 'Research'] }
    ],
    projects: [
      { name: 'Newsletter, Zine, or Blog', keywords: ['humanities', 'writing', 'journalism'], gradeMin: 9, priority: 100, difficulty: 'Beginner', time: '2-4 weeks', description: 'Publish consistent writing on a topic you care about.', why: 'Easy to understand and easy to scale into a real audience.', skills: ['Writing', 'Audience building'], portfolioValue: 'High' },
      { name: 'Podcast or Oral History Project', keywords: ['humanities', 'storytelling', 'history'], gradeMin: 9, priority: 96, difficulty: 'Intermediate', time: '3-6 weeks', description: 'Record interviews or create a themed audio series.', why: 'Shows communication, research, and production skill.', skills: ['Interviewing', 'Editing'], portfolioValue: 'High' },
      { name: 'Debate / Model UN Brief Bank', keywords: ['humanities', 'debate', 'policy'], gradeMin: 9, priority: 94, difficulty: 'Intermediate', time: '2-5 weeks', description: 'Build a public bank of briefs, cases, or resolutions.', why: 'Strong for law and argument-focused profiles.', skills: ['Argumentation', 'Research'], portfolioValue: 'High' },
      { name: 'History or Civics Research Essay', keywords: ['humanities', 'history', 'research', 'law'], gradeMin: 10, priority: 88, difficulty: 'Intermediate', time: '3-5 weeks', description: 'Write a long-form argument on a historical or civic topic.', why: 'Good proof of serious writing ability.', skills: ['Research', 'Writing'], portfolioValue: 'Medium' }
    ],
    extracurriculars: [
      { name: 'Debate / Speech and Debate', keywords: ['humanities', 'debate', 'communication'], gradeMin: 9, priority: 100, description: 'Argumentation and performance under pressure.', why: 'One of the best humanities extracurriculars.', time: '2-6 hours per week', impact: 'High' },
      { name: 'Model UN or Civic Forum', keywords: ['humanities', 'policy', 'government'], gradeMin: 9, priority: 96, description: 'Global issues, diplomacy, and public speaking.', why: 'Excellent for law, policy, and international affairs.', time: '2-5 hours per week', impact: 'High' },
      { name: 'Student Newspaper / Yearbook', keywords: ['humanities', 'journalism', 'writing'], gradeMin: 9, priority: 94, description: 'Storytelling, editing, and publication.', why: 'Creates a durable portfolio of published work.', time: '2-5 hours per week', impact: 'High' },
      { name: 'Mock Trial or Mock Congress', keywords: ['humanities', 'law', 'government'], gradeMin: 9, priority: 92, description: 'Competition-based speaking and analysis.', why: 'Pairs well with law and government interests.', time: '2-5 hours per week', impact: 'Medium' }
    ],
    tools: [
      { name: 'Google Docs', keywords: ['humanities', 'writing'], priority: 100, description: 'Draft and revise polished writing.', why: 'The most important tool for writers.', time: '1 day', resource: 'Google Workspace help' },
      { name: 'Notion', keywords: ['humanities', 'organization', 'research'], priority: 92, description: 'Organize sources, outlines, and project plans.', why: 'Useful for long-form writing and research.', time: '1 week', resource: 'Notion templates' },
      { name: 'Audacity / CapCut', keywords: ['humanities', 'podcast', 'audio', 'video'], priority: 88, description: 'Edit audio and lightweight media projects.', why: 'Great for storytelling projects.', time: '1 week', resource: 'YouTube tutorials' }
    ],
    tips: [
      'Publish something real: a column, essay, podcast, or research piece.',
      'A strong writing or civic profile should show both thinking and output.',
      'Weighted AP English and history classes are excellent if the student can maintain the grades.',
      'Leadership in debate, journalism, or Model UN matters more than generic participation.',
      'Use one major project to connect your interests into a clear narrative.'
    ],
    gpaCourses: ['AP English Language and Composition', 'AP English Literature and Composition', 'AP US History', 'AP Government and Politics', 'AP Seminar / Research', 'AP World History']
  };

  const LAW_PLAYBOOK = {
    courses: [
      { name: 'AP Government and Politics', keywords: ['law', 'government', 'policy', 'civics'], gradeMin: 11, category: 'Social Science', track: 'core', priority: 100, gpaBoost: true, difficulty: 'AP', description: 'Government systems and constitutional concepts.', why: 'Best direct school-course signal for law-minded students.', skills: ['Civics', 'Policy analysis'] },
      { name: 'AP US History', keywords: ['law', 'history', 'government'], gradeMin: 10, category: 'Social Science', track: 'gpa', priority: 96, gpaBoost: true, difficulty: 'AP', description: 'American history and legal evolution.', why: 'Pairs well with law, government, and debate.', skills: ['Historical reasoning', 'Evidence'] },
      { name: 'AP English Language and Composition', keywords: ['law', 'writing', 'argument'], gradeMin: 10, category: 'Core', track: 'core', priority: 98, gpaBoost: true, difficulty: 'AP', description: 'Argument and persuasive writing.', why: 'Core for legal writing and public speaking.', skills: ['Writing', 'Argumentation'] },
      { name: 'Debate / Forensics', keywords: ['law', 'debate', 'argument', 'speech'], gradeMin: 9, category: 'Elective', track: 'specialty', priority: 94, gpaBoost: false, difficulty: 'Honors', description: 'Performance, argument, and quick thinking.', why: 'Excellent law-prep extracurricular course.', skills: ['Public speaking', 'Logic'] },
      { name: 'AP Seminar / Research', keywords: ['law', 'research', 'writing'], gradeMin: 10, category: 'Core', track: 'stretch', priority: 92, gpaBoost: true, difficulty: 'AP', description: 'Research, evidence, and argument presentation.', why: 'Creates law-school-style research and presentation habits.', skills: ['Research', 'Presentation'] },
      { name: 'Economics', keywords: ['law', 'policy', 'economics'], gradeMin: 10, category: 'Social Science', track: 'gpa', priority: 88, gpaBoost: false, difficulty: 'Honors', description: 'Basic economics and policy structures.', why: 'Useful for policy and public-interest law.', skills: ['Economic reasoning', 'Policy'] }
    ],
    jobs: [
      { title: 'Legal Aid Volunteer or Intern', keywords: ['law', 'legal', 'court'], gradeMin: 10, priority: 100, readiness: 'Ready now or prepare for 6 months', companies: ['Legal aid offices', 'nonprofits', 'courts'], description: 'Help with client support, intake, or research.', why: 'Direct law exposure and service.', salary: '$0-16/hour', howToBreakIn: 'Reach out to legal aid offices and ask about teen-friendly volunteer work.', skillsBuild: ['Legal research', 'Service'] },
      { title: 'Policy or Campaign Intern', keywords: ['law', 'policy', 'government'], gradeMin: 11, priority: 96, readiness: 'Prepare for 6-12 months', companies: ['Elected officials', 'policy orgs', 'campaigns'], description: 'Support civic or policy work.', why: 'Strong public-interest narrative.', salary: '$0-18/hour', howToBreakIn: 'Write a one-page policy memo and share it with local offices or advocacy groups.', skillsBuild: ['Policy writing', 'Research'] },
      { title: 'Mock Trial / Debate Coach Assistant', keywords: ['law', 'debate', 'speech'], gradeMin: 9, priority: 92, readiness: 'Ready now', companies: ['Schools', 'debate programs', 'community orgs'], description: 'Help younger students or teams with cases and speaking.', why: 'Builds leadership and teaching skill.', salary: 'Volunteer', howToBreakIn: 'Offer to help a teacher or coach with case prep and logistics.', skillsBuild: ['Mentoring', 'Organization'] }
    ],
    projects: [
      { name: 'Policy White Paper', keywords: ['law', 'policy', 'research'], gradeMin: 9, priority: 100, difficulty: 'Intermediate', time: '2-5 weeks', description: 'Write a concrete policy proposal on a real issue.', why: 'Shows legal reasoning and evidence use.', skills: ['Research', 'Writing'], portfolioValue: 'High' },
      { name: 'Civic Education Project', keywords: ['law', 'government', 'civics'], gradeMin: 9, priority: 96, difficulty: 'Beginner', time: '2-4 weeks', description: 'Teach students or families how a civic process works.', why: 'Useful and easy to explain in a personal statement.', skills: ['Communication', 'Civics'], portfolioValue: 'High' },
      { name: 'Mock Trial Case Brief Bank', keywords: ['law', 'debate', 'court'], gradeMin: 9, priority: 94, difficulty: 'Intermediate', time: '2-4 weeks', description: 'Build a public set of case briefs, themes, or evidence summaries.', why: 'Proves legal-style organization and analysis.', skills: ['Case analysis', 'Argumentation'], portfolioValue: 'High' }
    ],
    extracurriculars: [
      { name: 'Mock Trial', keywords: ['law', 'court', 'argument'], gradeMin: 9, priority: 100, description: 'Courtroom-style competition and legal argumentation.', why: 'The canonical law extracurricular.', time: '2-6 hours per week', impact: 'High' },
      { name: 'Debate or Speech Team', keywords: ['law', 'argument', 'speech'], gradeMin: 9, priority: 98, description: 'Build persuasion and quick thinking.', why: 'Amazing for law school and public speaking.', time: '2-6 hours per week', impact: 'High' },
      { name: 'Model UN / Civic Club', keywords: ['law', 'policy', 'government'], gradeMin: 9, priority: 92, description: 'Practice policy, diplomacy, and research.', why: 'Great for public-interest law.', time: '2-5 hours per week', impact: 'Medium' }
    ],
    tools: [
      { name: 'Google Docs', keywords: ['law', 'writing'], priority: 100, description: 'Draft memos, briefs, and essays.', why: 'Essential for legal writing practice.', time: '1 day', resource: 'Google Docs help' },
      { name: 'Google Scholar', keywords: ['law', 'research'], priority: 94, description: 'Research sources and citations.', why: 'Great for policy and argument projects.', time: '1 day', resource: 'scholar.google.com' }
    ],
    tips: [
      'Law profiles are strongest when debate, writing, and service all reinforce the same story.',
      'Take AP Gov and AP Lang if the schedule supports it; they are classic weighted-core options for law students.',
      'A policy memo or case brief bank is better than a generic club line.',
      'Show public-facing communication, not just interest in courts.',
      'Use one issue area and build depth around it.'
    ],
    gpaCourses: ['AP Government and Politics', 'AP US History', 'AP English Language and Composition', 'AP Seminar / Research', 'Economics']
  };

  const ARTS_PLAYBOOK = {
    courses: [
      { name: 'AP Art and Design', keywords: ['art', 'design', 'visual', 'portfolio', 'creative'], gradeMin: 10, category: 'Arts', track: 'core', priority: 100, gpaBoost: false, difficulty: 'AP', description: 'Portfolio-based art and design development.', why: 'The most direct arts portfolio class.', skills: ['Portfolio building', 'Critique'] },
      { name: 'Graphic Design', keywords: ['art', 'design', 'visual', 'ui', 'ux'], gradeMin: 9, category: 'Arts', track: 'specialty', priority: 98, gpaBoost: false, difficulty: 'Honors', description: 'Visual communication, branding, and layout.', why: 'Useful for portfolio work and creative internships.', skills: ['Branding', 'Visual communication'] },
      { name: 'Digital Media / Animation', keywords: ['art', 'animation', 'digital', 'video', 'design'], gradeMin: 9, category: 'Arts', track: 'specialty', priority: 96, gpaBoost: false, difficulty: 'Honors', description: 'Motion, editing, and digital storytelling.', why: 'Great for portfolio depth and creative proof-of-work.', skills: ['Animation', 'Editing'] },
      { name: 'AP English Language and Composition', keywords: ['art', 'writing', 'storytelling'], gradeMin: 10, category: 'Core', track: 'gpa', priority: 92, gpaBoost: true, difficulty: 'AP', description: 'Rhetoric and writing.', why: 'Useful if the student wants a strong weighted core class and communication skills.', skills: ['Writing', 'Communication'] },
      { name: 'Photography / Film Production', keywords: ['art', 'film', 'photo', 'creative'], gradeMin: 9, category: 'Arts', track: 'specialty', priority: 94, gpaBoost: false, difficulty: 'Honors', description: 'Cameras, composition, and visual storytelling.', why: 'Excellent for a creative portfolio.', skills: ['Composition', 'Editing'] }
    ],
    jobs: [
      { title: 'Design Intern', keywords: ['art', 'design', 'ui', 'ux', 'creative'], gradeMin: 10, priority: 100, readiness: 'Prepare for 6-12 months', companies: ['Agencies', 'startups', 'small businesses', 'nonprofits'], description: 'Design visuals, decks, and interfaces.', why: 'Best direct fit for a creative student.', salary: '$14-28/hour', howToBreakIn: 'Create a polished portfolio and one case study that shows process, not just final images.', skillsBuild: ['Design systems', 'Feedback'] },
      { title: 'Content / Creative Intern', keywords: ['art', 'content', 'creative', 'media'], gradeMin: 9, priority: 96, readiness: 'Ready now or prepare for 6 months', companies: ['Brands', 'student media', 'community orgs'], description: 'Create content for social, web, or campaigns.', why: 'Useful for artists who want professional output.', salary: '$0-20/hour', howToBreakIn: 'Start producing consistent visual content and share a portfolio.', skillsBuild: ['Storytelling', 'Production'] }
    ],
    projects: [
      { name: 'Professional Art Portfolio', keywords: ['art', 'portfolio', 'creative'], gradeMin: 9, priority: 100, difficulty: 'Intermediate', time: '4-10 weeks', description: 'Build a cohesive portfolio with process notes and best pieces.', why: 'A portfolio is the core asset for arts admissions and internships.', skills: ['Selection', 'Presentation'], portfolioValue: 'High' },
      { name: 'Brand Identity or Rebrand Project', keywords: ['art', 'design', 'brand'], gradeMin: 9, priority: 96, difficulty: 'Intermediate', time: '2-4 weeks', description: 'Rebrand a club, nonprofit, or small business.', why: 'Shows applied visual thinking and problem solving.', skills: ['Brand strategy', 'Layout'], portfolioValue: 'High' },
      { name: 'Short Film or Animation Reel', keywords: ['art', 'film', 'animation', 'creative'], gradeMin: 9, priority: 94, difficulty: 'Intermediate', time: '3-8 weeks', description: 'Produce a short media project that demonstrates voice and craft.', why: 'A strong arts artifact with clear impact.', skills: ['Editing', 'Storytelling'], portfolioValue: 'High' }
    ],
    extracurriculars: [
      { name: 'Art Club or Portfolio Critique Group', keywords: ['art', 'design', 'creative'], gradeMin: 9, priority: 100, description: 'Regular critique and peer feedback.', why: 'A must-have for creative growth.', time: '1-4 hours per week', impact: 'High' },
      { name: 'Theater, Film, or Yearbook', keywords: ['art', 'film', 'design', 'creative'], gradeMin: 9, priority: 96, description: 'Production and visual storytelling experience.', why: 'Great for arts students who want public artifacts.', time: '2-6 hours per week', impact: 'High' },
      { name: 'Photography or Media Team', keywords: ['art', 'media', 'photo'], gradeMin: 9, priority: 94, description: 'Build a real creative portfolio through school media.', why: 'Shows production, not just classwork.', time: '2-5 hours per week', impact: 'Medium' }
    ],
    tools: [
      { name: 'Figma', keywords: ['art', 'design', 'ui', 'ux'], priority: 100, description: 'Wireframes, design systems, and prototypes.', why: 'Must-have for design and product work.', time: '1-2 weeks', resource: 'Figma Learn' },
      { name: 'Adobe Express / Photoshop / Illustrator', keywords: ['art', 'design', 'creative'], priority: 98, description: 'Professional-grade creative editing and design tools.', why: 'Still very common in school and industry workflows.', time: '1-3 weeks', resource: 'Adobe tutorials' },
      { name: 'CapCut or DaVinci Resolve', keywords: ['art', 'film', 'video'], priority: 88, description: 'Video editing for reels and short films.', why: 'Great for motion and storytelling work.', time: '1 week', resource: 'YouTube tutorials' }
    ],
    tips: [
      'For arts, the portfolio is the transcript that matters most.',
      'Take a weighted English class if you can handle it, but do not overload so much that it hurts the portfolio.',
      'Show a coherent style, not random pieces with no story.',
      'Critique is part of the process. Use one group, club, or teacher to get constant feedback.',
      'A polished website or reel can be more valuable than a long list of activities.'
    ],
    gpaCourses: ['AP English Language and Composition', 'AP English Literature and Composition', 'AP Seminar / Research', 'AP Art and Design']
  };

  const UNCERTAIN_PLAYBOOK = {
    courses: [
      { name: 'AP English Language and Composition', keywords: ['writing', 'communication'], gradeMin: 10, category: 'Core', track: 'gpa', priority: 98, gpaBoost: true, difficulty: 'AP', description: 'Writing and argument.', why: 'Useful for almost every college path.', skills: ['Writing', 'Communication'] },
      { name: 'AP Statistics', keywords: ['data', 'analysis'], gradeMin: 10, category: 'Math', track: 'gpa', priority: 96, gpaBoost: true, difficulty: 'AP', description: 'Data and probability.', why: 'Flexible and useful for many fields.', skills: ['Data analysis'] },
      { name: 'AP Computer Science Principles', keywords: ['technology', 'coding'], gradeMin: 9, category: 'CS', track: 'explore', priority: 94, gpaBoost: false, difficulty: 'AP', description: 'Intro to computing and digital problem solving.', why: 'A low-risk exploration course for undecided students.', skills: ['Computational thinking'] }
    ],
    jobs: [
      { title: 'Career Exploration Internship', keywords: ['explore'], gradeMin: 9, priority: 100, readiness: 'Ready now', companies: ['Local nonprofits', 'city programs', 'schools'], description: 'Try different roles and learn what fits.', why: 'Best if the student is still exploring.', salary: '$0-18/hour', howToBreakIn: 'Shadow people in several fields and compare what energizes you.', skillsBuild: ['Reflection', 'Communication'] }
    ],
    projects: [
      { name: 'Personal Interest Sampler', keywords: ['explore'], gradeMin: 9, priority: 100, difficulty: 'Beginner', time: '1-2 weeks', description: 'Try three mini-projects in different areas and reflect on what clicks.', why: 'Helps turn uncertainty into a real decision.', skills: ['Experimentation', 'Reflection'], portfolioValue: 'Medium' }
    ],
    extracurriculars: [
      { name: 'Join One Technical and One Human Club', keywords: ['explore'], gradeMin: 9, priority: 100, description: 'Sample two very different types of communities.', why: 'Great for figuring out your direction fast.', time: '1-4 hours per week', impact: 'Medium' }
    ],
    tools: [
      { name: 'Notion or a simple notebook system', keywords: ['explore'], priority: 100, description: 'Track what you like and what you do not.', why: 'Undecided students need a system to reflect and compare.', time: '1 day', resource: 'Notion templates' }
    ],
    tips: [
      'If you are undecided, do not try to optimize everything at once. Sample in a structured way.',
      'Take one rigorous core AP and one exploratory class rather than drifting.',
      'Use projects to discover what you enjoy when classes are not enough.',
      'A good mentor question for you is not "what should I be?" but "what pattern keeps showing up?"'
    ],
    gpaCourses: ['AP English Language and Composition', 'AP Statistics', 'AP Computer Science Principles']
  };

  const PLAYBOOKS = {
    stem: STEM_PLAYBOOK,
    medicine: MEDICINE_PLAYBOOK,
    business: BUSINESS_PLAYBOOK,
    humanities: HUMANITIES_PLAYBOOK,
    law: LAW_PLAYBOOK,
    arts: ARTS_PLAYBOOK,
    undecided: UNCERTAIN_PLAYBOOK
  };

  const SCHOOL_HINTS = [
    {
      pattern: /rouse high school|leander isd/i,
      notes: [
        'If Rouse High School offers the cybersecurity pathway and AP Computer Science A, those should sit near the top of the roadmap for a CS-focused sophomore.',
        'For GPA protection, add one or two weighted core APs you can realistically keep at a high grade, such as AP Calculus AB, AP Statistics, or AP English Language.',
        'If AP CSA is not open yet, AP CSP plus the cybersecurity track is a strong next step while you build a project portfolio.'
      ]
    }
  ];

  const TOPIC_ALIASES = [
    ['computer science', 'stem'],
    ['software', 'stem'],
    ['coding', 'stem'],
    ['programming', 'stem'],
    ['cybersecurity', 'stem'],
    ['technology', 'stem'],
    ['engineering', 'stem'],
    ['medicine', 'medicine'],
    ['health', 'medicine'],
    ['pre-med', 'medicine'],
    ['business', 'business'],
    ['entrepreneur', 'business'],
    ['finance', 'business'],
    ['economics', 'business'],
    ['writing', 'humanities'],
    ['history', 'humanities'],
    ['journalism', 'humanities'],
    ['law', 'law'],
    ['government', 'law'],
    ['debate', 'law'],
    ['art', 'arts'],
    ['design', 'arts'],
    ['film', 'arts'],
    ['creative', 'arts']
  ];

  function escapeText(value) {
    return String(value ?? '')
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&#039;');
  }

  function normalizeText(value) {
    return String(value ?? '')
      .toLowerCase()
      .replace(/[^a-z0-9+ ]+/g, ' ')
      .replace(/\s+/g, ' ')
      .trim();
  }

  function splitList(value) {
    if (!value) return [];
    if (Array.isArray(value)) return value.flatMap(splitList);
    return String(value)
      .split(/[\n,;/|]+/)
      .map((part) => part.trim())
      .filter(Boolean);
  }

  function uniqueBy(items, keyFn) {
    const seen = new Set();
    const out = [];
    for (const item of items || []) {
      const key = keyFn(item);
      if (!key || seen.has(key)) continue;
      seen.add(key);
      out.push(item);
    }
    return out;
  }

  function asArray(value) {
    if (Array.isArray(value)) return value.filter(Boolean);
    if (!value) return [];
    return [value];
  }

  function gradeToNumber(value, stage = '') {
    const raw = normalizeText(value);
    if (!raw) return null;
    const digitMatch = raw.match(/(\d{1,2})/);
    if (digitMatch) {
      const n = Number(digitMatch[1]);
      if (n >= 1 && n <= 16) return n;
    }
    if (raw.includes('freshman')) return stage === 'college' ? 13 : 9;
    if (raw.includes('sophomore')) return stage === 'college' ? 14 : 10;
    if (raw.includes('junior')) return stage === 'college' ? 15 : 11;
    if (raw.includes('senior')) return stage === 'college' ? 16 : 12;
    if (raw.includes('ninth')) return 9;
    if (raw.includes('tenth')) return 10;
    if (raw.includes('eleventh')) return 11;
    if (raw.includes('twelfth')) return 12;
    return null;
  }

  function gradeLabel(value, stage = '') {
    const n = gradeToNumber(value, stage);
    if (!n) return value ? String(value) : '';
    if (n >= 13) {
      const collegeMap = { 13: 'College Freshman', 14: 'College Sophomore', 15: 'College Junior', 16: 'College Senior' };
      return collegeMap[n] || String(value);
    }
    const suffix = n === 11 ? 'th' : n === 12 ? 'th' : n === 13 ? 'th' : 'th';
    return `${n}${suffix} Grade`;
  }

  function workloadScore(value) {
    const raw = normalizeText(value);
    if (!raw) return 2;
    if (raw.includes('max') || raw.includes('highest') || raw.includes('extreme')) return 4;
    if (raw.includes('ambitious') || raw.includes('rigorous') || raw.includes('stretch')) return 3;
    if (raw.includes('balanced') || raw.includes('steady') || raw.includes('moderate')) return 2;
    if (raw.includes('light') || raw.includes('manageable')) return 1;
    return 2;
  }

  function tokenSetFrom(...chunks) {
    const tokens = new Set();
    for (const chunk of chunks.flat()) {
      for (const part of splitList(chunk)) {
        for (const token of normalizeText(part).split(' ')) {
          if (token && token.length > 1) tokens.add(token);
        }
      }
    }
    return tokens;
  }

  function inferInterest(profile) {
    const raw = normalizeText([
      profile.interest,
      profile.secondaryInterests,
      profile.careers,
      profile.skills,
      profile.goal,
      profile.extracurriculars,
      profile.currentCourses,
      profile.passionProjects
    ].join(' '));

    for (const [needle, interest] of TOPIC_ALIASES) {
      if (raw.includes(needle)) return interest;
    }
    return normalizeText(profile.interest) || 'undecided';
  }

  function normalizeProfile(raw = {}) {
    const source = raw.profile && typeof raw.profile === 'object' ? raw.profile : raw;
    const stage = normalizeText(source.educationStage || source.grade || source.path || 'highschool');
    const schoolGrade = source.schoolGrade || source.gradeLevel || source.schoolYear || source.currentYear || source.classYear || '';
    const schoolGradeNumber = gradeToNumber(schoolGrade, stage);
    const schoolName = String(source.schoolName || source.school || source.school_name || '').trim();
    const schoolLocation = String(source.schoolLocation || source.schoolDistrict || source.schoolCity || source.location || '').trim();
    const schoolCatalogUrl = String(source.schoolCatalogUrl || source.catalogUrl || source.courseCatalogUrl || '').trim();
    const interest = inferInterest(source);
    const currentCourses = splitList(source.currentCourses || source.courseLoad || source.schedule || '');
    const extracurriculars = splitList(source.extracurriculars || source.activities || source.passions || '');
    const passionProjects = splitList(source.passionProjects || source.projects || '');
    const skills = splitList(source.skills || '');
    const careers = splitList(source.careers || source.careerInterests || '');
    const targetColleges = splitList(source.targetColleges || source.colleges || '');
    const tokens = tokenSetFrom(
      source.name,
      schoolName,
      schoolLocation,
      interest,
      source.secondaryInterests,
      source.goal,
      source.careers,
      source.skills,
      source.extracurriculars,
      source.activities,
      source.currentCourses,
      source.passionProjects,
      currentCourses,
      extracurriculars,
      passionProjects
    );

    return {
      ...source,
      name: source.name || raw.name || 'Student',
      email: String(source.email || raw.email || '').toLowerCase(),
      grade: stage || source.grade || 'highschool',
      educationStage: stage || source.educationStage || 'highschool',
      schoolGrade: schoolGrade || '',
      schoolGradeNumber: schoolGradeNumber || null,
      schoolGradeLabel: gradeLabel(schoolGrade, stage),
      schoolName,
      schoolLocation,
      schoolCatalogUrl,
      interest,
      workloadPreference: source.workloadPreference || source.workload || source.rigor || 'balanced',
      workloadScore: workloadScore(source.workloadPreference || source.workload || source.rigor || 'balanced'),
      currentGpa: source.currentGpa || source.gpa || '',
      targetGpa: source.targetGpa || source.goalGpa || '',
      goal: source.goal || '',
      careers,
      skills,
      extracurriculars,
      currentCourses,
      passionProjects,
      targetColleges,
      internshipTimeline: source.internshipTimeline || source.internshipReadiness || '',
      timeAvailability: source.timeAvailability || source.weeklyAvailability || source.hoursPerWeek || '',
      catalogSearchTerms: [
        schoolName,
        schoolLocation,
        'course catalog',
        'program of studies'
      ].filter(Boolean).join(' '),
      tokens
    };
  }

  function getPlaybook(interest) {
    return PLAYBOOKS[interest] || PLAYBOOKS.undecided;
  }

  function hasCourseMatch(courseName, currentCourses) {
    const normalizedCourse = normalizeText(courseName);
    if (!normalizedCourse) return false;
    return currentCourses.some((course) => {
      const normalizedCurrent = normalizeText(course);
      return normalizedCurrent === normalizedCourse || normalizedCurrent.includes(normalizedCourse) || normalizedCourse.includes(normalizedCurrent);
    });
  }

  function scoreItem(item, profile, extraBoost = []) {
    let score = Number(item.priority || 0);
    const keywords = [...asArray(item.keywords), ...asArray(extraBoost)];
    const tokenSource = profile.tokens;

    for (const keyword of keywords) {
      const normalized = normalizeText(keyword);
      if (!normalized) continue;
      if (tokenSource.has(normalized)) score += 12;
      if (normalized.split(' ').some((piece) => tokenSource.has(piece))) score += 4;
    }

    if (item.gradeMin && profile.schoolGradeNumber && profile.schoolGradeNumber < item.gradeMin) {
      score -= 14;
    }
    if (item.gradeMax && profile.schoolGradeNumber && profile.schoolGradeNumber > item.gradeMax) {
      score -= 4;
    }
    if (item.gpaBoost && profile.workloadScore >= 3) {
      score += 6;
    }
    if (item.gpaBoost && profile.workloadScore <= 1) {
      score -= 4;
    }
    if (profile.currentCourses.some((course) => normalizeText(course) === normalizeText(item.name))) {
      score -= 40;
    }
    if (profile.currentCourses.some((course) => normalizeText(course).includes(normalizeText(item.name)))) {
      score -= 32;
    }
    return score;
  }

  function rankItems(items, profile, extraBoost = [], limit = 6) {
    return uniqueBy(
      [...items]
        .map((item) => ({ ...item, _score: scoreItem(item, profile, extraBoost) }))
        .sort((a, b) => b._score - a._score),
      (item) => normalizeText(item.name || item.title)
    ).slice(0, limit).map(({ _score, ...item }) => item);
  }

  function buildSchoolHints(profile) {
    const hint = SCHOOL_HINTS.find((entry) => entry.pattern.test(`${profile.schoolName} ${profile.schoolLocation}`));
    return hint ? hint.notes : [];
  }

  function buildCatalogCourseItem(course, profile) {
    const name = String(course.name || course.courseName || course.title || '').trim();
    const description = String(course.description || course.summary || course.note || '').trim();
    const keywords = [
      ...splitList(course.keywords || ''),
      ...splitList(name),
      ...splitList(description)
    ];
    const category = course.category || course.type || course.subject || '';
    const gradeMin = course.gradeMin || course.minGrade || null;
    const gradeMax = course.gradeMax || course.maxGrade || null;
    const sourceUrl = course.url || course.sourceUrl || course.link || profile.schoolCatalogUrl || '';
    const track = /ap/i.test(name) ? 'gpa' : /honors/i.test(name) ? 'gpa' : /cyber/i.test(name) ? 'specialty' : 'catalog';

    return {
      name,
      description: description || `School catalog course in ${category || 'a relevant pathway'}.`,
      why: course.why || 'Matches the school catalog and the student profile.',
      difficulty: course.difficulty || (/(ap|advanced placement)/i.test(name) ? 'AP' : /honors/i.test(name) ? 'Honors' : 'Standard'),
      category,
      track,
      gradeMin,
      gradeMax,
      gpaBoost: !!course.gpaBoost || /ap|honors/i.test(name),
      skills: asArray(course.skills || splitList(name)),
      source: sourceUrl ? 'school catalog' : 'playbook',
      sourceUrl,
      priority: Number(course.priority || 0),
      keywords
    };
  }

  function mergeCourseSources(profile, schoolCatalog = null) {
    const playbook = getPlaybook(profile.interest);
    const catalogCourses = asArray(schoolCatalog?.courses || schoolCatalog?.extractedCourses || schoolCatalog?.items || [])
      .map((course) => buildCatalogCourseItem(course, profile))
      .filter((course) => course.name);

    const schoolHints = buildSchoolHints(profile);
    const hintBoost = schoolHints.join(' ').split(' ').filter(Boolean);
    const rankedCatalog = rankItems(catalogCourses, profile, hintBoost, 10);
    const rankedPlaybook = rankItems(playbook.courses, profile, hintBoost, 10);
    const merged = uniqueBy([...rankedCatalog, ...rankedPlaybook], (item) => normalizeText(item.name));

    return merged;
  }

  function buildCourseRoadmap(profile, schoolCatalog = null) {
    const schoolHints = buildSchoolHints(profile);
    const allCourses = mergeCourseSources(profile, schoolCatalog);
    const interestName = profile.interest;

    const now = [];
    const next = [];
    const stretch = [];
    const gpaBoost = [];

    for (const course of allCourses) {
      const name = course.name || '';
      const isWeighted = !!course.gpaBoost || /ap|honors/i.test(name);
      const isCurrentFit = !profile.schoolGradeNumber || !course.gradeMin || profile.schoolGradeNumber >= course.gradeMin;
      const isStretch = course.track === 'stretch' || (profile.workloadScore >= 3 && /ap/i.test(name) && course.gradeMin && profile.schoolGradeNumber && profile.schoolGradeNumber < course.gradeMin + 1);
      const isCoreBoost = isWeighted && (course.track === 'gpa' || /english|history|government|calculus|statistics|physics|chemistry|biology/i.test(name));

      const entry = {
        name,
        description: course.description,
        why: course.why,
        difficulty: course.difficulty,
        category: course.category,
        source: course.source,
        sourceUrl: course.sourceUrl || '',
        skills: course.skills || [],
        priority: course.priority || 0,
        schoolSpecific: course.source === 'school catalog',
        gpaBoost: isCoreBoost,
        gradeFit: isCurrentFit ? 'on track' : 'future',
        track: course.track
      };

      if (isCoreBoost) gpaBoost.push(entry);
      if (isStretch) {
        stretch.push(entry);
      } else if (isCurrentFit) {
        now.push(entry);
      } else {
        next.push(entry);
      }
    }

    const sortedNow = uniqueBy(now.sort((a, b) => b.priority - a.priority), (item) => normalizeText(item.name)).slice(0, 5);
    const sortedNext = uniqueBy(next.sort((a, b) => b.priority - a.priority), (item) => normalizeText(item.name)).slice(0, 4);
    const sortedStretch = uniqueBy(stretch.sort((a, b) => b.priority - a.priority), (item) => normalizeText(item.name)).slice(0, 4);
    const sortedGpa = uniqueBy(gpaBoost.sort((a, b) => b.priority - a.priority), (item) => normalizeText(item.name)).slice(0, 4);

    const schoolSummary = schoolHints.length
      ? schoolHints[0]
      : profile.schoolName
        ? `The school catalog will be searched for ${profile.schoolName}.`
        : 'A school name and catalog link will make the recommendations much more specific.';

    return {
      courses: uniqueBy([...sortedNow, ...sortedNext, ...sortedStretch, ...sortedGpa], (item) => normalizeText(item.name)).slice(0, 10),
      courseTracks: {
        now: sortedNow,
        next: sortedNext,
        stretch: sortedStretch,
        gpaBoost: sortedGpa
      },
      schoolSummary,
      schoolSpecific: allCourses.some((course) => course.source === 'school catalog'),
      schoolCatalogCount: asArray(schoolCatalog?.courses || schoolCatalog?.extractedCourses).length
    };
  }

  function aggregatePeerSignals(peerStudents, profile) {
    const peers = asArray(peerStudents)
      .map(normalizeProfile)
      .filter((student) => student.email !== profile.email && student.name !== profile.name);

    const similarPeers = peers.filter((student) => {
      const sameSchool = normalizeText(student.schoolName) && normalizeText(student.schoolName) === normalizeText(profile.schoolName);
      const sameInterest = student.interest === profile.interest;
      const closeGrade = student.schoolGradeNumber && profile.schoolGradeNumber ? Math.abs(student.schoolGradeNumber - profile.schoolGradeNumber) <= 1 : true;
      return (sameSchool && sameInterest) || (sameInterest && closeGrade);
    });

    const freq = new Map();
    const pushTokens = (value) => {
      for (const part of splitList(value)) {
        const token = normalizeText(part);
        if (!token || token.length < 3) continue;
        if (['the', 'and', 'for', 'with', 'club', 'team', 'clubs', 'school', 'high', 'high school'].includes(token)) continue;
        freq.set(token, (freq.get(token) || 0) + 1);
      }
    };

    for (const student of similarPeers) {
      pushTokens(student.careers);
      pushTokens(student.skills);
      pushTokens(student.extracurriculars);
      pushTokens(student.currentCourses);
      pushTokens(student.passionProjects);
    }

    const sortedTokens = [...freq.entries()]
      .sort((a, b) => b[1] - a[1])
      .slice(0, 8)
      .map(([token, count]) => ({ token, count }));

    const topActivities = sortedTokens.slice(0, 4).map((item) => item.token);
    const sampleSize = similarPeers.length;
    const schoolFocus = profile.schoolName
      ? `Among Mentorist students with a similar profile, the school-aware patterns lean toward ${topActivities.join(', ') || 'hands-on proof-of-work'}.`
      : `Students with similar interests tend to pair depth in ${profile.interest} with a proof-of-work project and one leadership activity.`;

    return {
      sampleSize,
      similarPeers,
      commonThemes: sortedTokens,
      topActivities,
      schoolFocus,
      summary: sampleSize
        ? `${sampleSize} similar student profiles were found. Common patterns: ${topActivities.slice(0, 3).join(', ')}.`
        : 'No strong peer cluster was found locally, so the recommendations rely more heavily on the school catalog and the interest playbook.'
    };
  }

  function buildJobs(profile, peerInsights = {}) {
    const playbook = getPlaybook(profile.interest);
    const jobs = rankItems(playbook.jobs, profile, peerInsights.topActivities || [], 4).map((job) => ({
      title: job.title,
      companies: asArray(job.companies),
      description: job.description,
      readiness: job.readiness || 'Ready now',
      why: job.why,
      salary: job.salary || '',
      howToBreakIn: job.howToBreakIn || '',
      skillsBuild: asArray(job.skillsBuild || job.skills || []),
      gradeMin: job.gradeMin || null
    }));

    return jobs;
  }

  function buildProjects(profile, peerInsights = {}) {
    const playbook = getPlaybook(profile.interest);
    const projects = rankItems(playbook.projects, profile, peerInsights.topActivities || [], 4).map((project) => ({
      name: project.name,
      description: project.description,
      why: project.why,
      time: project.time || '',
      difficulty: project.difficulty || 'Intermediate',
      skills: asArray(project.skills || []),
      portfolioValue: project.portfolioValue || 'High',
      gradeMin: project.gradeMin || null
    }));

    return projects;
  }

  function buildExtracurriculars(profile, peerInsights = {}) {
    const playbook = getPlaybook(profile.interest);
    const items = rankItems(playbook.extracurriculars, profile, peerInsights.topActivities || [], 4).map((item) => ({
      name: item.name,
      description: item.description,
      why: item.why,
      time: item.time || '',
      impact: item.impact || 'Medium'
    }));
    return items;
  }

  function buildTools(profile) {
    const playbook = getPlaybook(profile.interest);
    return rankItems(playbook.tools, profile, [], 4).map((tool) => ({
      name: tool.name,
      description: tool.description,
      why: tool.why,
      time: tool.time || '',
      resource: tool.resource || '',
      priority: tool.priority || 0
    }));
  }

  function buildGpaStrategy(profile, courseTracks, schoolCatalog = null) {
    const playbook = getPlaybook(profile.interest);
    const courseNames = new Set(courseTracks.gpaBoost.map((course) => normalizeText(course.name)));
    const extra = playbook.gpaCourses
      .filter((course) => !courseNames.has(normalizeText(course)))
      .slice(0, 3);

    const recommendations = [
      ...courseTracks.gpaBoost.slice(0, 3).map((course) => course.name),
      ...extra
    ].slice(0, 5);

    const caution = profile.workloadScore <= 1
      ? 'Keep the schedule manageable. One weighted core AP plus one interest course is usually smarter than overloading the semester.'
      : 'If your school weights AP and Honors courses, a small number of carefully chosen weighted core courses can raise your weighted GPA while still telling a focused story.';

    return {
      headline: 'GPA and rigor strategy',
      recommendations,
      caution,
      notes: profile.interest === 'stem'
        ? 'For a STEM student, AP Calculus AB, AP Statistics, AP English Language, and AP Physics 1 are the most common weighted-core moves.'
        : 'Choose weighted core classes that fit the story you want schools to read, not just the ones with the easiest reputation.'
    };
  }

  function buildTips(profile, schoolHints, peerInsights, courseTracks) {
    const playbook = getPlaybook(profile.interest);
    const tips = [...playbook.tips];
    if (schoolHints.length) tips.unshift(...schoolHints);
    if (peerInsights.sampleSize) {
      tips.unshift(`Local Mentorist peer data suggests that ${peerInsights.topActivities.slice(0, 3).join(', ')} are common winning patterns for students like you.`);
    }
    if (courseTracks.gpaBoost.length) {
      tips.push(`Weighted core AP options to keep in view: ${courseTracks.gpaBoost.slice(0, 3).map((course) => course.name).join(', ')}.`);
    }
    tips.push('One deep project, one leadership activity, and one clear course sequence is usually stronger than a scattered resume.');
    return uniqueBy(tips.filter(Boolean), (item) => normalizeText(item)).slice(0, 7);
  }

  function buildMentorQuestions(profile, courseTracks, peerInsights) {
    const questions = [];
    if (profile.schoolName) {
      questions.push(`At ${profile.schoolName}, which exact course sequence should I prioritize if I want to keep my GPA high and still show rigor?`);
    }
    if (profile.interest === 'stem') {
      questions.push('If I can only choose one technical lane right now, should I prioritize AP CS A, the cybersecurity track, or a research-style project?');
    }
    if (courseTracks.gpaBoost.length) {
      questions.push(`Which of these weighted core classes is the safest GPA play for me: ${courseTracks.gpaBoost.slice(0, 3).map((course) => course.name).join(', ')}?`);
    }
    if (peerInsights.sampleSize) {
      questions.push('What activities are the highest-signal proof-of-work for students with my profile at top colleges?');
    }
    return questions.slice(0, 4);
  }

  function buildSummary(profile, schoolContext, peerInsights) {
    const schoolPiece = profile.schoolName ? `at ${profile.schoolName}` : 'with your current school context';
    const gradePiece = profile.schoolGradeLabel || profile.schoolGrade || 'your current grade';
    const interestLabel = profile.interest === 'stem' ? 'computer science / STEM' : profile.interest;
    const peerPiece = peerInsights.sampleSize
      ? `We found ${peerInsights.sampleSize} similar student profiles and used them to sharpen the project and extracurricular advice.`
      : 'The recommendations rely mostly on your profile, school catalog clues, and the interest playbook.';
    return `For a ${gradePiece} ${interestLabel} student ${schoolPiece}, the strongest roadmap is to match the school catalog with a focused course sequence, one GPA-safe weighted core AP, one proof-of-work project, and one extracurricular that shows leadership. ${peerPiece}`;
  }

  function buildRoadmap(profile, courseTracks) {
    const now = courseTracks.now.slice(0, 3).map((course) => course.name);
    const next = courseTracks.next.slice(0, 3).map((course) => course.name);
    const stretch = courseTracks.stretch.slice(0, 3).map((course) => course.name);
    return {
      now,
      next,
      stretch
    };
  }

  function buildPracticalNextSteps(profile, bundle) {
    const interest = normalizeText(profile.interest || 'your area of interest');
    const gradeLabel = profile.schoolGradeLabel || profile.schoolGrade || 'your current grade';
    const schoolName = profile.schoolName || 'your school';
    const topCourse = bundle?.courses?.[0]?.name || null;
    const topProject = bundle?.projects?.[0]?.name || null;
    const topOpportunity = bundle?.jobs?.[0]?.title || null;
    const steps = [];

    if (topCourse) {
      steps.push(`Ask your counselor or academic advisor this week whether ${topCourse} is the best fit for ${gradeLabel.toLowerCase()} and whether it can be slotted in without hurting your GPA.`);
    }

    if (topProject) {
      steps.push(`Start a real first milestone for ${topProject} this week by outlining the first deliverable, deadline, and evidence you will show.`);
    }

    if (topOpportunity) {
      steps.push(`Send 3 targeted outreach messages this week for ${topOpportunity} opportunities or a professor/mentor contact in your field.`);
    }

    if (interest.includes('stem') || interest.includes('computer') || interest.includes('science')) {
      steps.push('Create one public artifact this week—a GitHub repo, portfolio page, or project demo—so your work is visible to mentors and colleges.');
    } else if (interest.includes('medicine') || interest.includes('health')) {
      steps.push('Document one concrete health or research experience this week, such as a lab observation, volunteer reflection, or short data analysis write-up.');
    } else if (interest.includes('business') || interest.includes('entrepreneur')) {
      steps.push('Write one short case study or pitch this week that shows how you solve a real problem for a customer, club, or local organization.');
    } else {
      steps.push(`Turn one interest into visible proof this week by sharing a sample, portfolio piece, or short write-up tied to ${schoolName}.`);
    }

    if (profile.targetColleges?.length) {
      steps.push(`Pick your top 2 target colleges from ${profile.targetColleges.slice(0, 2).join(' and ')} and note one specific program, professor, or opportunity to mention in a future essay.`);
    }

    return steps.slice(0, 5);
  }

  function buildActionableStrategyMarkdown(rawProfile, options = {}) {
    const bundle = buildRecommendationBundle(rawProfile, options);
    const profile = bundle.profile || {};
    const requestType = options.requestType || 'Your Strategy Plan';
    const userQuery = normalizeText(options.userQuery || '');
    const schoolName = profile.schoolName || 'your school';
    const hasSchool = !!profile.schoolName;
    const gradeLabel = profile.schoolGradeLabel || profile.schoolGrade || 'your current grade';
    const interest = profile.interest || 'your interests';
    const isCollege = /college|university|undergrad|freshman|sophomore|junior|senior/i.test(String(gradeLabel)) || profile.grade === 'college';

    const courseTracks = bundle.courseTracks || {};
    const courseNow = (courseTracks.now || []).slice(0, 3);
    const courseNext = (courseTracks.next || []).slice(0, 3);
    const courseStretch = (courseTracks.stretch || []).slice(0, 2);
    const gpaBoost = (courseTracks.gpaBoost || []).slice(0, 3);
    const jobs = (bundle.jobs || []).slice(0, 2);
    const projects = (bundle.projects || []).slice(0, 2);
    const gpa = bundle.gpaStrategy || {};
    const peers = bundle.peerPatterns || {};
    const mentorQs = (bundle.mentorQuestions && bundle.mentorQuestions.length ? bundle.mentorQuestions : [
      'Which of these options is most realistic for my schedule and GPA this semester?',
      'What single project would strengthen my application or resume fastest?',
      'Which opportunity should I pursue first for real, visible experience?'
    ]).slice(0, 4);
    const steps = (bundle.practicalNextSteps || []).slice(0, 3);
    const catalogNote = hasSchool
      ? `Recommendations are matched to ${schoolName}'s catalog where we could infer it; confirm exact titles and prerequisites with your counselor.`
      : `Add your school on your profile and we'll match these to its real course catalog.`;

    const courseLine = (c) => {
      const why = (c.reason || c.why || '').replace(/\s+/g, ' ').trim();
      const src = c.source === 'school catalog' ? ' _(from your school catalog)_' : '';
      return `**${c.name}**${src}${why ? ` — ${why}` : ''}`;
    };

    const L = [];
    L.push(`# ${requestType}`);
    L.push('');
    L.push(`**Your read:** For a ${String(gradeLabel).toLowerCase()} student focused on ${interest}${hasSchool ? ` at ${schoolName}` : ''}, the highest-leverage move is a focused "spike": one clear course sequence, one GPA-safe rigor pick, one proof-of-work project, and one real opportunity you start pursuing now — not a scattered résumé.`);
    if (userQuery) { L.push(''); L.push(`> Responding to: _${userQuery}_`); }
    L.push('');

    // ── Course plan ──
    L.push(isCollege ? '## Course & credential plan' : '## Your course plan');
    L.push('');
    if (courseNow.length) L.push(`**Take now:** ${courseNow.map(courseLine).join('  ·  ')}`);
    if (courseNext.length) { L.push(''); L.push(`**Line up next:** ${courseNext.map(courseLine).join('  ·  ')}`); }
    if (courseStretch.length) { L.push(''); L.push(`**Stretch (if the load is sustainable):** ${courseStretch.map((c) => `**${c.name}**`).join(', ')}`); }
    if (!courseNow.length && !courseNext.length) {
      L.push('Once your grade and interest are set, we build a term-by-term sequence here. For now, prioritize the most advanced course in your interest area that you can take without hurting your GPA.');
    }
    L.push('');
    L.push(`_${catalogNote}_`);
    L.push('');

    // ── GPA strategy ──
    L.push('## GPA & rigor strategy');
    L.push('');
    if (gpa.recommendations && gpa.recommendations.length) {
      L.push(`**Weighted-core picks that protect GPA:** ${gpa.recommendations.slice(0, 5).join(', ')}.`);
      L.push('');
    }
    if (gpa.caution) { L.push(`**Watch out:** ${gpa.caution}`); L.push(''); }
    if (gpa.notes) { L.push(gpa.notes); L.push(''); }

    // ── Opportunities ──
    if (jobs.length) {
      L.push(isCollege ? '## Internships & roles to target' : '## Opportunities to build toward');
      L.push('');
      jobs.forEach((j) => {
        L.push(`### ${j.title}${j.readiness ? ` · _${j.readiness}_` : ''}`);
        if (j.why || j.description) L.push(`${j.why || j.description}`);
        if (j.companies && j.companies.length) L.push(`- **Where to look:** ${j.companies.slice(0, 4).join(', ')}`);
        if (j.howToBreakIn) L.push(`- **How to break in:** ${j.howToBreakIn}`);
        if (j.skillsBuild && j.skillsBuild.length) L.push(`- **Skills you'll build:** ${j.skillsBuild.slice(0, 4).join(', ')}`);
        if (j.salary) L.push(`- **Typical range:** ${j.salary}`);
        L.push('');
      });
    }

    // ── Projects ──
    if (projects.length) {
      L.push('## Proof-of-work projects');
      L.push('');
      projects.forEach((p) => {
        const meta = [p.time ? `~${p.time}` : '', p.portfolioValue ? `${p.portfolioValue} portfolio value` : ''].filter(Boolean).join(' · ');
        L.push(`- **${p.name}**${meta ? ` _(${meta})_` : ''} — ${p.description || p.why || 'A visible artifact you can show mentors and colleges.'}`);
      });
      L.push('');
    }

    // ── Peer signal ──
    if (peers.sampleSize && peers.topActivities && peers.topActivities.length) {
      L.push('## What is working for students like you');
      L.push('');
      L.push(`Across ${peers.sampleSize} similar Mentorist profiles, the highest-signal moves are: ${peers.topActivities.slice(0, 4).join(', ')}. Aim to go deep on one of these rather than sampling all of them.`);
      L.push('');
    }

    // ── Roadmap ──
    L.push('## Roadmap');
    L.push('');
    L.push(`- **Now (this term):** ${courseNow.length ? courseNow.map((c) => c.name).join(', ') : 'lock your course sequence'} + start your top project.`);
    L.push(`- **Next (this year):** ${courseNext.length ? courseNext.map((c) => c.name).join(', ') : 'raise rigor where GPA allows'} + turn the project into a visible result.`);
    L.push(`- **Later:** pursue ${jobs[0] ? jobs[0].title.toLowerCase() : 'a real opportunity'} and connect it to ${profile.targetColleges && profile.targetColleges.length ? profile.targetColleges.slice(0, 2).join(' / ') : 'your target programs'}.`);
    L.push('');

    // ── This week ──
    L.push('## This Week');
    L.push('');
    const weekActions = steps.length ? steps : [
      `Confirm your top course with your counselor and check it won't hurt your GPA.`,
      `Outline the first milestone of your top project — deliverable, deadline, and the evidence you'll show.`,
      `Send 2–3 outreach messages toward ${jobs[0] ? jobs[0].title.toLowerCase() : 'a mentor or program'} in your field.`
    ];
    weekActions.slice(0, 3).forEach((s, i) => L.push(`${i + 1}. ${s}`));
    L.push('');

    // ── Mentor questions ──
    L.push('## Bring these to your mentor');
    L.push('');
    mentorQs.forEach((q) => L.push(`- ${q}`));

    return L.join('\n').trim();
  }

  function buildRecommendationBundle(rawProfile, options = {}) {
    const profile = normalizeProfile(rawProfile);
    const schoolCatalog = options.schoolCatalog || options.catalog || null;
    const peerInsights = aggregatePeerSignals(options.peerStudents || options.students || [], profile);
    const courseData = buildCourseRoadmap(profile, schoolCatalog);
    const playbook = getPlaybook(profile.interest);
    const jobs = buildJobs(profile, peerInsights);
    const projects = buildProjects(profile, peerInsights);
    const extracurriculars = buildExtracurriculars(profile, peerInsights);
    const tools = buildTools(profile);
    const gpaStrategy = buildGpaStrategy(profile, courseData.courseTracks, schoolCatalog);
    const tips = buildTips(profile, courseData.schoolSummary ? [courseData.schoolSummary] : [], peerInsights, courseData.courseTracks);
    const mentorQuestions = buildMentorQuestions(profile, courseData.courseTracks, peerInsights);
    const summary = buildSummary(profile, courseData, peerInsights);
    const roadmap = buildRoadmap(profile, courseData.courseTracks);
    const practicalNextSteps = buildPracticalNextSteps(profile, {
      courses: courseData.courses,
      projects,
      jobs,
      courseTracks: courseData.courseTracks
    });
    const schoolCatalogInfo = {
      found: !!(schoolCatalog && (schoolCatalog.courses || schoolCatalog.extractedCourses || schoolCatalog.items || []).length),
      name: schoolCatalog?.schoolName || profile.schoolName || '',
      sourceUrl: schoolCatalog?.sourceUrl || profile.schoolCatalogUrl || '',
      sourceType: schoolCatalog?.sourceType || 'playbook',
      confidence: schoolCatalog?.confidence || (schoolCatalog && (schoolCatalog.courses || schoolCatalog.extractedCourses || schoolCatalog.items || []).length ? 'high' : 'medium')
    };

    return {
      success: true,
      profile,
      schoolContext: {
        ...schoolCatalogInfo,
        summary: courseData.schoolSummary,
        notes: buildSchoolHints(profile),
        catalogCourseCount: courseData.schoolCatalogCount
      },
      courses: courseData.courses.map((course) => ({
        name: course.name,
        description: course.description,
        why: course.why,
        difficulty: course.difficulty,
        category: course.category,
        source: course.source,
        sourceUrl: course.sourceUrl || '',
        skills: course.skills || [],
        gpaBoost: !!course.gpaBoost,
        schoolSpecific: !!course.schoolSpecific
      })),
      courseTracks: courseData.courseTracks,
      roadmap,
      jobs,
      opportunities: jobs,
      projects,
      extracurriculars,
      tools,
      peerPatterns: {
        sampleSize: peerInsights.sampleSize,
        summary: peerInsights.summary,
        schoolFocus: peerInsights.schoolFocus,
        commonThemes: peerInsights.commonThemes,
        topActivities: peerInsights.topActivities
      },
      gpaStrategy,
      tips,
      mentorQuestions,
      practicalNextSteps,
      summary,
      generatedAt: new Date().toISOString(),
      playbookInterest: profile.interest
    };
  }

  return {
    PLAYBOOKS,
    normalizeProfile,
    buildRecommendationBundle,
    buildCourseRoadmap,
    buildJobs,
    buildProjects,
    buildExtracurriculars,
    buildTools,
    buildGpaStrategy,
    buildTips,
    buildActionableStrategyMarkdown,
    inferInterest,
    gradeToNumber,
    gradeLabel,
    escapeText,
    normalizeText,
    splitList
  };
});
