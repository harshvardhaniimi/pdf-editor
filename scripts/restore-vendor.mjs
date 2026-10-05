import fs from 'node:fs/promises';
const groups={
 'dist/vendor/mupdf':[['node_modules/mupdf/dist/','mupdf.js'],['node_modules/mupdf/dist/','mupdf-wasm.js'],['node_modules/mupdf/dist/','mupdf-wasm.wasm']],
 'dist/vendor/ocr':[['node_modules/tesseract.js/dist/','tesseract.esm.min.js'],['node_modules/tesseract.js/dist/','worker.min.js'],['node_modules/tesseract.js-core/','tesseract-core-lstm.wasm.js'],['node_modules/tesseract.js-core/','tesseract-core-lstm.wasm']],
 'dist/vendor/lang':[['node_modules/@tesseract.js-data/eng/4.0.0/','eng.traineddata.gz']]
};
for(const [directory,files] of Object.entries(groups)){await fs.mkdir(directory,{recursive:true});for(const [prefix,name] of files)await fs.copyFile(prefix+name,directory+'/'+name);}
await fs.copyFile('node_modules/mupdf/LICENSE','dist/LICENSE.txt');
await fs.copyFile('node_modules/tesseract.js/LICENSE.md','dist/vendor/ocr/LICENSE.md');
await fs.copyFile('node_modules/tesseract.js-core/LICENSE','dist/vendor/ocr/CORE-LICENSE.txt');
console.log('Local PDF and OCR dependencies restored. Serve dist/ over HTTP.');
