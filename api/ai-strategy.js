/* POST /api/ai-strategy
   Body: { profile, requestType, userQuery, systemPrompt }
   Returns: { text } (the frontend reads data.text / data.markdown)

   The Gemini key lives ONLY in the GEMINI_API_KEY environment variable set in
   the Vercel dashboard — never in client code. */

const { generateStrategy } = require('../ai-lib.js');
const { readJsonBody, applyCors } = require('./_body.js');

module.exports = async (req, res) => {
  applyCors(req, res);
  if (req.method === 'OPTIONS') { res.status(204).end(); return; }
  if (req.method !== 'POST') { res.status(405).json({ success: false, error: 'Method not allowed' }); return; }

  const apiKey = process.env.GEMINI_API_KEY || process.env.MENTORIST_GEMINI_KEY || '';
  if (!apiKey) {
    res.status(503).json({ success: false, error: 'AI is not configured. Set GEMINI_API_KEY in Vercel.' });
    return;
  }

  try {
    const { profile, requestType, userQuery, systemPrompt } = await readJsonBody(req);
    const { text, model, grounded } = await generateStrategy({
      profile: profile || {},
      requestType,
      userQuery,
      systemPrompt,
      apiKey,
      model: process.env.GEMINI_MODEL,
      supabaseUrl: process.env.SUPABASE_URL,
      supabaseKey: process.env.SUPABASE_ANON_KEY || process.env.SUPABASE_KEY
    });
    res.status(200).json({ success: true, text, source: 'api-proxy', model, grounded });
  } catch (error) {
    const code = error?.statusCode || 500;
    res.status(code).json({ success: false, error: error?.message || 'AI request failed' });
  }
};
