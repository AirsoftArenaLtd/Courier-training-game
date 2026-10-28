#!/usr/bin/env python3
from pathlib import Path
import json,hashlib,subprocess
OUT=Path(__file__).resolve().parent;ROOT=OUT.parents[3];RUN=OUT/'resource-attempt-1'
read=lambda p:json.loads(p.read_text());sha=lambda p:hashlib.sha256(p.read_bytes()).hexdigest()
p=read(RUN/'plan.json');s=read(RUN/'status.json');assert s['phase']=='complete' and len(s['jobs'])==4;assert s['serverExited'] and s['leaseReleased'];assert all(sha(ROOT/f)==h for f,h in p['sources'].items())
native=read(OUT/'native-attempt-1/plan.json');assert all(native['sources'][f]==h for f,h in p['sources'].items() if f in native['sources'])
r={'sourceRevision':p['sourceRevision'],'inputs':len(p['sources']),'artifacts':0,'resourceViews':0,'profiles':{},'nativeRuntimeInputsIdentical':True,'cleanup':True,'intel60fpsCertified':False}
for j in s['jobs']:
 assert j['exit']==0 and not j['changedSources'];folder=RUN/'artifacts'/j['tag']
 for f,h in j['artifacts'].items():assert sha(folder/f)==h;r['artifacts']+=1
 env=j['env'];report=folder/('bench-'+j['tag']+'-'+env['QA_GFX']+'.json');q=read(report);assert len(q['prototype'])==6
 profile={'id':j['tag'],'quality':env['QA_GFX'],'accessibility':env['QA_A11Y'],'fallback':env['QA_FALLBACK']=='1','views':env['QA_VIEWS']}
 js="const fs=require('fs'),{checkHeavy}=require('./test/tools/fp-package-heavy-quality');console.log(JSON.stringify(checkHeavy(JSON.parse(fs.readFileSync(process.argv[1])),JSON.parse(process.argv[2]),process.argv[3])));"
 checked=subprocess.run(['node','-e',js,str(report),json.dumps(profile),j['tag']],cwd=ROOT,capture_output=True,text=True);assert checked.returncode==0,checked.stderr;peak=json.loads(checked.stdout);assert peak==j['peak'];r['profiles'][j['tag']]=peak;r['resourceViews']+=6
assert r['resourceViews']==24
(OUT/'resource-verification.json').write_text(json.dumps(r,indent=2)+'\n');print(json.dumps(r,indent=2))
