import M from './vendor/mupdf/mupdf.js';

// Font handles stay inside the worker. Keep the actual PDF fonts, including
// subset fonts, rather than trying to infer a replacement from their names.
const fonts = new Map(), pointers = new Map();
let nextFont = 0;
export function resetFonts() {
  for (const entry of fonts.values()) entry.font.destroy();
  fonts.clear(); pointers.clear();
}
function retain(font) {
  let id = pointers.get(font.pointer);
  if (!id) {
    id = 'pdf-font-' + (++nextFont);
    pointers.set(font.pointer, id);
    fonts.set(id, {font: new M.Font(font.pointer), glyphs: new Map()});
  }
  return id;
}
export function importFont(data, name = 'Local font') {
  const font = new M.Font(name, data);
  try { return {fontId: retain(font), font: font.getName()}; }
  finally { font.destroy(); }
}
export function hexColor(c) {
  if (!c?.length) return '#000000';
  const rgb = c.length === 1 ? [c[0], c[0], c[0]] : c.length === 4
    ? c.slice(0, 3).map(v => 1 - Math.min(1, v + c[3])) : c;
  return '#' + rgb.map(v => Math.round(Math.max(0, Math.min(1, v)) * 255).toString(16).padStart(2, '0')).join('');
}
export function readTextRuns(list) {
  // Some PDF subsets have no Unicode cmap. Their existing glyph IDs and
  // ToUnicode mappings still let us reuse the characters that are present.
  const remember = text => text.walk({showGlyph(font, trm, glyph, unicode) {
    const entry = fonts.get(retain(font));
    if (unicode >= 0 && glyph > 0) entry.glyphs.set(unicode, glyph);
  }});
  const device = new M.Device({fillText: remember, strokeText: remember, ignoreText: remember});
  try { list.run(device, M.Matrix.identity); device.close(); }
  finally { device.destroy(); }
  const st = list.toStructuredText('preserve-whitespace'), runs = [];
  let current = null, direction = [1, 0], wmode = 0;
  const finish = () => { if (current?.text.trim()) runs.push(current); current = null; };
  try {
    st.walk({
      beginLine(rect, mode, dir) { finish(); direction = dir; wmode = mode; },
      onChar(c, origin, font, size, quad, rgb, bidi) {
        const fontId = retain(font), color = hexColor(rgb);
        const xs = [quad[0], quad[2], quad[4], quad[6]], ys = [quad[1], quad[3], quad[5], quad[7]];
        const r = [Math.min(...xs), Math.min(...ys), Math.max(...xs), Math.max(...ys)];
        if (current && (current.fontId !== fontId || Math.abs(current.size - size) > .01 || current.color !== color)) finish();
        if (!current) current = {text: '', rect: r, font: font.getName(), fontId, size, color, direction, wmode, bidi, baseline: origin[1], originX: origin[0]};
        else current.rect = [Math.min(current.rect[0], r[0]), Math.min(current.rect[1], r[1]), Math.max(current.rect[2], r[2]), Math.max(current.rect[3], r[3])];
        current.text += c;
        current.baselineOffset = current.baseline - current.rect[1];
        font.destroy();
      },
      endLine: finish,
    });
  } finally { st.destroy(); }
  return runs;
}

export function textAppearance(arg) {
  const entry = fonts.get(arg.fontId);
  if (!entry) throw Error('Select the text again to reload its PDF font.');
  const {font, glyphs} = entry, size = Math.max(4, Math.min(160, +arg.size || 16));
  const glyphFor = c => glyphs.get(c.codePointAt(0)) || font.encodeCharacter(c.codePointAt(0));
  const text = (arg.text || '').replace(/\r\n?/g, '\n').replace(/\t/g, '    ');
  const missing = [...new Set([...text].filter(c => c !== '\n' && !glyphFor(c)))];
  if (missing.length) throw Error(`This PDF font does not contain ${missing.slice(0, 8).map(c => '“' + c + '”').join(', ')}. Load the full .ttf/.otf font from your device, or choose another font. Your edit has not been applied.`);
  const width = Math.max(20, arg.rect[2] - arg.rect[0]);
  const measure = s => [...s].reduce((n, c) => n + font.advanceGlyph(glyphFor(c)) * size, 0);
  const lines = [];
  for (const paragraph of text.split('\n')) {
    let line = '', used = 0;
    for (const word of paragraph.match(/\S+\s*|\s+/g) || []) {
      const wordWidth = measure(word);
      if (line && used + wordWidth > width) { lines.push(line); line = ''; used = 0; }
      for (const c of word) {
        const advance = measure(c);
        if (line && used + advance > width) { lines.push(line); line = ''; used = 0; }
        line += c; used += advance;
      }
    }
    lines.push(line);
  }
  const offset = Math.max(0, arg.baselineOffset ?? size), leading = size * 1.2;
  const rect = [...arg.rect];
  rect[3] = Math.max(rect[3], rect[1] + offset + (lines.length - 1) * leading + size * .35);
  const list = new M.DisplayList(rect), device = new M.DisplayListDevice(list), drawn = new M.Text();
  try {
    lines.forEach((line, i) => {
      let x = rect[0];
      const y = rect[1] + offset + i * leading;
      for (const c of line) {
        const glyph = glyphFor(c);
        drawn.showGlyph(font, [size, 0, 0, -size, x, y], glyph, c.codePointAt(0));
        x += font.advanceGlyph(glyph) * size;
      }
    });
    const rgb = [1, 3, 5].map(i => parseInt((arg.color || '#000000').slice(i, i + 2), 16) / 255);
    device.fillText(drawn, M.Matrix.identity, M.ColorSpace.DeviceRGB, rgb, 1);
    device.close();
    return {list, rect};
  } catch (error) { list.destroy(); throw error; }
  finally { drawn.destroy(); device.destroy(); }
}

export function previewText(arg) {
  const {list, rect} = textAppearance(arg);
  try {
    const scale = Math.min(2, 3000 / Math.max(rect[2] - rect[0], rect[3] - rect[1]));
    const pix = list.toPixmap(M.Matrix.scale(scale, scale), M.ColorSpace.DeviceRGB, true);
    try { return {data: pix.asPNG().slice(), rect}; }
    finally { pix.destroy(); }
  } finally { list.destroy(); }
}
