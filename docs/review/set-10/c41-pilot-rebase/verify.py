#!/usr/bin/env python3
"""Final independent C41 verification: native cohorts, resource archives and exact process cleanup."""
from pathlib import Path
import hashlib,json,subprocess,psutil,os,re
BASE=Path(__file__).resolve().parent;ROOT=BASE.parents[3];os.chdir(ROOT)
sha=lambda p:hashlib.sha256(Path(p).read_bytes()).hexdigest()
load=lambda p:json.loads(Path(p).read_text())
subprocess.run(['python3',str(BASE/'verify-native-progress.py')],stdout=subprocess.DEVNULL,check=True)
native=load(BASE/'native-progress-verified.json');plan=load(BASE/'native-font-retry/plan.json');resourcePlan=load(BASE/'resources-font-probe/plan.json')
assert native['completedContinuationJobs']==native['plannedContinuationJobs']==8
assert native['nativeChecks']==5608 and len(native['nativeJobs'])==11
assert plan['sources']==resourcePlan['sources']
cpu=load(BASE/'cpu.json');assert len(cpu['suites'])==16 and all(j['exit']==0 for j in cpu['suites'])
cpuChanged=[f for f,h in cpu['sources'].items() if sha(f)!=h];assert cpuChanged==['test/fpcustomerprotocolbrowser.js']
artifacts=dict(native['artifacts']);profiles=[];cleanup={}
for folder in ['native-font-retry','resources-font-probe']:
 state=load(BASE/folder/'status.json');assert state['phase']=='complete' and state['serverExited'] and state['leaseReleased']
 if folder=='resources-font-probe':
  assert len(state['jobs'])==len(resourcePlan['jobs'])==4
  for expected,job in zip(resourcePlan['jobs'],state['jobs']):
   assert all(job[k]==v for k,v in expected.items()) and job['exit']==0 and not job['changedSources']
   where=BASE/folder/'artifacts'/job['tag']
   for name,digest in job['artifacts'].items():
    p=where/name;assert sha(p)==digest,str(p);artifacts[str(p.relative_to(BASE))]=digest
   env=job['env'];profile={'id':job['tag'],'quality':env['QA_GFX'],'accessibility':env['QA_A11Y'],'fallback':env['QA_FALLBACK']=='1','views':env['QA_VIEWS']};report=where/('bench-'+job['tag']+'-'+profile['quality']+'.json')
   js="const fs=require('node:fs'),{checkProtocol}=require('./test/tools/fp-customerprotocol-quality');console.log(JSON.stringify(checkProtocol(JSON.parse(fs.readFileSync(process.argv[1])),JSON.parse(process.argv[2]),process.argv[3])));"
   peak=json.loads(subprocess.check_output(['node','-e',js,str(report),json.dumps(profile),job['tag']],text=True));assert peak==job['peak'];profiles.append({'tag':job['tag'],'views':len(profile['views'].split(',')),'peak':peak})
 for label,pid in [('controller',state.get('controllerPid',state.get('pid'))),('server',state['serverPid']),('child',state['childPid'])]:
  try:p=psutil.Process(pid);status=p.status();assert status=='zombie',(label,pid,status,p.cmdline())
  except psutil.NoSuchProcess:status='gone'
  cleanup[folder+'-'+label]={'pid':pid,'status':status}
parent=subprocess.check_output(['git','show','555ce222:data/modules.js'],text=True);stripped,count=re.subn(r", scene3d: '(?:customer-conversation|customer-doorsteps)'",'',Path('data/modules.js').read_text());assert count==4 and stripped==parent
result={'scope':'Completed C41 rebased acceptance: eleven native journeys combine three retained Low protocols and eight corrected-font continuation jobs with identical production inputs; two authored failure paths preserve failed assessments. Thirty-two static protocol resources retain original budgets. Shared optional registry integration, A31 translation and Intel O1 remain separate.','nativeSourceRevision':native['sourceRevision'],'retainedSourceRevision':native['retainedSourceRevision'],'nativePlanSha256':native['planSha256'],'resourcePlanSha256':sha(BASE/'resources-font-probe/plan.json'),'sourceCount':len(plan['sources']),'hostFonts':plan['hostFonts'],'allInputHashesVerified':True,'cpuSuites':16,'cpuTestOnlyChanges':cpuChanged,'nativeChecks':5608,'nativeJobs':native['nativeJobs'],'resourceViews':sum(p['views'] for p in profiles),'resourceProfiles':profiles,'registryProof':{'parent':'555ce222','scene3dLinks':4,'allOtherBytesIdentical':True},'artifactCount':len(artifacts),'artifacts':artifacts,'cleanup':cleanup,'visualReview':{'resolution':'original 1280x720','views':['High larger Tamil authored-critical doorstep result','High reception desk choices'],'finding':'Critical result, stars and Tamil glyphs are visible; result and reception controls fit. New protocol wording remains English pending shared A31.'},'allPassed':True}
(BASE/'verification.json').write_text(json.dumps(result,indent=2)+'\n')
print(json.dumps({k:v for k,v in result.items() if k not in ['nativeJobs','artifacts','hostFonts','resourceProfiles']},indent=2))
