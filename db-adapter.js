/**
 * ═══════════════════════════════════════════════════════════
 *  SLM FORGE — Database Adapter Layer  v1.0
 *  Plug-and-play: swap DB without touching app code.
 *
 *  HOW TO SWITCH:
 *    In config.js set:  DB_ADAPTER = 'gsheets'     (default demo)
 *                       DB_ADAPTER = 'supabase'
 *                       DB_ADAPTER = 'airtable'
 *                       DB_ADAPTER = 'rest'         (any REST API)
 *                       DB_ADAPTER = 'local'        (localStorage only)
 * ═══════════════════════════════════════════════════════════
 */

// ── UNIFIED CONFIG ───────────────────────────────────────
const SLM_CONFIG = {
  // ── Active adapter ──
  DB_ADAPTER: 'gsheets',    // 'gsheets' | 'supabase' | 'airtable' | 'rest' | 'local'

  // ── Google Sheets (demo default) ──
  GAS_URL: 'https://script.google.com/macros/s/AKfycbyGqUE3c7AV8c3sGB6t8LkzAjvv11dVtptV4KO3I756giB3g4Gqx6VX7-Mn0pq7AzKTpw/exec',

  // ── Supabase (enterprise option) ──
  // Uncomment and fill these to switch to Supabase:
  // DB_ADAPTER: 'supabase',
  // SUPABASE_URL: 'https://your-project.supabase.co',
  // SUPABASE_ANON_KEY: 'your-anon-key',

  // ── Airtable (no-code option) ──
  // DB_ADAPTER: 'airtable',
  // AIRTABLE_TOKEN: 'your-personal-access-token',
  // AIRTABLE_BASE: 'appXXXXXXXXXXXXXX',

  // ── Generic REST API ──
  // DB_ADAPTER: 'rest',
  // REST_BASE_URL: 'https://api.yourcompany.com/slmforge',
  // REST_API_KEY: 'your-api-key',

  // ── Super Admins — always works, no DB needed ──
  // Password is stored as btoa(password) — change these immediately after setup
  SUPER_ADMINS: [
    {
      email:    'venkateshvelamuri5@gmail.com',
      name:     'Venkatesh Velamuri',
      passHash: btoa('Admin@SLMForge2025'),   // change this
    },
    {
      email:    'admin@slmforge.com',          // bypass admin — always works
      name:     'SLM Forge Admin',
      passHash: btoa('SLMForge@Admin2025'),    // change this
    },
  ],

  // App version
  VERSION: '4.0.0',
};

// ═══════════════════════════════════════════════════════════
//  ADAPTER INTERFACE
//  All adapters implement: login, register, getProfiles,
//  publishProfile, assignProfile, getLicenses, grantLicense,
//  revokeLicense, getPending, approvePending, write
// ═══════════════════════════════════════════════════════════

class DBAdapter {
  // Override in subclass
  async login(email, passHash, app)      { throw new Error('Not implemented'); }
  async register(email, passHash, name, org) { throw new Error('Not implemented'); }
  async getProfiles(email, role)         { throw new Error('Not implemented'); }
  async publishProfile(profile)          { throw new Error('Not implemented'); }
  async assignProfile(profileId, emails) { throw new Error('Not implemented'); }
  async getLicenses()                    { throw new Error('Not implemented'); }
  async grantLicense(data)               { throw new Error('Not implemented'); }
  async revokeLicense(email)             { throw new Error('Not implemented'); }
  async getPending()                     { throw new Error('Not implemented'); }
  async approvePending(email, role, appAccess) { throw new Error('Not implemented'); }
  async write(collection, data)          { throw new Error('Not implemented'); }
}

// ═══════════════════════════════════════════════════════════
//  GOOGLE SHEETS ADAPTER (default — demo ready)
// ═══════════════════════════════════════════════════════════
class GoogleSheetsAdapter extends DBAdapter {
  constructor(gasUrl) {
    super();
    this.url = gasUrl;
  }

  async _get(params) {
    try {
      const r = await fetch(this.url + '?' + new URLSearchParams(params), { mode: 'cors' });
      if (r.ok) return r.json();
    } catch(e) { console.warn('[GSheets GET]', e.message); }
    return null;
  }

