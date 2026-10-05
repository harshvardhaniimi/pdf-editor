# PDF PaperKit — project guidance

## Communication and documentation

Keep `README.md` short and useful to a person opening the repository: what the editor does, the live link, a screenshot, and basic run/deploy instructions. Put implementation context and coding-agent guidance here. Do not turn the README into an exhaustive manual or repeat the same feature in several sections.

The public project is PDF PaperKit at https://pdfeditor.harsh17.in/. The current interface and npm package still use Folio. Do not rename the application as a side effect of unrelated work.

## Build and deployment

- This is a static application: HTML, CSS, JavaScript modules, Web Workers, and WebAssembly. There is no frontend framework, API service, database, or required application secret.
- Use Node.js 22+ and `npm ci`. Runtime versions are pinned by `package-lock.json`; version ranges in `package.json` are not the exact deployed versions.
- `npm run build` restores vendor assets, generates `dist/source.zip`, and checks JavaScript syntax. Serve the built `dist/` directory over HTTP(S); `file://` does not work.
- `npm start` runs Python's HTTP server on port 5173 and expects Python 3 as `python`. The equivalent is `python3 -m http.server 5173 --directory dist`.
- `npm test` runs the committed font/style regression checks after the runtime assets have been built.
- `npm run package-netlify` builds and produces `artifacts/pdf-editor-netlify.zip`, with `index.html` at the archive root. Python 3 is required for packaging.
- Netlify uses `netlify.toml`: build command `npm run build`, publish directory `dist`, Node 22. The production branch is `main`. Signing into Netlify with GitHub does not itself connect the repository for deployment.
- Do not claim a deployment is live solely because a commit was published. Report separately what was built, pushed, and verified on the live site.

## Code map

| File | Responsibility |
| --- | --- |
| `dist/index.html`, `dist/style.css`, `dist/app.js` | Layout, controls, interaction state, OCR orchestration, and worker requests. |
| `dist/engine.js` | PDF worker entry point and serialized RPC queue. |
| `dist/engine-core.js` | MuPDF document loading, rendering, mutations, forms, page operations, and export. |
| `dist/text-style.js` | Retained font handles, style extraction, glyph validation, and exact PDF-font previews. |
| `scripts/restore-vendor.mjs` | Copies installed MuPDF, Tesseract.js/core, and English language data into `dist/vendor/`. |
| `scripts/package-source.mjs`, `scripts/archive.mjs` | Build the downloadable source ZIP using Node. |
| `scripts/package-netlify.py` | Packages built public assets for manual deployment. |
| `tests/text-style.test.mjs` | Committed font and colour regression tests. |
| `docs/screenshots/` | Actual locally captured workspace, text-editing, and OCR screenshots using sample PDFs. |

Generated vendor files, source/deploy archives, `node_modules/`, and local `qa/` fixtures are intentionally ignored. Do not add credentials or private documents to the repository or downloadable source.

## Privacy and UI invariants

- Keep PDF contents, passwords, imported images/fonts, signatures, and OCR results on the user's device. Do not add document uploads, analytics, third-party runtime requests, or server-side OCR.
- Serve engines and language models from the same origin. Preserve the Content Security Policy in `dist/index.html`; do not weaken it to load remote scripts or fonts.
- Local processing does not promise an offline installation. App/engine/model files must be loaded from the host, including assets requested on demand. There is no service worker or installable offline mode.
- Documents and undo history live in browser memory. There is no autosave. Keep export reminders, unsaved-change handling, and clear export behaviour.
- Keep the workspace simple and direct. Put technical details in developer documentation unless they help a user make a decision, such as supplying a missing font.
- Preserve keyboard access, labelled controls, touch behaviour, and the responsive layout. Single-letter shortcuts must not intercept typing in inputs.

## PDF engine and font invariants

