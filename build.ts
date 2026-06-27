import { $ } from 'bun';
import * as fs from 'fs';

const build = await Bun.build({
  entrypoints: ['./src/index.ts', './src/cli.ts'],
  outdir: './dist/',
  // sourcemap: 'inline',
  format: 'esm',
  minify: {
    syntax: true,
    whitespace: true,
  },
  target: 'bun',
});

const size = fs.statSync('./dist/index.js').size;
console.log(`Built index.js: ${size / 1_000}k bytes`);

console.log('Generating type declarations...');
await $`bun x tsc -p tsconfig.types.json`;
console.log('Type declarations generated successfully.');
