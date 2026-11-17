// Stand-in for the old Base44 SDK. The pages still call base44.entities.X.list / filter / create /
// update / delete and base44.integrations.Core.UploadFile exactly as before; underneath, everything
// goes to the GameNight Google Sheet through its web app (apps-script/GameNightApi.gs).
import { getSheetUrl, getSheetKey } from "@/lib/sheet-link";

const ENTITIES = ["GameLog", "PlayerProfile", "UserPreferences", "BoardGame"];

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
  if (!key) throw new SheetError("Enter the key first.", 401);
  let res;
  try {
    res = body
      ? await fetch(url, {
          method: "POST",
          redirect: "follow",
          // text/plain keeps this a "simple" request, so Apps Script doesn't need CORS preflight
          headers: { "Content-Type": "text/plain;charset=utf-8" },
          body: JSON.stringify({ key, ...body }),
        })
      : await fetch(url + (url.includes("?") ? "&" : "?") + "key=" + encodeURIComponent(key), { redirect: "follow" });
  } catch {
    throw new SheetError("Couldn't reach the sheet. Check your connection and try again.", 0);
  }
  let out;
  try { out = await res.json(); } catch { throw new SheetError("The sheet sent back something unexpected.", res.status); }
  if (!out.ok) throw new SheetError(out.error || "The sheet refused that.", out.auth === false ? 401 : 400);
  return out;
}

// One read fetches every tab; queries that fire together share it.
let snapshot = null;
let snapshotAt = 0;
function getAll() {
  if (!snapshot || Date.now() - snapshotAt > 2000) {
    snapshotAt = Date.now();
    snapshot = call(null).then((o) => o.data).catch((e) => { snapshot = null; throw e; });
  }
  return snapshot;
}
function dropSnapshot() { snapshot = null; }

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
      const out = await call({ action: "create", entity: name, data });
      dropSnapshot();
      return out.record;
    },
    async update(id, data) {
      const out = await call({ action: "update", entity: name, id, data });
      dropSnapshot();
      return out.record;
    },
    async delete(id) {
      await call({ action: "delete", entity: name, id });
      dropSnapshot();
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

export const base44 = {
  entities: Object.fromEntries(ENTITIES.map((n) => [n, entity(n)])),
  integrations: {
    Core: {
      async UploadFile({ file }) {
        const small = await shrinkImage(file);
        const out = await call({ action: "upload", name: small.name, mimeType: small.type || "application/octet-stream", data: await toBase64(small) });
        return { file_url: out.file_url };
      },
    },
  },
  auth: {
    // "Logged in" now just means: this browser has the sheet's key, and the sheet accepts it.
    async me() {
      const out = await call({ action: "ping" });
      return { role: "admin", sheet: out.sheet };
    },
  },
};
