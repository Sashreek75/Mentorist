/* ============================================================
   MENTORIST — shared animation layer
   Drop-in, framework-free motion for every page. Safe by design:
   - Everything is wrapped in try/catch and guarded for missing DOM.
   - Elements are only ever HIDDEN by JS (never by CSS alone), so if
     this script fails to run, content stays fully visible.
   - Fully respects prefers-reduced-motion.
   Include AFTER shared.js:  <script src="animations.js"></script>
   ============================================================ */
(function () {
  'use strict';

  var REDUCE = false;
  try { REDUCE = window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches; } catch (e) {}

  /* ---------- 1. Sticky navbar shrink/elevate on scroll ---------- */
  function initNavbarScroll() {
    var nav = document.querySelector('.navbar');
    if (!nav) return;
    var apply = function () { nav.classList.toggle('scrolled', window.scrollY > 60); };
    apply();
    window.addEventListener('scroll', apply, { passive: true });
  }

  /* ---------- 2. Scroll reveal with per-group stagger ---------- */
  var REVEAL_SELECTOR = [
    '.card', '.admin-card', '.feature-card', '.impact-card', '.aud-card', '.step',
    '.timeline-card', '.guide-card', '.review-card', '.v-card', '.dashboard-hero',
    '.engine', '.mentor-cta', '.mission', '.empty-state', '.stat-card', '.benefit',
    '.tip-item', '.rec-item', '.section-hd'
  ].join(',');

  // Handle the existing ".reveal -> .visible" CSS convention used by some pages.
  // Anything hidden or under reduced-motion is revealed immediately so it can
  // never get stuck invisible (these pages ship without their own observer).
  function initRevealClass() {
    var nodes = Array.prototype.slice.call(document.querySelectorAll('.reveal:not(.visible)'));
    if (!nodes.length) return;
    if (REDUCE || !('IntersectionObserver' in window)) {
      nodes.forEach(function (el) { el.classList.add('visible'); });
      return;
    }
    var io = new IntersectionObserver(function (entries) {
      entries.forEach(function (e) {
        if (e.isIntersecting) { e.target.classList.add('visible'); io.unobserve(e.target); }
      });
    }, { threshold: 0.06, rootMargin: '0px 0px -6% 0px' });
    nodes.forEach(function (el) {
      if (el.offsetParent === null) { el.classList.add('visible'); return; } // hidden -> show now
      io.observe(el);
    });
  }

  function initReveal() {
    var nodes = Array.prototype.slice.call(document.querySelectorAll(REVEAL_SELECTOR));
    // Only animate elements that are actually rendered right now. Skip anything
    // hidden (display:none) so conditionally-shown panels never get stuck invisible.
    // Skip elements already using the .reveal convention (handled above).
    nodes = nodes.filter(function (el) {
      if (el.classList.contains('reveal')) return false;
      if (el.offsetParent === null) return false;              // display:none / detached
      if (el.closest('.will-reveal')) return false;            // avoid nesting
      if (el.hasAttribute('data-no-anim')) return false;
      return true;
    });
    if (!nodes.length) return;

    if (REDUCE || !('IntersectionObserver' in window)) {
      nodes.forEach(function (el) { el.classList.add('will-reveal', 'revealed'); });
      return;
    }

    // Assign a small stagger delay based on order within the same parent.
    var counters = new Map();
    nodes.forEach(function (el) {
      var p = el.parentNode;
      var i = counters.get(p) || 0;
      counters.set(p, i + 1);
      el.classList.add('will-reveal');
      el.style.transitionDelay = Math.min(i * 0.07, 0.35) + 's';
    });

    var io = new IntersectionObserver(function (entries) {
      entries.forEach(function (e) {
        if (e.isIntersecting) {
          e.target.classList.add('revealed');
          io.unobserve(e.target);
          // Drop the delay after firing so hover transitions stay snappy.
          setTimeout(function () { e.target.style.transitionDelay = ''; }, 800);
        }
      });
    }, { threshold: 0.08, rootMargin: '0px 0px -8% 0px' });

    nodes.forEach(function (el) { io.observe(el); });
  }

  /* ---------- 3. Count-up for stat numbers (value-aware) ---------- */
  // Remembers the last value shown per label so periodic re-renders only
  // animate when the number actually changes (no distracting re-counting).
  var lastValues = Object.create(null);

  function labelFor(el) {
    if (el.dataset.countKey) return el.dataset.countKey;
    var sib = el.parentNode && el.parentNode.querySelector('.stat-label');
    return (sib && sib.textContent.trim()) || el.textContent.trim();
  }

  function animateNumber(el) {
    var raw = el.textContent.trim();
    var m = raw.match(/^(\D*?)(\d[\d,]*)(.*)$/);
    if (!m) return;
    var prefix = m[1], suffix = m[3];
    var target = parseInt(m[2].replace(/,/g, ''), 10);
    if (!isFinite(target) || target > 1000000) return;

    var key = labelFor(el);
    if (lastValues[key] === target) { el.dataset.counted = '1'; return; } // unchanged
    lastValues[key] = target;

    if (REDUCE) { el.dataset.counted = '1'; return; }

    el.dataset.counted = '1';
    var dur = 850, start = null;
    function step(ts) {
      if (start === null) start = ts;
      var t = Math.min(1, (ts - start) / dur);
      var eased = 1 - Math.pow(1 - t, 3);
      el.textContent = prefix + Math.round(target * eased).toLocaleString() + suffix;
      if (t < 1) requestAnimationFrame(step);
      else el.textContent = prefix + target.toLocaleString() + suffix;
    }
    requestAnimationFrame(step);
  }

  var countIO = null;
  function observeCounters() {
    var els = document.querySelectorAll('.stat-val:not([data-counted]), [data-count-up]:not([data-counted])');
    if (!els.length) return;
    if (REDUCE || !('IntersectionObserver' in window)) {
      els.forEach(function (el) { el.dataset.counted = '1'; });
      return;
    }
    if (!countIO) {
      countIO = new IntersectionObserver(function (entries) {
        entries.forEach(function (e) {
          if (e.isIntersecting) { animateNumber(e.target); countIO.unobserve(e.target); }
        });
      }, { threshold: 0.4 });
    }
    els.forEach(function (el) { countIO.observe(el); });
  }

  // Catch stat cards that are rendered/replaced after load (e.g. admin realtime).
  function watchDynamicCounters() {
    if (!('MutationObserver' in window)) return;
    var pending = null;
    var mo = new MutationObserver(function () {
      clearTimeout(pending);
      pending = setTimeout(observeCounters, 120);
    });
    mo.observe(document.body, { childList: true, subtree: true });
  }

  /* ---------- boot ---------- */
  function boot() {
    try { initNavbarScroll(); } catch (e) {}
    try { initRevealClass(); } catch (e) {}
    try { initReveal(); } catch (e) {}
    try { observeCounters(); watchDynamicCounters(); } catch (e) {}
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', boot);
  } else {
    boot();
  }

  // Expose a manual re-scan hook for pages that render content dynamically.
  window.MentoristAnim = {
    refresh: function () { try { initRevealClass(); initReveal(); observeCounters(); } catch (e) {} }
  };
})();
