#!/usr/bin/env node
/**
 * Offline test harness for the Mentorist recommendation core.
 * Validates that the bundle shape is rich enough for the dashboard and that
 * school-aware recommendations surface the expected course sequence.
 */

const Core = require('./recommendation-core.js');

const scenarios = [
  {
    name: 'STEM Student at Rouse High School',
    profile: {
      name: 'Alex Chen',
      email: 'alex@example.com',
      schoolName: 'Rouse High School',
      schoolLocation: 'Leander ISD, TX',
      schoolGrade: '10th grade',
      grade: 'highschool',
      interest: 'stem',
      workloadPreference: 'ambitious',
      goal: 'Get into MIT or Caltech for Computer Science',
      careers: 'Software Engineer at Google, Apple, or a startup founder',
      skills: 'Python, Java, algorithms, machine learning basics',
      currentCourses: 'AP CSP, Honors Algebra II, Biology, English II',
      extracurriculars: 'Robotics club, coding club',
      passionProjects: 'School scheduler, cyber lab journal'
    },
    schoolCatalog: {
      schoolName: 'Rouse High School',
      sourceUrl: 'https://example.com/rouse-course-catalog',
      sourceType: 'html',
      confidence: 'high',
      courses: [
        { name: 'AP Computer Science A', description: 'Object-oriented programming in Java', category: 'CS', gradeMin: 10, gpaBoost: false },
        { name: 'Cybersecurity', description: 'Network defense and digital security', category: 'CTE', gradeMin: 10, gpaBoost: false },
        { name: 'AP Calculus AB', description: 'Limits and derivatives', category: 'Math', gradeMin: 11, gpaBoost: true },
        { name: 'AP English Language and Composition', description: 'Rhetoric and writing', category: 'Core', gradeMin: 10, gpaBoost: true }
      ]
    }
  },
  {
    name: 'Ivy League Target (Freshman)',
    profile: {
      name: 'Michael Chang',
      email: 'mchang@example.com',
      schoolName: 'Public High School',
      schoolGrade: '9th grade',
      grade: 'highschool',
      interest: 'business',
      workloadPreference: 'ambitious',
      goal: 'Get into Wharton (UPenn) or Harvard',
      careers: 'Finance, Investment Banking, Startup Founder',
      skills: 'Debate, basic economics, leadership',
      currentCourses: 'Honors Bio, Honors Geometry, English 9',
      extracurriculars: 'Debate team, DECA, Student Council',
      targetColleges: 'UPenn, Harvard, Columbia'
    }
  },
  {
    name: 'Medicine-Focused Student',
    profile: {
      name: 'Emma Rodriguez',
      email: 'emma@example.com',
      schoolName: 'Central High School',
      schoolGrade: '11th grade',
      grade: 'highschool',
      interest: 'medicine',
      workloadPreference: 'balanced',
      goal: 'Get into a top pre-med program and become a doctor',
      careers: 'Physician, medical researcher, or surgeon',
      skills: 'Biology, chemistry, research fundamentals',
      currentCourses: 'AP Biology, Algebra II, English III',
      extracurriculars: 'Hospital volunteering, HOSA',
      passionProjects: 'Health education campaign'
    },
    schoolCatalog: {
      schoolName: 'Central High School',
      sourceUrl: 'https://example.com/central-course-catalog',
      sourceType: 'html',
      confidence: 'high',
      courses: [
        { name: 'AP Biology', description: 'Biology and genetics', category: 'Science', gradeMin: 10, gpaBoost: true },
        { name: 'AP Chemistry', description: 'Chemical systems and lab work', category: 'Science', gradeMin: 10, gpaBoost: true },
        { name: 'Anatomy and Physiology', description: 'Body systems', category: 'Science', gradeMin: 10, gpaBoost: false }
      ]
    }
  },
  {
    name: 'Arts Student',
    profile: {
      name: 'Sofia Williams',
      email: 'sofia@example.com',
      schoolName: 'Arts and Design Academy',
      schoolGrade: '11th grade',
      grade: 'highschool',
      interest: 'arts',
      workloadPreference: 'balanced',
      goal: 'Build a strong design portfolio for college',
      careers: 'UI/UX Designer, graphic designer, product designer',
      skills: 'Adobe Creative Suite, design thinking, web design',
      currentCourses: 'AP Art and Design, English III',
      extracurriculars: 'Art club, yearbook',
      passionProjects: 'Brand identity redesign'
    }
  }
];

