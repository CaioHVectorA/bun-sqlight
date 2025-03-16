import * as fs from 'fs';
const build = await Bun.build({
  entrypoints: ['./src/index.ts'],
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
