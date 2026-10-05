import fs from 'node:fs/promises';
import { fileURLToPath } from 'node:url';
import { createZip } from './archive.mjs';

const root = new URL('../', import.meta.url);
const paths = [
  '.gitignore', 'LICENSE', 'README.md', 'package.json', 'package-lock.json',
  'netlify.toml', 'scripts/archive.mjs', 'scripts/package-source.mjs',
  'scripts/package-source.py', 'scripts/package-netlify.py',
  'scripts/restore-vendor.mjs', 'dist/index.html', 'dist/style.css',
  'dist/fonts.css', 'dist/app.js', 'dist/engine.js', 'dist/engine-core.js',
  'dist/licenses.html', 'dist/LICENSE.txt',
];
const entries = await Promise.all(paths.map(async path => ({
  name: 'pdf-editor/' + path,
  data: await fs.readFile(new URL(path, root)),
})));
const output = new URL('dist/source.zip', root);
await fs.writeFile(output, createZip(entries));
console.log('Source download generated: ' + fileURLToPath(output));
