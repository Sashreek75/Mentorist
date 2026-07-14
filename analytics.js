// analytics.js
// Custom telemetry script to log user interactions and page views.

const Analytics = {
  endpoint: 'https://supabase.mentorist.local/rest/v1/telemetry', // Replace with real Supabase URL if provided later
  apiKey: 'YOUR_SUPABASE_ANON_KEY', // Replace with real anon key
  sessionID: crypto.randomUUID ? crypto.randomUUID() : Math.random().toString(36).substring(2),
  
  init() {
    this.trackPageview();
    this.setupClickTracking();
    window.addEventListener('popstate', () => this.trackPageview());
  },

  trackPageview() {
    this.logEvent('page_view', {
      url: window.location.href,
      path: window.location.pathname,
      title: document.title
    });
  },

  setupClickTracking() {
    document.addEventListener('click', (e) => {
      const target = e.target.closest('button, a');
      if (target) {
        const action = target.tagName.toLowerCase();
        const label = target.textContent.trim() || target.getAttribute('aria-label') || target.id || 'unlabeled';
        this.logEvent('click', { action, label });
      }
    });
  },

  logEvent(eventType, payload) {
    const data = {
      event_type: eventType,
      session_id: this.sessionID,
      payload: payload,
      timestamp: new Date().toISOString(),
      user_agent: navigator.userAgent
    };

    // Logging to console for the frontend verification
    console.log('[Analytics Event]', data);

    // In a real environment, this sends to Supabase
    /*
    fetch(this.endpoint, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'apikey': this.apiKey,
        'Authorization': `Bearer ${this.apiKey}`
      },
      body: JSON.stringify(data)
    }).catch(err => console.error('Analytics Error:', err));
    */
  }
};

document.addEventListener('DOMContentLoaded', () => {
  Analytics.init();
});