  async _post(payload) {
    try {
      const r = await fetch(this.url, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });
      if (r.ok) return r.json();
    } catch(e) {
      // Fallback no-cors fire-and-forget
      try { await fetch(this.url, { method:'POST', mode:'no-cors', headers:{'Content-Type':'application/json'}, body: JSON.stringify(payload) }); } catch(e2) {}
    }
    return null;
  }

  async login(email, passHash, app) {
    return this._get({ action:'login', email, password:passHash, app });
  }

  async register(email, passHash, name, org) {
    return this._post({ action:'register', email, password:passHash, name, org });
  }

  async getProfiles(email, role) {
    return this._get({ action:'getProfiles', email, role });
  }

  async publishProfile(profile) {
    return this._post({ action:'publishProfile', ...profile });
  }

  async assignProfile(profileId, emails, assignedBy) {
    return this._post({ action:'assignProfile', profileId, userEmails: emails, assignedBy });
  }

  async getLicenses(requester) {
    return this._get({ action:'getLicenses', requester });
  }

  async grantLicense(data) {
    return this._post({ action:'grantLicense', ...data });
  }

  async revokeLicense(email, revokedBy) {
    return this._post({ action:'revokeLicense', email, revokedBy });
  }

  async getPending() {
    return this._get({ action:'getPending' });
  }

  async approvePending(email, role, appAccess, approvedBy) {
    return this._post({ action:'approvePending', email, role, appAccess, approvedBy });
  }

  async write(collection, data) {
    return this._post({ action:'write', sheet: collection, row: data });
  }
}

// ═══════════════════════════════════════════════════════════
//  SUPABASE ADAPTER (enterprise PostgreSQL)
// ═══════════════════════════════════════════════════════════
class SupabaseAdapter extends DBAdapter {
  constructor(url, key) {
    super();
    this.url = url;
    this.key = key;
    this.headers = {
      'Content-Type': 'application/json',
      'apikey': key,
      'Authorization': 'Bearer ' + key,
    };
  }

  async _query(table, params = {}) {
    try {
      const qs = Object.entries(params).map(([k,v])=>`${k}=${encodeURIComponent(v)}`).join('&');
      const r = await fetch(`${this.url}/rest/v1/${table}?${qs}`, { headers: this.headers });
      if (r.ok) return r.json();
    } catch(e) { console.warn('[Supabase]', e.message); }
    return null;
  }

  async _upsert(table, data) {
    try {
      const r = await fetch(`${this.url}/rest/v1/${table}`, {
        method: 'POST',
        headers: { ...this.headers, 'Prefer': 'resolution=merge-duplicates' },
        body: JSON.stringify(data),
      });
      if (r.ok) return r.json();
    } catch(e) { console.warn('[Supabase upsert]', e.message); }
    return null;
  }

  async login(email, passHash, app) {
    const rows = await this._query('users', { email: `eq.${email}` });
    if (!rows?.length) return { success:false, error:'No account found.' };
    const user = rows[0];
    if (user.password_hash !== passHash) return { success:false, error:'Incorrect password.' };
    // Check license
    const lic = await this._query('licenses', { email: `eq.${email}`, status: 'eq.active' });
    if (!lic?.length) return { success:false, error:'No active license.' };
    const license = lic[0];
    if (!license.app_access.includes(app) && app !== 'forge') return { success:false, error:`No ${app} access.` };
    // Update last login
    await fetch(`${this.url}/rest/v1/users?email=eq.${email}`, { method:'PATCH', headers:this.headers, body: JSON.stringify({ last_login: new Date().toISOString() }) });
    return { success:true, name:user.name, org:user.org, role:user.role, appAccess: license.app_access.split(',') };
  }

  async register(email, passHash, name, org) {
    const exists = await this._query('users', { email: `eq.${email}` });
    if (exists?.length) return { success:false, error:'Account already exists.' };
    await this._upsert('users', { email, name, org, password_hash:passHash, role:'user', created_at: new Date().toISOString() });
    await this._upsert('pending_registrations', { email, name, org, registered_at: new Date().toISOString(), status:'pending' });
    return { success:true, pending:true };
  }

  async getProfiles(email, role) {
    const rows = await this._query('slm_profiles', { status: 'eq.published' });
    if (!rows) return { profiles:[] };
    if (role === 'admin' || role === 'developer') return { profiles: rows };
    // Filter by access control
    const ac = await this._query('access_control', { user_email: `eq.${email}` });
    const ids = new Set((ac||[]).map(r=>r.profile_id));
    return { profiles: rows.filter(p => ids.has(p.id)) };
  }

  async publishProfile(profile) {
    await this._upsert('slm_profiles', { ...profile, status:'published', published_at: new Date().toISOString() });
    return { success:true };
  }

  async getLicenses() {
    const rows = await this._query('licenses');
    return { licenses: rows || [] };
  }

  async grantLicense(data) {
    await this._upsert('licenses', { ...data, status:'active', granted_at: new Date().toISOString() });
    return { success:true };
  }

  async revokeLicense(email) {
    await fetch(`${this.url}/rest/v1/licenses?email=eq.${email}`, { method:'PATCH', headers:this.headers, body: JSON.stringify({ status:'revoked' }) });
    return { success:true };
  }

  async getPending() {
    const rows = await this._query('pending_registrations', { status: 'eq.pending' });
    return { pending: rows || [] };
  }

