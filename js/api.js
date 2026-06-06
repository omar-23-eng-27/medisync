/**
 * MediSync API client — shared across all pages.
 * Sets API_URL to the backend. Change for production deployment.
 */

const API_URL = window.MEDISYNC_API_URL || 'http://localhost:3001';

const TOKEN_KEY = 'medisync_token';
const USER_KEY  = 'medisync_user';

const api = {
  // ── Token management ────────────────────────────────────────────────────
  getToken()       { return localStorage.getItem(TOKEN_KEY); },
  setToken(t)      { localStorage.setItem(TOKEN_KEY, t); },
  getUser()        { try { return JSON.parse(localStorage.getItem(USER_KEY)); } catch { return null; } },
  setUser(u)       { localStorage.setItem(USER_KEY, JSON.stringify(u)); },
  clearSession()   { localStorage.removeItem(TOKEN_KEY); localStorage.removeItem(USER_KEY); },
  isAuthenticated(){ return !!this.getToken(); },

  /** Redirect to login.html if not authenticated. Call at top of every app page. */
  requireAuth() {
    if (!this.isAuthenticated()) {
      window.location.href = 'login.html';
    }
  },

  // ── Core fetch wrapper ───────────────────────────────────────────────────
  async request(endpoint, options = {}) {
    const token = this.getToken();
    const headers = {
      'Content-Type': 'application/json',
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
      ...options.headers,
    };

    let response;
    try {
      response = await fetch(`${API_URL}${endpoint}`, { ...options, headers });
    } catch {
      throw new Error('Cannot reach the MediSync server. Is it running?');
    }

    if (response.status === 401) {
      this.clearSession();
      window.location.href = 'login.html';
      return;
    }

    const data = await response.json().catch(() => ({}));

    if (!response.ok) {
      throw new Error(data.error || `Request failed (${response.status})`);
    }

    return data;
  },

  get(endpoint)         { return this.request(endpoint, { method: 'GET' }); },
  post(endpoint, body)  { return this.request(endpoint, { method: 'POST',  body: JSON.stringify(body) }); },
  put(endpoint, body)   { return this.request(endpoint, { method: 'PUT',   body: JSON.stringify(body) }); },
  del(endpoint)         { return this.request(endpoint, { method: 'DELETE' }); },

  // ── Auth helpers ────────────────────────────────────────────────────────
  async login(email, password) {
    const data = await this.post('/api/auth/login', { email, password });
    this.setToken(data.token);
    this.setUser(data.user);
    return data;
  },

  async register(name, email, password, specialization, referralCode) {
    const data = await this.post('/api/auth/register', {
      name, email, password,
      ...(specialization ? { specialization } : {}),
      ...(referralCode   ? { referralCode }   : {}),
    });
    this.setToken(data.token);
    this.setUser(data.user);
    return data;
  },

  logout() {
    this.clearSession();
    window.location.href = 'login.html';
  },

  // ── Convenience domain calls ─────────────────────────────────────────────
  getDashboard()                  { return this.get('/api/dashboard'); },
  getUpcomingShifts()             { return this.get('/api/shifts/upcoming'); },
  getMarketplace(params = {})     {
    const qs = new URLSearchParams(params).toString();
    return this.get(`/api/shifts/marketplace${qs ? '?' + qs : ''}`);
  },
  claimShift(id)                  { return this.post(`/api/shifts/${id}/claim`); },
  clockIn(id)                     { return this.post(`/api/shifts/${id}/clock-in`); },
  clockOut(id)                    { return this.post(`/api/shifts/${id}/clock-out`); },
  getReferrals()                  { return this.get('/api/referrals'); },
  submitReferral(name, email, specialization) {
    return this.post('/api/referrals', { name, email, specialization });
  },
  redeemPoints(points)            { return this.post('/api/referrals/redeem', { points }); },
  getProfile()                    { return this.get('/api/profile'); },
  updateProfile(data)             { return this.put('/api/profile', data); },
  getLeaderboard()                { return this.get('/api/profile/leaderboard'); },
};

// ── Shared UI utilities ─────────────────────────────────────────────────────

/** Format a date/time string into "2:30 PM" */
function fmtTime(iso) {
  return new Date(iso).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
}

/** Format a date to "Mon, Sep 17" */
function fmtDate(iso) {
  return new Date(iso).toLocaleDateString([], { weekday: 'short', month: 'short', day: 'numeric' });
}

/** Relative time: "2 hours ago", "Yesterday" */
function fmtRelative(iso) {
  const diff = Date.now() - new Date(iso).getTime();
  const mins = Math.floor(diff / 60000);
  if (mins < 60)   return `${mins} min ago`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24)    return `${hrs} hour${hrs > 1 ? 's' : ''} ago`;
  const days = Math.floor(hrs / 24);
  if (days === 1)  return 'Yesterday';
  return `${days} days ago`;
}

/** Duration between two ISO strings as "Xh" */
function fmtDuration(start, end) {
  const h = Math.abs(new Date(end) - new Date(start)) / 3_600_000;
  return `${Math.round(h)}h`;
}

/** Activity reason → human label */
function activityLabel(reason, meta) {
  const map = {
    'shift-completed':  `Shift completed${meta?.title ? ` · ${meta.title}` : ''}`,
    'referral-bonus':   `Referral bonus${meta?.refereeName ? ` · ${meta.refereeName}` : ''}`,
    'rating-bonus':     '5-star rating received',
    'signup-bonus':     'Welcome bonus',
    'survey':           'Pulse survey completed',
    'redemption':       `Redeemed $${meta?.cashValue ?? ''}`,
  };
  return map[reason] || reason;
}

/** Activity reason → Material icon name */
function activityIcon(reason) {
  const map = {
    'shift-completed': 'check_circle',
    'referral-bonus':  'card_giftcard',
    'rating-bonus':    'stars',
    'signup-bonus':    'celebration',
    'survey':          'bolt',
    'redemption':      'redeem',
  };
  return map[reason] || 'info';
}

/** Show a temporary toast notification */
function showToast(message, type = 'success') {
  let container = document.getElementById('toast-container');
  if (!container) {
    container = document.createElement('div');
    container.id = 'toast-container';
    container.style.cssText = 'position:fixed;top:76px;right:16px;z-index:9999;display:flex;flex-direction:column;gap:8px;';
    document.body.appendChild(container);
  }
  const toast = document.createElement('div');
  const bg = type === 'error' ? '#ba1a1a' : '#5e0084';
  toast.style.cssText = `background:${bg};color:#fff;padding:12px 18px;border-radius:12px;font-size:13px;font-weight:600;box-shadow:0 4px 16px rgba(0,0,0,0.15);animation:slideIn 0.25s ease;max-width:300px;`;
  toast.textContent = message;
  container.appendChild(toast);
  setTimeout(() => { toast.remove(); }, 3500);
}

// Inject slideIn keyframe once
(function() {
  const style = document.createElement('style');
  style.textContent = '@keyframes slideIn{from{opacity:0;transform:translateX(20px)}to{opacity:1;transform:translateX(0)}}';
  document.head.appendChild(style);
})();
