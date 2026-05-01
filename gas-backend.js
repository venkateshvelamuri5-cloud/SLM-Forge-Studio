/**
 * ═══════════════════════════════════════════════════════════
 *  SLM FORGE — Google Apps Script Backend  v4.0
 * ═══════════════════════════════════════════════════════════
 *
 *  FIRST TIME SETUP (do this once before anything else):
 *  ─────────────────────────────────────────────────────
 *  1. Open your sheet → Extensions → Apps Script
 *  2. Delete everything, paste this entire file, Save
 *  3. Select "setupSpreadsheet" from the function dropdown → ▶ Run
 *     (This creates all 8 sheets with correct headers + seeds admin)
 *  4. Deploy → New Deployment
 *       Type:  Web App
 *       Execute as:  Me
 *       Who has access:  Anyone
 *     → Copy the Web App URL
 *  5. Replace GAS_URL in index.html, studio.html, orchestrator.html
 *  6. After any code change: Deploy → Manage Deployments → Edit
 *       → New version → Deploy
 *
 *  ADMIN LOGIN (after setup):
 *    Email:    venkateshvelamuri5@gmail.com
 *    Password: Admin@SLMForge2025   (change this after first login)
 * ═══════════════════════════════════════════════════════════
 */

var SPREADSHEET_ID = '1Ful1tNZdUYKMkz2DkrJ3RFQxKChkGkUw2m1tayLWqEw';
var SUPER_ADMINS   = ['venkateshvelamuri5@gmail.com', 'admin@slmforge.com'];
var ADMIN_PASSWORD = 'Admin@SLMForge2025'; // default — overridden once admin registers

// ── Sheet column definitions ─────────────────────────────
var SHEETS = {
  'Users': [
    'email','name','org',
    'password_hash',   // col D = column 4
    'role','created_at','last_login'
  ],
  'Licenses': [
    'email','name','role',
    'app_access',      // forge | forge,studio | forge,studio,orchestrator
    'status',          // pending | active | revoked | expired
    'granted_by','granted_at','expires_at','notes'
  ],
  'Pending_Registrations': [
    'email','name','org','registered_at',
    'status',          // pending | approved | rejected
    'reviewed_by','reviewed_at','notes'
  ],
  'SLM_Profiles': [
    'id','name','desc','category','task',
    'role_desc','criteria','examples_json',
    'model_key','system_prompt','kb_chunks_json',
    'developer_email','status','created_at','published_at',
    'version',          // col P = column 16
    'active_version',   // col Q = column 17
    'version_history_json' // col R = column 18
  ],
  'KB_Chunks': [
    'profile_id','chunk_index','text','src','version'
  ],
  'Access_Control': [
    'user_email','profile_id','assigned_at','assigned_by'
  ],
  'Login_Attempts': [
    'email','timestamp','role','app','status'
  ],
  'Feeback from the Users': [
    'name','email','org','timestamp','q1','q2','q3'
  ],
  'Batch_Jobs': [
    'job_id','user_email','profile_name','file_name',
    'status','row_count','timestamp'
  ]
};

// ═══════════════════════════════════════════════════════════
//  SETUP — Run once manually from Apps Script editor
// ═══════════════════════════════════════════════════════════
function setupSpreadsheet() {
  var ss = SpreadsheetApp.openById(SPREADSHEET_ID);

  // Create all sheets with headers
  var names = Object.keys(SHEETS);
  for (var i = 0; i < names.length; i++) {
    createSheet(ss, names[i], SHEETS[names[i]]);
  }

  // Remove default Sheet1 if empty
  var def = ss.getSheetByName('Sheet1');
  if (def && ss.getSheets().length > 1) {
    try { ss.deleteSheet(def); } catch(e) {}
  }

  // Seed super admin in Users
  var usersSheet = ss.getSheetByName('Users');
  var usersData  = usersSheet.getDataRange().getValues();
  var adminInUsers = false;
  for (var r = 1; r < usersData.length; r++) {
    if ((usersData[r][0]||'').toLowerCase().trim() === SUPER_ADMINS[0]) {
      adminInUsers = true; break;
    }
  }
  if (!adminInUsers) {
    usersSheet.appendRow([
      SUPER_ADMINS[0],
      'Venkatesh Velamuri',
      '',
      Utilities.base64Encode(ADMIN_PASSWORD),
      'admin',
      new Date().toISOString(),
      ''
    ]);
    Logger.log('Seeded super admin in Users sheet');
  }

  // Seed super admin in Licenses
  var licSheet = ss.getSheetByName('Licenses');
  var licData  = licSheet.getDataRange().getValues();
  var adminInLic = false;
  for (var r = 1; r < licData.length; r++) {
    if ((licData[r][0]||'').toLowerCase().trim() === SUPER_ADMINS[0]) {
      adminInLic = true; break;
    }
  }
  if (!adminInLic) {
    licSheet.appendRow([
      SUPER_ADMINS[0], 'Venkatesh Velamuri', 'admin',
      'forge,studio,orchestrator',
      'active', 'system', new Date().toISOString(), '',
      'Super Admin — permanent access, cannot be revoked'
    ]);
    Logger.log('Seeded super admin in Licenses sheet');
  }

  Logger.log('Setup complete!');
  return {
    success: true,
    sheetsCreated: names.join(', '),
    adminSeeded: !adminInUsers,
    defaultPassword: adminInUsers ? '(already set)' : ADMIN_PASSWORD
  };
}

