#!/usr/bin/env python3
"""Rehash the exact frozen inputs/artifacts and independently replay original resource checkers."""
from pathlib import Path
import json,hashlib,subprocess,psutil,re
BASE=Path(__file__).resolve().parent;ROOT=BASE.parents[3];CFG=json.loads((BASE/'verification-config.json').read_text());sha=lambda p:hashlib.sha256(Path(p).read_bytes()).hexdigest()
current={};artifacts={};native=[];resources=[];cohorts=[];fonts={};cleanup=[]
def gone(pid,ended):
 if not pid:return True
 try:
  p=psutil.Process(pid)
  return p.status()==psutil.STATUS_ZOMBIE or p.create_time()>ended
 except psutil.NoSuchProcess:return True
for spec in CFG['cohorts']:
 out=ROOT/spec['directory'];plan=json.loads((out/'plan.json').read_text());state=json.loads((out/'status.json').read_text());selected=spec.get('onlyTags');jobs=[j for j in state['jobs'] if not selected or j['tag'] in selected]
 if selected:assert {j['tag'] for j in jobs}==set(selected)
 else:assert state['phase']=='complete' and len(jobs)==len(plan['jobs'])
 assert state['serverExited'] and state['leaseReleased'];assert all(gone(state.get(k),state['endedAt']) for k in ['controllerPid','serverPid','childPid'])
 mismatches=[]
 for f,h in plan['sources'].items():
  actual=sha(ROOT/f);current[f]=actual
  if actual!=h:mismatches.append(f)
 assert set(mismatches)==set(spec.get('allowedOldTestDifferences',[])),mismatches
 for f,h in plan.get('hostFonts',{}).items():assert sha(f)==h;fonts[f]=h
 for job in jobs:
  assert job['exit']==0 and not job['changedSources'];folder=out/'artifacts'/job['tag']
  for file,h in job['artifacts'].items():
   p=folder/file;assert sha(p)==h;artifacts[str(p.relative_to(ROOT))]=h
  if job['script']=='test/fpbench.js':
   env=job['env'];profile={'id':job['tag'],'quality':env['QA_GFX'],'accessibility':env['QA_A11Y'],'fallback':env['QA_FALLBACK']=='1','views':env['QA_VIEWS']};report=folder/('bench-'+job['tag']+'-'+env['QA_GFX']+'.json');tool=job.get('tool',CFG.get('resourceTool'));method=job.get('method',CFG.get('resourceMethod'))
   js="const fs=require('node:fs'),q=require('./test/tools/"+tool+"');console.log(JSON.stringify(q['"+method+"'](JSON.parse(fs.readFileSync(process.argv[1])),JSON.parse(process.argv[2]),process.argv[3])));"
   p=subprocess.run(['node','-e',js,str(report),json.dumps(profile),job['tag']],cwd=ROOT,text=True,capture_output=True);assert p.returncode==0,(job['tag'],p.stdout,p.stderr);peak=json.loads(p.stdout);assert peak==job['peak'];resources.append({'tag':job['tag'],'profile':profile,'views':len(env['QA_VIEWS'].split(',')),'peak':peak})
  else:
   report=folder/(job['tag']+'.json');r=json.loads(report.read_text());assert r['complete'] and not r.get('errors') and not r.get('failure');modes=r.get('modes') or [r];outcomes=[]
   for m in modes:
    result=m.get('result',{});payload=result.get('result',result);record=result.get('record',{});assessment=result.get('assessment',m.get('assessment'));font=m.get('fontProof');
    if font and font.get('lang')=='ta':assert font.get('override') is None and any(f['familyName']=='Noto Sans Tamil' and f['glyphCount']>=28 for f in font['platformFonts'])
    outcomes.append({'quality':m.get('quality',m.get('gfx',r.get('quality',r.get('gfx')))),'lang':m.get('lang',r.get('lang')),'large':m.get('large',r.get('large')),'score':payload.get('score',record.get('bestScore')),'stars':result.get('stars',record.get('bestStars')),'assessment':assessment,'durable':m.get('durable',r.get('durable')),'fontProof':font,'stages':len(m.get('stages',[])),'items':len(m.get('items',[]))})
   policy=next(v for v in CFG['nativePolicies'] if job['tag'].endswith(v['suffix']))
   assert len(outcomes)==1;actual=outcomes[0];assert actual['score']==policy['score'],(job['tag'],actual['score'],policy['score'])
   if 'assessmentPassed' in policy:assert actual['assessment']['passed']==policy['assessmentPassed'] and actual['assessment']['pending'] is False
   if policy.get('abandoned'):assert actual['assessment']['abandoned'] is True
   if 'items' in policy:assert actual['items']==policy['items']
   if 'stages' in policy:assert actual['stages']==policy['stages']
   if policy.get('unsafeLift'):assert r['critical']['critical']==1 and r['critical']['raised'] and r['critical']['held'] and not r['critical']['recorded'] and r['critical']['completed']==0
   if 'assessmentCriticals' in policy:assert len(actual['assessment']['criticals'])==policy['assessmentCriticals']
   if policy.get('wrongBooking'):assert r['result']['result']['stats']['attempt']['failed'] and r['result']['result']['stats']['attempt']['ok'] is False
   if policy.get('fullClosure'):assert r['result']['result']['stats']['route']=={'visited':7,'total':7}
   native.append({'tag':job['tag'],'checks':r['checks'],'scope':r.get('scope'),'outcomes':outcomes,'report':str(report.relative_to(ROOT))})
 cohorts.append({'sourceRevision':plan['sourceRevision'],'plan':str((out/'plan.json').relative_to(ROOT)),'planSha256':sha(out/'plan.json'),'sourceCount':len(plan['sources']),'acceptedTags':[j['tag'] for j in jobs],'excludedJobs':[j['tag'] for j in state['jobs'] if j not in jobs],'oldTestDifferences':mismatches});cleanup.append({'directory':str(out.relative_to(ROOT)),'serverExited':True,'leaseReleased':True,'ownedPidsGoneOrZombie':True})
