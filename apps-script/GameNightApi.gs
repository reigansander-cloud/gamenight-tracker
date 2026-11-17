/**
 * GAMENIGHT — the sheet behind the GameNight tracker (https://<you>.github.io/gamenight-tracker/).
 *
 * Set up once: Deploy → New deployment → type "Web app" → Execute as: Me, Who has access: Anyone → Deploy.
 * The site is open: anyone with the link can read and log games (no key).
 * The key (GameNight menu → "Tracker link and key") is only needed for the bulk "import" / "copyImages" actions.
 *
 * Tabs (made automatically the first time they're needed):
 *   Games         one row per logged game
 *   Game Players  one row per player in a game (game_id ties it to Games; date/game columns are just for reading)
 *   Players       player colours, avatars, live-score backgrounds
 *   Settings      one row: colour scheme, custom factions / scoresheets / live-score templates (JSON)
 *   Board Games   (not used by the site yet)
 * You can edit any of these directly in the sheet. Keep the header row and the id / game_id columns as they are.
 *
 * GET  ?key=K                                  → { ok, data: { GameLog: [...], PlayerProfile: [...], ... } }
 * POST {key, action:"ping"}                    → { ok, sheet }
 * POST {key, action:"create", entity, data}    → { ok, record }
 * POST {key, action:"update", entity, id, data}→ { ok, record }
 * POST {key, action:"delete", entity, id}      → { ok }
 * POST {key, action:"upload", name, mimeType, data(base64)} → { ok, file_url }   (saved in Drive: "GameNight Uploads")
 * POST {key, action:"import", entities:{...}, replace} → copies records in (keeps their ids and dates)
 * POST {key, action:"copyImages", extra:[urls]} → moves any media.base44.com images into Drive, returns {map}
 */

var ENTITIES = {
  GameLog:         { tab: 'Games',       fields: ['id', 'date_played', 'game_name', 'notes', 'created_date', 'updated_date'], dates: ['date_played'] },
  PlayerProfile:   { tab: 'Players',     fields: ['id', 'player_name', 'color', 'avatar', 'live_score_bg', 'created_date', 'updated_date'] },
  UserPreferences: { tab: 'Settings',    fields: ['id', 'color_scheme', 'custom_factions', 'custom_scoresheets', 'live_score_templates', 'created_date', 'updated_date'],
                     json: ['custom_factions', 'custom_scoresheets', 'live_score_templates'] },
  BoardGame:       { tab: 'Board Games', fields: ['id', 'title', 'owner', 'expansions', 'image_url', 'notes', 'created_date', 'updated_date'], json: ['expansions'] },
};
var PLAYERS_TAB = 'Game Players';
var PLAYER_FIELDS = ['game_id', 'date_played', 'game', 'name', 'faction', 'score', 'winner'];

// The GameNight sheet (used when the script isn't opened from inside it, e.g. as the web app).
var SHEET_ID = '12-kmQwLT8-7ej_5N15iiHnJB1NNZyQnk4hyQVpwx2d4';
function ss_() { return SpreadsheetApp.getActiveSpreadsheet() || SpreadsheetApp.openById(SHEET_ID); }

// ---------- menu, key ----------

function onOpen() {
  SpreadsheetApp.getUi().createMenu('GameNight')
    .addItem('Tracker link and key', 'showTrackerLink')
    .addItem('Change the key (the old one stops working)', 'resetTrackerKey')
    .addItem('Make / tidy the tabs', 'setupTabs')
    .addToUi();
}

function trackerKey_() {
  var props = PropertiesService.getScriptProperties();
  var key = props.getProperty('TRACKER_KEY');
  if (!key) {
    key = Utilities.getUuid().replace(/-/g, '').slice(0, 12);
    props.setProperty('TRACKER_KEY', key);
  }
  return key;
}

/** Run this from the script editor to see the key in the Execution log. */
function logTrackerKey() { Logger.log('Tracker key: ' + trackerKey_()); }

