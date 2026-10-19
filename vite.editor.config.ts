import { resolve } from 'node:path'
import { defineConfig } from 'vite'

export default defineConfig({
  base: './',
  build: {
    outDir: 'dist-editor',
    emptyOutDir: true,
    rollupOptions: {
      input: resolve(__dirname, 'editor.html'),
    },
  },
})
