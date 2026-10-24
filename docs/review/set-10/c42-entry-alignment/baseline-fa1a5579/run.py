from pathlib import Path
import os,json,hashlib,subprocess,time,socket
root=Path('/workspace/c42-problem-solving');out=Path('/tmp/c42-browser-fa1a5579');status=out/'status.json';prereq=Path('/tmp/c41-stop-followups/status.json')
def state(phase,**kw):status.write_text(json.dumps(dict(phase=phase,**kw),indent=2)+'\n');print(phase,kw,flush=True)
state('waiting-for-C41-browser',state='waiting',runtime='fa1a5579',protocol='fa1a5579')
while True:
 try:q=json.loads(prereq.read_text())
 except (FileNotFoundError,json.JSONDecodeError):q={}
 if q.get('state')=='failed':state('C41-prerequisite',state='blocked',detail=q);raise SystemExit(1)
 if q.get('phase')=='all-sequential-followups' and q.get('state')=='passed':break
 time.sleep(10)
src=json.loads((root/'docs/review/set-10/c42-problem-validation/source-equivalence.json').read_text())
for name,h in src['files'].items():assert hashlib.sha256((root/name).read_bytes()).hexdigest()==h,name
probe=socket.socket();busy=probe.connect_ex(('127.0.0.1',8384))==0;probe.close();assert not busy,'Port 8384 is already owned by another process.'
serverlog=(out/'http.log').open('w');server=subprocess.Popen(['python3','-m','http.server','8384','--bind','127.0.0.1'],cwd=root,stdout=serverlog,stderr=subprocess.STDOUT)
results=[];env=os.environ.copy();env.update(QA_BROWSER='/usr/bin/chromium',QA_BASE='http://127.0.0.1:8384',QA_FPS_FLOOR='0')
jobs=[('scorm-2004',['node','test/scorm-launch-2004.js'],{},900),('resources',['node','test/tools/fp-problem-quality.js'],dict(QA_TAG='c42-resource-fa1a5579'),14400),('native',['node','test/fpproblembrowser.js'],dict(QA_TAG='c42-native-fa1a5579'),36000)]
for kind in ['address','damaged','storm']:jobs.append(('critical-'+kind,['node','test/fpproblembrowser.js'],dict(QA_TAG='c42-critical-'+kind+'-fa1a5579',QA_VARIANT='critical',QA_CASE='low-ta-large-'+kind),3600))
jobs.append(('storm-timeout',['node','test/fpproblembrowser.js'],dict(QA_TAG='c42-timeout-fa1a5579',QA_VARIANT='timeout',QA_CASE='low-en-normal-storm'),3600))
jobs.append(('old-dialogue',['node','test/fpcustomerbrowser.js'],dict(QA_TAG='c42-dialogue-regression-fa1a5579',QA_CASE='high-ta-large-twostops'),3600))
for suite in ['academy','enterprise','routeday','driving']:jobs.append((suite,['node','test/'+suite+'.js'],{},900))
try:
 for _ in range(50):
  probe=socket.socket();ready=probe.connect_ex(('127.0.0.1',8384))==0;probe.close()
  if ready:break
  assert server.poll() is None,'The owned HTTP server exited.';time.sleep(.1)
 assert ready,'The owned HTTP server did not start.'
 for name,cmd,extra,timeout in jobs:
  for file,h in src['files'].items():assert hashlib.sha256((root/file).read_bytes()).hexdigest()==h,file
  state(name,state='running',runtime='fa1a5579',protocol='fa1a5579')
  with (out/(name+'.log')).open('w') as log:
   try:r=subprocess.run(cmd,cwd=root,env={**env,**extra},stdout=log,stderr=subprocess.STDOUT,timeout=timeout);code=r.returncode
   except subprocess.TimeoutExpired:code=124
  results.append(dict(job=name,exit=code,command=cmd,environment=extra));(out/'results.json').write_text(json.dumps(results,indent=2)+'\n')
  if code:state(name,state='failed',exit=code);raise SystemExit(code)
 state('all-browser-checks',state='passed',runtime='fa1a5579',protocol='fa1a5579')
finally:
 server.terminate()
 try:server.wait(timeout=10)
 except subprocess.TimeoutExpired:server.kill();server.wait()
 serverlog.close()
