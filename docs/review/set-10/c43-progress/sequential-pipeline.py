from pathlib import Path
import os,json,hashlib,subprocess,time,socket
root=Path('/workspace/c43-scanner-exceptions');out=Path('/tmp/c43-browser-0adf5acc');out.mkdir(exist_ok=True);status=out/'status.json'
def state(phase,**kw):status.write_text(json.dumps(dict(phase=phase,**kw),indent=2)+'\n');print(phase,kw,flush=True)
state('waiting-for-C42-browser',state='waiting',runtime='0adf5acc')
while True:
 try:q=json.loads(Path('/tmp/c42-browser-27c4e863/status.json').read_text())
 except (FileNotFoundError,json.JSONDecodeError):q={}
 if q.get('state') in ['failed','blocked']:state('C42-prerequisite',state='blocked',detail=q);raise SystemExit(1)
 if q.get('phase')=='all-browser-checks' and q.get('state')=='passed':break
 time.sleep(10)
node=Path('/tmp/c43-node-final/results.json')
while not node.exists():time.sleep(2)
assert len(json.loads(node.read_text()))==84 and all(r['exit']==0 for r in json.loads(node.read_text())),'The fresh pure-Node gate failed.'
src=json.loads((root/'docs/review/set-10/c43-progress/source-equivalence.json').read_text())
def verify():
 for file,h in src['files'].items():assert hashlib.sha256((root/file).read_bytes()).hexdigest()==h,file
verify();probe=socket.socket();busy=probe.connect_ex(('127.0.0.1',8385))==0;probe.close();assert not busy,'Port 8385 is already owned.'
serverlog=(out/'http.log').open('w');server=subprocess.Popen(['python3','-m','http.server','8385','--bind','127.0.0.1'],cwd=root,stdout=serverlog,stderr=subprocess.STDOUT)
env={**os.environ,'QA_BROWSER':'/usr/bin/chromium','QA_BASE':'http://127.0.0.1:8385','QA_FPS_FLOOR':'0'};results=[]
jobs=[('scorm-2004',['node','test/scorm-launch-2004.js'],{},900),('resources',['node','test/tools/fp-scanner-quality.js'],{'QA_TAG':'c43-resource-0adf5acc'},14400),('native',['node','test/fpscannerstopbrowser.js'],{'QA_TAG':'c43-native-0adf5acc'},36000),('critical-id',['node','test/fpscannerstopbrowser.js'],{'QA_TAG':'c43-bad-id-0adf5acc','QA_VARIANT':'bad-id','QA_CASE':'low-ta-large-adult'},7200),('doorstep-regression',['node','test/fpcustomerstopbrowser.js'],{'QA_TAG':'c43-doorstep-regression-0adf5acc','QA_CASE':'high-ta-large'},7200),('problem-regression',['node','test/fpproblembrowser.js'],{'QA_TAG':'c43-problem-regression-0adf5acc','QA_CASE':'high-ta-large-recover'},7200)]
for suite in ['academy','enterprise','routeday','driving']:jobs.append((suite,['node','test/'+suite+'.js'],{},900))
try:
 for _ in range(50):
  probe=socket.socket();ready=probe.connect_ex(('127.0.0.1',8385))==0;probe.close()
  if ready:break
  assert server.poll() is None;time.sleep(.1)
 assert ready
 for name,cmd,extra,timeout in jobs:
  verify();state(name,state='running',runtime='0adf5acc')
  with (out/(name+'.log')).open('w') as log:
   try:r=subprocess.run(cmd,cwd=root,env={**env,**extra},stdout=log,stderr=subprocess.STDOUT,timeout=timeout);code=r.returncode
   except subprocess.TimeoutExpired:code=124
  results.append(dict(job=name,exit=code,command=cmd,environment=extra));(out/'results.json').write_text(json.dumps(results,indent=2)+'\n')
  if code:state(name,state='failed',exit=code);raise SystemExit(code)
 state('all-browser-checks',state='passed',runtime='0adf5acc')
finally:
 server.terminate()
 try:server.wait(timeout=10)
 except subprocess.TimeoutExpired:server.kill();server.wait()
 serverlog.close()
