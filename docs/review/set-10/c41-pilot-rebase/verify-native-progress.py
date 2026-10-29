#!/usr/bin/env python3
"""Verify completed native subsets without disturbing active native/resource controllers."""
from pathlib import Path
import json,hashlib,os
BASE=Path(__file__).resolve().parent;ROOT=BASE.parents[3];os.chdir(ROOT)
sha=lambda p:hashlib.sha256(Path(p).read_bytes()).hexdigest()
load=lambda p:json.loads(Path(p).read_text())
old=load(BASE/'acceptance/plan.json');plan=load(BASE/'native-font-retry/plan.json');state=load(BASE/'native-font-retry/status.json');retained=load(BASE/'native-low-verified.json')
changed=[f for f,h in old['sources'].items() if plan['sources'].get(f)!=h]
assert changed==['test/tools/fp-script-font-proof.js'] and old['sources'].keys()==plan['sources'].keys()
for name,digest in {**plan['sources'],**plan['hostFonts']}.items():assert sha(name)==digest,name
oldState=load(BASE/'acceptance/status.json');oldJobs={j['tag']:j for j in oldState['jobs']};artifacts={};jobs=[]
selected=[('acceptance',oldJobs[j['tag']]) for j in retained['jobs']]+[('native-font-retry',j) for j in state['jobs']]
for folder,job in selected:
 assert job['exit']==0 and not job['changedSources'];where=BASE/folder/'artifacts'/job['tag']
 for name,digest in job['artifacts'].items():
  p=where/name;assert sha(p)==digest,str(p);artifacts[str(p.relative_to(BASE))]=digest
 d=load(where/(job['tag']+'.json'));assert d['complete'] and not d['errors']
 m=d['modes'][0] if 'modes' in d else d;assert m['durable'];result=m['result'];font=m.get('fontProof')
 if font:
  assert font['override'] is None
  if m['lang']=='ta':assert any(p['postScriptName']=='NotoSansTamil-Bold' and p['glyphCount']>=28 for p in font['platformFonts'])
 assessment=result.get('assessment')
 if assessment is not None:assert assessment['passed']==('intercom-bad' not in job['tag'])
 jobs.append({'tag':job['tag'],'checks':d['checks'],'quality':m['quality'],'lang':m['lang'],'large':m['large'],'score':result['result']['score'],'stars':result['stars'],'assessmentPassed':assessment and assessment['passed'],'durable':m['durable'],'fontProof':font})
result={'scope':'Completed C41 native subsets only. Native continuation or resource gates may still be active; no complete cleanup, full-resource or review-ready claim. Three retained Low protocols share byte-identical production with the corrected offscreen-font-probe continuation. Actual Tamil glyph proof applies to protocol runs; original-id native regressions do not collect this probe.','sourceRevision':plan['sourceRevision'],'retainedSourceRevision':old['sourceRevision'],'retainedInputDifference':changed,'planSha256':sha(BASE/'native-font-retry/plan.json'),'sourceCount':len(plan['sources']),'hostFonts':plan['hostFonts'],'allInputHashesVerified':True,'nativeJobs':jobs,'nativeChecks':sum(j['checks'] for j in jobs),'artifactCount':len(artifacts),'artifacts':artifacts,'continuationPhaseAtVerification':state['phase'],'completedContinuationJobs':len(state['jobs']),'plannedContinuationJobs':len(plan['jobs']),'allPassedSubset':True}
(BASE/'native-progress-verified.json').write_text(json.dumps(result,indent=2)+'\n')
print(json.dumps({k:v for k,v in result.items() if k not in ['nativeJobs','artifacts','hostFonts']},indent=2))
