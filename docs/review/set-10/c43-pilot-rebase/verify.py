#!/usr/bin/env python3
"""Verify the completed rebase acceptance without starting browsers or altering raw evidence."""
from pathlib import Path
import json,hashlib,subprocess,psutil,os,re
BASE=Path(__file__).resolve().parent;ROOT=BASE.parents[3];os.chdir(ROOT)
sha=lambda p:hashlib.sha256(Path(p).read_bytes()).hexdigest()
load=lambda p:json.loads(Path(p).read_text())
plan=load(BASE/'acceptance-font-probe/plan.json');state=load(BASE/'acceptance-font-probe/status.json');cpu=load(BASE/'cpu.json')
assert state['phase']=='complete' and state['serverExited'] and state['leaseReleased']
assert len(state['jobs'])==len(plan['jobs'])==8
for f,h in {**plan['sources'],**plan['hostFonts']}.items():assert sha(f)==h,f
assert len(cpu['suites'])==13 and all(j['exit']==0 for j in cpu['suites'])
cpuChanged=[f for f,h in cpu['sources'].items() if sha(f)!=h];assert cpuChanged==['test/fpscannerstopbrowser.js','test/tools/fp-scanner-quality.js']
artifacts={};native=[]
for expected,job in zip(plan['jobs'],state['jobs']):
 assert all(job[k]==v for k,v in expected.items()) and job['exit']==0 and not job['changedSources'];where=BASE/'acceptance-font-probe/artifacts'/job['tag']
 for name,digest in job['artifacts'].items():
  p=where/name;assert sha(p)==digest,str(p);artifacts[str(p.relative_to(BASE))]=digest
 if job['script']!='test/fpscannerstopbrowser.js':continue
 d=load(where/(job['tag']+'.json'));assert d['complete'] and not d['errors'] and len(d['modes'])==1;m=d['modes'][0];r=m['result'];assert m['durable'];font=m['fontProof'];assert font['override'] is None
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
parent=subprocess.check_output(['git','show','6e689fae:data/modules.js'],text=True);stripped,count=re.subn(r"^        scene3d: 'scanner-stop',\n",'',Path('data/modules.js').read_text(),flags=re.M);assert count==3 and stripped==parent
result={'scope':'Completed C43 rebase acceptance on the pushed C42/C41/C38 stack. Seven actual-key native journeys (including bad-ID critical) and 56 static scanner resource views. A31/latest shared integration and owner Intel O1 remain separate; historical broader matrices retain their sources.','sourceRevision':plan['sourceRevision'],'planSha256':sha(BASE/'acceptance-font-probe/plan.json'),'sourceCount':len(plan['sources']),'hostFonts':plan['hostFonts'],'allInputHashesVerified':True,'cpuSuites':13,'cpuTestOnlyChanges':cpuChanged,'nativeChecks':sum(j['checks'] for j in native),'nativeJobs':native,'resourceViews':sum(p['views'] for p in profiles),'resourceProfiles':profiles,'registryProof':{'parent':'6e689fae','scene3dLinks':3,'allOtherBytesIdentical':True},'artifactCount':len(artifacts),'artifacts':artifacts,'cleanup':cleanup,'allPassed':True}
result['visualReview']={'resolution':'original 1280x720','views':['High captured-photo review','High larger Tamil bad-ID result'],'finding':'The captured parcel/planter image and native controls fit without overlap. The bad-ID critical, capped service stars and Tamil result text are visible; the new critical explanation remains English pending A31.'}
(BASE/'verification.json').write_text(json.dumps(result,indent=2)+'\n')
print(json.dumps({k:v for k,v in result.items() if k not in ['nativeJobs','artifacts','hostFonts','resourceProfiles']},indent=2))