- Preserve the worker's asynchronous engine import and message queue. A static import with top-level WASM initialization previously allowed early messages to be lost.
- Wrap mutations in MuPDF journal operations. Preserve undo/redo and distinguish a new edit after undo from an already-exported state.
- Existing horizontal text is removed with content redaction, then replaced by a FreeText annotation. Mixed fonts or colours are separate editable runs; this is not automatic paragraph reflow.
- Retain the actual PDF font in the worker, together with original colour, size, and baseline. Do not map every font to Helvetica or inherit the toolbar's colour for existing text.
- Use glyph mappings from PDF text as well as font Unicode mappings: subset fonts can lack a usable Unicode cmap. Validate missing glyphs before changing the document. Keep failed edits open so users can correct them, select another font, or load a local `.ttf`/`.otf` file.
- Clear retained font handles when a different document is opened. Keep font data and handles inside the worker; do not send documents or fonts to external services.
- Original-font page previews must use the PDF engine, matching export. A CSS font-family guess is not an accurate substitute for an embedded PDF font.
- Build text appearance resources in a temporary PDF and graft them into the working document. MuPDF's font-resource cache can otherwise point to objects deleted by undo when a user starts a new edit.
- Preserve custom appearance streams when moving/resizing FreeText annotations. Regenerating them from the default appearance alone can silently replace the embedded font.
- Check both normal and flattened exports by reopening them. An annotation's text may not appear in page-content extraction until it is flattened.

## OCR, export, and known limits

- Tesseract.js uses the bundled English model in a separate worker, on the current page only. Recognition supports cancellation and confidence review. Recognition alone does not modify the PDF or add a searchable layer to all detected lines.
- OCR edits erase the selected image region and use white backing. Scans contain no font metadata. Do not promise exact original typography, reliable handwriting recognition, or general multilingual OCR.
- Export creates a new, unencrypted copy, including when the input was password-protected. Keep this disclosure in the export UI. Editing can invalidate existing digital signatures.
- Handwritten signatures are visual marks, not certificate-based signatures. Standard AcroForms are supported; XFA and certificate signing are not.
- Whiteout covers content; redaction removes selected page content. Area redaction is not a whole-document sanitizer for metadata, attachments, comments, or other pages.
- Inserted PDF pages are flattened. Duplicated pages containing annotations or widgets are flattened to preserve appearance. Flattening removes separate annotation/form-field editability, not all possible PDF editing.
- Opening PDFs is limited to 150 MB; image and font imports to 30 MB. Inserted images are scaled to a maximum dimension of 3000 pixels. Browser memory can impose lower practical limits.
- Rotated or vertical text, complex scripts, advanced typography, paragraph reflow, and difficult scan layouts are limited or unsupported. Fonts absent from a PDF depend on the renderer's available substitute unless the user loads a full font.
- Chrome, Edge, Firefox, and Safari are intended targets, but automated browser checks have exercised Chromium. Do not represent other browsers as verified without testing them.
- WebMCP is optional and feature-detected through `document.modelContext`. Its tools inspect workspace metadata, navigate pages, or activate text editing. Native registration/invocation has not been verified in the QA browser; normal editing must work without it.

## Validation and source packaging

Run checks appropriate to the change. For documentation-only changes, check local links/images and rebuild the source package; do not add tests that simply repeat the prose.

For text/style changes, run `npm run build` and `npm test`. The committed tests cover embedded fonts/colours, baseline alignment, adjacent styles, subset glyph errors, movement, export/reopening, undo, and a new edit after undo. An optional local font exercises additional TrueType/OpenType cases:

```sh
PDF_EDITOR_TEST_FONT=/path/to/font.ttf npm test
```

The optional font is not uploaded or bundled. Use the equivalent environment-variable syntax for non-POSIX shells. Do not claim a named font such as Calibri was tested merely because another embedded font passed.

For UI or OCR changes, exercise the relevant browser workflow, inspect the visual result, and reopen the downloaded PDF. Local QA scripts and fixtures in ignored `qa/` have covered annotations, forms, images, page operations, encrypted input, redaction, OCR, responsive layout, and requests staying local. They are not part of `npm test` and may be absent in a fresh checkout.

`scripts/package-source.mjs` has an explicit file list. Include new runtime files, required documentation, and referenced documentation images so the downloadable source remains usable. Rebuild `dist/source.zip` and inspect its contents when changing that list. Preserve AGPL license notices, upstream source links, and the application's source-download link.

The project uses AGPL-3.0-or-later with MuPDF. Tesseract.js/core and the English model use Apache-2.0; see `dist/licenses.html` and the lockfile for exact notices and versions. Do not suggest a proprietary distribution without addressing the engine's licensing requirements.
