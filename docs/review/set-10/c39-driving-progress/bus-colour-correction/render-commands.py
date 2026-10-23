from pathlib import Path
import subprocess,json,os,time
root=Path('/workspace/c39-bus-colour')
source=Path('/tmp/c39-bus-colour-source').read_text().strip()
out=root/'test/out/fp-review'
profiles=json.loads(subprocess.check_output(['node','-e',"console.log(JSON.stringify(require('./test/fpquality').PROFILES))"],cwd=root,text=True))
state={'source':source,'scope':'drill-bus-colour-only','views':['drillbusclue','drillbusafter'],'profiles':[],'complete':False}
target=Path('/tmp/c39-bus-render-state.json')
def save():target.write_text(json.dumps(state,indent=2)+'\n')
save()
for profile in profiles:
    assert subprocess.check_output(['git','rev-parse','HEAD'],cwd=root,text=True).strip()==source
    assert not subprocess.check_output(['git','status','--porcelain'],cwd=root,text=True).strip()
    tag='c39-bus-colour-'+profile['id']
    env={**os.environ,'QA_BASE':'http://127.0.0.1:8381','QA_BROWSER':'/usr/bin/chromium','QA_FPS_FLOOR':'0',
         'QA_TAG':tag,'QA_GFX':profile['quality'],'QA_PROTOTYPE_ONLY':'1','QA_MODULES':'','QA_PRETRIP':'','QA_ROUTELESSON':'','QA_HAZARDLESSON':'','QA_DRIVINGLESSON':'1','QA_SCHOOLLESSON':'',
         'QA_SOUND':'1','QA_MIRROR_PROBE':'1','QA_THEME':'','QA_SHOTS':'1','QA_VIEWS':','.join(state['views']),
         'QA_A11Y':profile.get('accessibility',''),'QA_FALLBACK':'1' if profile.get('fallback') else '0'}
    for flag in ['QA_AMBIENT','QA_RADIO','QA_WALKAROUND','QA_DAMAGE','QA_STOPS','QA_TRAFFIC','QA_NAV','QA_SIGNS','QA_ACTORS','QA_TOWN','QA_LIGHTING','QA_WEATHER']:env[flag]=''
    step={'id':profile['id'],'quality':profile['quality'],'tag':tag,'started':time.time(),'log':'/tmp/'+tag+'.log','env':{k:v for k,v in env.items() if k.startswith('QA_')}}
    state['profiles'].append(step);save()
    with open(step['log'],'w') as log:
        p=subprocess.Popen(['node','test/fpbench.js'],cwd=root,env=env,stdout=log,stderr=subprocess.STDOUT)
        step['pid']=p.pid;save();step['exit']=p.wait()
    step['finished']=time.time();save()
    if step['exit']:
        state['failure']='Benchmark failed: '+profile['id'];save();raise SystemExit(step['exit'])
    report='bench-'+tag+'-'+profile['quality']+'.json'
    script="const fs=require('fs'),q=require('./test/fpquality');const p=q.PROFILES.find(p=>p.id===process.argv[1]);p.views='drillbusclue,drillbusafter';console.log(JSON.stringify(q.checkReport(JSON.parse(fs.readFileSync(process.argv[2])),p,process.argv[3])));"
    step['report']=report
    step['peak']=json.loads(subprocess.check_output(['node','-e',script,profile['id'],str(out/report),tag],cwd=root,text=True))
    save();print(profile['id'],step['peak'],flush=True)
state['complete']=True;save()
