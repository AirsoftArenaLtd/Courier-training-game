"""Copy only this frozen plan's raw outputs; acceptance is separate from artifact collection."""
from pathlib import Path
import hashlib,json,shutil
out=Path(__file__).resolve().parent
plan=json.loads((out/'plan.json').read_text());root=Path(plan['root']);art=out/'artifacts';art.mkdir(exist_ok=True)
tags=[job['env']['QA_TAG'] for job in plan['jobs'] if 'QA_TAG' in job['env']]
files=[]
for file in sorted((root/'test/out/fp-review').iterdir()):
 if file.is_file() and any(file.name.startswith(tag) or file.name.startswith('bench-'+tag) for tag in tags):
  shutil.copy2(file,art/file.name);files.append(dict(file=file.name,bytes=file.stat().st_size,sha256=hashlib.sha256(file.read_bytes()).hexdigest()))
images=[row for row in files if row['file'].endswith(('.png','.jpg'))]
(out/'artifact-index.json').write_text(json.dumps(dict(runtime=plan['runtime'],scope='Raw outputs collected from this frozen plan only. Missing jobs, resource failures, partial native journeys and uninspected captures are not acceptance.',files=files),indent=2)+'\n')
(out/'gallery.md').write_text('# Frozen playable safety captures\n\nRaw captures only; visual inspection records identify the images actually reviewed.\n\n'+'\n'.join('- ['+row['file']+'](artifacts/'+row['file']+')' for row in images)+'\n')
print(json.dumps(dict(files=len(files),images=len(images))))
