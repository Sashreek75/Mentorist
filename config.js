/* ============================================================
   MENTORIST — runtime config
   Single source of truth for the deployed AI strategy server.

   The AI engine is served by the Vercel serverless functions in /api
   (same origin as the site). GEMINI_API_KEY must be set in the Vercel
   project's Environment Variables (Settings -> Environment Variables) —
   never in client code.

   AI_SERVER points at the deployment so the engine also works when a page
   is opened from file://. On the live site it resolves same-origin.
   ============================================================ */
(function () {
  var AI_SERVER = 'https://mentorist-website.vercel.app';
  if (AI_SERVER && AI_SERVER.indexOf('REPLACE-WITH') === -1) {
    window.__MENTORIST_RECOMMEND_API__ = AI_SERVER.replace(/\/+$/, '');
  }
})();
