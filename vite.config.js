import react from '@vitejs/plugin-react'
import { defineConfig } from 'vite'
import path from 'path'
import fs from 'fs'

// Each build gets an id; the site checks version.json (never cached) and reloads itself when a newer build is out.
const BUILD_ID = String(Date.now())
const writeVersion = {
  name: 'write-version',
  writeBundle(opts) {
    fs.writeFileSync(path.join(opts.dir, 'version.json'), JSON.stringify({ id: BUILD_ID }))
  },
}

// https://vite.dev/config/
export default defineConfig({
  base: './', // works at https://<user>.github.io/<repo>/ (pages are under #/ so no server routing needed)
  logLevel: 'error',
  resolve: {
    alias: { '@': path.resolve(__dirname, './src') },
  },
  define: { __BUILD_ID__: JSON.stringify(BUILD_ID) },
  plugins: [react(), writeVersion],
});
