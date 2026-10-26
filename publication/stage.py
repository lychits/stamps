"""Validate local catalogue assets and prepare the GitHub Pages artifact."""
from pathlib import Path
import json
import shutil

ROOT = Path(__file__).resolve().parent.parent
catalogue = json.loads((ROOT / "catalog.json").read_text())
assert catalogue["stamps"], "The catalogue is empty"
for page in catalogue["pages"]:
    for key in ("image", "thumbnail"):
        if page.get(key):
            assert (ROOT / page[key]).is_file(), page[key]
for stamp in catalogue["stamps"]:
    for key in ("image", "large_image", "original_image"):
        if stamp.get(key):
            assert (ROOT / stamp[key]).is_file(), stamp[key]
stage = ROOT / "_site"
stage.mkdir(exist_ok=True)
shutil.copytree(ROOT / "assets", stage / "assets", dirs_exist_ok=True)
for name in ("index.html", "catalog.json", "research-report.md", "catalogue-offline.zip"):
    shutil.copy2(ROOT / name, stage / name)
(stage / ".nojekyll").write_text("")
print(f"Staged {len(catalogue['stamps'])} specimens from repository files.")