assert len(native)==CFG['nativeJobs'];assert sum(r['views'] for r in resources)==CFG['resourceViews']
if len(cohorts)>1:
 assert all(current[f]==h for f,h in json.loads((ROOT/CFG['cohorts'][-1]['directory']/'plan.json').read_text())['sources'].items())
# Existing registry differences must remain the approved per-module additions only.
registry=(ROOT/'data/modules.js').read_text();stripped=re.sub(CFG['registryPattern'],'',registry,flags=re.M);parent=subprocess.check_output(['git','show',CFG['registryBase']+':data/modules.js'],cwd=ROOT,text=True);assert stripped==parent
cpu=json.loads((BASE/'cpu.json').read_text());assert all(x['exit']==0 for x in cpu['suites']);cpuLogs={x['log']:sha(BASE/x['log']) for x in cpu['suites']}
visual=CFG.get('visualReview',[])
for view in visual:assert view['file'] in artifacts
result={'scope':CFG['scope'],'cohorts':cohorts,'liveInputCount':len(current),'hostFonts':fonts,'allInputHashesVerified':True,'cpuSuites':len(cpu['suites']),'cpuLogHashes':cpuLogs,'nativeChecks':sum(j['checks'] for j in native),'nativeJobs':native,'resourceViews':sum(j['views'] for j in resources),'resources':resources,'registryProof':{'base':CFG['registryBase'],'onlyApprovedLinks':True},'artifactCount':len(artifacts),'artifacts':artifacts,'cleanup':cleanup,'visualReview':visual,'allPassed':bool(visual)}
(BASE/'verification.json').write_text(json.dumps(result,indent=2)+'\n');print(json.dumps({k:result[k] for k in ['cpuSuites','nativeChecks','resourceViews','artifactCount','allPassed']}))
