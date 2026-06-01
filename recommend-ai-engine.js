/**
 * Mentorist recommendation engine helpers.
 * This module now uses the shared recommendation core instead of a provider-specific SDK.
 */

const Core = require('./recommendation-core.js');

function generateRecommendations(studentProfile, options = {}) {
  return Promise.resolve(Core.buildRecommendationBundle(studentProfile, options));
}

function getCoursesBySchool(schoolName, interest = 'undecided') {
  const profile = Core.normalizeProfile({
    schoolName,
    interest,
    grade: 'highschool',
    schoolGrade: '10'
  });
  return Promise.resolve(Core.buildRecommendationBundle(profile).courses);
}

function findJobOpportunities(interest = 'undecided', grade = '10') {
  const profile = Core.normalizeProfile({
    interest,
    grade: 'highschool',
    schoolGrade: grade
  });
  return Promise.resolve(Core.buildRecommendationBundle(profile).jobs);
}

function getToolsAndProjects(interest = 'undecided', goal = '', skillLevel = 'beginner') {
  const profile = Core.normalizeProfile({
    interest,
    goal,
    workloadPreference: skillLevel === 'advanced' ? 'ambitious' : 'balanced',
    grade: 'highschool',
    schoolGrade: '10'
  });

  const bundle = Core.buildRecommendationBundle(profile);
  return Promise.resolve({
    tools: bundle.tools,
    projects: bundle.projects
  });
}

module.exports = {
  generateRecommendations,
  getCoursesBySchool,
  findJobOpportunities,
  getToolsAndProjects
};