function showTrackerLink() {
  var url = '';
  try { url = ScriptApp.getService().getUrl() || ''; } catch (err) { url = ''; }
  var html = HtmlService.createHtmlOutput(
    '<div style="font:14px Arial;line-height:1.5">' +
    '<b>Link</b> (Deploy → Manage deployments → the web app\'s URL, ending in /exec):<br>' +
    '<input style="width:100%" readonly onclick="this.select()" value="' + url + '"><br><br>' +
    '<b>Key</b>:<br><input style="width:100%;font-size:18px" readonly onclick="this.select()" value="' + trackerKey_() + '">' +
    '<p style="color:#666">The site itself needs no key. The key is only for bulk imports.</p></div>').setWidth(460).setHeight(260);
  SpreadsheetApp.getUi().showModalDialog(html, 'GameNight link and key');
}

function resetTrackerKey() {
  PropertiesService.getScriptProperties().deleteProperty('TRACKER_KEY');
  showTrackerLink();
}

// ---------- web app ----------

function out_(obj) {
  return ContentService.createTextOutput(JSON.stringify(obj)).setMimeType(ContentService.MimeType.JSON);
}

function doGet(e) {
  var ss = ss_();
  var data = {};
  Object.keys(ENTITIES).forEach(function (name) { data[name] = readEntity_(ss, name); });
  return out_({ ok: true, data: data, sheet: ss.getName(), at: new Date().toISOString() });
}

function doPost(e) {
  var body;
  try { body = JSON.parse(e.postData.contents); } catch (err) { return out_({ ok: false, error: 'Could not read what the site sent.' }); }
  var adminOnly = body.action === 'import' || body.action === 'copyImages';
  if (adminOnly && String(body.key || '') !== trackerKey_()) return out_({ ok: false, auth: false, error: 'That key is wrong.' });
  var ss = ss_();
  if (body.action === 'ping') return out_({ ok: true, sheet: ss.getName() });
  if (body.action === 'upload') {
    try { return out_({ ok: true, file_url: saveUpload_(body) }); }
    catch (err) { return out_({ ok: false, error: 'Upload failed: ' + (err.message || err) }); }
  }
  var lock = LockService.getScriptLock();
  lock.waitLock(25000);
  try {
    var res;
    if (body.action === 'create') res = { ok: true, record: createRecord_(ss, body.entity, body.data || {}) };
    else if (body.action === 'update') res = { ok: true, record: updateRecord_(ss, body.entity, body.id, body.data || {}) };
    else if (body.action === 'delete') { deleteRecord_(ss, body.entity, body.id); res = { ok: true }; }
    else if (body.action === 'import') res = { ok: true, counts: importAll_(ss, body.entities || {}, !!body.replace) };
    else if (body.action === 'copyImages') res = { ok: true, map: copyImages_(ss, body.extra || []) };
    else res = { ok: false, error: 'Unknown action "' + body.action + '".' };
    SpreadsheetApp.flush();
    return out_(res);
  } catch (err) {
    return out_({ ok: false, error: String(err.message || err) });
  } finally {
    lock.releaseLock();
  }
}

// ---------- tabs ----------

function setupTabs() {
  var ss = ss_();
  Object.keys(ENTITIES).forEach(function (n) { tab_(ss, ENTITIES[n].tab, ENTITIES[n].fields); });
  tab_(ss, PLAYERS_TAB, PLAYER_FIELDS);
}

/** Gets a tab, making it (bold frozen header, text columns) if it's missing. Adds any missing header columns. */
function tab_(ss, name, fields) {
  var sh = ss.getSheetByName(name);
  if (!sh) {
    sh = ss.insertSheet(name);
    sh.getRange(1, 1, 1, fields.length).setValues([fields]).setFontWeight('bold').setBackground('#1e3a5f').setFontColor('#f5e9c8');
    sh.setFrozenRows(1);
    // text everywhere (so dates and "1-4" stay as typed) except numbers we set explicitly
    sh.getRange(2, 1, sh.getMaxRows() - 1, fields.length).setNumberFormat('@');
    if (name === PLAYERS_TAB) {
      sh.getRange(2, fields.indexOf('score') + 1, sh.getMaxRows() - 1, 1).setNumberFormat('General');
      sh.getRange(2, fields.indexOf('winner') + 1, sh.getMaxRows() - 1, 1).setNumberFormat('General');
    }
    sh.setColumnWidth(1, 120);
    return sh;
  }
  var headers = headers_(sh);
  fields.forEach(function (f) { if (headers.indexOf(f) < 0) addColumn_(sh, f); });
  return sh;
}

