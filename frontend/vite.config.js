import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// https://vite.dev/config/
export default defineConfig({
  plugins: [react()],
  // Testes unitários (npm test). Os de interface ficam em e2e/ (Playwright).
  test: {
    include: ['src/**/*.test.js'],
    environment: 'node',
  },
})
