import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    include: ['tests/**/*.test.{js,mjs}'],
    globalSetup: './tests/setup/global.mjs',
    setupFiles: ['./tests/setup/ambiente.mjs'],
    // Os arquivos compartilham o mesmo banco de teste, então rodam um de cada vez
    fileParallelism: false,
    testTimeout: 20000,
    hookTimeout: 60000,
    coverage: {
      provider: 'v8',
      include: ['src/**/*.js', '../frontend/src/demo/**/*.js'],
      exclude: ['src/database/migrations/**', 'src/database/seeders/**'],
      reporter: ['text-summary', 'text'],
      allowExternal: true,
    },
  },
});