function createSheet(ss, name, headers) {
  var sheet = ss.getSheetByName(name);
  if (!sheet) {
    sheet = ss.insertSheet(name);
    Logger.log('Created: ' + name);
  }
  // Write headers if row 1 empty
  var first = sheet.getRange(1,1).getValue();
  if (!first || first === '') {
    var range = sheet.getRange(1, 1, 1, headers.length);
    range.setValues([headers]);
    range.setBackground('#1a2332');
    range.setFontColor('#ffffff');
    range.setFontWeight('bold');
    range.setFontSize(10);
    sheet.setFrozenRows(1);
    for (var i = 0; i < headers.length; i++) {
      sheet.setColumnWidth(i+1, 160);
    }
    Logger.log('Headers set for: ' + name);
  }
  return sheet;
}

function ensureSheet(ss, name) {
  var sheet = ss.getSheetByName(name);
  if (!sheet) {
    sheet = ss.insertSheet(name);
    var headers = SHEETS[name];
    if (headers) {
      var r = sheet.getRange(1,1,1,headers.length);
      r.setValues([headers]);
      r.setBackground('#1a2332');
      r.setFontColor('#fff');
      r.setFontWeight('bold');
      sheet.setFrozenRows(1);
    }
  }
  return sheet;
}

// ═══════════════════════════════════════════════════════════
//  HTTP ROUTERS
// ═══════════════════════════════════════════════════════════
function doGet(e) {
  var p = e.parameter || {};
  try {
    switch (p.action) {
      case 'ping':        return ok({ ts: new Date().toISOString(), sheets: Object.keys(SHEETS) });
      case 'setup':       return ok(setupSpreadsheet());
      case 'login':       return ok(handleLogin(p));
      case 'getProfiles': return ok(handleGetProfiles(p));
      case 'getChunks':   return ok(handleGetChunks(p));
      case 'getUsers':    return ok(handleGetUsers(p));
      case 'getLicenses': return ok(handleGetLicenses(p));
      case 'getPending':  return ok(handleGetPending(p));
      default:            return err('Unknown GET action: ' + p.action);
    }
  } catch(e) { return err(e.message + '\n' + e.stack); }
}

function doPost(e) {
  var body = {};
  try { body = JSON.parse(e.postData.contents); } catch(x) {}
  try {
    switch (body.action) {
      case 'register':       return ok(handleRegister(body));
      case 'write':          return ok(handleWrite(body));
      case 'publishProfile':   return ok(handlePublishProfile(body));
      case 'saveChunks':      return ok(handleSaveChunks(body));
      case 'activateVersion':  return ok(handleActivateVersion(body));
      case 'assignProfile':  return ok(handleAssignProfile(body));
      case 'removeProfile':  return ok(handleRemoveProfile(body));
      case 'grantLicense':   return ok(handleGrantLicense(body));
      case 'revokeLicense':  return ok(handleRevokeLicense(body));
      case 'approvePending': return ok(handleApprovePending(body));
      case 'rejectPending':  return ok(handleRejectPending(body));
      case 'bulkUsers':      return ok(handleBulkUsers(body));
      default:
        if (body.sheet && body.row) return ok(handleWrite(body));
        return err('Unknown POST action: ' + body.action);
    }
  } catch(e) { return err(e.message); }
}

function ok(data) {
  return ContentService
    .createTextOutput(JSON.stringify(data))
    .setMimeType(ContentService.MimeType.JSON);
}
function err(msg) {
  return ContentService
    .createTextOutput(JSON.stringify({ success:false, error:msg }))
    .setMimeType(ContentService.MimeType.JSON);
}

