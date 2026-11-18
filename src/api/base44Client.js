// Stand-in for the old Base44 SDK. The pages still call base44.entities.X.list / filter / create /
// update / delete and base44.integrations.Core.UploadFile exactly as before; underneath, everything
// goes to the GameNight Google Sheet through its web app (apps-script/GameNightApi.gs).
//
// Instant updates: this keeps a local copy of the sheet (also saved in the browser, so the app opens
// straight away with the last data it saw). Changes are applied to that copy immediately and queued;
// the queue is sent to the sheet in the background, in order, retrying if the connection drops.
// When fresh data arrives from the sheet, anything still queued is re-applied on top of it, so your
// own changes never flicker away while they're on their way.
import { getSheetUrl, getSheetKey } from "@/lib/sheet-link";

const ENTITIES = ["GameLog", "PlayerProfile", "UserPreferences", "BoardGame"];
const CACHE_KEY = "gamenight_cache_v1";
const OUTBOX_KEY = "gamenight_outbox_v1";
const REFRESH_AFTER_MS = 15000;      // re-check the sheet when data is older than this and someone reads it
const POLL_MS = 45000;               // and every so often while the app is open (other people's games)

export class SheetError extends Error {
  constructor(message, status) {
    super(message);
    this.status = status;
  }
}

async function call(body) {
  const url = getSheetUrl();
  const key = getSheetKey();
  if (!url) throw new SheetError("The sheet link isn't set yet.", 401);
  let res;
  try {
    res = body
      ? await fetch(url, {
          method: "POST",
          redirect: "follow",
          // text/plain keeps this a "simple" request, so Apps Script doesn't need CORS preflight
          headers: { "Content-Type": "text/plain;charset=utf-8" },
          body: JSON.stringify(key ? { key, ...body } : body),
        })
      : await fetch(url, { redirect: "follow" });
  } catch {
    throw new SheetError("Couldn't reach the sheet. Check your connection.", 0);
  }
  let out;
  // Google sometimes answers with an HTML error page when it's busy: treat that like a dropped connection
  try { out = await res.json(); } catch { throw new SheetError("The sheet is busy. Trying again.", 0); }
  if (!out.ok) throw new SheetError(out.error || "The sheet refused that.", out.auth === false ? 401 : 400);
  return out;
}

// ---------- local copy ----------

const load = (k, fallback) => {
  try { const v = localStorage.getItem(k); return v ? JSON.parse(v) : fallback; } catch { return fallback; }
};
const save = (k, v) => {
  try { localStorage.setItem(k, JSON.stringify(v)); } catch { /* full / private mode: still works in memory */ }
};

let serverData = load(CACHE_KEY, null)?.data || null;   // last thing the sheet said
let serverAt = 0;                                        // when (0 = not yet this session)
let outbox = load(OUTBOX_KEY, []);                       // changes not yet confirmed by the sheet
let view = null;                                         // serverData + outbox: what the app shows
let confirmCount = 0;                                    // bumps whenever the sheet confirms a change

const listeners = new Set();     // told when the shown data changes because of the sheet
const statusListeners = new Set();
let status = { pending: outbox.length, error: null };

function setStatus(patch) {
  status = { ...status, ...patch, pending: outbox.length };
  statusListeners.forEach((f) => f(status));
}

const clone = (d) => JSON.parse(JSON.stringify(d || {}));
function rebuildView() {
  let d = clone(serverData);
  ENTITIES.forEach((e) => { d[e] = d[e] || []; });
  outbox.forEach((op) => { d = applyOp(d, op); });
  view = d;
}

function applyOp(d, op) {
  const list = d[op.entity] || [];
  if (op.type === "create") {
    d[op.entity] = [...list.filter((r) => r.id !== op.record.id), op.record];
  } else if (op.type === "update") {
    d[op.entity] = list.map((r) => (r.id === op.id ? { ...r, ...op.data, id: r.id, updated_date: op.at } : r));
  } else if (op.type === "delete") {
    d[op.entity] = list.filter((r) => r.id !== op.id);
  } else if (op.type === "rename") {
    const oldKey = op.from.trim().toLowerCase();
    const newKey = op.to.trim().toLowerCase();
    d.GameLog = (d.GameLog || []).map((g) =>
      String(g.game_name || "").trim().toLowerCase() === oldKey ? { ...g, game_name: op.to, updated_date: op.at } : g);
    d.UserPreferences = (d.UserPreferences || []).map((p) => {
      const out = { ...p };
      ["custom_factions", "custom_scoresheets", "live_score_templates"].forEach((f) => {
        const obj = out[f];
        if (!obj || typeof obj !== "object" || !(oldKey in obj)) return;
        const copy = { ...obj };
        const entry = copy[oldKey];
        if (newKey !== oldKey) delete copy[oldKey];
        if (newKey === oldKey || !(newKey in copy)) {
          copy[newKey] = entry && typeof entry === "object" && "label" in entry ? { ...entry, label: op.to } : entry;
        }
        out[f] = copy;
      });
      return out;
    });
  }
  return d;
}

