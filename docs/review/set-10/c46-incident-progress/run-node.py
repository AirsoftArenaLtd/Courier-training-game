"""Current-source pure Node prerequisite; no browser, socket, merge or push."""
from pathlib import Path
from concurrent.futures import ThreadPoolExecutor, as_completed
import hashlib,json,subprocess,time
ROOT=Path(__file__).resolve().parents[4]
OUT=Path(__file__).resolve().parent
h=lambda p:hashlib.sha256(p.read_bytes()).hexdigest()
old=json.loads((ROOT/'docs/review/set-10/c45-local-shadow-correction/node-results.json').read_text())
files=sorted(set(x['file'] for x in old)|{'test/fpincidentstage.js','test/fpincidentscenario.js','test/fpincidentworld.js','test/fpincidentgeometry.js'})
assert len(files)==101
sources={str(p.relative_to(ROOT)):h(p) for d in ['src','data'] for p in sorted((ROOT/d).rglob('*')) if p.is_file()}
sources['index.html']=h(ROOT/'index.html')
(OUT/'application-sources.json').write_text(json.dumps(sources,indent=2)+'\n')
def run(f):
 start=time.time();log=OUT/(Path(f).stem+'.log')
 with log.open('w') as out:r=subprocess.run(['node',f],cwd=ROOT,stdout=out,stderr=subprocess.STDOUT,timeout=900)
 return {'file':f,'exit':r.returncode,'seconds':round(time.time()-start,3),'sourceSha256':h(ROOT/f),'log':log.name,'logSha256':h(log)}
prior=json.loads((OUT/'node-results.json').read_text()) if (OUT/'node-results.json').exists() else []
results=[r for r in prior if r['file'] in files and r['exit']==0 and r['sourceSha256']==h(ROOT/r['file']) and r['logSha256']==h(OUT/r['log'])]
remaining=[f for f in files if f not in {r['file'] for r in results}]
print('Retained',len(results),'unchanged passed suites; running',len(remaining),flush=True)
with ThreadPoolExecutor(max_workers=4) as pool:
 for future in as_completed([pool.submit(run,f) for f in remaining]):
  r=future.result();results.append(r);(OUT/'node-results.json').write_text(json.dumps(sorted(results,key=lambda x:x['file']),indent=2)+'\n');print(r['file'],r['exit'],flush=True)
assert all(h(ROOT/f)==v for f,v in sources.items()),'Application changed during the prerequisite'
assert all(r['exit']==0 for r in results),'A Node suite failed'
print('All 101 pure Node suites passed.',flush=True)
