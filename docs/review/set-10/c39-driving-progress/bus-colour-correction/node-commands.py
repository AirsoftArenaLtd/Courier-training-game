from pathlib import Path
import subprocess,json,time
root=Path('/workspace/c39-bus-colour');source=Path('/tmp/c39-bus-colour-source').read_text().strip();out=Path('/tmp/c39-bus-node-'+source[:8]);out.mkdir(exist_ok=True)
suites=[x['suite'] for x in json.loads(Path('/tmp/c39-school-node-b7dc5de8/results.json').read_text())]
assert len(suites)==85
assert subprocess.check_output(['git','rev-parse','HEAD'],cwd=root,text=True).strip()==source
assert not subprocess.check_output(['git','status','--porcelain'],cwd=root,text=True).strip()
results=[]
for suite in suites:
    start=time.time()
    with (out/(suite+'.log')).open('w') as log:r=subprocess.run(['node','test/'+suite],cwd=root,stdout=log,stderr=subprocess.STDOUT)
    results.append({'suite':suite,'exit':r.returncode,'seconds':round(time.time()-start,2)})
    (out/'results.json').write_text(json.dumps(results,indent=2)+'\n')
    print(suite,r.returncode,flush=True)
    if r.returncode:raise SystemExit(r.returncode)
print('All 85 Node suites passed.',flush=True)
