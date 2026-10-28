#!/usr/bin/env python3
from pathlib import Path
import hashlib,json,subprocess
OUT=Path(__file__).resolve().parent;ROOT=OUT.parents[3];RUN=OUT/'attempt-4'
read=lambda p:json.loads(p.read_text())
sha=lambda p:hashlib.sha256(p.read_bytes()).hexdigest()
plan=read(RUN/'plan.json');state=read(RUN/'status.json')
assert state['phase']=='complete' and len(state['jobs'])==8,state['phase']
assert state['serverExited'] and state['leaseReleased']
assert all(sha(ROOT/f)==h for f,h in plan['sources'].items())
old=read(OUT/'attempt-2/plan.json');assert [f for f,h in old['sources'].items() if plan['sources'].get(f)!=h]==['src/scenes/FirstPersonScene.js']
result={'sourceRevision':plan['sourceRevision'],'inputs':len(plan['sources']),'artifacts':0,'nativeChecks':0,'nightNativeChecks':0,'schoolNativeChecks':0,'inspectionResourceViews':0,'profiles':{},'runs':[],'cleanup':True,'intel60fpsCertified':False,'scope':'Existing C-38 stack; shared optional registry/launcher not certified. Earlier 28 night resource views retain their attempt-2 source scope; this run rechecks all four affected inspection views.'}
for job in state['jobs']:
 assert job['exit']==0 and not job['changedSources']
 folder=RUN/'artifacts'/job['tag']
 for f,h in job['artifacts'].items():assert sha(folder/f)==h;result['artifacts']+=1
 if job['script']=='test/fpbench.js':
  env=job['env'];p=folder/('bench-'+job['tag']+'-'+env['QA_GFX']+'.json');r=read(p);assert len(r['prototype'])==1 and not r['errors'] and not r['missingViews']
  profile={'id':job['tag'],'quality':env['QA_GFX'],'accessibility':env['QA_A11Y'],'fallback':env['QA_FALLBACK']=='1','views':'nightlessoninspect'}
  js="const fs=require('fs'),{checkReport}=require('./test/fpquality');console.log(JSON.stringify(checkReport(JSON.parse(fs.readFileSync(process.argv[1])),JSON.parse(process.argv[2]),process.argv[3])));"
  check=subprocess.run(['node','-e',js,str(p),json.dumps(profile),job['tag']],cwd=ROOT,capture_output=True,text=True);assert check.returncode==0,check.stderr
  peak=json.loads(check.stdout);assert peak==job['peak'];result['profiles'][job['tag']]=peak;result['inspectionResourceViews']+=1
 else:
  r=read(folder/(job['tag']+'.json'));assert r['complete'] and not r['errors'] and not r.get('failure');assert len(r['runs'])==1
  n=r['checks'];result['nativeChecks']+=n;result['nightNativeChecks' if 'night' in job['tag'] else 'schoolNativeChecks']+=n
  result['runs'].append({'tag':job['tag'],'checks':n,'quality':r['runs'][0]['quality'],'language':r['runs'][0]['lang'],'larger':r['runs'][0]['large'],'encounter':r['runs'][0].get('encounter'),'result':r['runs'][0].get('result')})
assert result['nightNativeChecks']==210 and result['inspectionResourceViews']==4 and len(result['runs'])==4
(OUT/'final-verification.json').write_text(json.dumps(result,indent=2)+'\n');print(json.dumps({k:v for k,v in result.items() if k!='runs'},indent=2))
