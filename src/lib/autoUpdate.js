// Browsers (and iPhone home-screen apps) keep the page for a while, so a new version can take
// several minutes to show up. Instead, ask GitHub for the latest build id whenever the app opens or
// comes back to the front, and if it's newer, reload onto a fresh address that skips the old copy.
/* global __BUILD_ID__ */
const CURRENT = typeof __BUILD_ID__ !== "undefined" ? __BUILD_ID__ : "dev";

async function check() {
  if (CURRENT === "dev") return;
  try {
    const res = await fetch("./version.json?t=" + Date.now(), { cache: "no-store" });
    if (!res.ok) return;
    const { id } = await res.json();
    if (!id || id === CURRENT) return;
    // only try once per new build, so a stubborn cache can't cause a reload loop
    const tried = "gamenight_reload_" + id;
    if (sessionStorage.getItem(tried)) return;
    sessionStorage.setItem(tried, "1");
    const url = new URL(window.location.href);
    url.searchParams.set("v", id);
    window.location.replace(url.toString());
  } catch {
    /* offline: try again next time */
  }
}

export function watchForUpdates() {
  check();
  document.addEventListener("visibilitychange", () => {
    if (document.visibilityState === "visible") check();
  });
}
