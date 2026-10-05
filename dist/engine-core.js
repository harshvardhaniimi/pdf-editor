import mupdf from './vendor/mupdf/mupdf.js';
import {resetFonts, importFont, readTextRuns, hexColor, textAppearance, previewText} from './text-style.js';
const M=mupdf, I=M.Matrix.identity, RGB=M.ColorSpace.DeviceRGB;
let doc=null, pending=null, operationId=0;
const color=h=>[1,3,5].map(i=>parseInt((h||'#172c28').slice(i,i+2),16)/255);
function bytes(d=doc){const b=d.saveToBuffer('garbage=4,compress=yes,encrypt=no');const out=b.asUint8Array().slice();b.destroy();return out;}
function clearPage(p){p.getAnnotations().forEach(a=>a.destroy());p.getWidgets().forEach(a=>a.destroy());p.destroy();}
function metadata(){return {count:doc.countPages(),undo:doc.canUndo(),redo:doc.canRedo(),journal:doc.getJournal(),pages:Array.from({length:doc.countPages()},(_,i)=>{const p=doc.loadPage(i),b=p.getBounds();p.destroy();return {bounds:b,width:b[2]-b[0],height:b[3]-b[1]};})};}
function initialize(d){resetFonts();doc?.destroy();doc=d;doc.disableJS();doc.enableJournal();return metadata();}
function mutate(name,fn){doc.beginOperation(name+' #'+(++operationId));try{fn();doc.endOperation();return metadata();}catch(e){doc.abandonOperation();throw e;}}
function annotate(p,type,r){const a=p.createAnnotation(type);if(a.hasRect())a.setRect(r);a.setFlags(M.PDFAnnotation.IS_PRINT);a.setAuthor('Folio');a.setName('folio-'+Date.now()+'-'+Math.random().toString(36).slice(2,7));return a;}
function addText(p,arg,appearance){const r=appearance?.rect||arg.rect,a=annotate(p,'FreeText',r);a.setContents(arg.text||'');a.setBorderWidth(0);a.setColor([]);a.setDefaultAppearance(arg.font==='original'?'Helv':arg.font||'Helv',+arg.size||16,color(arg.color));
 if(appearance){
  // Build font resources in a temporary document. MuPDF's PDF font cache can
  // otherwise retain references to objects removed by undo and a new edit.
  const scratch=new M.PDFDocument();let sp,sa,stream;
  try{scratch.insertPage(-1,scratch.addPage([0,0,612,792],0,{},''));sp=scratch.loadPage(0);sa=sp.createAnnotation('FreeText');sa.setRect(r);sa.setAppearanceFromDisplayList(null,null,I,appearance.list);const ap=sa.getObject().get('AP','N'),matrix=ap.get('Matrix'),bbox=ap.get('BBox').asJS();stream=ap.readStream();a.setAppearance(null,null,matrix.isNull()?I:matrix.asJS(),bbox,doc.graftObject(ap.get('Resources')),stream);}
  finally{stream?.destroy();if(sp)clearPage(sp);scratch.destroy();}
 }else a.update();return a;}
function removeArea(p,r,scan=false,black=false){const a=annotate(p,'Redact',r);a.setColor(black?[0]:[1]);a.update();p.applyRedactions(black,scan?2:0,0,0);}
function moveText(a,r){const ap=a.getObject().get('AP','N');if(!ap.isStream()){a.setRect(r);return;}const stream=ap.readStream(),matrix=ap.get('Matrix'),bbox=ap.get('BBox').asJS(),resources=ap.get('Resources');try{a.setRect(r);a.setAppearance(null,null,matrix.isNull()?I:matrix.asJS(),bbox,resources,stream);}finally{stream.destroy();}}
function getInfo(index){const p=doc.loadPage(index), list=p.toDisplayList(false);let lines;try{lines=readTextRuns(list);}finally{list.destroy();}
 const annots=p.getAnnotations().map((a,i)=>{let appearance=null,style=null;try{if(a.getType()==='FreeText'){appearance=a.getDefaultAppearance();const dl=a.toDisplayList();try{style=readTextRuns(dl)[0]||null;}finally{dl.destroy();}if(style)style={...style,baselineOffset:style.baseline-a.getBounds()[1]};else style={color:hexColor(appearance.color)};}}catch{}return {index:i,type:a.getType(),rect:a.getBounds(),text:a.getContents(),name:a.getName(),appearance,style};});
 const widgets=p.getWidgets().map((w,i)=>({index:i,type:w.getFieldType(),rect:w.getBounds(),name:w.getLabel()||w.getName(),value:w.getValue(),readOnly:w.isReadOnly(),options:w.isChoice()?w.getOptions():[],maxLength:w.isText()?w.getMaxLen():0}));
 clearPage(p);return {lines,annots,widgets};}
