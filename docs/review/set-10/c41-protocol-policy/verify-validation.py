#!/usr/bin/env python3
"""Independently verify completed protocol native/resource phases, fingerprints and artifacts."""
from pathlib import Path
import hashlib,json,subprocess,psutil
BASE=Path(__file__).resolve().parent;ROOT=BASE.parents[3]
sha=lambda p:hashlib.sha256(p.read_bytes()).hexdigest()
result={'scope':'Owned optional protocol adapter on the pre-rebase C-38/C-41 stack. Explicit optional descriptors and Tamil font are fixtures. Shared A-30/current-pilot/translated-body/Intel acceptance is separate.','phases':{},'nativeChecks':0,'nativeLayouts':0,'nativeJourneys':0,'resourceViews':0,'artifacts':0}
all_sources={};modes=set()
def terminated(pid):
 try:return psutil.Process(pid).status()==psutil.STATUS_ZOMBIE
 except psutil.NoSuchProcess:return True
for folder,expected in [('native-attempt-2',6),('resource-attempt-2',4),('native-negative-attempt-2',1)]:
 path=BASE/folder;plan=json.loads((path/'plan.json').read_text());status=json.loads((path/'status.json').read_text())
 assert status['phase']=='complete',(folder,status)
 assert status['serverExited'] and status['leaseReleased']
 assert terminated(status['pid']) and not psutil.pid_exists(status['serverPid']) and not psutil.pid_exists(status['childPid'])
 assert len(status['jobs'])==expected
 for f,h in plan['sources'].items():
  assert sha(ROOT/f)==h,('changed source',folder,f)
  if f in all_sources:assert all_sources[f]==h,('different phase inputs',f)
  all_sources[f]=h
 summary={'revision':plan['sourceRevision'],'inputs':len(plan['sources']),'controllerState':'zombie (terminated, awaiting environment reaping)' if psutil.pid_exists(status['pid']) else 'reaped','jobs':[]}
 for job in status['jobs']:
  assert job['exit']==0 and not job['changedSources'] and job['artifacts']
  item={'tag':job['tag'],'artifacts':len(job['artifacts'])}
  for f,h in job['artifacts'].items():
   assert sha(path/'artifacts'/job['tag']/f)==h,('changed artifact',job['tag'],f)
   result['artifacts']+=1
  if folder.startswith('native'):
   report=json.loads((path/'artifacts'/job['tag']/(job['tag']+'.json')).read_text())
   assert report['complete'] and report['durable'] and not report['errors'] and not report.get('failure')
   assert report['checks']>0 and report['layouts'] and report['shots']
   actual=report['result'];assert actual['result']['stats']['completed']
   assert actual['result']['ratios']=={'service':0 if report['bad'] else 1,'safety':1,'efficiency':1}
   assert actual['result']['score']==(900 if report['bad'] else 1100)
   assert actual['result']['stats']['protocol']['failed']==report['bad']
   assert report['completedStop']['state']['exitSafe'] and report['completedStop']['state']['enterSafe'] and report['completedStop']['state']['scannedInVan']
   if report['large']:assert actual['assessment']['passed']==(not report['bad']) and actual['assessment']['attempts']==1
   if folder=='native-attempt-2':modes.add((report['kind'],report['quality'],report['lang'],report['large']))
   else:assert report['bad'] and report['kind']=='intercom' and report['large'] and report['lang']=='ta'
   item.update(checks=report['checks'],layouts=len(report['layouts']),score=actual['result']['score'])
   result['nativeChecks']+=report['checks'];result['nativeLayouts']+=len(report['layouts']);result['nativeJourneys']+=1
  else:
   env=job['env'];profile={'id':job['tag'],'quality':env['QA_GFX'],'accessibility':env['QA_A11Y'],'fallback':env['QA_FALLBACK']=='1','views':env['QA_VIEWS']}
   report=path/'artifacts'/job['tag']/('bench-'+job['tag']+'-'+env['QA_GFX']+'.json')
   js="const fs=require('fs'),{checkProtocol}=require('./test/tools/fp-customerprotocol-quality');console.log(JSON.stringify(checkProtocol(JSON.parse(fs.readFileSync(process.argv[1])),JSON.parse(process.argv[2]),process.argv[3])));"
   checked=subprocess.run(['node','-e',js,str(report),json.dumps(profile),job['tag']],cwd=ROOT,capture_output=True,text=True)
   assert checked.returncode==0,checked.stderr
   peak=json.loads(checked.stdout);assert peak==job['peak'];item['peak']=peak;result['resourceViews']+=len(env['QA_VIEWS'].split(','))
  summary['jobs'].append(item)
 result['phases'][folder]=summary
assert modes=={(kind,quality,lang,large) for kind in ['intercom','reception','locker'] for quality,lang,large in [('low','en',False),('high','ta',True)]}
extra=json.loads((BASE/'additional-inputs.json').read_text())
for f,item in extra['sources'].items():
 assert sha(ROOT/f)==item['sha256'];assert hashlib.sha256(subprocess.check_output(['git','show',item['frozenRevision']+':'+f],cwd=ROOT)).hexdigest()==item['sha256']
 all_sources[f]=item['sha256']
fonts=json.loads((BASE/'host-fonts.json').read_text())
for f,h in fonts['files'].items():assert sha(Path(f))==h,('changed host font',f)
result['hostFontInputs']=len(fonts['files'])
result.update(uniqueInputs=len(all_sources),cleanupVerified=True,allPassed=True)
(BASE/'final-verification.json').write_text(json.dumps(result,indent=2)+'\n')
print(json.dumps({k:v for k,v in result.items() if k!='phases'}))