// ═══════════════════════════════════════════════════════════
//  AUTH — LOGIN
// ═══════════════════════════════════════════════════════════
function handleLogin(p) {
  var email  = (p.email    ||'').toLowerCase().trim();
  var pwHash = (p.password ||'');
  var app    = (p.app      ||'forge');

  if (!email) return { success:false, error:'Email is required.' };

  var ss = SpreadsheetApp.openById(SPREADSHEET_ID);

  // ── Super admin — always gets in ──
  if (SUPER_ADMINS.indexOf(email) !== -1) {
    var name = 'Venkatesh Velamuri';
    var usersSheet = ss.getSheetByName('Users');
    if (usersSheet) {
      var uRows = usersSheet.getDataRange().getValues();
      for (var i=1; i<uRows.length; i++) {
        if ((uRows[i][0]||'').toLowerCase().trim() === email) {
          if (uRows[i][3] && uRows[i][3] !== pwHash) {
            return { success:false, error:'Incorrect password for admin account.' };
          }
          name = uRows[i][1] || name;
          usersSheet.getRange(i+1,7).setValue(new Date().toISOString());
          break;
        }
      }
    }
    logAttempt(ss, email, 'admin', app, 'success');
    return { success:true, name:name, role:'admin', org:'',
             appAccess:['forge','studio','orchestrator'], isSuperAdmin:true };
  }

  // ── Regular user ──
  var usersSheet = ss.getSheetByName('Users');
  if (!usersSheet) return { success:false, error:'System not configured. Contact venkateshvelamuri5@gmail.com.' };

  var uRows   = usersSheet.getDataRange().getValues();
  var userRow = null, rowNum = -1;
  for (var i=1; i<uRows.length; i++) {
    if ((uRows[i][0]||'').toLowerCase().trim() === email) {
      userRow = uRows[i]; rowNum = i+1; break;
    }
  }

  if (!userRow) {
    logAttempt(ss, email, 'unknown', app, 'no_account');
    return { success:false, error:'No account found. Please register first.' };
  }

  // Column D (index 3) = password_hash
  if (userRow[3] !== pwHash) {
    logAttempt(ss, email, userRow[4]||'user', app, 'wrong_password');
    return { success:false, error:'Incorrect password.' };
  }

  var name = userRow[1] || email.split('@')[0];
  var org  = userRow[2] || '';
  var role = userRow[4] || 'user';

  // ── Check license ──
  var lic = getUserLicense(ss, email);

  if (!lic) {
    logAttempt(ss, email, role, app, 'no_license');
    return { success:false, error:'Your account is pending approval. Contact venkateshvelamuri5@gmail.com to request access.' };
  }
  if (lic.status === 'pending') {
    logAttempt(ss, email, role, app, 'pending');
    return { success:false, error:'Your registration is pending admin approval. You will be contacted once approved.' };
  }
  if (lic.status === 'revoked') {
    logAttempt(ss, email, role, app, 'revoked');
    return { success:false, error:'Your access has been revoked. Contact venkateshvelamuri5@gmail.com.' };
  }
  if (lic.status === 'expired') {
    logAttempt(ss, email, role, app, 'expired');
    return { success:false, error:'Your license has expired. Contact venkateshvelamuri5@gmail.com to renew.' };
  }

  var appAccess = lic.appAccess || ['forge'];
  if (app !== 'forge' && appAccess.indexOf(app) === -1) {
    logAttempt(ss, email, role, app, 'no_app_access');
    return { success:false, error:'You do not have access to ' + app + '. Contact venkateshvelamuri5@gmail.com.' };
  }

  usersSheet.getRange(rowNum, 7).setValue(new Date().toISOString());
  logAttempt(ss, email, role, app, 'success');
  return { success:true, name:name, org:org, role:role, appAccess:appAccess };
}

function getUserLicense(ss, email) {
  var sheet = ss.getSheetByName('Licenses');
  if (!sheet) return null;
  var rows = sheet.getDataRange().getValues();
  for (var i=1; i<rows.length; i++) {
    if ((rows[i][0]||'').toLowerCase().trim() === email) {
      var exp = rows[i][7] ? new Date(rows[i][7]) : null;
      var isExp = exp && exp < new Date();
      return {
        role:      rows[i][2] || 'user',
        appAccess: (rows[i][3]||'forge').split(',').map(function(s){return s.trim();}),
        status:    isExp ? 'expired' : (rows[i][4]||'active')
      };
    }
  }
  return null;
}

