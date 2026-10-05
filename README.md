# PDF Editor · Folio

A self-contained browser PDF editor, ready to deploy on Netlify. PDF documents, images, passwords, signatures and OCR results stay in browser memory. No backend, document uploads, analytics, remote fonts, or third-party runtime requests. Export before reloading; there is no document autosave.

## Run

Serve `dist/` using an HTTP server, for example:

```sh
npm ci
npm run build
python -m http.server 5173 --directory dist
```

Open http://localhost:5173 in a current Chrome, Edge, Firefox or Safari browser. ES modules and WebAssembly require HTTP(S); opening index.html via file:// is not supported. Only Chromium has been exercised in the automated browser checks.

The build bundles all runtime libraries, WASM binaries and the English OCR model from the pinned npm dependencies. Initial app and engine loading requires access to the hosting origin, then document operations are local. No server-side PDF processing exists.

## Deploy to Netlify

For a manual deployment, run `npm run package-netlify`. Upload the generated
`artifacts/pdf-editor-netlify.zip` at https://app.netlify.com/drop after signing
in to Netlify with GitHub. If the upload UI requires a folder, extract the ZIP
and drop the extracted folder containing `index.html`.

Netlify will assign an initial address. In the project's settings, change its
project/site name to `pdf-editor` to request `https://pdf-editor.netlify.app`.
The name must be available; this package does not reserve it. If Netlify rejects
that name, choose another name you approve. Do not replace an existing site
unless it is the intended destination.

For Git-connected deployment, connect a repository containing this project.
The included `netlify.toml` selects `dist` and runs `npm run build` after Netlify
installs the locked dependencies. This copies the local PDF/OCR engines and
English model, generates the source download, and checks JavaScript syntax.
No build-time secrets or backend services are required. Netlify account
authentication is separate from a GitHub
repository connection, even when GitHub is used to sign in to Netlify.

The deploy ZIP contains only public application assets, open-source notices,
and the source download. It excludes sample test documents, credentials, Git
metadata, node_modules, and the previous hosting provider's configuration.

## Features

- Open and drag/drop PDFs; unlock password-protected documents with a supplied password.
- Click horizontal PDF text lines to replace text. Original text is removed using content redaction, then replacement FreeText annotations are added. Font family, size, color and box width can be changed.
- Add text, PNG/JPEG/WebP images, freehand ink, handwritten signature images, highlights, rectangles, ellipses, cosmetic whiteout and actual area redaction.
- Select, move, resize and delete added objects. Image corner resizing preserves aspect ratio unless Shift is held.
- Fill standard AcroForm text, choice, checkbox and radio fields.
- Thumbnails, page navigation, zoom, rotate, duplicate, delete, move/reorder, insert blank pages, merge PDFs and extract individual pages.
- Undo/redo through MuPDF's operation journal.
- Local English OCR with Tesseract.js, confidence review, detected-line editing and recognized-text download. OCR results remain temporary until individual edits are applied.
- PDF export, optionally flattening annotations and form fields.
- Responsive touch-aware layout, labeled controls, keyboard shortcuts, and guarded WebMCP registration for workspace status, navigation and starting text editing.

## Limits

This is not a universal desktop-prepress replacement. Existing content is edited by line, not by automatic paragraph reflow. Original embedded fonts are not reused for replacement text; built-in fallback fonts may change metrics. Rotated text, complex scripts, vertical writing, advanced typography, XFA forms and certificate-based signing are limited or unsupported. Existing digital signatures may be invalidated by editing.

OCR is English only and operates on the current page, best with clear upright printed scans. Handwriting and complex layouts may be inaccurate. OCR edits erase image pixels and use a white background; always inspect the result. A searchable text layer is not automatically added to every unedited OCR line.

Whiteout only covers content. Area redaction removes selected page content, but is not a whole-document sanitizer: metadata, attachments, annotations and other pages must be inspected separately.

PDFs up to 150 MB can be opened; browser memory limits may be lower. Images above 30 MB are rejected and inserted images are resized to a maximum dimension of 3000 pixels. Imported/duplicated pages are flattened where needed to preserve appearance; imported interactive fields become static.

**Exported PDFs are not password-protected**, even when the input was encrypted. The UI states this before download. Original files are never overwritten by this app.

## Layout

- `dist/index.html`, `dist/style.css`, `dist/app.js`: editor UI and interaction state.
- `dist/engine.js`: asynchronous PDF worker and message queue.
- `dist/engine-core.js`: PDF rendering, extraction, mutation and export.
- `dist/vendor/mupdf/`: pinned MuPDF engine, v1.28.1.
- `dist/vendor/ocr/`: Tesseract.js and its WASM LSTM core.
- `dist/vendor/lang/eng.traineddata.gz`: bundled English recognition model.
- `scripts/package-source.mjs`: creates the user-downloadable source package without documents or credentials, using Node alone.

## Validation

Automated engine checks cover actual removal of original text, replacement text in flattened exports, annotations, undo/redo, page actions, image insertion/movement/deletion, merge, area redaction, encrypted input and standard text-field filling. Browser checks exercise direct editing, export downloads, responsive layout, scanned-page OCR and its exported result, and verify there are no external runtime requests or POST requests during the tested document flow. Tests and generated synthetic fixtures are in the local `qa/` directory, excluded from published source.

Native WebMCP is feature-detected. The available QA browser does not expose the proposed `document.modelContext` API, so native registration/invocation could not be verified.

## Licensing

Folio is distributed under **GNU AGPL-3.0-or-later** because it incorporates MuPDF. Preserve the source download and license notices when distributing a modified version. A proprietary closed-source distribution needs a separately licensed PDF engine or an appropriate commercial MuPDF license.

MuPDF is Copyright Artifex Software, Inc. and contributors. Tesseract.js and Tesseract.js-core are Apache-2.0. English language data is from tesseract-ocr/tessdata. See `dist/licenses.html` and the bundled license files for notices and links to exact upstream source releases. Runtime dependencies are pinned in `package-lock.json`.
