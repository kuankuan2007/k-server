import { defineConfig } from 'rolldown';

export default defineConfig([
  {
    input: 'test/src/index.ts',
    platform: 'node',
    output: {
      file: 'test/dist/index.js',
      format: 'esm',
      sourcemap: true,
      cleanDir: true,
    },
  },
]);