function logAttempt(ss, email, role, app, status) {
  try {
    var sheet = ensureSheet(ss, 'Login_Attempts');
    sheet.appendRow([email, new Date().toISOString(), role, app, status]);
  } catch(e) {}
}

// ═══════════════════════════════════════════════════════════
//  REGISTRATION
//  → Creates Users row + Pending_Registrations row (status=pending)
//  → Does NOT auto-grant license
//  → Admin approves from Orchestrator → then user can log in
// ═══════════════════════════════════════════════════════════
function handleRegister(body) {
  var email  = (body.email   ||'').toLowerCase().trim();
  var pwHash = (body.password||'');
  var name   = (body.name    ||'').trim();
  var org    = (body.org     ||'').trim();

  if (!email || email.indexOf('@') === -1) return { success:false, error:'Valid email required.' };
  if (!pwHash) return { success:false, error:'Password required.' };
  if (!name)   return { success:false, error:'Full name required.' };

  var ss         = SpreadsheetApp.openById(SPREADSHEET_ID);
  var usersSheet = ensureSheet(ss, 'Users');
  var existing   = usersSheet.getDataRange().getValues();

  for (var i=1; i<existing.length; i++) {
    if ((existing[i][0]||'').toLowerCase().trim() === email) {
      return { success:false, error:'An account already exists for this email. Please sign in.' };
    }
  }

  // Write to Users — columns: email|name|org|password_hash(D)|role|created_at|last_login
  usersSheet.appendRow([email, name, org, pwHash, 'user', new Date().toISOString(), '']);

  // Write to Pending_Registrations
  var pendSheet = ensureSheet(ss, 'Pending_Registrations');
  pendSheet.appendRow([email, name, org, new Date().toISOString(), 'pending', '', '', '']);

  Logger.log('New registration (pending): ' + email);

  return {
    success: true,
    pending: true,
    message: 'Account created. Your access is pending admin approval. Please contact venkateshvelamuri5@gmail.com to request access.'
  };
}

// ═══════════════════════════════════════════════════════════
//  PENDING REGISTRATIONS — Admin view & approval
// ═══════════════════════════════════════════════════════════
function handleGetPending(p) {
  var ss    = SpreadsheetApp.openById(SPREADSHEET_ID);
  var sheet = ss.getSheetByName('Pending_Registrations');
  if (!sheet) return { success:true, pending:[] };

  var rows    = sheet.getDataRange().getValues();
  var pending = [];
  for (var i=1; i<rows.length; i++) {
    if (rows[i][0] && rows[i][4] === 'pending') {
      pending.push({ email:rows[i][0], name:rows[i][1], org:rows[i][2], registeredAt:rows[i][3] });
    }
  }
  return { success:true, pending:pending };
}

function handleApprovePending(body) {
  var email      = (body.email     ||'').toLowerCase().trim();
  var approvedBy = (body.approvedBy||'admin');
  var role       = body.role       || 'user';
  var appAccess  = body.appAccess  || 'forge';

  var ss = SpreadsheetApp.openById(SPREADSHEET_ID);
  _setPendingStatus(ss, email, 'approved', approvedBy);

  // Grant license
  handleGrantLicense({ email:email, role:role, appAccess:appAccess, grantedBy:approvedBy, notes:'Approved from Orchestrator' });

  return { success:true };
}

function handleRejectPending(body) {
  var email      = (body.email     ||'').toLowerCase().trim();
  var rejectedBy = (body.rejectedBy||'admin');
  var ss = SpreadsheetApp.openById(SPREADSHEET_ID);
  _setPendingStatus(ss, email, 'rejected', rejectedBy, body.notes||'');
  return { success:true };
}

function _setPendingStatus(ss, email, status, reviewedBy, notes) {
  var sheet = ss.getSheetByName('Pending_Registrations');
  if (!sheet) return;
  var rows = sheet.getDataRange().getValues();
  for (var i=1; i<rows.length; i++) {
    if ((rows[i][0]||'').toLowerCase().trim() === email) {
      sheet.getRange(i+1,5).setValue(status);
      sheet.getRange(i+1,6).setValue(reviewedBy||'');
      sheet.getRange(i+1,7).setValue(new Date().toISOString());
      if (notes) sheet.getRange(i+1,8).setValue(notes);
      return;
    }
  }
}

