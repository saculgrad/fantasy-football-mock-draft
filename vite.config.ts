import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// https://vite.dev/config/
export default defineConfig({
  // GitHub Pages project sites are served at /<repo-name>/, not the domain
  // root, so asset URLs need this base prefix or they'll 404 once deployed.
  base: '/fantasy-football-mock-draft/',
  plugins: [react()],
})