function notify() { listeners.forEach((f) => f()); }

// ---------- reading ----------

let fetching = null;
function refresh() {
  if (fetching) return fetching;
  const startedAt = confirmCount;
  fetching = call(null)
    .then((o) => {
      fetching = null;
      // A change got confirmed while this was in flight, so this copy may predate it: ask again.
      if (confirmCount !== startedAt) return refresh();
      const before = JSON.stringify(view);
      serverData = o.data;
      serverAt = Date.now();
      save(CACHE_KEY, { data: serverData, at: serverAt });
      rebuildView();
      if (JSON.stringify(view) !== before) notify();
      return view;
    })
    .catch((e) => { fetching = null; throw e; });
  return fetching;
}

async function getAll() {
  if (!view && (serverData || outbox.length)) rebuildView();
  if (view) {
    // show what we have now; check the sheet in the background if it's been a while
    if (Date.now() - serverAt > REFRESH_AFTER_MS) refresh().catch(() => {});
    return view;
  }
  // very first open on this device: nothing saved yet, so wait for the sheet
  return refresh();
}

// ---------- writing ----------

function newId() {
  const c = globalThis.crypto;
  return (c?.randomUUID ? c.randomUUID() : Math.random().toString(16).slice(2) + Date.now().toString(16)).replace(/-/g, "").slice(0, 16);
}

let inFlight = null;   // the change currently being sent (never merged into)

function queue(op) {
  op.at = op.at || new Date().toISOString();
  op.n = 0;
  const last = outbox[outbox.length - 1];
  if (op.type === "update" && last && last !== inFlight && last.type === "update" && last.entity === op.entity && last.id === op.id) {
    // several quick edits to the same thing (e.g. adding categories in a row) go to the sheet as one save
    Object.assign(last.data, op.data);
    last.at = op.at;
  } else {
    outbox.push(op);
  }
  save(OUTBOX_KEY, outbox);
  if (!view) rebuildView();
  else view = applyOp(clone(view), op);
  setStatus({ error: null });
  pump();
}

let pumping = false;
let retryTimer = null;
async function pump() {
  if (pumping || !outbox.length) return;
  pumping = true;
  clearTimeout(retryTimer);
  while (outbox.length) {
    const op = outbox[0];
    inFlight = op;
    try {
      if (op.type === "create") await call({ action: "create", entity: op.entity, data: op.record });
      else if (op.type === "update") await call({ action: "update", entity: op.entity, id: op.id, data: op.data });
      else if (op.type === "delete") await call({ action: "delete", entity: op.entity, id: op.id });
      else if (op.type === "rename") await call({ action: "renameGame", from: op.from, to: op.to });
      // confirmed: fold it into what we believe the sheet holds
      inFlight = null;
      outbox.shift();
      serverData = applyOp(clone(serverData), op);
      confirmCount++;
      save(OUTBOX_KEY, outbox);
      save(CACHE_KEY, { data: serverData, at: serverAt });
      setStatus({ error: null });
    } catch (e) {
      inFlight = null;
      op.n = (op.n || 0) + 1;
      const retryable = e.status === 0 && op.n < 8;
      if (retryable) {
        save(OUTBOX_KEY, outbox);
        setStatus({ error: navigator.onLine === false ? "Offline: changes will save when you're back online" : "Saving is taking a while… retrying" });
        retryTimer = setTimeout(pump, Math.min(30000, 1500 * 2 ** (op.n - 1)));
        pumping = false;
        return;
      }
      // the sheet said no (e.g. the game was deleted there): drop it and show the sheet's version
      outbox.shift();
      save(OUTBOX_KEY, outbox);
      rebuildView();
      notify();
      setStatus({ error: `Couldn't save a change: ${e.message}` });
    }
  }
  pumping = false;
  setStatus({});
  // line everything up with the sheet once the queue is empty
  setTimeout(() => { if (!outbox.length) refresh().catch(() => {}); }, 1200);
}

// retry straight away when the connection comes back / the app is reopened
if (typeof window !== "undefined") {
  window.addEventListener("online", () => pump());
  document.addEventListener("visibilitychange", () => {
    if (document.visibilityState !== "visible") return;
    pump();
    if (Date.now() - serverAt > REFRESH_AFTER_MS) refresh().catch(() => {});
  });
  setInterval(() => {
    if (document.visibilityState === "visible" && !outbox.length) refresh().catch(() => {});
  }, POLL_MS);
  if (outbox.length) setTimeout(pump, 500);
}