function drawPage(index,scale=1){const p=doc.loadPage(index),b=p.getBounds();scale=Math.min(scale,4500/Math.max(b[2]-b[0],b[3]-b[1]));const pix=p.toPixmap(M.Matrix.scale(scale,scale),RGB,false,true),data=pix.asPNG().slice(),width=pix.getWidth(),height=pix.getHeight();pix.destroy();p.destroy();return {data,width,height,scale};}
function demo(){const d=new M.PDFDocument(), f=new M.Font('Helvetica'),bold=new M.Font('Helvetica-Bold'),serif=new M.Font('Times-Roman');const resources={Font:{F1:d.addSimpleFont(f),F2:d.addSimpleFont(bold),F3:d.addSimpleFont(serif)}};
 const esc=s=>s.replace(/([\\()])/g,'\\$1');const text=(s,x,y,size,font='F1',c='0.09 0.18 0.16')=>`${c} rg BT /${font} ${size} Tf 1 0 0 1 ${x} ${792-y} Tm (${esc(s)}) Tj ET\n`;
 let s='0.99 0.985 0.972 rg 0 0 612 792 re f\n';s+=text('FOLIO',52,59,13,'F2');s+=text('A SPACE TO MAKE IT YOURS',337,58,9,'F1','0.38 0.43 0.41');s+='0.76 0.8 0.77 RG 0.7 w 52 711 m 560 711 l S\n';s+=text('Good ideas deserve',52,150,39,'F3')+text('a little editing.',52,197,39,'F3');s+=text('Make your first edit right here.',52,250,14,'F2');s+=text('This is a real PDF. Select Edit text, then click any line.',52,274,12)+text('Or open a document of your own to get started.',52,294,12);
 s+='0.9 0.945 0.91 rg 52 292 508 149 re f\n';s+=text('YOUR DOCUMENT. YOUR DEVICE.',73,382,10,'F2','0.15 0.35 0.24');s+=text('A private place for your paperwork.',73,416,22,'F3');s+=text('Your files stay in this browser, including scanned pages.',73,447,11)+text('No accounts for editing. No document uploads. Just you and your PDF.',73,468,11);
 s+=text('01',52,553,12,'F2','0.19 0.4 0.27')+text('Change the words',86,552,13,'F2')+text('Click existing text, or add something new.',86,574,11);
 s+=text('02',52,618,12,'F2','0.19 0.4 0.27')+text('Leave your mark',86,617,13,'F2')+text('Add an image, highlight a line, or sign your name.',86,639,11);
 s+=text('03',52,683,12,'F2','0.19 0.4 0.27')+text('Take it with you',86,682,13,'F2')+text('Download your edited PDF whenever you are ready.',86,704,11);
 s+=text('A LITTLE PRACTICE GOES A LONG WAY',52,755,8,'F1','0.45 0.48 0.46')+text('01 / 02',516,755,8);d.insertPage(-1,d.addPage([0,0,612,792],0,resources,s));
 let t=text('A page for your next idea.',52,90,30,'F3')+text('Try adding text, an image, or a handwritten note below.',52,128,12);t+='0.89 0.91 0.90 RG 0.5 w\n';for(let y=192;y<710;y+=36)t+=`52 ${792-y} m 560 ${792-y} l S\n`;t+=text('MAKE SOMETHING YOURS',52,755,8,'F1','0.45 0.48 0.46')+text('02 / 02',516,755,8);d.insertPage(-1,d.addPage([0,0,612,792],0,resources,t));f.destroy();bold.destroy();serif.destroy();return initialize(d);}
