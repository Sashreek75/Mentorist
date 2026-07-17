/* POST /api/recommend
   Body: a student profile object.
   Returns: { success, data } — the offline-quality structured bundle
   (courses, opportunities, roadmap, GPA strategy, etc.). Works with no
   network / no AI key, so it is a reliable baseline path. */

const core = require('../recommendation-core.js');
const { readJsonBody, applyCors } = require('./_body.js');

module.exports = async (req, res) => {
  applyCors(req, res);
  if (req.method === 'OPTIONS') { res.status(204).end(); return; }
  if (req.method !== 'POST') { res.status(405).json({ success: false, error: 'Method not allowed' }); return; }

  try {
    const profile = await readJsonBody(req);
    const data = core.buildRecommendationBundle(profile || {}, {});
    res.status(200).json({ success: true, data });
  } catch (error) {
    res.status(500).json({ success: false, error: error?.message || 'Recommendation failed' });
  }
};
