#!/usr/bin/env python3
"""Verify completed C-50 follow-up evidence against its exact candidate; never manufacture a pass."""
from pathlib import Path
import hashlib,json,re
OUT=Path(__file__).resolve().parent;ROOT=Path('/workspace/c50-notice-pilot')
sha=lambda p:hashlib.sha256(p.read_bytes()).hexdigest()
def read(p):return json.loads(p.read_text())
summary={'candidateBase':'f2e439ef','ownedCorrection':'e82091aa','scopes':[],'resourceProfiles':{},'strictLanguageViews':0,'occlusionViews':0,'resourceViews':0}
for phase in ['final','layout']:
 folder=OUT/phase;plan=read(folder/'plan.json');state=read(folder/'status.json');assert state['phase']=='complete',(phase,state['phase'],state.get('failure'));assert state['serverExited'] and state['leaseReleased']
 for f,h in plan['sources'].items():
  # The follow-up audit replaces only the old pilot test's sign-face expectation.
  # Keep that original test as an exact input of the completed language/resource phase.
  source=folder/'test-source/fpsignlayoutbrowser.js' if phase=='final' and f=='test/fpsignlayoutbrowser.js' else ROOT/f
  assert sha(source)==h,('Candidate source changed',phase,f)
 artifacts=0
 for job in state['jobs']:
  assert job['exit']==0 and not job['changedSources']
  for name,h in job['artifacts'].items():assert sha(folder/'artifacts'/job['tag']/name)==h;artifacts+=1
  if job['script']=='test/fplangsbrowser.js':
   log=(folder/(job['tag']+'.log')).read_text();match=re.search(r'(\d+) cab views in 12 languages fit',log);assert match and job['env']['QA_STRICT']=='1';summary['strictLanguageViews']+=int(match[1])
  elif job['script']=='test/fpsignlayoutbrowser.js':
   report=read(folder/'artifacts'/job['tag']/(job['tag']+'.json'));assert report['completed'] and not report['failures'] and not report['errors'];summary['occlusionViews']+=len(report['runs'])+len(report['firstDay'])
  elif job['script']=='test/fpbench.js':
   assert 'peak' in job;summary['resourceProfiles'][job['tag']]=job['peak']
   report=read(folder/'artifacts'/job['tag']/('bench-'+job['tag']+'-'+job['env']['QA_GFX']+'.json'))
   assert set(report['prototype'])==set(job['env']['QA_VIEWS'].split(',')) and not report['missingViews'] and not report['errors']
   assert all(view['frames']>0 and not view['contextLost'] for view in report['prototype'].values())
   summary['resourceViews']+=len(report['prototype'])
 summary['scopes'].append({'phase':phase,'inputs':len(plan['sources']),'artifacts':artifacts,'cleanup':True})
assert summary['strictLanguageViews']==1176
assert summary['resourceViews']==16
summary['intel60fpsCertified']=False
summary['partialCandidate']='The root phase omitted the existing address-label guard; it is retained only as a partial source scope. final/ and layout/ repeat on the complete candidate.'
legacy=read(OUT/'layout-legacy-audit/artifacts/notice-layout-low/notice-layout-low.json')
assert legacy['completed'] and len(legacy['failures'])==8 and not legacy['errors']
assert all('stop/' in failure and failure.endswith('sign line is absent') for failure in legacy['failures'])
summary['legacyAudit']='Unmodified pilot sign-layout test required automatic STOP face paragraphs in eight views. Retained as a failed pre-C50 expectation; the owned audit now requires translated signal/yield notices, hidden face paragraphs and native J readings, preserving all clipping and occlusion checks.'
(OUT/'verification.json').write_text(json.dumps(summary,indent=2)+'\n');print(json.dumps(summary,indent=2))
