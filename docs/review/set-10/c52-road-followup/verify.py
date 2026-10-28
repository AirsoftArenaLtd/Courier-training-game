#!/usr/bin/env python3
from pathlib import Path
import hashlib,json,re
OUT=Path(__file__).resolve().parent;ROOT=Path('/workspace/c52-road-pilot')
sha=lambda p:hashlib.sha256(p.read_bytes()).hexdigest()
read=lambda p:json.loads(p.read_text())
runs={n:(read(OUT/n/'plan.json'),read(OUT/n/'status.json')) for n in ['attempt-1','attempt-2']}
p1,s1=runs['attempt-1'];p2,s2=runs['attempt-2']
assert s1['phase']=='failed' and len(s1['jobs'])==7 and s1['jobs'][-1]['exit']==1
assert 'Unexpected token' in (OUT/'attempt-1/road-budget-loaded-low.log').read_text()
assert s2['phase']=='complete' and len(s2['jobs'])==4,s2['phase']
assert p1['candidateBase']==p2['candidateBase']
changed=[f for f in p1['sources'] if p1['sources'][f]!=p2['sources'].get(f)]
assert changed==['test/fpbench.js'],changed
assert sha(OUT/'attempt-1/baseline-source/test/fpbench.js')==p1['sources']['test/fpbench.js']
result={'candidateBase':p2['candidateBase'],'inputsPerAttempt':len(p2['sources']),'artifacts':0,'nativeChecks':0,'languageViews':0,'resourceViews':0,'profiles':{},'roadSamples':{},'cleanup':True,'intel60fpsCertified':False,'retryScope':'Only the inherited benchmark missing closing brace changed between attempts. Native/language runtime sources are identical.'}
for name,(plan,state) in runs.items():
 run=OUT/name
 assert state['serverExited'] and state['leaseReleased']
 for f,h in plan['sources'].items():
  source=run/'baseline-source'/f if name=='attempt-1' and f=='test/fpbench.js' else ROOT/f
  assert sha(source)==h,(name,f)
 for job in state['jobs']:
  assert not job['changedSources']
  folder=run/'artifacts'/job['tag']
  for artifact,h in job['artifacts'].items():assert sha(folder/artifact)==h;result['artifacts']+=1
  if job['exit']!=0:continue
  script=job['script']
  if script=='test/fplangsbrowser.js':
   m=re.search(r'(\d+) cab views in 12 languages fit',(run/(job['tag']+'.log')).read_text());assert m and job['env']['QA_STRICT']=='1';result['languageViews']+=int(m[1])
  elif script=='test/fpbench.js':
   report=read(folder/('bench-'+job['tag']+'-'+job['env']['QA_GFX']+'.json'));assert len(report['prototype'])==10 and not report['errors'] and not report['missingViews'];result['resourceViews']+=len(report['prototype']);result['profiles'][job['tag']]=job['peak']
   assert (run/(job['tag']+'-quality.log')).is_file()
  else:
   artifact=('c25-'+job['env']['QA_GFX']+'-lighting.json') if script=='test/fplightingbrowser.js' else 'c22-cab.json' if script=='test/fpcabbrowser.js' else job['tag']+'.json'
   report=read(folder/artifact);assert not report.get('errors');result['nativeChecks']+=report['checks']
   if script=='test/fplightingbrowser.js':
    p=report['headlights'];difference=sum(p['on']['rgb'])-sum(p['off']['rgb']);assert difference>12 and [p['on']['x'],p['on']['y']]==[650,403];result['roadSamples'][job['env']['QA_GFX']]={'sumDifference':difference,'point':[650,403]}
assert result['languageViews']==1176 and result['resourceViews']==40 and result['nativeChecks']==392
(OUT/'verification.json').write_text(json.dumps(result,indent=2)+'\n');print(json.dumps(result,indent=2))
