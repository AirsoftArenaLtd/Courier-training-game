source='b7dc5de8059d4b0e2f55039487cdb696751f120a'
from pathlib import Path
import subprocess,json,time,hashlib
root=Path('/workspace/c39-school-next');out=Path('/tmp/c39-school-node-'+source[:8]);out.mkdir(exist_ok=True)
suites=[x['suite'] for x in json.loads(Path('/tmp/c39-driving-final-node/results.json').read_text())]+['fpschoollesson.js','fpschoollessonui.js','fplessonbays.js','fpschoollessonworld.js']
assert len(suites)==len(set(suites))==85
results=json.loads((out/'results.json').read_text()) if (out/'results.json').exists() else []
assert [r['suite'] for r in results]==suites[:len(results)] and all(r['exit']==0 for r in results)
assert subprocess.check_output(['git','rev-parse','HEAD'],cwd=root,text=True).strip()==source
assert not subprocess.check_output(['git','status','--porcelain'],cwd=root,text=True).strip()
print('Resuming after '+str(len(results))+' verified suites.',flush=True)
for suite in suites[len(results):]:
 start=time.time()
 with (out/(suite+'.log')).open('w') as log:r=subprocess.run(['node','test/'+suite],cwd=root,stdout=log,stderr=subprocess.STDOUT)
 results.append({'suite':suite,'exit':r.returncode,'seconds':round(time.time()-start,2)})
 (out/'results.json').write_text(json.dumps(results,indent=2)+'\n')
 print(suite,r.returncode,flush=True)
 if r.returncode:raise SystemExit(r.returncode)
print('All 85 non-browser suites passed.',flush=True)
