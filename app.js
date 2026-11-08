// Shared code for index.html and watch.html
(() => {
  const AUTH_KEY = 'pm_logged_in';

  const toast = (message) => {
    let el = document.querySelector('.toast');
    if (!el) { el = document.createElement('div'); el.className = 'toast'; el.setAttribute('role', 'status'); document.body.append(el); }
    el.textContent = message;
    el.classList.add('visible');
    clearTimeout(window.toastTimer);
    window.toastTimer = setTimeout(() => el.classList.remove('visible'), 1800);
  };

  const isLoggedIn = () => { try { return localStorage.getItem(AUTH_KEY) === '1'; } catch (e) { return false; } };
  const setLoggedIn = (v) => {
    try { v ? localStorage.setItem(AUTH_KEY, '1') : localStorage.removeItem(AUTH_KEY); } catch (e) {}
    renderAccount();
    document.dispatchEvent(new CustomEvent('pm:auth', { detail: { loggedIn: v } }));
  };

  const fmtDate = (d) => d.toLocaleDateString('en-US', { month: 'short', day: '2-digit', year: 'numeric' }) + ' At ' + d.toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit' });

  // ---- account label in header ----
  const accountLabel = document.querySelector('.account-copy small');
  const guestHTML = accountLabel ? accountLabel.innerHTML : '';
  function renderAccount() {
    if (!accountLabel) return;
    accountLabel.innerHTML = isLoggedIn() ? 'Signed in' : guestHTML;
    accountLabel.style.color = isLoggedIn() ? '#e10600' : '';
  }
  renderAccount();

  // ---- ticker: duplicate items for a seamless loop ----
  const track = document.querySelector('.ticker-track');
  if (track) track.querySelectorAll('.ticker-item').forEach((el) => { const c = el.cloneNode(true); c.setAttribute('aria-hidden', 'true'); c.tabIndex = -1; track.append(c); });

  // ---- theme toggle ----
  const themeBtn = document.querySelector('.theme-button');
  if (themeBtn) themeBtn.addEventListener('click', () => document.body.classList.toggle('dim'));

  // ---- brand goes home ----
  const brand = document.querySelector('.brand');
  if (brand) brand.addEventListener('click', () => { location.href = 'index.html'; });

  // ---- sports bar: scroll arrows, More toggle, active tab (index + watch) ----
  if (document.querySelector('.sports-nav')) {
      const sportsNav = document.querySelector('.sports-nav');
      const navPrev = document.querySelector('.nav-arrow.prev');
      const navNext = document.querySelector('.nav-arrow.next');
      const updateNavArrows = () => {
        const max = sportsNav.scrollWidth - sportsNav.clientWidth;
        navPrev.hidden = sportsNav.scrollLeft <= 2;
        navNext.hidden = sportsNav.scrollLeft >= max - 2;
      };
      navPrev.addEventListener('click', () => sportsNav.scrollBy({ left: -sportsNav.clientWidth * 0.6 }));
      navNext.addEventListener('click', () => sportsNav.scrollBy({ left: sportsNav.clientWidth * 0.6 }));
      sportsNav.addEventListener('scroll', updateNavArrows, { passive: true });
      window.addEventListener('resize', updateNavArrows);
      updateNavArrows();
      const morePill = document.querySelector('.more-pill');
      morePill.addEventListener('click', () => {
        const open = sportsNav.classList.toggle('expanded');
        morePill.setAttribute('aria-expanded', open);
        morePill.querySelector('.nav-label').textContent = open ? 'Less' : 'More';
      });
      document.querySelectorAll('.nav-pill:not(.more-pill)').forEach((button) => button.addEventListener('click', () => { document.querySelectorAll('.nav-pill:not(.more-pill)').forEach((item) => { item.classList.remove('active'); item.removeAttribute('aria-current'); }); button.classList.add('active'); button.setAttribute('aria-current', 'page'); }));
  }

  // ---- what match did the user click? ----
  const teamName = (el) => (el ? (el.lastChild && el.lastChild.nodeType === 3 ? el.lastChild.textContent : el.firstChild.textContent).trim() : '');
  const matchInfo = (btn) => {
    const info = { m: 'Live TV', l: 'All channels', d: '' };
    const card = btn.closest('.match-card, .featured, .up-card');
    if (card && card.matches('.match-card')) {
      const t = card.querySelectorAll('.mini-team');
      info.m = `${teamName(t[0])} vs ${teamName(t[1])}`;
      info.l = card.querySelector('.match-head span').textContent.replace(/^[^A-Za-z0-9]+/, '').trim();
    } else if (card && card.matches('.featured')) {
      const t = card.querySelectorAll('.team');
      info.m = `${teamName(t[0])} vs ${teamName(t[1])}`;
      info.l = teamName(card.querySelector('.league'));
    } else if (card) {
      info.m = btn.dataset.remind || info.m;
      info.l = card.querySelector('.up-league strong').textContent;
      info.d = card.querySelector('.up-league span').textContent;
    } else if (btn.matches('.ticker-item')) {
      info.m = (btn.dataset.toast || '').replace(/^Opening\s+/, '') || info.m;
      info.l = btn.querySelector('.ticker-status').textContent === 'FT' ? 'Replay' : 'Live';
    } else if (btn.matches('.trend-item')) {
      info.m = btn.querySelector('.trend-name').textContent;
      info.l = info.m;
    } else if (btn.dataset.toast && / vs /.test(btn.dataset.toast)) {
      info.m = btn.dataset.toast.replace(/^Opening\s+/, '');
    }
    return info;
  };
  const goWatch = (btn) => {
    const q = new URLSearchParams(Object.entries(matchInfo(btn)).filter(([, v]) => v));
    location.href = `watch.html?${q}`;
  };

  // ---- click gate ----
  // UI-only controls that never need sign-in
  const FREE = '.nav-arrow, .nav-pill, .date-tabs button, .theme-button, .language-button, .menu-button, .brand, .account-button, .signin-btn, .signin-alt button, .live-view button, .pm-sidebar button, .site-footer button';
  // Buttons that open a stream (go to the watch page even when signed in)
  const WATCH = '.watch-btn, .card-action, .ticker-item, .floating';
  document.addEventListener('click', (e) => {
    const btn = e.target.closest('button');
    if (!btn || btn.matches(FREE)) return;
    if (isLoggedIn() && !btn.matches(WATCH)) return; // signed in: normal behaviour
    e.preventDefault();
    e.stopPropagation();
    goWatch(btn);
  }, true); // capture phase: runs before each button's own handler

  // ---- profile button: sign out / go sign in ----
  const account = document.querySelector('.account-button');
  if (account) account.addEventListener('click', () => {
    if (isLoggedIn()) { setLoggedIn(false); toast('Signed out'); }
    else location.href = 'watch.html';
  });


  // ---- footer: year, email form, placeholder links ----
  document.querySelectorAll('.footer-year').forEach((el) => { el.textContent = new Date().getFullYear(); });
  document.querySelectorAll('.footer-form').forEach((form) => form.addEventListener('submit', (e) => {
    e.preventDefault();
    const input = form.querySelector('input');
    const err = form.querySelector('.footer-form-error');
    const ok = /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(input.value.trim());
    err.hidden = ok;
    input.setAttribute('aria-invalid', !ok);
    if (!ok) { input.focus(); return; }
    input.value = '';
    toast('Thanks! We\'ll send you match reminders.');
  }));
  document.addEventListener('click', (e) => {
    const a = e.target.closest('a[data-soon]');
    if (!a) return;
    e.preventDefault();
    toast(`${a.getAttribute('aria-label') || a.textContent.trim()} — coming soon`);
  });

  window.PM = { toast, isLoggedIn, setLoggedIn, fmtDate };
  window.showToast = toast; // used by index.html handlers
})();
