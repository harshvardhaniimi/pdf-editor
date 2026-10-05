"""Compatibility entrypoint; source packaging also works using Node alone."""
from pathlib import Path
import subprocess

subprocess.run(
    ["node", str(Path(__file__).with_suffix(".mjs"))],
    check=True,
)
