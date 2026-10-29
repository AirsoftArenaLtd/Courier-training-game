#!/usr/bin/env python3
"""Verify a finished C44 cohort; never launch browsers or modify its raw artifacts."""
from pathlib import Path
import hashlib,json,os,re,subprocess,psutil
BASE=Path(__file__).resolve().parent;ROOT=BASE.parents[3];os.chdir(ROOT)
load=lambda p:json.loads(Path(p).read_text())
sha=lambda p:hashlib.sha256(Path(p).read_bytes()).hexdigest()
plan=load(BASE/'acceptance-ready/plan.json');state=load(BASE/'acceptance-ready/status.json')
assert state['phase']=='complete' and state['serverExited'] and state['leaseReleased']
assert len(state['jobs'])==len(plan['jobs'])==7
for file,digest in {**plan['sources'],**plan['hostFonts']}.items():assert sha(file)==digest,file
cpu=load(BASE/'cpu.json');assert len(cpu['suites'])==27 and all(j['exit']==0 for j in cpu['suites'])
diff=subprocess.check_output(['git','diff','--name-only',cpu['candidate'],plan['sourceRevision'],'--','src','data','assets','lib','css','test','index.html','first-person.html'],text=True).splitlines();assert not diff,diff
cpuLogs=load(BASE/'cpu-log-hashes.json');assert set(cpuLogs)=={j['log'] for j in cpu['suites']}
for file,digest in cpuLogs.items():assert sha(BASE/file)==digest,file
artifacts={}
for expected,job in zip(plan['jobs'],state['jobs']):
 assert all(job[k]==v for k,v in expected.items()) and job['exit']==0 and not job['changedSources']
 for name,digest in job['artifacts'].items():
  p=BASE/'acceptance-ready/artifacts'/job['tag']/name;assert sha(p)==digest,str(p);artifacts[str(p.relative_to(BASE))]=digest
outcomes=json.loads(subprocess.check_output(['node',str(BASE/'verify-outcomes.js')],text=True))
parent=subprocess.check_output(['git','show','010b1f23:data/modules.js'],text=True)
restored,count=re.subn(r"^        scene3d: 'loading-cargo',\n",'',Path('data/modules.js').read_text(),flags=re.M)
assert count==2 and restored==parent
cleanup={}
for label in ['controller','server','child']:
 pid=state[label+'Pid']
 try:
  p=psutil.Process(pid);status=p.status();assert status=='zombie',(label,pid,status,p.cmdline())
 except psutil.NoSuchProcess:status='gone'
 cleanup[label]={'pid':pid,'status':status}
visual=load(BASE/'visual-review.json');assert len(visual['captures'])>=4
for item in visual['captures']:assert item['resolution']==[1280,720] and sha(BASE/item['path'])==item['sha256'] and item['notes']
result={'scope':'Completed C44 fitted-floor eye correction on C39/A30 via C40-C43. Six actual-key journeys and 56 original-profile static cargo views. Failed earlier source eca956a8 stays separate; A31 and owner Intel O1 remain separate.','sourceRevision':plan['sourceRevision'],'planSha256':sha(BASE/'acceptance-ready/plan.json'),'sourceCount':len(plan['sources']),'hostFonts':plan['hostFonts'],'allInputHashesVerified':True,'cpuSuites':27,'cpuLogHashes':cpuLogs,'cpuToBrowserSourceDifferences':diff,**outcomes,'registryProof':{'parent':'010b1f23','scene3dLinks':2,'allOtherBytesIdentical':True},'artifactCount':len(artifacts),'artifacts':artifacts,'cleanup':cleanup,'visualReview':visual,'allPassed':True}
(BASE/'verification.json').write_text(json.dumps(result,indent=2)+'\n')
print(json.dumps({k:v for k,v in result.items() if k not in ['hostFonts','artifacts','cpuLogHashes','nativeJobs','visualReview']},indent=2))
