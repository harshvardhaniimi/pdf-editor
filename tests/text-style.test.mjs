import {test} from 'node:test';
import assert from 'node:assert/strict';
import {readFile,writeFile} from 'node:fs/promises';
import M from '../dist/vendor/mupdf/mupdf.js';
import {execute as e} from '../dist/engine-core.js';

// Optional: exercise an actual local TrueType/OpenType font as well as MuPDF's
// bundled fonts. The font is only used locally and is never part of the repo.
const fontData=process.env.PDF_EDITOR_TEST_FONT?await readFile(process.env.PDF_EDITOR_TEST_FONT):null;
function fixture(subset=false){
  const d=new M.PDFDocument(),f=fontData?new M.Font('Test font',fontData):new M.Font('Times-Italic'),bold=new M.Font('Helvetica-Bold');
  const encoded=(font,s)=>[...s].map(c=>font.encodeCharacter(c.codePointAt(0)).toString(16).padStart(4,'0')).join('');
  const text=(s,font,name,x,y,c)=>`${c} rg BT /${name} 20 Tf 1 0 0 1 ${x} ${792-y} Tm <${encoded(font,s)}> Tj ET\n`;
  const resources={Font:{F1:d.addFont(f),F2:d.addFont(bold)}};
  d.insertPage(-1,d.addPage([0,0,612,792],0,resources,text('Original blue text',f,'F1',50,100,'0.12 0.34 0.67')+text('Bold red',bold,'F2',260,100,'0.8 0.1 0.2')+text('Keep this line',f,'F1',50,150,'0 0 0')));
  if(subset)d.subsetFonts();
  const b=d.saveToBuffer('garbage=4,compress=yes'),data=b.asUint8Array().slice();b.destroy();f.destroy();bold.destroy();d.destroy();return data;
}
const getLine=async()=> (await e('info',{page:0})).lines.find(l=>l.text==='Original blue text');
const args=l=>({...l,page:0,font:'original',replace:l.rect,rect:[...l.rect.slice(0,2),245,l.rect[3]+10],text:'Edited blue text'});

test('preserves embedded font, color, baseline and adjacent mixed styles through export and re-edit',async()=>{
  await e('open',{data:fixture()});const l=await getLine();assert(l.fontId);assert.equal(l.color,'#1f57ab');
  const before=(await e('info',{page:0})).lines;assert(before.some(v=>v.text==='Bold red'&&v.color==='#cc1a33'));
  const a=args(l);const preview=await e('textPreview',a);assert(preview.data.length>100);
  await e('text',a);let info=await e('info',{page:0}),added=info.annots[0];
  assert(!info.lines.some(v=>v.text.includes('Original blue')));assert(info.lines.some(v=>v.text==='Bold red'));assert(info.lines.some(v=>v.text==='Keep this line'));
  assert.equal(added.style.font.replace(/^[A-Z]{6}\+/,''),l.font.replace(/^[A-Z]{6}\+/,''));assert.equal(added.style.color,l.color);assert(Math.abs(added.style.baseline-l.baseline)<.01);
  await e('undo');assert(await getLine());await e('redo');
  await e('annot',{page:0,index:0,rect:added.rect.map((v,i)=>v+(i%2?20:10))});const moved=(await e('info',{page:0})).annots[0];assert.equal(moved.style.color,l.color);assert.equal(moved.style.font,added.style.font);
  const pdf=await e('export');await e('open',{data:pdf});added=(await e('info',{page:0})).annots[0];assert.equal(added.style.color,l.color);
  await e('text',{...added.style,page:0,annotation:0,rect:added.rect,font:'original',text:'Reopened blue text'});
  const flattened=await e('export',{flatten:true});await e('open',{data:flattened});info=await e('info',{page:0});const edited=info.lines.find(v=>v.text==='Reopened blue text');assert(edited);assert.equal(edited.color,l.color);assert.equal(edited.font.replace(/^[A-Z]{6}\+/,''),l.font.replace(/^[A-Z]{6}\+/,''));
});

test('subset fonts allow known glyphs, reject missing glyphs without changing the document',async()=>{
  await e('open',{data:fixture(true)});const l=await getLine(),a={...args(l),text:'blue Original text'};
  await e('textPreview',a);await e('text',a);await e('undo');
  const before=await e('meta');await assert.rejects(e('text',{...a,text:'New glyph 🦄'}),/does not contain/);
  assert(await getLine());assert.deepEqual((await e('meta')).journal,before.journal);
  // Choosing a different font remains an explicit way out of a subset limit.
  await e('text',{...a,font:'Helv',text:'Replacement font selected'});
  const added=(await e('info',{page:0})).annots[0];assert.equal(added.style.color,l.color);assert(added.style.fontId);
  const flat=await e('export',{flatten:true});await e('open',{data:flat});assert((await e('info',{page:0})).lines.some(v=>v.text.includes('Replacement font')));
});

test('font uploads are local, used for export, and font handles expire on a new document',async()=>{
  await e('open',{data:fixture(true)});const l=await getLine();
  if(fontData){const imported=await e('importFont',{data:fontData});await e('text',{...args(l),fontId:imported.fontId,text:'Extra letters: xyz'});const a=(await e('info',{page:0})).annots[0];assert(a.style.fontId);assert.equal(a.style.color,l.color);assert(a.text.includes('xyz'));}
  await e('demo');await assert.rejects(e('textPreview',args(l)),/reload its PDF font/);
});

if(process.env.PDF_EDITOR_TEST_FIXTURE)await writeFile(process.env.PDF_EDITOR_TEST_FIXTURE,fixture());