// ═══════════════════════════════════════════════════════════
//  LICENSE MANAGEMENT
// ═══════════════════════════════════════════════════════════
function handleGetLicenses(p) {
  var ss    = SpreadsheetApp.openById(SPREADSHEET_ID);
  var sheet = ss.getSheetByName('Licenses');
  if (!sheet) return { success:true, licenses:[] };

  var rows     = sheet.getDataRange().getValues();
  var licenses = [];
  for (var i=1; i<rows.length; i++) {
    if (!rows[i][0]) continue;
    licenses.push({
      email:     rows[i][0], name:rows[i][1], role:rows[i][2],
      appAccess: (rows[i][3]||'forge').split(',').map(function(s){return s.trim();}),
      status:    rows[i][4]||'active',
      grantedBy: rows[i][5], grantedAt:rows[i][6],
      expiresAt: rows[i][7]||'', notes:rows[i][8]||''
    });
  }
  return { success:true, licenses:licenses };
}

function handleGrantLicense(body) {
  var email     = (body.email    ||'').toLowerCase().trim();
  var name      = body.name      || email.split('@')[0];
  var role      = body.role      || 'user';
  var appAccess = Array.isArray(body.appAccess) ? body.appAccess.join(',') : (body.appAccess||'forge');
  var grantedBy = body.grantedBy || 'admin';
  var expiresAt = body.expiresAt || '';
  var notes     = body.notes     || '';

  if (!email) return { success:false, error:'Email required' };

  var ss    = SpreadsheetApp.openById(SPREADSHEET_ID);
  var sheet = ensureSheet(ss, 'Licenses');
  var rows  = sheet.getDataRange().getValues();

  for (var i=1; i<rows.length; i++) {
    if ((rows[i][0]||'').toLowerCase().trim() === email) {
      sheet.getRange(i+1,1,1,9).setValues([[
        email, name, role, appAccess, 'active',
        grantedBy, new Date().toISOString(), expiresAt, notes
      ]]);
      return { success:true, updated:true };
    }
  }
  sheet.appendRow([email, name, role, appAccess, 'active', grantedBy, new Date().toISOString(), expiresAt, notes]);
  return { success:true, updated:false };
}

function handleRevokeLicense(body) {
  var email = (body.email||'').toLowerCase().trim();
  if (!email) return { success:false, error:'Email required' };

  var ss    = SpreadsheetApp.openById(SPREADSHEET_ID);
  var sheet = ss.getSheetByName('Licenses');
  if (!sheet) return { success:false, error:'Licenses sheet not found' };

  var rows = sheet.getDataRange().getValues();
  for (var i=1; i<rows.length; i++) {
    if ((rows[i][0]||'').toLowerCase().trim() === email) {
      sheet.getRange(i+1,5).setValue('revoked');
      return { success:true };
    }
  }
  return { success:false, error:'License not found for: ' + email };
}

// ═══════════════════════════════════════════════════════════
//  SLM PROFILES
// ═══════════════════════════════════════════════════════════
function handleGetProfiles(p) {
  var email = (p.email||'').toLowerCase().trim();
  var role  = (p.role ||'user').toLowerCase();

  var ss           = SpreadsheetApp.openById(SPREADSHEET_ID);
  var profileSheet = ss.getSheetByName('SLM_Profiles');
  if (!profileSheet) return { success:true, profiles:[] };

  var rows = profileSheet.getDataRange().getValues();
  var allPublished = [];
  for (var i=1; i<rows.length; i++) {
    if (rows[i][12] === 'published') {
      allPublished.push({
        id:rows[i][0],name:rows[i][1],desc:rows[i][2],
        category:rows[i][3],task:rows[i][4],role:rows[i][5],
        criteria:rows[i][6],examples:safeJson(rows[i][7],[]),
        modelKey:rows[i][8],systemPrompt:rows[i][9],
        kbChunkCount:0, // chunks stored in KB_Chunks sheet — fetch via getChunks
        developerEmail:rows[i][11],status:rows[i][12],
        publishedAt:rows[i][14], icon:taskIcon(rows[i][4]),
        version:rows[i][15]||1,
        activeVersion:rows[i][16]||rows[i][15]||1,
        versionHistory:safeJson(rows[i][17],[])
      });
    }
  }

  // Enrich all profiles with assignedUsers from Access_Control
  var acSheet = ss.getSheetByName('Access_Control');
  if (acSheet) {
    var acRows = acSheet.getDataRange().getValues();
    var profileUsers = {};
    for (var i=1; i<acRows.length; i++) {
      var uEmail = (acRows[i][0]||'').toLowerCase().trim();
      var pid    = acRows[i][1] || '';
      if (uEmail && pid) {
        if (!profileUsers[pid]) profileUsers[pid] = [];
        if (profileUsers[pid].indexOf(uEmail) === -1) profileUsers[pid].push(uEmail);
      }
    }
    allPublished.forEach(function(p){ p.assignedUsers = profileUsers[p.id] || []; });
  }

  if (role === 'admin' || role === 'developer') return { success:true, profiles:allPublished };

  // End users: only assigned profiles
  var userAssigned = {};
  if (acSheet) {
    var acRows2 = acSheet.getDataRange().getValues();
    for (var j=1; j<acRows2.length; j++) {
      if ((acRows2[j][0]||'').toLowerCase().trim() === email) {
        userAssigned[acRows2[j][1]] = true;
      }
    }
  }
  var filtered = allPublished.filter(function(p){ return userAssigned[p.id]; });
  return { success:true, profiles:filtered };
}

