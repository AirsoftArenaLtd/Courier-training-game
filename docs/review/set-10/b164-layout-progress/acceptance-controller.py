from pathlib import Path
import json,hashlib,os,subprocess,time
r=Path('/workspace/b164-nav-clearance');out=r/'test/out/fp-review'
paths=['index.html','assets/3d/manifest.json']+[str(p.relative_to(r)) for p in sorted((r/'src/core').glob('fp*.js'))]+['src/scenes/FirstPersonScene.js']+['test/'+n+'.js' for n in ['fpsignlayoutbrowser','fpweatherbrowser','fpnavbrowser','fpcabbrowser','fphudbrowser','fpmirrorsbrowser','fprearbrowser','fprear','fpbench']]
m={'source':subprocess.check_output(['git','rev-parse','HEAD'],cwd=r,text=True).strip(),'pilotBase':'fdcc3311','complete':False,'jobs':[],'sourceSHA256':{p:hashlib.sha256((r/p).read_bytes()).hexdigest() for p in paths}}
def save():(out/'b164-acceptance.json').write_text(json.dumps(m,indent=2)+'\n')
def frozen():assert all(hashlib.sha256((r/p).read_bytes()).hexdigest()==h for p,h in m['sourceSHA256'].items())
m['superseded']='65921394 initially passed240approaches and81navigationchecks, but the full repo found the old rear-screen mount. Final jobs below include its correction and rerun the native gates.'
save()
env={**os.environ,'QA_BASE':'http://127.0.0.1:8358','QA_BROWSER':'/usr/bin/chromium','QA_FPS_FLOOR':'0'}
jobs=[('layout-low',['node','test/fpsignlayoutbrowser.js'],{'QA_TAG':'b164-accepted-layout'}),('navigation',['node','test/fpnavbrowser.js'],{}),('repository',['node','test/run-all.js'],{}),('weather-low',['node','test/fpweatherbrowser.js'],{'QA_GFX':'low'}),('weather-high',['node','test/fpweatherbrowser.js'],{'QA_GFX':'high'}),('hud',['node','test/fphudbrowser.js'],{}),('cab',['node','test/fpcabbrowser.js'],{}),('mirrors',['node','test/fpmirrorsbrowser.js'],{}),('rear',['node','test/fprearbrowser.js'],{}),('layout-high',['node','test/fpsignlayoutbrowser.js'],{'QA_GFX':'high','QA_LANGS':'en,ta','QA_TAG':'b164-final-high'})]
for ident,quality,a11y,fallback in [('low','low','','0'),('high','high','','0'),('accessible','low','large,colour,reduced','0'),('fallback','low','','1')]:
 jobs.append(('bench-'+ident,['node','test/fpbench.js'],{'QA_TAG':'b164-'+ident,'QA_GFX':quality,'QA_A11Y':a11y,'QA_FALLBACK':fallback,'QA_PROTOTYPE_ONLY':'1','QA_VIEWS':'cab,signspeak,navfull,navdouble,lightingnightreverse','QA_SIGNS':'1','QA_NAV':'1','QA_TRAFFIC':'1','QA_STOPS':'1','QA_DAMAGE':'1','QA_WALKAROUND':'1','QA_RADIO':'1','QA_ACTORS':'1','QA_TOWN':'1','QA_LIGHTING':'1','QA_WEATHER':'1','QA_SOUND':'1','QA_SHOTS':'1'}))
for name,cmd,extra in jobs:
 frozen();j={'name':name,'command':cmd,'environment':extra,'started':time.time()};m['jobs'].append(j);save();print('START',name,flush=True)
 with (out/('b164-'+name+'.log')).open('w') as log:j['exit']=subprocess.run(cmd,cwd=r,env={**env,**extra},stdout=log,stderr=subprocess.STDOUT,timeout=7200).returncode
 j['ended']=time.time()
 if j['exit']==0 and name.startswith('bench-'):
  q=extra['QA_GFX'];a=json.loads((out/('bench-'+extra['QA_TAG']+'-'+q+'.json')).read_text());limits={'calls':64 if q=='low' else 128,'triangles':2500 if q=='low' else 300000,'textures':2 if q=='low' else 4,'attachmentBytes':(4 if q=='low' else 16)*1024*1024};assert a['actualQuality']==q and not a['missingViews'] and not a['errors'];j['peak']={k:max(v['peak'][k] for v in a['prototype'].values()) for k in limits};j['peak']['phaserBytes']=a['phaserTexturesPeak']['withMipmapsUpperBytes'];assert all(j['peak'][k]<=v for k,v in limits.items());assert j['peak']['phaserBytes']<=(4 if q=='low' else 16)*1024*1024
 save();print('END',name,j['exit'],flush=True)
 if j['exit']:raise SystemExit(j['exit'])
frozen();m['complete']=True;save()
