// The GameNight sheet's web app (apps-script/GameNightApi.gs).
// each person pastes it once and their browser remembers it.
export const SHEET_URL = "https://script.google.com/macros/s/AKfycbxhls64VPLWJg-0RbuKIeKrdqcm6evlhfl5gsJVo6zBbdhR8gNB9yi2dxyDwcwhQ5Xd/exec";

const KEY_STORE = "gamenight_sheet_key";
const URL_STORE = "gamenight_sheet_url";

export function getSheetUrl() {
  try { return localStorage.getItem(URL_STORE) || SHEET_URL; } catch { return SHEET_URL; }
}
export function getSheetKey() {
  try { return localStorage.getItem(KEY_STORE) || ""; } catch { return ""; }
}
export function saveSheetLink({ url, key }) {
  try {
    if (url !== undefined) {
      if (url && url !== SHEET_URL) localStorage.setItem(URL_STORE, url);
      else localStorage.removeItem(URL_STORE);
    }
    if (key !== undefined) {
      if (key) localStorage.setItem(KEY_STORE, key);
      else localStorage.removeItem(KEY_STORE);
    }
  } catch { /* private mode */ }
}
