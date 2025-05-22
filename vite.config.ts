import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import path from 'path'
import monacoEditorPlugin from 'vite-plugin-monaco-editor';

// https://vitejs.dev/config/
export default defineConfig({
  plugins: [
    react(),
    // Default options support: json, javascript, typescript, css, html
    // Add other languages as needed, e.g., monacoEditorPlugin({ languageWorkers: ['editorWorkerService', 'css', 'html', 'json', 'typescript', 'java', 'python', 'xml'] })
    monacoEditorPlugin({})
  ],
  base: './',
  build: {
    outDir: 'dist',
    emptyOutDir: true,
  },
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './src'),
    },
  },
  server: {
    port: 5173
  }
})
