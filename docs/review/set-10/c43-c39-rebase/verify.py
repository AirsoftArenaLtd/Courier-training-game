#!/usr/bin/env python3
"""Verify the completed rebase acceptance without starting browsers or altering raw evidence."""
from pathlib import Path
import json,hashlib,subprocess,psutil,os,re
BASE=Path(__file__).resolve().parent;ROOT=BASE.parents[3];os.chdir(ROOT)
sha=lambda p:hashlib.sha256(Path(p).read_bytes()).hexdigest()
load=lambda p:json.loads(Path(p).read_text())
plan=load(BASE/'acceptance/plan.json');state=load(BASE/'acceptance/status.json');cpu=load(BASE/'cpu.json')
assert state['phase']=='complete' and state['serverExited'] and state['leaseReleased']
assert len(state['jobs'])==len(plan['jobs'])==8
for f,h in {**plan['sources'],**plan['hostFonts']}.items():assert sha(f)==h,f
assert len(cpu['suites'])==25 and all(j['exit']==0 for j in cpu['suites'])
cpuChanged=subprocess.check_output(['git','diff','--name-only',cpu['candidate'],plan['sourceRevision'],'--','src','data','assets','lib','css','test','index.html','firstperson.html'],text=True).splitlines()
assert not cpuChanged, cpuChanged
cpuLogs=load(BASE/'cpu-log-hashes.json')
assert set(cpuLogs)=={j['log'] for j in cpu['suites']}
for f,h in cpuLogs.items():assert sha(BASE/f)==h,f
artifacts={};native=[]
for expected,job in zip(plan['jobs'],state['jobs']):
 assert all(job[k]==v for k,v in expected.items()) and job['exit']==0 and not job['changedSources'];where=BASE/'acceptance/artifacts'/job['tag']
 for name,digest in job['artifacts'].items():
  p=where/name;assert sha(p)==digest,str(p);artifacts[str(p.relative_to(BASE))]=digest
 if job['script']!='test/fpscannerstopbrowser.js':continue
 d=load(where/(job['tag']+'.json'));assert d['complete'] and not d['errors'] and len(d['modes'])==1
 assert d['sourceRevision']==plan['sourceRevision'] and not d['uncommittedRuntime']
 assert d['protocolSha256']==plan['sources']['test/fpscannerstopbrowser.js']
 assert all(plan['sources'][f]==h for f,h in d['sourceFiles'].items())
 m=d['modes'][0];r=m['result'];assert m['durable'];font=m['fontProof'];assert font['override'] is None
 quality,lang,size,kind=job['env']['QA_CASE'].split('-');assert (m['quality'],m['lang'],m['large'],m['kind'])==(quality,lang,size=='large',kind)
 assert r['id']=='m5-'+kind and len(m['stops'])==3 and d['checks']>1000
 assert r['result']['score']==(5000 if job['env'].get('QA_VARIANT')=='bad-id' else 5100 if kind=='exceptions' else 6200)
 assert r['record']['bestScore']==r['result']['score'] and r['record']['bestStars']==r['stars']
 assert m['resultPresentation']['active'] and m['resultPresentation']['modals']==0 and m['resultPresentation']['counter']==m['resultPresentation']['expected']
 if m['lang']=='ta':assert any(f['postScriptName']=='NotoSansTamil-Bold' and f['glyphCount']>=28 for f in font['platformFonts'])
 assessment=r.get('assessment');bad='bad-high' in job['tag']
 if assessment is not None:assert assessment['passed']==(not bad)
 if bad:assert r['stars']['service']==1 and len(assessment['criticals'])>0
 else:assert all(stars==3 for stars in r['stars'].values())
 native.append({'tag':job['tag'],'checks':d['checks'],'quality':m['quality'],'lang':m['lang'],'large':m['large'],'kind':m['kind'],'stops':len(m['stops']),'score':r['result']['score'],'stars':r['stars'],'assessmentPassed':assessment and assessment['passed'],'durable':m['durable'],'scope':d['scope']})
profiles=json.loads(subprocess.check_output(['node',str(BASE/'verify-resources.js')],text=True));cleanup={}
for label,pid in [('controller',state['controllerPid']),('server',state['serverPid']),('child',state['childPid'])]:
 try:p=psutil.Process(pid);status=p.status();assert status=='zombie',(label,pid,status,p.cmdline())
 except psutil.NoSuchProcess:status='gone'
 cleanup[label]={'pid':pid,'status':status}
parent=subprocess.check_output(['git','show','b4e87e42:data/modules.js'],text=True);stripped,count=re.subn(r"^        scene3d: 'scanner-stop',\n",'',Path('data/modules.js').read_text(),flags=re.M);assert count==3 and stripped==parent
visual=load(BASE/'visual-review.json');assert len(visual['captures'])>=4
for v in visual['captures']:assert v['resolution']==[1280,720] and sha(BASE/v['path'])==v['sha256'] and v['notes']
result={'scope':'Completed C43 C39/A30 acceptance on pushed C42/C41/C40 and the ee328d18 runtime. Seven actual-key native journeys (including bad-ID critical) and 56 static scanner resource views. A31/latest shared integration and owner Intel O1 remain separate; historical broader matrices retain their sources.','sourceRevision':plan['sourceRevision'],'planSha256':sha(BASE/'acceptance/plan.json'),'sourceCount':len(plan['sources']),'hostFonts':plan['hostFonts'],'allInputHashesVerified':True,'cpuSuites':25,'cpuTestOnlyChanges':cpuChanged,'cpuLogHashes':cpuLogs,'nativeChecks':sum(j['checks'] for j in native),'nativeJobs':native,'resourceViews':sum(p['views'] for p in profiles),'resourceProfiles':profiles,'registryProof':{'parent':'b4e87e42','scene3dLinks':3,'allOtherBytesIdentical':True},'artifactCount':len(artifacts),'artifacts':artifacts,'cleanup':cleanup,'allPassed':True,'visualReview':visual}
(BASE/'verification.json').write_text(json.dumps(result,indent=2)+'\n')
print(json.dumps({k:v for k,v in result.items() if k not in ['nativeJobs','artifacts','hostFonts','resourceProfiles']},indent=2))
