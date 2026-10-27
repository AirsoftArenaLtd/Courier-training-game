from pathlib import Path
import json,hashlib,os,subprocess,time,shutil
r=Path('/workspace/b164-nav-clearance');out=r/'test/out/fp-review';m=json.loads((out/'b164-acceptance.json').read_text())
assert m['jobs'][-1]['name']=='cab' and m['jobs'][-1]['exit']==1
assert 'net::ERR_EMPTY_RESPONSE' in (out/'b164-cab.log').read_text()
failed=m['jobs'].pop();shutil.copy2(out/'b164-cab.log',out/'b164-cab-server-interruption.log');failed['log']='b164-cab-server-interruption.log';failed['scope']='No page loaded: local HTTP server returned an empty response. No product assertion ran.';m.setdefault('interruptedAttempts',[]).append(failed)
m['resumedAt']=time.time();m['resumeController']='/tmp/b164-acceptance-resume.py';m['resumeBase']='http://127.0.0.1:8364'
def save():(out/'b164-acceptance.json').write_text(json.dumps(m,indent=2)+'\n')
def frozen():assert all(hashlib.sha256((r/p).read_bytes()).hexdigest()==h for p,h in m['sourceSHA256'].items())
s=Path('/tmp/b164-acceptance.py').read_text();exec(s[s.index('env='):s.index('for name,cmd,extra in jobs:')].replace('127.0.0.1:8358','127.0.0.1:8364'))
for name,cmd,extra in jobs:
 if name in {j['name'] for j in m['jobs'] if j.get('exit')==0}:continue
 frozen();j={'name':name,'command':cmd,'environment':{**extra,'QA_BASE':env['QA_BASE']},'started':time.time()};m['jobs'].append(j);save();print('START',name,flush=True)
 with (out/('b164-'+name+'.log')).open('w') as log:j['exit']=subprocess.run(cmd,cwd=r,env={**env,**extra},stdout=log,stderr=subprocess.STDOUT,timeout=7200).returncode
 j['ended']=time.time()
 if j['exit']==0 and name.startswith('bench-'):
  q=extra['QA_GFX'];a=json.loads((out/('bench-'+extra['QA_TAG']+'-'+q+'.json')).read_text());limits={'calls':64 if q=='low' else 128,'triangles':2500 if q=='low' else 300000,'textures':2 if q=='low' else 4,'attachmentBytes':(4 if q=='low' else 16)*1024*1024};assert a['actualQuality']==q and not a['missingViews'] and not a['errors'];j['peak']={k:max(v['peak'][k] for v in a['prototype'].values()) for k in limits};j['peak']['phaserBytes']=a['phaserTexturesPeak']['withMipmapsUpperBytes'];assert all(j['peak'][k]<=v for k,v in limits.items());assert j['peak']['phaserBytes']<=(4 if q=='low' else 16)*1024*1024
 save();print('END',name,j['exit'],flush=True)
 if j['exit']:raise SystemExit(j['exit'])
frozen();m['complete']=True;save()