function handlePublishProfile(body) {
  var ss    = SpreadsheetApp.openById(SPREADSHEET_ID);
  var sheet = ensureSheet(ss, 'SLM_Profiles');
  var rows  = sheet.getDataRange().getValues();
  var now   = new Date().toISOString();
  var id    = body.id || ('prof_' + Date.now());
  var newVersion = parseInt(body.version || 1);

  for (var i=1; i<rows.length; i++) {
    if (rows[i][0] === id) {
      // Build version history — append new snapshot
      var existingHistory = safeJson(rows[i][17], []);
      var snapshot = {
        version:    newVersion,
        publishedAt: now,
        publishedBy: body.developerEmail || '',
        name:        body.name || '',
        desc:        body.desc || '',
        systemPrompt:body.systemPrompt || '',
        modelKey:    body.modelKey || 'llama3b',
        kbChunkCount:(body.kbChunks||[]).length,
        exampleCount:(body.examples||[]).length,
      };
      existingHistory.push(snapshot);
      // Keep last 20 versions
      if (existingHistory.length > 20) existingHistory = existingHistory.slice(-20);

      sheet.getRange(i+1,1,1,18).setValues([[
        id, body.name||'', body.desc||'', body.category||'General', body.task||'custom',
        body.role||'', body.criteria||'', JSON.stringify(body.examples||[]),
        body.modelKey||'llama3b', body.systemPrompt||'', '',
        body.developerEmail||'', 'published', rows[i][13], now,
        newVersion, newVersion, JSON.stringify(existingHistory)
      ]]);
      // Save KB chunks to dedicated sheet
      if (body.kbChunks && body.kbChunks.length) {
        _saveChunksToSheet(ss, id, body.kbChunks, newVersion);
      }
      return { success:true, id:id, updated:true, version:newVersion, kbChunkCount:(body.kbChunks||[]).length };
    }
  }
  // New profile
  var initHistory = [{
    version:1, publishedAt:now, publishedBy:body.developerEmail||'',
    name:body.name||'', desc:body.desc||'', systemPrompt:body.systemPrompt||'',
    modelKey:body.modelKey||'llama3b',
    kbChunkCount:(body.kbChunks||[]).length, exampleCount:(body.examples||[]).length,
  }];
  sheet.appendRow([
    id, body.name||'', body.desc||'', body.category||'General', body.task||'custom',
    body.role||'', body.criteria||'', JSON.stringify(body.examples||[]),
    body.modelKey||'llama3b', body.systemPrompt||'', '',
    body.developerEmail||'', 'published', now, now,
    1, 1, JSON.stringify(initHistory)
  ]);
  // Save KB chunks to dedicated sheet
  if (body.kbChunks && body.kbChunks.length) {
    _saveChunksToSheet(ss, id, body.kbChunks, 1);
  }
  return { success:true, id:id, updated:false, version:1, kbChunkCount:(body.kbChunks||[]).length };
}


// ═══════════════════════════════════════════════════════════
//  KB CHUNKS — stored in dedicated sheet, one row per chunk
// ═══════════════════════════════════════════════════════════
function handleGetChunks(p) {
  var profileId = p.profileId || '';
  if (!profileId) return { success:false, error:'profileId required' };

  var ss    = SpreadsheetApp.openById(SPREADSHEET_ID);
  var sheet = ss.getSheetByName('KB_Chunks');
  if (!sheet) return { success:true, chunks:[] };

  var rows   = sheet.getDataRange().getValues();
  var chunks = [];
  for (var i=1; i<rows.length; i++) {
    if ((rows[i][0]||'') === profileId) {
      chunks.push({ text:rows[i][2]||'', src:rows[i][3]||'document' });
    }
  }
  return { success:true, profileId:profileId, chunks:chunks, count:chunks.length };
}

