# PDF PaperKit

A PDF editor that runs in your browser. Your documents stay on your device; no account or upload is required.

**[Open the editor](https://pdfeditor.harsh17.in/)**

- Edit text, preserving embedded fonts and colours where possible.
- Add images, highlights, drawings, and handwritten signatures; fill standard PDF forms.
- Rotate, reorder, merge, duplicate, and extract pages.
- Recognize printed English text in scanned PDFs with local OCR.
- Undo changes and download the edited PDF.

![PDF PaperKit workspace](docs/screenshots/workspace.png)

The interface currently uses the name **Folio**. Export before closing the tab: documents are not autosaved. Exported PDFs are not password-protected. OCR and complex PDF layouts may need manual corrections.

## Run locally

Requires Node.js 22+ and Python 3.

```sh
npm ci
npm run build
npm start
```

Open [localhost:5173](http://localhost:5173). If Python is only available as `python3`, use `python3 -m http.server 5173 --directory dist` instead of `npm start`.

## Deploy

Connect the repository to Netlify. [`netlify.toml`](netlify.toml) sets the build command and publish directory; no API keys are needed. For a manual deployment, run `npm run package-netlify` and upload the ZIP from `artifacts/`.

Development and agent guidance: [`AGENTS.md`](AGENTS.md). Report problems through [GitHub Issues](https://github.com/harshvardhaniimi/pdf-editor/issues).

Licensed under [AGPL-3.0-or-later](LICENSE), using MuPDF and Tesseract.js.
