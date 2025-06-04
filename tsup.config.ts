import { defineConfig } from 'tsup';

export default defineConfig({
  entry: ['src/EventPool.ts'],
  format: ['cjs', 'esm'],
  dts: true,
  clean: true,
  outDir: 'dist',
  treeshake: true,
  minify: true,
  splitting: false,
  sourcemap: true,
});
