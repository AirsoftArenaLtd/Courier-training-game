#!/usr/bin/env python3
"""Serial, bounded source-frozen checks; the private test server binds only to localhost."""
import fcntl,hashlib,json,os,re,shutil,subprocess,time
from pathlib import Path
import psutil
OUT=Path(__file__).resolve().parent;ROOT=OUT.parents[4];os.chdir(ROOT)
sha=lambda p:hashlib.sha256(Path(p).read_bytes()).hexdigest()
def write(s):
 p=OUT/'status.json';t=p.with_suffix('.tmp');t.write_text(json.dumps(s,indent=2)+'\n');t.replace(p)
plan=json.loads((OUT/'plan.json').read_text());assert plan['base']=='http://127.0.0.1:8400'
server_cmd=['python3','-m','http.server','8400','--bind','127.0.0.1']
state={'phase':'queued','pid':os.getpid(),'jobs':[],'startedAt':time.time(),'serverCommand':server_cmd};write(state)
with open('/workspace/.otr-browser-validation.lock','a') as lease:
 fcntl.flock(lease,fcntl.LOCK_EX);server=None
 try:
  server=subprocess.Popen(server_cmd,cwd=ROOT,stdout=open(OUT/'server.log','w'),stderr=subprocess.STDOUT);state['serverPid']=server.pid;time.sleep(.2);assert server.poll() is None
  for index,job in enumerate(plan['jobs']):
   assert all(sha(f)==h for f,h in plan['sources'].items()),'Frozen source changed'
   tag=job['tag'];state.update(phase='running',index=index,tag=tag);write(state)
   raw=ROOT/'test/out/fp-review';raw.mkdir(parents=True,exist_ok=True);before={p.name:p.stat().st_mtime_ns for p in raw.glob('*') if p.is_file()}
   with open(OUT/(tag+'.log'),'w') as log:
    child=subprocess.Popen(['node',job['script']],env={**os.environ,**job['env'],'QA_BASE':plan['base'],'QA_TAG':tag},stdout=log,stderr=log,start_new_session=True);state['childPid']=child.pid;write(state)
    try:code=child.wait(timeout=2400)
    except subprocess.TimeoutExpired:
     owned=psutil.Process(child.pid).children(recursive=True)+[psutil.Process(child.pid)]
     for p in reversed(owned):
      try:p.terminate()
      except psutil.NoSuchProcess:pass
     _,alive=psutil.wait_procs(owned,timeout=5)
     for p in alive:
      try:p.kill()
      except psutil.NoSuchProcess:pass
     child.wait();code=124
   folder=OUT/'artifacts'/tag;folder.mkdir(parents=True,exist_ok=True);artifacts=[]
   for p in sorted(raw.glob('*')):
    if p.is_file() and before.get(p.name)!=p.stat().st_mtime_ns:shutil.copyfile(p,folder/p.name);artifacts.append({'file':str((folder/p.name).relative_to(OUT/'artifacts')),'sha256':sha(folder/p.name)})
   changed=[f for f,h in plan['sources'].items() if sha(f)!=h];accepted=code==0 and not changed;checks=0;peak=None
   if job['script']=='test/fpcontextrecoverybrowser.js':
    r=json.loads((folder/(tag+'.json')).read_text()) if (folder/(tag+'.json')).exists() else {};accepted=accepted and r.get('complete') is True and not r.get('failures') and not r.get('errors');checks=r.get('checks',0)
   elif job['script']=='test/fpbench.js' and accepted:
    env=job['env'];report=folder/('bench-'+tag+'-'+env['QA_GFX']+'.json');profile={'id':tag,'quality':env['QA_GFX'],'views':env['QA_VIEWS'],'accessibility':env['QA_A11Y'],'fallback':env['QA_FALLBACK']=='1'}
    verify="const fs=require('fs'),{checkReport}=require('./test/fpquality');console.log(JSON.stringify(checkReport(JSON.parse(fs.readFileSync(process.argv[1])),JSON.parse(process.argv[2]),process.argv[3])));"
    result=subprocess.run(['node','-e',verify,str(report),json.dumps(profile),tag],cwd=ROOT,capture_output=True,text=True);(OUT/(tag+'-quality.log')).write_text(result.stdout+result.stderr);accepted=accepted and result.returncode==0
    if result.returncode==0:peak=json.loads(result.stdout)
   else:
    matches=re.findall(r'(\d+) [^\n]*checks passed',(OUT/(tag+'.log')).read_text());checks=int(matches[-1]) if matches else 0
   state['jobs'].append({**job,'exit':code,'accepted':accepted,'checks':checks,'peak':peak,'changedSources':changed,'artifacts':artifacts});write(state);assert accepted,'Browser job failed: '+tag
  state['phase']='complete'
 except Exception as error:state.update(phase='failed',failure=str(error))
 finally:
  if server is not None and server.poll() is None:server.terminate();server.wait(timeout=10)
  state.update(serverExited=server is None or server.poll() is not None,leaseReleased=True,endedAt=time.time());write(state)