function handleSaveChunks(body) {
  var profileId  = body.profileId || '';
  var chunks     = body.chunks || [];
  var version    = body.version || 1;
  var isBatch    = body.isBatch || false;
  var batchIndex = body.batchIndex || 0;
  if (!profileId) return { success:false, error:'profileId required' };

  var ss    = SpreadsheetApp.openById(SPREADSHEET_ID);
  var sheet = ensureSheet(ss, 'KB_Chunks');

  if (!isBatch || batchIndex === 0) {
    // First batch (or full upload): delete existing chunks for this profile first
    var rows = sheet.getDataRange().getValues();
    for (var i=rows.length-1; i>=1; i--) {
      if ((rows[i][0]||'') === profileId) sheet.deleteRow(i+1);
    }
  }

  // Append this batch
  if (chunks.length) {
    var newRows = chunks.map(function(c, idx) {
      return [profileId, (batchIndex*200)+idx, c.text||'', c.src||'document', version];
    });
    sheet.getRange(sheet.getLastRow()+1, 1, newRows.length, 5).setValues(newRows);
  }

  return { success:true, profileId:profileId, count:chunks.length, batchIndex:batchIndex };
}

function _saveChunksToSheet(ss, profileId, chunks, version) {
  var sheet = ensureSheet(ss, 'KB_Chunks');
  var rows  = sheet.getDataRange().getValues();

  // Delete existing chunks for this profile
  for (var i=rows.length-1; i>=1; i--) {
    if ((rows[i][0]||'') === profileId) {
      sheet.deleteRow(i+1);
    }
  }

  // Write new chunks in batch
  if (!chunks.length) return;
  var newRows = chunks.map(function(c, idx) {
    return [profileId, idx, c.text||'', c.src||'document', version];
  });
  sheet.getRange(sheet.getLastRow()+1, 1, newRows.length, 5).setValues(newRows);
}

// ── Activate a specific version (rollback/promote) ──────────
function handleActivateVersion(body) {
  var ss    = SpreadsheetApp.openById(SPREADSHEET_ID);
  var sheet = ensureSheet(ss, 'SLM_Profiles');
  var rows  = sheet.getDataRange().getValues();
  var id    = body.id;
  var targetVersion = parseInt(body.version);

  for (var i=1; i<rows.length; i++) {
    if (rows[i][0] === id) {
      // Just update the active_version column (col Q = index 17, 1-based col 17)
      sheet.getRange(i+1, 17).setValue(targetVersion);
      return { success:true, id:id, activeVersion:targetVersion };
    }
  }
  return { success:false, error:'Profile not found' };
}

// ═══════════════════════════════════════════════════════════
//  ACCESS CONTROL
// ═══════════════════════════════════════════════════════════
function handleAssignProfile(body) {
  var ss     = SpreadsheetApp.openById(SPREADSHEET_ID);
  var sheet  = ensureSheet(ss, 'Access_Control');
  var emails = Array.isArray(body.userEmails) ? body.userEmails : [body.userEmail];
  var pid    = body.profileId;
  var by     = body.assignedBy || '';
  var now    = new Date().toISOString();

  // Read existing assignments to deduplicate
  var existing = sheet.getDataRange().getValues();
  var existingSet = {};
  for (var i=1; i<existing.length; i++) {
    existingSet[(existing[i][0]||'').toLowerCase().trim()+'|'+existing[i][1]] = true;
  }

  // Remove ALL existing assignments for this profile first (clean replace)
  for (var i=existing.length-1; i>=1; i--) {
    if (existing[i][1] === pid) sheet.deleteRow(i+1);
  }

  // Write the new assignments
  var added = 0;
  emails.filter(Boolean).forEach(function(e) {
    sheet.appendRow([e.toLowerCase().trim(), pid, now, by]);
    added++;
  });
  return { success:true, assigned:added };
}

