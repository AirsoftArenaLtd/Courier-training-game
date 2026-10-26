from pathlib import Path
import concurrent.futures, json, subprocess, time
root=Path('/workspace/c46-safety-wellness')
out=Path(__file__).resolve().parent
files=[p for p in (root/'test').glob('*.js') if not p.name.endswith('browser.js') and p.name not in ['run-all.js','qa.js','fpquality.js','fpbench.js','a11y-screens.js','fpaccesslayout.js','scorm-launch-2004.js'] and 'puppeteer' not in p.read_text()]
def run(file):
 start=time.monotonic()
 with (out/(file.stem+'.log')).open('w') as log:
  result=subprocess.run(['node',str(file)],cwd=root,stdout=log,stderr=subprocess.STDOUT,timeout=900)
 row=dict(file=str(file.relative_to(root)),exit=result.returncode,seconds=round(time.monotonic()-start,2));print(json.dumps(row),flush=True);return row
with concurrent.futures.ThreadPoolExecutor(max_workers=2) as pool: rows=list(pool.map(run,sorted(files)))
changed=subprocess.check_output(['git','diff','--name-only'],cwd=root,text=True).splitlines()+subprocess.check_output(['git','ls-files','--others','--exclude-standard'],cwd=root,text=True).splitlines()
syntax=[]
for file in sorted(set(f for f in changed if f.endswith('.js'))):
 result=subprocess.run(['node','--check',file],cwd=root,capture_output=True,text=True);syntax.append(dict(file=file,exit=result.returncode,error=result.stderr))
(out/'results.json').write_text(json.dumps(dict(scope='All discovered plain Node suites. Browser/resource/native suites excluded and separately required.',suites=rows,syntax=syntax),indent=2)+'\n')
raise SystemExit(0 if all(r['exit']==0 for r in rows+syntax) else 1)
