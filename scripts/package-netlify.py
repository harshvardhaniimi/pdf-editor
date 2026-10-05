"""Create a Netlify manual-deploy ZIP with index.html at the archive root."""
from pathlib import Path
from zipfile import ZipFile, ZIP_DEFLATED

root = Path(__file__).resolve().parent.parent
public = root / "dist"
output = root / "artifacts" / "pdf-editor-netlify.zip"
output.parent.mkdir(parents=True, exist_ok=True)

required = [
    "index.html", "app.js", "engine.js", "engine-core.js", "style.css",
    "vendor/mupdf/mupdf-wasm.wasm",
    "vendor/ocr/worker.min.js",
    "vendor/ocr/tesseract-core-lstm.wasm.js",
    "vendor/lang/eng.traineddata.gz",
    "source.zip", "licenses.html", "LICENSE.txt",
]
for name in required:
    if not (public / name).is_file():
        raise SystemExit(f"Missing required public asset: {name}")

with ZipFile(output, "w", ZIP_DEFLATED) as archive:
    for path in sorted(public.rglob("*")):
        if path.is_file():
            archive.write(path, path.relative_to(public).as_posix())

with ZipFile(output) as archive:
    assert archive.testzip() is None, "ZIP integrity check failed"
    assert all(name in archive.namelist() for name in required)
    assert not any(name.startswith((".git/", ".openai/", "qa/", "node_modules/"))
                   for name in archive.namelist())

print(f"Ready for Netlify: {output} ({output.stat().st_size:,} bytes)")
