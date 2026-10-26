"""Collect source-scoped incident component jobs; never starts a browser or reruns a suite."""
from pathlib import Path
from datetime import datetime,timezone
import json,hashlib,subprocess,shutil
ROOT=Path(__file__).resolve().parents[4]
OUT=Path(__file__).resolve().parent
h=lambda p:hashlib.sha256(p.read_bytes()).hexdigest()
plan=json.loads((OUT/'plan.json').read_text());assert Path(plan['root'])==ROOT and len(plan['jobs'])==8
assert all(h(ROOT/f)==v for f,v in plan['sources'].items()),'Frozen source changed'
nodes=json.loads(Path(plan['node_results']).read_text());nb=Path(plan['node_results']).parent
assert len(nodes)==101 and all(r['exit']==0 and h(ROOT/r['file'])==r['sourceSha256'] and h(nb/r['log'])==r['logSha256'] for r in nodes)
pipeline=Path(plan['output']);ledger=json.loads((pipeline/'results.json').read_text()) if (pipeline/'results.json').exists() else {}
passed=[];pending=[];native=[];resources=[]
for job in plan['jobs']:
 entry=ledger.get(job['id'],{})
 if entry.get('exit')!=0:
  pending.append({'id':job['id'],'state':entry.get('state') or ('failed' if entry.get('exit') is not None else 'not started'),'exit':entry.get('exit')});continue
 fp=hashlib.sha256(json.dumps(dict(sources=plan['sources'],job=job,environment=plan.get('environment',{})),sort_keys=True).encode()).hexdigest()
 assert entry['fingerprint']==fp and h(pipeline/entry['log'])==entry['logSha256']
 assert all(h(ROOT/f)==v for f,v in entry['artifacts'].items())
 tag=job['environment']['QA_TAG'];item={'id':job['id'],'fingerprint':fp,'logSha256':entry['logSha256'],'artifacts':entry['artifacts']}
 if job['id'].startswith('native-'):
  file=ROOT/'test/out/fp-review'/(tag+'.json');report=json.loads(file.read_text());assert report['complete'] and not report['errors'] and not report['uncommittedRuntime'] and report['checks']>0 and len(report['modes'])==1
  assert report['protocolSha256']==plan['sources']['test/fpincidentbrowser.js'] and all(plan['sources'].get(f)==v for f,v in report['sourceFiles'].items())
  m=report['modes'][0];variant=report['variant'];assert '-'.join([m['quality'],m['lang'],'large' if m['large'] else 'normal'])==job['environment']['QA_CASE'] and variant==job['environment']['QA_VARIANT']
  d=m['reload'];assert m['durable'] and d['scene']=='DialogueScene' and d['scene3d'] is None and not d['default3d']
  if variant=='abandon':
   a=d['assessment'];assert a==m['abandoned']['assessment'] and a['attempts']==1 and a['abandoned'] and not a['passed'] and not a['pending'] and not d.get('record',{}).get('plays')
  else:
   code="const a=require('node:assert/strict'),r=JSON.parse(require('node:fs').readFileSync(process.argv[1])),m=r.modes[0],o=require('./test/tools/fp-incident-original'),v=o.replay(m.observation);a.deepEqual(v,m.original);a.deepEqual(o.normalize(m.result.result),v.result);a.deepEqual(m.result.stars,v.stars);console.log(JSON.stringify(v));"
   original=json.loads(subprocess.check_output(['node','-e',code,str(file)],cwd=ROOT,text=True));assert m['result']['record']['plays']==d['record']['plays']==1 and d['record']['bestScore']==original['result']['score']
   if variant=='good':assert original['result']['score']==4100 and sum(original['stars'].values())==9 and not m['result']['verdict']['criticals']
   else:assert m['result']['verdict']['criticals']
   if m['large'] or variant!='good':assert d['assessment']==m['result']['assessment'] and d['assessment']['attempts']==1 and not d['assessment']['pending'] and d['assessment']['passed']==(variant=='good')
  assert all('test/out/fp-review/'+f in entry['artifacts'] for f in m['shots'])
  item.update(checks=report['checks'],captures=len(m['shots']),variant=variant,quality=m['quality'],lang=m['lang'],large=m['large'],score=m.get('result',{}).get('result',{}).get('score'));native.append(item)
 else:
  q=json.loads((ROOT/'test/out/fp-review'/(tag+'-quality.json')).read_text());assert len(q['profiles'])==1 and q['profiles'][0]['exit']==0 and len(q['requestedViews'])==8
  p=q['profiles'][0];assert p['id']==job['environment']['QA_PROFILES'];raw=ROOT/'test/out/fp-review'/p['report'];r=json.loads(raw.read_text());assert r['incidentFixture'] and not r['errors'] and not r['missingViews']
  for v in q['requestedViews']:
   x=r['incidentProof'][v];assert x['source']=='incident-static-render-fixture' and x['id']=='m8-incident' and x['canonical'] and x['bounded'] and x['carBlocks'] and x['actors']==3 and x['checkpointUnchanged'] and x['eventsUnchanged'] and x['workdayUnchanged']
   if v in ['incidentdamage','incidentdriver','incidentwitness','incidentcab']:assert x['gaze']=='customer-conversation'
   assert x['models']==(0 if p['id']=='fallback-low' else 2) and x['people']==(2 if p['id']=='loaded-high' else 0)
   assert x['shadow']['on']==(p['id']=='loaded-high')
   if p['id']=='loaded-high':assert x['shadow']['span']==20 and x['shadow']['size']==[512,512]
  code="const fs=require('node:fs'),q=require('./test/fpquality'),p=q.PROFILES.find(x=>x.id===process.argv[2]);console.log(JSON.stringify(q.checkReport(JSON.parse(fs.readFileSync(process.argv[1])),{...p,views:process.argv[3]},process.argv[4])));"
  peak=json.loads(subprocess.check_output(['node','-e',code,str(raw),p['id'],','.join(q['requestedViews']),r['tag']],cwd=ROOT,text=True));assert peak==p['peak'];item.update(views=8,profile=p['id'],peak=peak);resources.append(item)
 target=OUT/'completed'/job['id'];target.mkdir(parents=True,exist_ok=True);shutil.copy2(pipeline/entry['log'],target/entry['log'])
 for f,v in entry['artifacts'].items():
  destination=target/Path(f).name;assert not destination.exists() or h(destination)==v
  if not destination.exists():shutil.copy2(ROOT/f,destination)
 passed.append(item)
summary={'date':datetime.now(timezone.utc).isoformat(),'applicationRuntime':plan['runtime'],'protocolRevision':plan['protocolRevision'],'passedJobs':len(passed),'expectedJobs':8,'complete':not pending,'nativeChecks':sum(x['checks'] for x in native),'nativeCaptures':sum(x['captures'] for x in native),'resourceViews':sum(x['views'] for x in resources),'native':native,'resources':resources,'pending':pending,'scope':'Incident component only. No whole-C46/steps/dogs/heat/optional-new-id/shared-rollout/Tamil-glyph/Intel acceptance.'}
(OUT/'completed-summary.json').write_text(json.dumps(summary,indent=2)+'\n')
manifest={'status':'incident component jobs complete; visual/shared review still required' if not pending else 'incident component validation incomplete; C46 doing','planSha256':h(OUT/'plan.json'),'files':{str(p.relative_to(OUT)):h(p) for p in sorted(OUT.rglob('*')) if p.is_file() and p.name!='manifest.json'}}
(OUT/'manifest.json').write_text(json.dumps(manifest,indent=2)+'\n');print(json.dumps({k:summary[k] for k in ['passedJobs','expectedJobs','nativeChecks','nativeCaptures','resourceViews','complete']}))