  async write(collection, data) {
    await this._upsert(collection, Array.isArray(data) ? Object.fromEntries(data.map((v,i)=>['col'+i,v])) : data);
    return { success:true };
  }
}

// ═══════════════════════════════════════════════════════════
//  AIRTABLE ADAPTER
// ═══════════════════════════════════════════════════════════
class AirtableAdapter extends DBAdapter {
  constructor(token, baseId) {
    super();
    this.token  = token;
    this.baseId = baseId;
    this.url    = `https://api.airtable.com/v0/${baseId}`;
    this.headers = { 'Authorization': 'Bearer ' + token, 'Content-Type': 'application/json' };
  }

  async _list(table, filter = '') {
    try {
      const qs = filter ? '?filterByFormula='+encodeURIComponent(filter) : '';
      const r = await fetch(`${this.url}/${encodeURIComponent(table)}${qs}`, { headers: this.headers });
      if (r.ok) { const d = await r.json(); return d.records.map(rec => rec.fields); }
    } catch(e) { console.warn('[Airtable]', e.message); }
    return [];
  }

  async _create(table, fields) {
    try {
      const r = await fetch(`${this.url}/${encodeURIComponent(table)}`, {
        method: 'POST', headers: this.headers, body: JSON.stringify({ fields }),
      });
      if (r.ok) return r.json();
    } catch(e) { console.warn('[Airtable create]', e.message); }
    return null;
  }

  async login(email, passHash, app) {
    const rows = await this._list('Users', `{email}='${email}'`);
    if (!rows.length) return { success:false, error:'No account found.' };
    const user = rows[0];
    if (user.password_hash !== passHash) return { success:false, error:'Incorrect password.' };
    const lic = await this._list('Licenses', `AND({email}='${email}',{status}='active')`);
    if (!lic.length) return { success:false, error:'No active license.' };
    return { success:true, name:user.name, org:user.org||'', role:user.role||'user', appAccess:(lic[0].app_access||'forge').split(',') };
  }

  async register(email, passHash, name, org) {
    await this._create('Users', { email, name, org, password_hash:passHash, role:'user', created_at: new Date().toISOString() });
    await this._create('Pending_Registrations', { email, name, org, registered_at: new Date().toISOString(), status:'pending' });
    return { success:true, pending:true };
  }

  async getProfiles(email, role) {
    const rows = await this._list('SLM_Profiles', `{status}='published'`);
    if (role==='admin'||role==='developer') return { profiles:rows };
    const ac = await this._list('Access_Control', `{user_email}='${email}'`);
    const ids = new Set(ac.map(r=>r.profile_id));
    return { profiles: rows.filter(p=>ids.has(p.id)) };
  }

  async write(collection, data) {
    if (Array.isArray(data)) {
      const fields = {};
      data.forEach((v,i)=>{ fields['col'+i]=String(v); });
      await this._create(collection, fields);
    } else {
      await this._create(collection, data);
    }
    return { success:true };
  }

  async getLicenses() {
    const rows = await this._list('Licenses');
    return { licenses:rows };
  }
}

// ═══════════════════════════════════════════════════════════
//  LOCAL STORAGE ADAPTER (offline / dev mode)
// ═══════════════════════════════════════════════════════════
class LocalAdapter extends DBAdapter {
  _get(key, def=[]) { try { return JSON.parse(localStorage.getItem('slmf_'+key)||JSON.stringify(def)); } catch(e){return def;} }
  _set(key, val) { try { localStorage.setItem('slmf_'+key, JSON.stringify(val)); } catch(e){} }

  async login(email, passHash, app) {
    const users = this._get('users', []);
    const user  = users.find(u => u.email.toLowerCase() === email.toLowerCase());
    if (!user) return { success:false, error:'No account found.' };
    if (user.password_hash !== passHash) return { success:false, error:'Incorrect password.' };
    return { success:true, name:user.name, org:user.org||'', role:user.role||'user', appAccess:user.appAccess||['forge'] };
  }

  async register(email, passHash, name, org) {
    const users = this._get('users', []);
    if (users.find(u=>u.email===email)) return { success:false, error:'Account exists.' };
    users.push({ email, password_hash:passHash, name, org, role:'user', createdAt:new Date().toISOString() });
    this._set('users', users);
    const pending = this._get('pending', []);
    pending.push({ email, name, org, registeredAt:new Date().toISOString(), status:'pending' });
    this._set('pending', pending);
    return { success:true, pending:true };
  }

  async getProfiles(email, role) {
    const profiles = this._get('published_profiles', []);
    if (role==='admin'||role==='developer') return { profiles };
    const ac = this._get('access_control', []);
    const ids = new Set(ac.filter(r=>r.email===email).map(r=>r.profileId));
    return { profiles: profiles.filter(p=>ids.has(p.id)) };
  }

