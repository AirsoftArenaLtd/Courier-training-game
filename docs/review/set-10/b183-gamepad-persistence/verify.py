#!/usr/bin/env python3
from pathlib import Path
import hashlib,json
OUT=Path(__file__).resolve().parent;ROOT=OUT.parents[3];RUN=OUT/'attempt-3'
read=lambda p:json.loads(p.read_text())
sha=lambda p:hashlib.sha256(p.read_bytes()).hexdigest()
p=read(RUN/'plan.json');s=read(RUN/'status.json')
assert s['phase']=='complete' and len(s['jobs'])==2,s['phase']
assert s['serverExited'] and s['leaseReleased']
assert all(sha(ROOT/f)==h for f,h in p['sources'].items())
result={'sourceRevision':p['candidateBase'],'inputs':len(p['sources']),'artifacts':0,'nativeChecks':0,'layouts':0,'runs':[],'cleanup':True,'translations':'Three revised body sentences await the shared catalogue; English fallback is explicit.'}
for j in s['jobs']:
 assert j['exit']==0 and not j['changedSources']
 folder=RUN/'artifacts'/j['tag']
 for f,h in j['artifacts'].items():assert sha(folder/f)==h;result['artifacts']+=1
 r=read(folder/(j['tag']+'.json'));assert r['complete'] and not r['errors'] and not r.get('failure')
 assert all(not v['bad'] for v in r['layouts'])
 assert all(row['size']>= (22 if r['large'] else 17) for layout in r['layouts'] for row in layout['rows'])
 result['nativeChecks']+=r['checks'];result['layouts']+=len(r['layouts']);result['runs'].append({'tag':j['tag'],'checks':r['checks'],'layouts':len(r['layouts'])})
(OUT/'verification.json').write_text(json.dumps(result,indent=2)+'\n');print(json.dumps(result,indent=2))
