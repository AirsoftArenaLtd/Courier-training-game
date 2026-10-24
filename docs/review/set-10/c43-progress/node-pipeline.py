import subprocess,pathlib,json,concurrent.futures
root=pathlib.Path('/workspace/c43-scanner-exceptions');out=pathlib.Path('/tmp/c43-node-final')
inventory=subprocess.check_output(['node','test/run-all.js','--list'],cwd=root,text=True);(out/'inventory.txt').write_text(inventory)
files=[]
for line in inventory.splitlines():
 if line.startswith('| `'):
  parts=line.split('|')
  if parts[2].strip()=='Node':files.append(parts[1].strip().strip('`'))
files=[f for f in files if f!='scorm-launch-2004.js']
print(str(len(files))+' pure Node suites; the SCORM browser is deferred to the sequential pipeline',flush=True)
def run(name):
 with (out/(name+'.log')).open('w') as log:
  try:r=subprocess.run(['node','test/'+name],cwd=root,stdout=log,stderr=subprocess.STDOUT,timeout=300);code=r.returncode
  except subprocess.TimeoutExpired:code=124
 return {'suite':name,'exit':code}
with concurrent.futures.ThreadPoolExecutor(max_workers=4) as pool:results=list(pool.map(run,files))
(out/'results.json').write_text(json.dumps(results,indent=2)+'\n');bad=[r for r in results if r['exit']];print(str(len(results)-len(bad))+' passed; failures: '+str(bad),flush=True)
raise SystemExit(1 if bad else 0)
