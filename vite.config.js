import react from '@vitejs/plugin-react'
import { defineConfig } from 'vite'

// https://vite.dev/config/
// base is set for GitHub Pages project-site hosting at /zero-glutes-given/
export default defineConfig({
  base: process.env.GITHUB_ACTIONS ? '/zero-glutes-given/' : '/',
  plugins: [react()],
})
