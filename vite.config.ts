import { defineConfig } from 'vite'

export default defineConfig({
  // Relative base so the build works both at username.github.io/mgei-schedule/
  // and under any subpath / local preview
  base: './',
})
