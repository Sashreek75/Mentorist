require('dotenv').config();
const { RecommendationEngine } = require('./recommendations.js');
const Core = require('./recommendation-core.js');
// Mock window and document since recommendations.js checks for them
global.window = {
  __MN_GEMINI_KEY__: process.env.GEMINI_API_KEY,
  location: { protocol: 'https:', hostname: 'mentorist.org' }
};
global.document = { addEventListener: () => {} };

const testProfile = {
  name: 'Jessica Lee',
  email: 'jessica@example.com',
  schoolName: 'Westwood High School',
  grade: 'highschool',
  schoolGrade: '11th grade',
  interest: 'STEM',
  workloadPreference: 'ambitious',
  goal: 'Get into MIT or Stanford for CS',
  currentCourses: ['AP Calculus BC', 'AP Physics C', 'AP Lang'],
  extracurriculars: ['Robotics (Captain)', 'Math Team', 'Piano'],
  targetColleges: ['MIT', 'Stanford', 'CMU']
};

async function runLiveTest() {
  console.log('Testing browser-direct Gemini API integration...');
  console.log('Using API Key ending in:', process.env.GEMINI_API_KEY ? process.env.GEMINI_API_KEY.slice(-4) : 'NONE');
  
  if (!process.env.GEMINI_API_KEY) {
    console.error('Skipping: GEMINI_API_KEY not found in .env');
    return;
  }

  try {
    const onStatus = (msg) => console.log('  Status Update:', msg);
    
    const startTime = Date.now();
    const result = await RecommendationEngine.getInteractiveRecommendations(
      testProfile,
      'Ivy League Admissions',
      'I have strong STEM stats but feel my extracurriculars are too generic. What should I do this summer?',
      onStatus
    );
    
    console.log(`\nResponse received in ${((Date.now() - startTime) / 1000).toFixed(1)}s`);
    console.log('Success:', !!result.markdown);
    console.log('Source:', result.source);
    console.log('Fallback used:', result.fallback === true);
    console.log(`Length: ${result.markdown?.length} characters`);
    
    console.log('ACTUAL RESPONSE:', result.markdown);
if (result.markdown && result.markdown.length > 300) {
      console.log('\nResponse Snippet:');
      console.log(result.markdown.slice(0, 300) + '...\n');
      
      const mdLower = result.markdown.toLowerCase();
      const mentionsIvy = mdLower.includes('spike') || mdLower.includes('mit') || mdLower.includes('stanford');
      console.log('Mentions Ivy/Spike concepts:', mentionsIvy);
      
      if (mentionsIvy) {
        console.log('\n✅ Live API test PASSED');
        process.exit(0);
      } else {
        console.error('\n❌ Live API test FAILED (Response lacked Ivy context)');
        process.exit(1);
      }
    } else {
      console.error('\n❌ Live API test FAILED (Response too short or missing)');
      process.exit(1);
    }
  } catch (error) {
    console.error('\n❌ Live API test FAILED with error:');
    console.error(error);
    process.exit(1);
  }
}

runLiveTest();
