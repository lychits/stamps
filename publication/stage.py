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
for name in ("index.html", "catalog.json", "research-report.md", "Full_Visual_Audit_2026-10-27.md", "Full_Visual_Audit_2026-10-27.json", "catalogue-offline.zip"):
    shutil.copy2(ROOT / name, stage / name)
(stage / ".nojekyll").write_text("")
print(f"Staged {len(catalogue['stamps'])} specimens from repository files.")

# The newer album is published at a stable address alongside the original catalogue.
from zipfile import ZipFile

atlas = ROOT / "atlas"
target = stage / "atlas"
shutil.copytree(atlas, target, ignore=shutil.ignore_patterns("images"), dirs_exist_ok=True)
registry = (atlas / "collection.js").read_text().split("window.COLLECTION=", 1)[1]
records = json.loads(registry.strip().removesuffix(";"))
expected = {r[key] for r in records for key in ("image", "thumb")}
assert len(records) == 493 and len(expected) == 986
seen = set()
for album in sorted((atlas / "images").glob("album-*.zip")):
    with ZipFile(album) as archive:
        for entry in archive.namelist():
            assert entry in expected and entry not in seen, entry
            archive.extract(entry, target)
            seen.add(entry)
assert seen == expected, expected - seen
print(f"Staged Postal Atlas with {len(records)} cards and {len(seen)} images.")
