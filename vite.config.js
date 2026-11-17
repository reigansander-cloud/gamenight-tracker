import react from '@vitejs/plugin-react'
import { defineConfig } from 'vite'
import path from 'path'

// https://vite.dev/config/
export default defineConfig({
  base: './', // works at https://<user>.github.io/<repo>/ (pages are under #/ so no server routing needed)
  logLevel: 'error',
  resolve: {
    alias: { '@': path.resolve(__dirname, './src') },
  },
  plugins: [react()],
});