// ---------- the Base44-shaped API the pages use ----------

function sortRecords(records, sort) {
  if (!sort) return records;
  const desc = sort.startsWith("-");
  const field = desc ? sort.slice(1) : sort;
  return [...records].sort((a, b) => {
    const av = a[field] ?? "", bv = b[field] ?? "";
    if (av < bv) return desc ? 1 : -1;
    if (av > bv) return desc ? -1 : 1;
    return 0;
  });
}

function entity(name) {
  return {
    async list(sort, limit) {
      const all = (await getAll())[name] || [];
      const sorted = sortRecords(all, sort || "-created_date");
      return limit ? sorted.slice(0, limit) : sorted;
    },
    async filter(query = {}, sort, limit) {
      const all = (await getAll())[name] || [];
      const hits = all.filter((r) => Object.entries(query).every(([k, v]) => r[k] === v));
      const sorted = sortRecords(hits, sort || "-created_date");
      return limit ? sorted.slice(0, limit) : sorted;
    },
    async get(id) {
      const all = (await getAll())[name] || [];
      return all.find((r) => r.id === id) || null;
    },
    async create(data) {
      const now = new Date().toISOString();
      const record = clone({ ...data, id: data.id || newId(), created_date: data.created_date || now, updated_date: now });
      queue({ type: "create", entity: name, record, at: now });
      return record;
    },
    async update(id, data) {
      const now = new Date().toISOString();
      queue({ type: "update", entity: name, id, data: clone(data), at: now });
      return (view[name] || []).find((r) => r.id === id) || { id, ...data };
    },
    async delete(id) {
      queue({ type: "delete", entity: name, id });
      return { id };
    },
  };
}

// Big phone photos are shrunk before upload (they're only ever shown as backgrounds / avatars).
async function shrinkImage(file, maxSide = 1600) {
  if (!file.type.startsWith("image/") || file.type === "image/gif" || file.type === "image/svg+xml") return file;
  try {
    const bmp = await createImageBitmap(file);
    const scale = Math.min(1, maxSide / Math.max(bmp.width, bmp.height));
    if (scale === 1 && file.size < 1.5e6) return file;
    const canvas = document.createElement("canvas");
    canvas.width = Math.round(bmp.width * scale);
    canvas.height = Math.round(bmp.height * scale);
    canvas.getContext("2d").drawImage(bmp, 0, 0, canvas.width, canvas.height);
    const blob = await new Promise((r) => canvas.toBlob(r, "image/jpeg", 0.85));
    return blob ? new File([blob], file.name.replace(/\.\w+$/, "") + ".jpg", { type: "image/jpeg" }) : file;
  } catch {
    return file;
  }
}

function toBase64(file) {
  return new Promise((resolve, reject) => {
    const r = new FileReader();
    r.onload = () => resolve(String(r.result).split(",")[1]);
    r.onerror = reject;
    r.readAsDataURL(file);
  });
}

const entities = Object.fromEntries(ENTITIES.map((n) => [n, entity(n)]));
// Renames a game on every log at once (plus any templates saved under its name).
entities.GameLog.renameAll = async (from, to) => {
  if (!view) await getAll();
  const key = from.trim().toLowerCase();
  const count = (view.GameLog || []).filter((g) => String(g.game_name || "").trim().toLowerCase() === key).length;
  queue({ type: "rename", entity: "GameLog", from, to });
  return count;
};

/** Called (with no arguments) when data shown on screen changed because of the sheet. Returns an unsubscribe. */
export function onSheetChange(fn) { listeners.add(fn); return () => listeners.delete(fn); }
/** Called with { pending, error } whenever the save queue changes. Returns an unsubscribe. */
export function onSaveStatus(fn) { statusListeners.add(fn); fn(status); return () => statusListeners.delete(fn); }
export function retrySaving() { pump(); }

export const base44 = {
  entities,
  integrations: {
    Core: {
      // uploads still wait for the sheet (the picture needs its Drive link before it can be shown)
      async UploadFile({ file }) {
        const small = await shrinkImage(file);
        const out = await call({ action: "upload", name: small.name, mimeType: small.type || "application/octet-stream", data: await toBase64(small) });
        return { file_url: out.file_url };
      },
    },
  },
  auth: {
    async me() {
      const out = await call({ action: "ping" });
      return { role: "admin", sheet: out.sheet };
    },
  },
};