  async publishProfile(profile) {
    const profiles = this._get('published_profiles', []);
    const idx = profiles.findIndex(p=>p.id===profile.id);
    if (idx>=0) profiles[idx]=profile; else profiles.push(profile);
    this._set('published_profiles', profiles);
    return { success:true };
  }

  async getLicenses() { return { licenses: this._get('licenses',[]) }; }

  async grantLicense(data) {
    const lic = this._get('licenses',[]);
    const idx = lic.findIndex(l=>l.email===data.email);
    if (idx>=0) lic[idx]=data; else lic.push(data);
    this._set('licenses',lic);
    return { success:true };
  }

  async revokeLicense(email) {
    const lic = this._get('licenses',[]).map(l=>l.email===email?{...l,status:'revoked'}:l);
    this._set('licenses',lic);
    return { success:true };
  }

  async getPending() { return { pending: this._get('pending',[]).filter(p=>p.status==='pending') }; }

  async write(collection, data) {
    const col = this._get('log_'+collection, []);
    col.push({ data, ts: new Date().toISOString() });
    this._set('log_'+collection, col);
    return { success:true };
  }
}

// ═══════════════════════════════════════════════════════════
//  GENERIC REST API ADAPTER
// ═══════════════════════════════════════════════════════════
class RestAPIAdapter extends DBAdapter {
  constructor(baseUrl, apiKey) {
    super();
    this.base = baseUrl.replace(/\/$/, '');
    this.headers = { 'Content-Type':'application/json', 'X-API-Key': apiKey };
  }

  async _get(path, params={}) {
    try {
      const qs = new URLSearchParams(params).toString();
      const r = await fetch(`${this.base}${path}?${qs}`, { headers: this.headers });
      if (r.ok) return r.json();
    } catch(e) { console.warn('[REST GET]', e.message); }
    return null;
  }

  async _post(path, body) {
    try {
      const r = await fetch(`${this.base}${path}`, { method:'POST', headers: this.headers, body: JSON.stringify(body) });
      if (r.ok) return r.json();
    } catch(e) { console.warn('[REST POST]', e.message); }
    return null;
  }

  async login(email, passHash, app)     { return this._post('/auth/login', { email, password:passHash, app }); }
  async register(email, passHash, name, org) { return this._post('/auth/register', { email, password:passHash, name, org }); }
  async getProfiles(email, role)        { return this._get('/profiles', { email, role }); }
  async publishProfile(profile)         { return this._post('/profiles', profile); }
  async getLicenses()                   { return this._get('/licenses'); }
  async grantLicense(data)              { return this._post('/licenses', data); }
  async revokeLicense(email)            { return this._post('/licenses/revoke', { email }); }
  async getPending()                    { return this._get('/registrations/pending'); }
  async approvePending(email, role, appAccess, by) { return this._post('/registrations/approve', { email, role, appAccess, approvedBy:by }); }
  async write(collection, data)         { return this._post('/log/'+collection, { data }); }
}

// ═══════════════════════════════════════════════════════════
//  FACTORY — returns the configured adapter
// ═══════════════════════════════════════════════════════════
function createDBAdapter() {
  switch (SLM_CONFIG.DB_ADAPTER) {
    case 'supabase':
      return new SupabaseAdapter(SLM_CONFIG.SUPABASE_URL, SLM_CONFIG.SUPABASE_ANON_KEY);
    case 'airtable':
      return new AirtableAdapter(SLM_CONFIG.AIRTABLE_TOKEN, SLM_CONFIG.AIRTABLE_BASE);
    case 'rest':
      return new RestAPIAdapter(SLM_CONFIG.REST_BASE_URL, SLM_CONFIG.REST_API_KEY);
    case 'local':
      return new LocalAdapter();
    case 'gsheets':
    default:
      return new GoogleSheetsAdapter(SLM_CONFIG.GAS_URL);
  }
}

// ═══════════════════════════════════════════════════════════
//  SUPER ADMIN AUTH — fully client-side, no DB needed
// ═══════════════════════════════════════════════════════════
function checkSuperAdmin(email, pass) {
  const e = email.toLowerCase().trim();
  const h = btoa(pass);
  const found = SLM_CONFIG.SUPER_ADMINS.find(a =>
    a.email.toLowerCase() === e && a.passHash === h
  );
  if (!found) return null;
  return {
    success:    true,
    name:       found.name,
    email:      found.email,
    role:       'admin',
    org:        '',
    appAccess:  ['forge', 'studio', 'orchestrator'],
    isSuperAdmin: true,
  };
}

function isSuperAdminEmail(email) {
  return SLM_CONFIG.SUPER_ADMINS.some(a => a.email.toLowerCase() === email.toLowerCase().trim());
}

// Singleton
const db = createDBAdapter();