function assert(condition, message) {
  if (!condition) {
    throw new Error(message);
  }
}

function validateBundle(bundle) {
  assert(bundle && bundle.success, 'Bundle should be successful');
  assert(Array.isArray(bundle.courses), 'Courses should be an array');
  assert(Array.isArray(bundle.jobs), 'Jobs should be an array');
  assert(Array.isArray(bundle.projects), 'Projects should be an array');
  assert(Array.isArray(bundle.tools), 'Tools should be an array');
  assert(Array.isArray(bundle.tips), 'Tips should be an array');
  assert(bundle.courses.length > 0, 'Courses should not be empty');
  assert(bundle.jobs.length > 0, 'Jobs should not be empty');
  assert(bundle.projects.length > 0, 'Projects should not be empty');
  assert(bundle.tools.length > 0, 'Tools should not be empty');
  assert(bundle.tips.length >= 4, 'Tips should include at least four items');
  assert(bundle.courseTracks && Array.isArray(bundle.courseTracks.now), 'Course tracks should exist');
  assert(bundle.gpaStrategy && Array.isArray(bundle.gpaStrategy.recommendations), 'GPA strategy should exist');
  assert(bundle.peerPatterns && typeof bundle.peerPatterns.summary === 'string', 'Peer pattern summary should exist');
  assert(bundle.summary && bundle.summary.length > 0, 'Summary should exist');
}

function printHighlights(bundle) {
  console.log(`  School: ${bundle.profile.schoolName || 'Unknown'}`);
  console.log(`  Grade: ${bundle.profile.schoolGrade || 'Unknown'} | Interest: ${bundle.profile.interest}`);
  console.log(`  Top course: ${bundle.courses[0]?.name || 'n/a'}`);
  console.log(`  Top opportunity: ${bundle.jobs[0]?.title || 'n/a'}`);
  console.log(`  Top project: ${bundle.projects[0]?.name || 'n/a'}`);
  console.log(`  Peer signal: ${bundle.peerPatterns.summary || 'n/a'}`);
}

function validateActionableMarkdown(bundle, scenario) {
  const markdown = Core.buildActionableStrategyMarkdown(scenario.profile, {
    schoolCatalog: scenario.schoolCatalog,
    peerStudents: scenarios.map((item) => item.profile),
    requestType: 'Course Recommendations'
  });

  assert(typeof markdown === 'string' && markdown.length > 220, 'Actionable markdown should be generated');
  assert(markdown.includes('This Week') || markdown.includes('this week'), 'Actionable markdown should include concrete weekly actions');
  assert(markdown.includes(bundle.courses[0]?.name || ''), 'Actionable markdown should mention the top recommended course');
  assert(markdown.includes(bundle.projects[0]?.name || ''), 'Actionable markdown should mention the top recommended project');
}

function runScenario(scenario) {
  console.log(`\n${'='.repeat(70)}`);
  console.log(`Scenario: ${scenario.name}`);
  console.log(`${'='.repeat(70)}`);

  const bundle = Core.buildRecommendationBundle(scenario.profile, {
    schoolCatalog: scenario.schoolCatalog,
    peerStudents: scenarios.map((item) => item.profile)
  });

  validateBundle(bundle);
  validateActionableMarkdown(bundle, scenario);
  printHighlights(bundle);

  if (scenario.name.includes('Rouse')) {
    const courseNames = bundle.courses.map((course) => course.name.toLowerCase()).join(' | ');
    assert(courseNames.includes('computer science a') || courseNames.includes('cybersecurity'), 'Rouse scenario should surface AP CSA or Cybersecurity');
  }
  
  if (scenario.name.includes('Ivy')) {
    const isIvy = (bundle.profile.targetColleges || []).some(c => String(c).includes('UPenn'));
    assert(isIvy, 'Profile target colleges should be parsed correctly');
  }

  console.log('  Validation: passed');
}

function main() {
  console.log('\nMentorist Recommendation Core Test Suite');
  console.log(`Testing ${scenarios.length} scenarios`);

  let failures = 0;
  for (const scenario of scenarios) {
    try {
      runScenario(scenario);
    } catch (error) {
      failures += 1;
      console.error(`  Failed: ${error.message}`);
    }
  }

  console.log(`\nSummary: ${scenarios.length - failures} passed, ${failures} failed`);
  process.exit(failures === 0 ? 0 : 1);
}

main();
