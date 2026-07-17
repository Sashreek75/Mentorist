/* POST /api/feedback — accepts thumbs up/down + notes on a recommendation.
   Best-effort: acknowledges immediately so the UI never blocks. */

const { readJsonBody, applyCors } = require('./_body.js');

module.exports = async (req, res) => {
  applyCors(req, res);
  if (req.method === 'OPTIONS') { res.status(204).end(); return; }
  if (req.method !== 'POST') { res.status(405).json({ success: false, error: 'Method not allowed' }); return; }
  try {
    await readJsonBody(req); // captured for future persistence
    res.status(200).json({ success: true });
  } catch {
    res.status(200).json({ success: true });
  }
};
