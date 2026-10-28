#!/usr/bin/env python3
from pathlib import Path
import json,hashlib
OUT=Path(__file__).resolve().parent;ROOT=OUT.parents[3];RUN=OUT/'native-attempt-1'
read=lambda p:json.loads(p.read_text());sha=lambda p:hashlib.sha256(p.read_bytes()).hexdigest()
p=read(RUN/'plan.json');s=read(RUN/'status.json');assert s['phase']=='complete' and len(s['jobs'])==4;assert s['serverExited'] and s['leaseReleased'];assert all(sha(ROOT/f)==h for f,h in p['sources'].items())
r={'sourceRevision':p['sourceRevision'],'inputs':len(p['sources']),'artifacts':0,'nativeChecks':0,'layouts':0,'runs':[],'cleanup':True,'scope':'Actual native safe/unsafe workflows on existing C-40/C-38 stack. New words await shared translations; optional shared launcher, current-pilot rebase and resource acceptance are separate.'}
for j in s['jobs']:
 assert j['exit']==0 and not j['changedSources'];folder=RUN/'artifacts'/j['tag']
 for f,h in j['artifacts'].items():assert sha(folder/f)==h;r['artifacts']+=1
 q=read(folder/(j['tag']+'.json'));assert q['complete'] and not q['errors'] and not q.get('failure')
 if q['unsafe']:assert q['critical']['critical']==1 and q['critical']['held'] and q['critical']['raised']
 else:assert q['result']['record']['bestScore']==1000 and q['result']['stars']=={'safety':3,'efficiency':3}
 r['nativeChecks']+=q['checks'];r['layouts']+=len(q['layouts']);r['runs'].append({'tag':j['tag'],'checks':q['checks'],'layouts':len(q['layouts']),'unsafe':q['unsafe'],'larger':q['large']})
(OUT/'native-verification.json').write_text(json.dumps(r,indent=2)+'\n');print(json.dumps(r,indent=2))