function headers_(sh) {
  var lastCol = sh.getLastColumn();
  if (lastCol < 1) return [];
  return sh.getRange(1, 1, 1, lastCol).getDisplayValues()[0].map(function (h) { return String(h).trim(); });
}

function addColumn_(sh, header) {
  var at = sh.getLastColumn() + 1;
  if (at > sh.getMaxColumns()) sh.insertColumnAfter(sh.getMaxColumns());
  if (at > 1) sh.getRange(1, at - 1).copyTo(sh.getRange(1, at), SpreadsheetApp.CopyPasteType.PASTE_FORMAT, false);
  sh.getRange(1, at).setValue(header);
  sh.getRange(2, at, Math.max(sh.getMaxRows() - 1, 1), 1).setNumberFormat('@');
  return at;
}

function colMap_(headers) {
  var col = {};
  headers.forEach(function (h, i) { if (h !== '' && !(h in col)) col[h] = i; });
  return col;
}

// ---------- reading ----------

function cellOut_(v, field, cfg, tz) {
  if (v === '' || v === null) return undefined;
  if (v instanceof Date) {
    if (cfg.dates && cfg.dates.indexOf(field) >= 0) return Utilities.formatDate(v, tz, 'yyyy-MM-dd');
    return v.toISOString();
  }
  if (typeof v !== 'string') return v;
  var declared = cfg.json && cfg.json.indexOf(field) >= 0;
  var looksJson = cfg.fields.indexOf(field) < 0 && (v.charAt(0) === '{' || v.charAt(0) === '[');
  if (declared || looksJson) { try { return JSON.parse(v); } catch (e) { return v; } }
  return v;
}

function readRows_(sh) {
  var lastRow = sh.getLastRow(), lastCol = sh.getLastColumn();
  if (lastRow < 2 || lastCol < 1) return [];
  return sh.getRange(2, 1, lastRow - 1, lastCol).getValues();
}

function readEntity_(ss, name) {
  var cfg = ENTITIES[name];
  var sh = ss.getSheetByName(cfg.tab);
  if (!sh) return [];
  var tz = ss.getSpreadsheetTimeZone();
  var headers = headers_(sh);
  var records = [];
  readRows_(sh).forEach(function (row) {
    if (row.join('') === '') return;
    var r = {};
    headers.forEach(function (h, i) {
      if (!h) return;
      var v = cellOut_(row[i], h, cfg, tz);
      if (v !== undefined) r[h] = v;
    });
    if (!r.id) return;
    r.id = String(r.id);
    if (typeof r.notes === 'number') r.notes = String(r.notes);
    if (name === 'GameLog' && r.game_name !== undefined) r.game_name = String(r.game_name);
    if (name === 'PlayerProfile' && r.player_name !== undefined) r.player_name = String(r.player_name);
    records.push(r);
  });
  if (name === 'GameLog') {
    var byGame = readGamePlayers_(ss);
    records.forEach(function (r) { r.players = byGame[r.id] || []; });
  }
  return records;
}

function readGamePlayers_(ss) {
  var sh = ss.getSheetByName(PLAYERS_TAB);
  var byGame = {};
  if (!sh) return byGame;
  var col = colMap_(headers_(sh));
  readRows_(sh).forEach(function (row) {
    var gid = String(row[col.game_id] || '');
    var name = row[col.name];
    if (!gid || name === '' || name === null) return;
    var p = { name: String(name) };
    var f = row[col.faction];
    if (f !== '' && f !== null && f !== undefined) p.faction = String(f);
    var s = row[col.score];
    if (s !== '' && s !== null && s !== undefined && !isNaN(Number(s))) p.score = Number(s);
    var w = row[col.winner];
    p.is_winner = w === true || String(w).toUpperCase() === 'TRUE';
    (byGame[gid] = byGame[gid] || []).push(p);
  });
  return byGame;
}

