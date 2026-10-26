"""Restore the verified static catalogue, then stage an independent Pages site."""
from concurrent.futures import ThreadPoolExecutor, as_completed
from pathlib import Path, PurePosixPath
from urllib.request import Request, urlopen
from urllib.parse import quote
import hashlib
import io
import json
import shutil
import time
import zipfile

ROOT = Path(__file__).resolve().parent.parent
MANIFEST = json.loads((ROOT / "publication/manifest.json").read_text())


def verified(data, entry):
    if "member" in entry:
        with zipfile.ZipFile(io.BytesIO(data)) as archive:
            return hashlib.sha256(archive.read(entry["member"])).hexdigest() == entry["member_sha256"]
    return len(data) == entry["size"] and hashlib.sha256(data).hexdigest() == entry["sha256"]


def matches(path, entry):
    return path.is_file() and verified(path.read_bytes(), entry)


def restore(entry):
    relative = PurePosixPath(entry["path"])
    if relative.is_absolute() or ".." in relative.parts:
        raise ValueError("Invalid manifest path")
    path = ROOT / str(relative)
    if matches(path, entry):
        return
    request = Request(MANIFEST["origin"] + quote(str(relative)),
                      headers={"User-Agent": "Victor-Stamp-Catalogue-Migration/1.0"})
    for attempt in range(3):
        try:
            with urlopen(request, timeout=90) as response:
                data = response.read()
            if not verified(data, entry):
                raise ValueError("Content does not match manifest: " + str(relative))
            path.parent.mkdir(parents=True, exist_ok=True)
            temporary = path.with_name(path.name + ".download")
            temporary.write_bytes(data)
            temporary.replace(path)
            return
        except Exception:
            if attempt == 2:
                raise
            time.sleep(2 ** attempt)


def main():
    entries = MANIFEST["files"]
    with ThreadPoolExecutor(max_workers=12) as pool:
        jobs = [pool.submit(restore, entry) for entry in entries]
        for number, job in enumerate(as_completed(jobs), 1):
            job.result()
            if number % 100 == 0:
                print(f"Verified {number}/{len(entries)} files", flush=True)
    catalogue = json.loads((ROOT / "catalog.json").read_text())
    assert len(catalogue["stamps"]) == 477
    shutil.copy2(ROOT / "catalog.json", ROOT / "catalog-source.json")
    shutil.copy2(ROOT / "research-report.md", ROOT / "Deep_Research_Report.md")
    stage = ROOT / "_site"
    stage.mkdir(exist_ok=True)
    for entry in entries:
        target = stage / entry["path"]
        target.parent.mkdir(parents=True, exist_ok=True)
        shutil.copy2(ROOT / entry["path"], target)
    (stage / ".nojekyll").write_text("")
    print(f"Verified and staged {len(entries)} files; 477 stamp specimens.")


if __name__ == "__main__":
    main()