export async function execute(action,arg={}){
 if(action==='demo')return demo();
 if(action==='open'){pending?.destroy();pending=new M.PDFDocument(arg.data);if(pending.needsPassword()&&!pending.authenticatePassword(arg.password||''))return {needsPassword:true};const d=pending;pending=null;if(!d.countPages()){d.destroy();throw Error('This PDF has no pages.');}return initialize(d);}
 if(action==='password'){if(!pending||!pending.authenticatePassword(arg.password))throw Error('That password did not unlock this PDF. Please try again.');const d=pending;pending=null;return initialize(d);}
 if(!doc)throw Error('Open a PDF first.');
 if(action==='meta')return metadata();
 if(action==='render')return drawPage(arg.page,arg.scale);
 if(action==='info')return getInfo(arg.page);
 if(action==='importFont')return importFont(arg.data,arg.name);
 if(action==='textPreview')return previewText(arg);
 if(action==='undo'){doc.undo();return metadata();}
 if(action==='redo'){doc.redo();return metadata();}
 if(action==='export'){const copy=new M.PDFDocument(bytes());if(arg.flatten)copy.bake(true,true);if(arg.pages?.length)copy.rearrangePages(arg.pages);const data=bytes(copy);copy.destroy();return data;}
 if(action==='text'){const appearance=arg.font==='original'?textAppearance(arg):null;try{return mutate(arg.replace?'Edit text':'Add text',()=>{const p=doc.loadPage(arg.page);try{if(arg.annotation!=null){const a=p.getAnnotations()[arg.annotation];p.deleteAnnotation(a);}else if(arg.replace){const r=[...arg.replace];const inset=Math.min(2,(r[3]-r[1])*.18);r[1]+=inset;r[3]-=inset;removeArea(p,r,arg.scan,false);}
 if(arg.scan){const a=annotate(p,'Square',arg.replace);a.setColor([]);a.setInteriorColor([1]);a.setBorderWidth(0);a.update();}
 addText(p,arg,appearance);p.update();}finally{clearPage(p);}});}finally{appearance?.list.destroy();}}
 if(action==='add')return mutate('Add '+arg.type,()=>{const p=doc.loadPage(arg.page);let a;
 if(arg.type==='highlight'){a=annotate(p,'Highlight',arg.rect);const [x,y,r,b]=arg.rect;a.setQuadPoints([[x,y,r,y,x,b,r,b]]);a.setColor(color(arg.color||'#f6d756'));a.setOpacity(.45);}
 if(arg.type==='rectangle'||arg.type==='ellipse'||arg.type==='cover'){a=annotate(p,arg.type==='ellipse'?'Circle':'Square',arg.rect);a.setColor(arg.type==='cover'?[]:color(arg.color));a.setBorderWidth(arg.type==='cover'?0:+arg.width||2);if(arg.type==='cover')a.setInteriorColor([1]);}
 if(arg.type==='draw'||arg.type==='signature'){a=annotate(p,'Ink',arg.rect);a.setInkList(arg.strokes||[arg.points]);a.setColor(color(arg.color));a.setBorderWidth(+arg.width||2);}
 if(arg.type==='image'){a=annotate(p,'Stamp',arg.rect);const image=new M.Image(arg.data);a.setStampImage(image);image.destroy();a.setRect(arg.rect);}
 if(arg.type==='redact'){a=annotate(p,'Redact',arg.rect);a.update();p.applyRedactions(true,2,2,0);a=null;}
 if(!a&&arg.type!=='redact')throw Error('Unknown annotation type.');a?.update();p.update();clearPage(p);});
 if(action==='annot')return mutate(arg.remove?'Delete object':'Move object',()=>{const p=doc.loadPage(arg.page),a=p.getAnnotations()[arg.index];if(!a)throw Error('Select an object again.');if(arg.remove)p.deleteAnnotation(a);else{const old=a.getBounds(),r=arg.rect;if(a.hasInkList()){const sx=(r[2]-r[0])/(old[2]-old[0]),sy=(r[3]-r[1])/(old[3]-old[1]);a.setInkList(a.getInkList().map(st=>st.map(([x,y])=>[r[0]+(x-old[0])*sx,r[1]+(y-old[1])*sy])));}else if(a.hasQuadPoints()){const dx=r[0]-old[0],dy=r[1]-old[1];a.setQuadPoints(a.getQuadPoints().map(q=>q.map((v,i)=>v+(i%2?dy:dx))));}else if(a.getType()==='FreeText')moveText(a,r);else a.setRect(r);a.update();}p.update();clearPage(p);});
 if(action==='widget')return mutate('Fill form field',()=>{const p=doc.loadPage(arg.page),w=p.getWidgets()[arg.index];if(w.isReadOnly())throw Error('This field is read-only.');if(w.isCheckbox()||w.isRadioButton())w.toggle();else if(w.isChoice())w.setChoiceValue(arg.value);else if(w.isText())w.setTextValue(arg.value);p.update();clearPage(p);});
 if(action==='rotate')return mutate('Rotate page',()=>{const o=doc.findPage(arg.page),rotation=o.getInheritable('Rotate').asNumber();o.put('Rotate',(rotation+90)%360);});
 if(action==='deletePage')return mutate('Delete page',()=>{if(doc.countPages()<2)throw Error('Keep at least one page in the document.');doc.deletePage(arg.page);});
 if(action==='blank')return mutate('Add blank page',()=>{doc.insertPage(arg.page+1,doc.addPage([0,0,612,792],0,{},''));});
 if(action==='reorder')return mutate('Reorder pages',()=>doc.rearrangePages(arg.order));
 if(action==='duplicate')return mutate('Duplicate page',()=>{const copy=new M.PDFDocument(bytes());const p=copy.loadPage(arg.page);const annots=p.getAnnotations().length||p.getWidgets().length;p.destroy();if(annots)copy.bake(true,true);doc.graftPage(arg.page+1,copy,arg.page);copy.destroy();});
 if(action==='merge')return mutate('Insert PDF pages',()=>{const extra=new M.PDFDocument(arg.data);if(extra.needsPassword()&&!extra.authenticatePassword(arg.password||'')){extra.destroy();throw Error('Unlock the other PDF before inserting it.');}extra.bake(true,true);const map=doc.newGraftMap();for(let i=0;i<extra.countPages();i++)map.graftPage(arg.page+1+i,extra,i);map.destroy();extra.destroy();});
 throw Error('Unknown action: '+action);
}