// ---------- writing ----------

function newId_() { return Utilities.getUuid().replace(/-/g, '').slice(0, 16); }

function cellIn_(v) {
  if (v === undefined || v === null) return '';
  if (typeof v === 'object') return JSON.stringify(v);
  return v;
}

/** Writes record fields into row (1-based), adding columns for fields the tab doesn't have. */
function writeRow_(sh, rowNum, record) {
  var headers = headers_(sh);
  var col = colMap_(headers);
  Object.keys(record).forEach(function (k) {
    if (k === 'players') return;
    if (!(k in col)) {
      if (record[k] === undefined || record[k] === null || record[k] === '') return;
      if (!/^[\w &()'-]{1,60}$/.test(k)) return;
      addColumn_(sh, k);
      headers = headers_(sh);
      col = colMap_(headers);
    }
  });
  ensureRows_(sh, rowNum);
  var range = sh.getRange(rowNum, 1, 1, headers.length);
  range.setNumberFormat('@');   // text, so dates and numbers-in-notes stay exactly as the site sent them
  var row = range.getValues()[0];
  Object.keys(record).forEach(function (k) {
    if (k === 'players' || !(k in col)) return;
    var v = cellIn_(record[k]);
    row[col[k]] = typeof v === 'string' && v.length > 49000 ? v.slice(0, 49000) : v;
  });
  range.setValues([row]);
}

function ensureRows_(sh, lastNeeded) {
  if (lastNeeded > sh.getMaxRows()) sh.insertRowsAfter(sh.getMaxRows(), lastNeeded - sh.getMaxRows());
}

function findRow_(sh, id) {
  var col = colMap_(headers_(sh));
  if (!('id' in col) || sh.getLastRow() < 2) return 0;
  var ids = sh.getRange(2, col.id + 1, sh.getLastRow() - 1, 1).getDisplayValues();
  for (var i = 0; i < ids.length; i++) if (String(ids[i][0]) === String(id)) return i + 2;
  return 0;
}

function cfg_(entity) {
  var cfg = ENTITIES[entity];
  if (!cfg) throw new Error('Unknown kind of record "' + entity + '".');
  return cfg;
}

function createRecord_(ss, entity, data) {
  var cfg = cfg_(entity);
  var sh = tab_(ss, cfg.tab, cfg.fields);
  var now = new Date().toISOString();
  var rec = {};
  Object.keys(data).forEach(function (k) { rec[k] = data[k]; });
  rec.id = data.id ? String(data.id) : newId_();
  rec.created_date = data.created_date || now;
  rec.updated_date = data.updated_date || now;
  writeRow_(sh, sh.getLastRow() + 1, rec);
  if (entity === 'GameLog') writeGamePlayers_(ss, rec);
  return readOne_(ss, entity, rec.id);
}

function updateRecord_(ss, entity, id, data) {
  var cfg = cfg_(entity);
  var sh = tab_(ss, cfg.tab, cfg.fields);
  var row = findRow_(sh, id);
  if (!row) throw new Error('That record isn\'t in the sheet any more (deleted there?). Reload and try again.');
  var rec = {};
  Object.keys(data).forEach(function (k) { if (k !== 'id' && k !== 'created_date') rec[k] = data[k]; });
  rec.updated_date = new Date().toISOString();
  writeRow_(sh, row, rec);
  if (entity === 'GameLog') {
    var cur = readOne_(ss, entity, id);
    if (data.players) cur.players = data.players;
    writeGamePlayers_(ss, cur);
  }
  return readOne_(ss, entity, id);
}

function deleteRecord_(ss, entity, id) {
  var cfg = cfg_(entity);
  var sh = ss.getSheetByName(cfg.tab);
  if (!sh) return;
  var row = findRow_(sh, id);
  if (row) sh.deleteRow(row);
  if (entity === 'GameLog') removeGamePlayers_(ss, id);
}

function readOne_(ss, entity, id) {
  var all = readEntity_(ss, entity);
  for (var i = 0; i < all.length; i++) if (all[i].id === String(id)) return all[i];
  return null;
}

function removeGamePlayers_(ss, gameId) {
  var sh = ss.getSheetByName(PLAYERS_TAB);
  if (!sh || sh.getLastRow() < 2) return;
  var col = colMap_(headers_(sh));
  var ids = sh.getRange(2, col.game_id + 1, sh.getLastRow() - 1, 1).getDisplayValues();
  for (var i = ids.length - 1; i >= 0; i--) if (String(ids[i][0]) === String(gameId)) sh.deleteRow(i + 2);
}

function playerRows_(game, headers) {
  var col = colMap_(headers);
  return (game.players || []).filter(function (p) { return p && p.name; }).map(function (p) {
    var row = headers.map(function () { return ''; });
    row[col.game_id] = game.id;
    row[col.date_played] = game.date_played || '';
    row[col.game] = game.game_name || '';
    row[col.name] = p.name;
    row[col.faction] = p.faction || '';
    row[col.score] = (p.score === null || p.score === undefined || p.score === '' || isNaN(Number(p.score))) ? '' : Number(p.score);
    row[col.winner] = !!p.is_winner;
    return row;
  });
}

/** Replaces a game's rows on Game Players (kept in the same place when the game already had rows). */
function writeGamePlayers_(ss, game) {
  var sh = tab_(ss, PLAYERS_TAB, PLAYER_FIELDS);
  var headers = headers_(sh);
  var col = colMap_(headers);
  var rows = playerRows_(game, headers);
  var at = 0;
  if (sh.getLastRow() >= 2) {
    var ids = sh.getRange(2, col.game_id + 1, sh.getLastRow() - 1, 1).getDisplayValues();
    for (var i = ids.length - 1; i >= 0; i--) if (String(ids[i][0]) === String(game.id)) { sh.deleteRow(i + 2); at = i + 2; }
  }
  if (!rows.length) return;
  if (at) sh.insertRowsBefore(at, rows.length);
  else { at = sh.getLastRow() + 1; ensureRows_(sh, at + rows.length - 1); }
  writePlayerBlock_(sh, at, rows, headers);
}

/** Text columns as text, score as a number, winner as a checkbox. (Checkboxes go in first: inserting them clears values.) */
function writePlayerBlock_(sh, at, rows, headers) {
  var col = colMap_(headers);
  sh.getRange(at, 1, rows.length, headers.length).setNumberFormat('@');
  sh.getRange(at, col.score + 1, rows.length, 1).setNumberFormat('General');
  sh.getRange(at, col.winner + 1, rows.length, 1).setNumberFormat('General').insertCheckboxes();
  sh.getRange(at, 1, rows.length, headers.length).setValues(rows);
}

// ---------- uploads ----------

function uploadFolder_() {
  var props = PropertiesService.getScriptProperties();
  var id = props.getProperty('UPLOAD_FOLDER');
  if (id) { try { return DriveApp.getFolderById(id); } catch (e) { /* deleted: make a new one */ } }
  var folder = DriveApp.createFolder('GameNight Uploads');
  props.setProperty('UPLOAD_FOLDER', folder.getId());
  return folder;
}

function storeBlob_(blob) {
  var file = uploadFolder_().createFile(blob);
  file.setSharing(DriveApp.Access.ANYONE_WITH_LINK, DriveApp.Permission.VIEW);
  return 'https://lh3.googleusercontent.com/d/' + file.getId();
}

function saveUpload_(body) {
  var bytes = Utilities.base64Decode(body.data || '');
  var name = String(body.name || 'upload').slice(0, 120);
  return storeBlob_(Utilities.newBlob(bytes, body.mimeType || 'application/octet-stream', new Date().getTime() + '-' + name));
}

// ---------- moving off Base44 ----------

function importAll_(ss, entities, replace) {
  var counts = {};
  Object.keys(entities).forEach(function (name) {
    var cfg = cfg_(name);
    var list = entities[name] || [];
    var sh = tab_(ss, cfg.tab, cfg.fields);
    if (replace && sh.getLastRow() > 1) sh.deleteRows(2, sh.getLastRow() - 1);
    if (name === 'GameLog') {
      var gp = tab_(ss, PLAYERS_TAB, PLAYER_FIELDS);
      if (replace && gp.getLastRow() > 1) gp.deleteRows(2, gp.getLastRow() - 1);
    }
    // add any extra fields as columns first, then write everything in one go
    var keep = {};
    list.forEach(function (r) { Object.keys(r).forEach(function (k) { keep[k] = true; }); });
    ['players', 'created_by', 'created_by_id', 'is_sample', 'app_id', 'entity_name', 'is_deleted', 'deleted_date', 'environment']
      .forEach(function (k) { delete keep[k]; });
    var headers = headers_(sh);
    Object.keys(keep).forEach(function (k) { if (headers.indexOf(k) < 0 && /^[\w &()'-]{1,60}$/.test(k)) { addColumn_(sh, k); headers = headers_(sh); } });
    var col = colMap_(headers);
    var rows = list.map(function (r) {
      var row = headers.map(function () { return ''; });
      Object.keys(r).forEach(function (k) { if (k in col && keep[k]) row[col[k]] = cellIn_(r[k]); });
      if (!row[col.id]) row[col.id] = newId_();
      return row;
    });
    // oldest first, like rows added over time
    rows.sort(function (a, b) { return String(a[col.created_date]).localeCompare(String(b[col.created_date])); });
    if (rows.length) {
      var first = sh.getLastRow() + 1;
      ensureRows_(sh, first + rows.length - 1);
      sh.getRange(first, 1, rows.length, headers.length).setNumberFormat('@').setValues(rows);
    }
    if (name === 'GameLog') {
      var gsh = ss.getSheetByName(PLAYERS_TAB);
      var gh = headers_(gsh);
      var prow = [];
      var sorted = list.slice().sort(function (a, b) { return String(a.created_date).localeCompare(String(b.created_date)); });
      sorted.forEach(function (g) { prow = prow.concat(playerRows_(g, gh)); });
      if (prow.length) {
        var start = gsh.getLastRow() + 1;
        ensureRows_(gsh, start + prow.length - 1);
        writePlayerBlock_(gsh, start, prow, gh);
      }
    }
    counts[name] = list.length;
  });
  return counts;
}

/** Copies every media.base44.com image the sheet points at (plus `extra`) into Drive and repoints the sheet. */
function copyImages_(ss, extra) {
  var re = /https:\/\/[\w.-]*base44\.(?:com|app)\/[^\s"'\\)]+/g;
  var map = {};
  var props = PropertiesService.getScriptProperties();
  var saved = JSON.parse(props.getProperty('IMAGE_MAP') || '{}');
  function moved(url) {
    if (map[url]) return map[url];
    if (saved[url]) return (map[url] = saved[url]);
    try {
      var resp = UrlFetchApp.fetch(url, { muteHttpExceptions: true });
      if (resp.getResponseCode() !== 200) return url;
      var name = url.split('/').pop().split('?')[0] || 'image';
      map[url] = storeBlob_(resp.getBlob().setName(name));
      saved[url] = map[url];
      return map[url];
    } catch (e) { return url; }
  }
  (extra || []).forEach(moved);
  Object.keys(ENTITIES).forEach(function (n) {
    var sh = ss.getSheetByName(ENTITIES[n].tab);
    if (!sh || sh.getLastRow() < 2) return;
    var range = sh.getRange(2, 1, sh.getLastRow() - 1, sh.getLastColumn());
    var vals = range.getValues();
    var changed = false;
    vals.forEach(function (row) {
      row.forEach(function (v, i) {
        if (typeof v !== 'string' || v.indexOf('base44') < 0) return;
        var nv = v.replace(re, function (u) { return moved(u); });
        if (nv !== v) { row[i] = nv; changed = true; }
      });
    });
    if (changed) range.setValues(vals);
  });
  props.setProperty('IMAGE_MAP', JSON.stringify(saved));
  return map;
}
