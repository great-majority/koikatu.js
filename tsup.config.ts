import { defineConfig } from 'tsup';

export default defineConfig([
  {
    entry: ['src/index.ts'],
    format: ['esm', 'cjs'],
    dts: true,
    splitting: false,
    clean: true,
    sourcemap: true,
  },
  {
    entry: ['src/index.ts'],
    format: ['iife'],
    globalName: 'KoikatuJS',
    outExtension: () => ({ js: '.global.js' }),
    platform: 'browser',
    noExternal: ['@msgpack/msgpack'],
    splitting: false,
    clean: false,
    sourcemap: true,
  },
  {
    entry: ['src/index.ts'],
    format: ['iife'],
    globalName: 'KoikatuJS',
    outExtension: () => ({ js: '.global.min.js' }),
    platform: 'browser',
    noExternal: ['@msgpack/msgpack'],
    splitting: false,
    clean: false,
    sourcemap: true,
    minify: true,
  },
]);
