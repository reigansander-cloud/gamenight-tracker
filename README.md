# GameNight

The GameNight tracker, moved off Base44. Live at https://reigansander-cloud.github.io/gamenight-tracker/ Same pages and components as before; the data now lives in a
Google Sheet ("GameNight") and the site is hosted on GitHub Pages.

## How it fits together

- **The site** (this repo) builds with Vite and deploys to GitHub Pages on every push to `main`
  (`.github/workflows/deploy.yml`).
- **The sheet** has a small Apps Script web app (`apps-script/GameNightApi.gs`) that the site reads and writes
  through. Tabs: `Games`, `Game Players`, `Players`, `Settings`. You can edit them directly in the sheet.
- **No login**: anyone with the site link can view and log games. The sheet's key (GameNight menu →
  Tracker link and key) is only needed for bulk imports.
- **Uploaded pictures** (avatars, live-score backgrounds) go to a Drive folder called *GameNight Uploads*.

`src/api/base44Client.js` is a stand-in for the old Base44 SDK, so the pages still call
`base44.entities.GameLog.list()` etc. exactly as they did; it just talks to the sheet instead.

## Changing the sheet script

Open the sheet → Extensions → Apps Script, paste in `apps-script/GameNightApi.gs`, save, then
Deploy → Manage deployments → edit (pencil) → Version: *New version* → Deploy. The link stays the same.

## Running it locally

```
npm install
npm run dev
```