function handleRemoveProfile(body) {
  var ss  = SpreadsheetApp.openById(SPREADSHEET_ID);
  var pid = body.profileId || '';

  // 1. Remove from SLM_Profiles
  if (pid && body.fullDelete) {
    var profSheet = ss.getSheetByName('SLM_Profiles');
    if (profSheet) {
      var profRows = profSheet.getDataRange().getValues();
      for (var i=profRows.length-1; i>=1; i--) {
        if ((profRows[i][0]||'') === pid) { profSheet.deleteRow(i+1); break; }
      }
    }
    // 2. Remove from KB_Chunks
    var kbSheet = ss.getSheetByName('KB_Chunks');
    if (kbSheet) {
      var kbRows = kbSheet.getDataRange().getValues();
      for (var k=kbRows.length-1; k>=1; k--) {
        if ((kbRows[k][0]||'') === pid) kbSheet.deleteRow(k+1);
      }
    }
  }

  // 3. Remove from Access_Control (for specific user or all users)
  var acSheet = ss.getSheetByName('Access_Control');
  if (acSheet) {
    var rows = acSheet.getDataRange().getValues();
    for (var i=rows.length-1; i>=1; i--) {
      var matchUser = !body.userEmail || (rows[i][0]||'').toLowerCase().trim() === (body.userEmail||'').toLowerCase().trim();
      var matchPid  = !pid || rows[i][1] === pid;
      if (matchUser && matchPid) acSheet.deleteRow(i+1);
    }
  }
  return { success:true };
}

// ═══════════════════════════════════════════════════════════
//  USERS LIST
// ═══════════════════════════════════════════════════════════
function handleGetUsers(p) {
  var ss    = SpreadsheetApp.openById(SPREADSHEET_ID);
  var sheet = ss.getSheetByName('Users');
  if (!sheet) return { success:true, users:[] };
  var rows  = sheet.getDataRange().getValues();
  var users = [];
  for (var i=1; i<rows.length; i++) {
    if (!rows[i][0]) continue;
    users.push({ email:rows[i][0], name:rows[i][1], org:rows[i][2],
                 role:rows[i][4]||'user', createdAt:rows[i][5]||'', lastLogin:rows[i][6]||'' });
  }
  return { success:true, users:users };
}

// ═══════════════════════════════════════════════════════════
//  GENERIC WRITE
// ═══════════════════════════════════════════════════════════
function handleWrite(body) {
  var sheetName = body.sheet;
  var row       = body.row;
  if (!sheetName || !row) return { success:false, error:'Missing sheet or row' };
  var ss    = SpreadsheetApp.openById(SPREADSHEET_ID);
  var sheet = ensureSheet(ss, sheetName);
  sheet.appendRow(Array.isArray(row) ? row : [JSON.stringify(row)]);
  return { success:true };
}

// ═══════════════════════════════════════════════════════════
//  BULK USER IMPORT
// ═══════════════════════════════════════════════════════════
function handleBulkUsers(body) {
  var users       = body.users || [];
  var defPass     = body.defaultPassword || 'Welcome@SLM2025';
  var grantedBy   = body.grantedBy || 'admin';
  if (!users.length) return { success:false, error:'No users provided' };

  var ss         = SpreadsheetApp.openById(SPREADSHEET_ID);
  var usersSheet = ensureSheet(ss, 'Users');
  var licSheet   = ensureSheet(ss, 'Licenses');

  var existing   = usersSheet.getDataRange().getValues();
  var emailSet   = {};
  for (var i=1; i<existing.length; i++) {
    emailSet[(existing[i][0]||'').toLowerCase().trim()] = true;
  }

  var created=0, skipped=0;
  users.forEach(function(u) {
    var email = (u.email||'').toLowerCase().trim();
    if (!email || email.indexOf('@') === -1) return;
    if (emailSet[email]) { skipped++; return; }
    var pass   = Utilities.base64Encode(u.password || defPass);
    var role   = u.role || 'user';
    var access = role==='admin' ? 'forge,studio,orchestrator' : role==='developer' ? 'forge,studio' : 'forge';
    usersSheet.appendRow([email, u.name||'', u.org||'', pass, role, new Date().toISOString(), '']);
    licSheet.appendRow([email, u.name||'', role, access, 'active', grantedBy, new Date().toISOString(), '', 'Bulk imported']);
    emailSet[email] = true;
    created++;
  });
  return { success:true, created:created, skipped:skipped };
}

// ═══════════════════════════════════════════════════════════
//  HELPERS
// ═══════════════════════════════════════════════════════════
function safeJson(s, fallback) {
  try { return JSON.parse(s); } catch(e) { return fallback; }
}
function taskIcon(task) {
  var m = {resume:'📄',profile:'👤',jd:'📋',interview:'🎤',sentiment:'📊',
           lead:'🎯',proposal:'📝',contract:'⚖️',financial:'💹',
           content:'✍️',prd:'🗂️',codereview:'💻',hr:'👥',custom:'✏️'};
  return m[task] || '🤖';
}
