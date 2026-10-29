#!/usr/bin/env python3
"""Recheck completed archives, exact inputs, original resource gates and owned-process cleanup."""
from pathlib import Path
import json,hashlib,subprocess,psutil,os,re
BASE=Path(__file__).resolve().parent;ROOT=BASE.parents[3];os.chdir(ROOT)
sha=lambda p:hashlib.sha256(Path(p).read_bytes()).hexdigest()
load=lambda p:json.loads(Path(p).read_text())
cpu=load(BASE/'cpu.json');assert len(cpu['suites'])==20 and all(j['exit']==0 for j in cpu['suites'])
for f,h in cpu['sources'].items():assert sha(f)==h,f
native=load(BASE/'acceptance/plan.json');resources=load(BASE/'resources/plan.json')
assert all(native['sources'].get(f)==h for f,h in resources['sources'].items())
artifacts={};cases=[];profiles=[];cleanup={}
for folder,plan in [('acceptance',native),('resources',resources)]:
 for name,digest in {**plan['sources'],**plan.get('hostFonts',{})}.items():assert sha(name)==digest,name
 state=load(BASE/folder/'status.json');assert state['phase']=='complete' and state['serverExited'] and state['leaseReleased']
 assert len(state['jobs'])==len(plan['jobs'])
 for expected,job in zip(plan['jobs'],state['jobs']):
  assert all(job[k]==v for k,v in expected.items()) and job['exit']==0 and not job['changedSources']
  where=BASE/folder/'artifacts'/job['tag']
  for name,digest in job['artifacts'].items():
   p=where/name;assert sha(p)==digest,str(p);artifacts[str(p.relative_to(BASE))]=digest
  if folder=='resources':
   env=job['env'];profile={'id':job['tag'],'quality':env['QA_GFX'],'accessibility':env['QA_A11Y'],'fallback':env['QA_FALLBACK']=='1','views':env['QA_VIEWS']}
   report=where/('bench-'+job['tag']+'-'+profile['quality']+'.json')
   js="const fs=require('node:fs'),{checkHeavy}=require('./test/tools/fp-package-heavy-quality');console.log(JSON.stringify(checkHeavy(JSON.parse(fs.readFileSync(process.argv[1])),JSON.parse(process.argv[2]),process.argv[3])));"
   peak=json.loads(subprocess.check_output(['node','-e',js,str(report),json.dumps(profile),job['tag']],text=True));assert peak==job['peak']
   profiles.append({'tag':job['tag'],'views':len(profile['views'].split(',')),'peak':peak});continue
  d=load(where/(job['tag']+'.json'));assert d['complete'] and not d['errors'];m=d.get('modes',[d])[0];out=m.get('result',{});assessment=out.get('assessment',m.get('assessment'))
  if 'heavy-unsafe' in job['tag']:
   assert d['critical']['raised'] and d['critical']['critical']==1 and d['critical']['completed']==0 and not d['critical']['recorded']
   assert assessment['abandoned'] and not assessment['passed'] and 'record' not in out
  elif 'heavy-' in job['tag']:
   assert out['record']['bestScore']==1000 and out['stars']=={'safety':3,'efficiency':3}
   if m['large']:assert assessment['passed']
  elif assessment is not None:assert assessment['abandoned'] and not assessment['passed']
  durable=m.get('durable',d.get('durable'))
  if isinstance(durable,dict):assert all(durable[k] for k in ['stored','reloaded'])
  cases.append({'tag':job['tag'],'checks':d['checks'],'quality':m['quality'],'lang':m['lang'],'large':m['large'],'items':len(m.get('items',[])),'stages':len(m.get('stages',[])),'result':out,'assessment':assessment,'durable':durable,'scope':d['scope']})
 for label,pid in [('controller',state.get('controllerPid',state.get('pid'))),('server',state['serverPid']),('child',state['childPid'])]:
  try:p=psutil.Process(pid);status=p.status();assert status=='zombie',(label,pid,status,p.cmdline())
  except psutil.NoSuchProcess:status='gone'
  cleanup[folder+'-'+label]={'pid':pid,'status':status}
parent=subprocess.check_output(['git','show','66f2cda5:data/modules.js'],text=True)
current=Path('data/modules.js').read_text();stripped,count=re.subn(r", scene3d: '(?:package-sort-belt|package-lift-bay|package-label-station)'",'',current)
assert count==3 and stripped==parent
result={'scope':'Completed C40 current-pilot-stack rebase gate. Nine heterogeneous native jobs: Low completion, High label layout and sort/lift assessment abandonment, plus safe heavy handling and actual unsafe solo-rise/abandonment. Staged sort fixtures and optional heavy descriptor are explicit; not nine equivalent full-course successes. Shared optional launcher/A31 integration and Intel FPS remain separate.','nativeSourceRevision':native['sourceRevision'],'resourceSourceRevision':resources['sourceRevision'],'nativePlanSha256':sha(BASE/'acceptance/plan.json'),'resourcePlanSha256':sha(BASE/'resources/plan.json'),'sourceCount':len(native['sources']),'hostFonts':native['hostFonts'],'allInputHashesVerified':True,'cpuSuites':20,'nativeChecks':sum(c['checks'] for c in cases),'nativeJobs':cases,'resourceViews':sum(p['views'] for p in profiles),'resourceProfiles':profiles,'registryProof':{'parent':'66f2cda5','scene3dLinks':3,'allOtherBytesIdentical':True},'artifactCount':len(artifacts),'artifacts':artifacts,'cleanup':cleanup,'visualReview':{'resolution':'original 1280x720','views':['High heavy status reading','High pushed hand truck'],'finding':'Status policy, choices and Back fit without overlap; load, hand truck and pallet are visible. New heavy text remains English pending A31.'},'allPassed':True}
(BASE/'verification.json').write_text(json.dumps(result,indent=2)+'\n')
print(json.dumps({k:v for k,v in result.items() if k not in ['nativeJobs','artifacts','hostFonts','resourceProfiles']},indent=2))
