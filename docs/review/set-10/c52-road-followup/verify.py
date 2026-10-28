#!/usr/bin/env python3
from pathlib import Path
import hashlib,json,re
OUT=Path(__file__).resolve().parent;RUN=OUT/'attempt-1';ROOT=Path('/workspace/c52-road-pilot')
sha=lambda p:hashlib.sha256(p.read_bytes()).hexdigest()
read=lambda p:json.loads(p.read_text())
plan=read(RUN/'plan.json');state=read(RUN/'status.json');assert state['phase']=='complete',state['phase'];assert state['serverExited'] and state['leaseReleased'];assert len(state['jobs'])==10
assert all(sha(ROOT/f)==h for f,h in plan['sources'].items())
result={'candidateBase':plan['candidateBase'],'inputs':len(plan['sources']),'artifacts':0,'nativeChecks':0,'languageViews':0,'resourceViews':0,'profiles':{},'roadSamples':{},'cleanup':True,'intel60fpsCertified':False}
for job in state['jobs']:
 assert job['exit']==0 and not job['changedSources']
 folder=RUN/'artifacts'/job['tag']
 for name,h in job['artifacts'].items():assert sha(folder/name)==h;result['artifacts']+=1
 script=job['script']
 if script=='test/fplangsbrowser.js':
  m=re.search(r'(\d+) cab views in 12 languages fit',(RUN/(job['tag']+'.log')).read_text());assert m and job['env']['QA_STRICT']=='1';result['languageViews']+=int(m[1])
 elif script=='test/fpbench.js':
  report=read(folder/('bench-'+job['tag']+'-'+job['env']['QA_GFX']+'.json'));assert len(report['prototype'])==10 and not report['errors'] and not report['missingViews'];result['resourceViews']+=len(report['prototype']);result['profiles'][job['tag']]=job['peak']
 else:
  name=('c25-'+job['env']['QA_GFX']+'-lighting.json') if script=='test/fplightingbrowser.js' else 'c22-cab.json' if script=='test/fpcabbrowser.js' else job['tag']+'.json'
  report=read(folder/name);assert not report.get('errors');result['nativeChecks']+=report['checks']
  if script=='test/fplightingbrowser.js':
   p=report['headlights'];difference=sum(p['on']['rgb'])-sum(p['off']['rgb']);assert difference>12 and [p['on']['x'],p['on']['y']]==[650,403];result['roadSamples'][job['env']['QA_GFX']]={'sumDifference':difference,'point':[650,403]}
assert result['languageViews']==1176 and result['resourceViews']==40 and result['nativeChecks']==392
(OUT/'verification.json').write_text(json.dumps(result,indent=2)+'\n');print(json.dumps(result,indent=2))
