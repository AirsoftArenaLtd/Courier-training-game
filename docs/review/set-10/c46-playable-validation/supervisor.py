"""One serial source-frozen browser lease; the matrix follows only a passing preflight."""
from pathlib import Path
import fcntl, hashlib, json, os, signal, socket, subprocess, time
out=Path(__file__).resolve().parent
plan=json.loads((out/'plan.json').read_text());root=Path(plan['root']);results=[]
def state(phase,**fields):
 record=dict(phase=phase,runtime=plan['runtime'],pid=os.getpid(),**fields)
 (out/'status.json').write_text(json.dumps(record,indent=2)+'\n');print(json.dumps(record),flush=True)
def verify():
 for file,want in plan['sources'].items():assert hashlib.sha256((root/file).read_bytes()).hexdigest()==want,file
def stop_owned(process):
 if process is None or process.poll() is not None:return
 os.killpg(process.pid,signal.SIGTERM)
 try:process.wait(timeout=10)
 except subprocess.TimeoutExpired:os.killpg(process.pid,signal.SIGKILL);process.wait()
lock=Path('/workspace/.otr-browser-validation.lock').open('a+')
state('waiting-for-browser-lease');fcntl.flock(lock,fcntl.LOCK_EX)
server=child=None
try:
 verify();baseline=json.loads((root/'docs/review/set-10/c46-playable-integration-progress/results.json').read_text());fresh=json.loads((root/'docs/review/set-10/c46-gate-and-walk-correction/results.json').read_text())
 assert len(baseline['suites'])==107 and all(row['exit']==0 for row in baseline['suites']+baseline['syntax'])
 assert fresh['retainedNodeSuites']==102 and len(fresh['suites'])==5 and len(fresh['syntax'])==10 and all(row['exit']==0 for row in fresh['suites']+fresh['syntax'])
 for row in plan['retained']:
  report=json.loads((out/row['report']).read_text())
  if row['name']=='low-en-normal-steps':assert report['complete'] and report['checks']==955 and report['modes'][0]['durable'] and report['modes'][0]['result']['result']['score']==7500
  else:assert report['profiles'][0]['exit']==0 and len(report['requestedViews'])==15
 with socket.socket() as probe:assert probe.connect_ex(('127.0.0.1',plan['port']))!=0,'Port already owned'
 with (out/'http.log').open('w') as log:server=subprocess.Popen(['python3','-m','http.server',str(plan['port']),'--bind','127.0.0.1'],cwd=root,stdout=log,stderr=subprocess.STDOUT,start_new_session=True)
 for _ in range(50):
  with socket.socket() as probe:ready=probe.connect_ex(('127.0.0.1',plan['port']))==0
  if ready:break
  assert server.poll() is None;time.sleep(.1)
 assert ready
 for job in plan['jobs']:
  verify();state(job['name'],state='running',group=job['group'],server=server.pid)
  env={**os.environ,'QA_BROWSER':'/usr/bin/chromium','QA_BASE':'http://127.0.0.1:'+str(plan['port']),'QA_FPS_FLOOR':'0',**job['env']}
  with (out/(job['name']+'.log')).open('w') as log:
   child=subprocess.Popen(job['command'],cwd=root,env=env,stdout=log,stderr=subprocess.STDOUT,start_new_session=True)
   (out/'owned-processes.json').write_text(json.dumps(dict(supervisor=os.getpid(),server=server.pid,job=job['name'],child=child.pid),indent=2)+'\n')
   try:code=child.wait(timeout=job['timeout'])
   except subprocess.TimeoutExpired:stop_owned(child);code=124
  verify();results.append(dict(name=job['name'],group=job['group'],exit=code,env=job['env']))
  preflight=sum(job['group']=='preflight' for job in plan['jobs'])
  (out/'results.json').write_text(json.dumps(dict(runtime=plan['runtime'],scope=plan['scope'],retained=plan['retained'],jobs=results,preflightComplete=sum(row['group']=='preflight' for row in results)==preflight and all(row['exit']==0 for row in results),complete=len(results)==len(plan['jobs'])),indent=2)+'\n')
  if code:state(job['name'],state='failed',exit=code);break
 else:state('complete',state='passed')
finally:
 stop_owned(child);stop_owned(server);fcntl.flock(lock,fcntl.LOCK_UN);lock.close()
 (out/'released.json').write_text(json.dumps(dict(pid=os.getpid(),released=True),indent=2)+'\n')
