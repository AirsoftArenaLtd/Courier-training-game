"""Collect this incident follow-up's own outputs; collection is not acceptance."""
from pathlib import Path
import hashlib, json, shutil
out = Path(__file__).resolve().parent
plan = json.loads((out / 'plan.json').read_text())
art = out / 'artifacts'
art.mkdir(exist_ok=True)
tags = [job['env']['QA_TAG'] for job in plan['jobs']]
files = []
for source in sorted((Path(plan['root']) / 'test/out/fp-review').iterdir()):
    if source.is_file() and any(source.name.startswith(tag) or source.name.startswith('bench-' + tag) for tag in tags):
        target = art / source.name
        shutil.copy2(source, target)
        files.append(dict(file=target.name, bytes=target.stat().st_size, sha256=hashlib.sha256(target.read_bytes()).hexdigest()))
(out / 'artifact-index.json').write_text(json.dumps(dict(runtime=plan['runtime'], scope='Raw outputs only; partial or uninspected captures are not acceptance.', files=files), indent=2) + '\n')
(out / 'gallery.md').write_text('# Current incident captures\n\nRaw captures only; inspection records identify images actually reviewed.\n\n' +
                              '\n'.join('- [' + row['file'] + '](artifacts/' + row['file'] + ')' for row in files if row['file'].endswith('.png')) + '\n')
print(json.dumps(dict(files=len(files))))
