from pathlib import Path
import json,hashlib,os,subprocess,time,re
r=Path('/workspace/c49-after-b164');out=r/'test/out/fp-review';m=json.loads(Path('/tmp/c49-after-b164-source.json').read_text());m['jobs']=[]
def save():(out/'c49-current-acceptance.json').write_text(json.dumps(m,indent=2)+'\n')
def frozen():assert all(hashlib.sha256((r/p).read_bytes()).hexdigest()==h for p,h in m['sourceSHA256'].items())
save();deadline=time.time()+7200;log=Path('/tmp/c49-after-b164-repository.log')
while True:
 s=log.read_text();found=re.search(r'^(\d+) of (\d+) suites passed(?:; failed:.*)?$',s,re.M)
 if found:break
 if time.time()>deadline:raise SystemExit('Repository run did not finish')
 time.sleep(5)
m['jobs'].append({'name':'repository','command':['node','test/run-all.js'],'log':str(log),'passed':int(found[1]),'total':int(found[2]),'exit':int(found[1]!=found[2])});save()
if found[1]!=found[2]:raise SystemExit(1)
env={**os.environ,'QA_BASE':'http://127.0.0.1:8361','QA_BROWSER':'/usr/bin/chromium','QA_FPS_FLOOR':'0'}
jobs=[('pixels',['node','test/fpmaterialsbrowser.js'],{'QA_TAG':'c49-current-materials'}),('assets',['node','test/fpassetsbrowser.js'],{'QA_MODES':'high,high-fallback','QA_TAG':'c49-current-assets'}),('town',['node','test/fptownbrowser.js'],{'QA_GFX':'high','QA_TAG':'c49-current-town'})]
for ident,q,a,f in [('low','low','','0'),('high','high','','0'),('accessible','low','large,colour,reduced','0'),('fallback','low','','1')]:
 jobs.append(('bench-'+ident,['node','test/fpbench.js'],{'QA_TAG':'c49-current-'+ident,'QA_GFX':q,'QA_A11Y':a,'QA_FALLBACK':f,'QA_PROTOTYPE_ONLY':'1','QA_VIEWS':'cab,signspeak,navfull,navdouble,lightingnightreverse','QA_SIGNS':'1','QA_NAV':'1','QA_TRAFFIC':'1','QA_STOPS':'1','QA_DAMAGE':'1','QA_WALKAROUND':'1','QA_RADIO':'1','QA_ACTORS':'1','QA_TOWN':'1','QA_LIGHTING':'1','QA_WEATHER':'1','QA_SOUND':'1','QA_SHOTS':'1'}))
for name,cmd,extra in jobs:
 frozen();j={'name':name,'command':cmd,'environment':extra,'started':time.time()};m['jobs'].append(j);save();print('START',name,flush=True)
 with (out/('c49-current-'+name+'.log')).open('w') as log:j['exit']=subprocess.run(cmd,cwd=r,env={**env,**extra},stdout=log,stderr=subprocess.STDOUT,timeout=7200).returncode
 j['ended']=time.time()
 if j['exit']==0 and name.startswith('bench-'):
  q=extra['QA_GFX'];a=json.loads((out/('bench-'+extra['QA_TAG']+'-'+q+'.json')).read_text());limits={'calls':64 if q=='low' else 128,'triangles':2500 if q=='low' else 300000,'textures':2 if q=='low' else 4,'attachmentBytes':(4 if q=='low' else 16)*1024*1024};assert a['actualQuality']==q and not a['missingViews'] and not a['errors'];j['peak']={k:max(v['peak'][k] for v in a['prototype'].values()) for k in limits};j['peak']['phaserBytes']=a['phaserTexturesPeak']['withMipmapsUpperBytes'];assert all(j['peak'][k]<=v for k,v in limits.items());assert j['peak']['phaserBytes']<=(4 if q=='low' else 16)*1024*1024
 save();print('END',name,j['exit'],flush=True)
 if j['exit']:raise SystemExit(j['exit'])
frozen();m['complete']=True;save()
