from pathlib import Path
import datetime,hashlib,json,os,shutil,signal,subprocess,time
B=Path('/workspace/c39-route-driving');R=Path('/workspace/c39-route-acceptance');PRE=Path('/workspace/c39-pilot-acceptance');P=Path('/tmp/c39-route-acceptance.json');OUT=R/'test/out/fp-review';OUT.mkdir(parents=True,exist_ok=True)
def now():return datetime.datetime.now(datetime.timezone.utc).isoformat()
def sha(p):return hashlib.sha256(p.read_bytes()).hexdigest()
def sh(args,root=B):return subprocess.check_output(args,cwd=root,text=True,stderr=subprocess.STDOUT)
def tracked(root):return {p:sha(root/p) for p in sh(['git','ls-files','src','data','assets/3d','index.html','test/*.js','test/tools'],root).splitlines() if (root/p).is_file()}
s=json.loads(P.read_text())
def save():P.write_text(json.dumps(s,indent=2)+'\n')
def note(text):
 p=B/'docs/COORDINATION.md';t=p.read_text();marker='| --- | --- | --- | --- |';i=t.index(marker,t.index('## Inbox for Claude'))+len(marker);t=t[:i]+'\n| 23 Oct | Codex | '+text+' | doing (codex/c39-route-driving) |'+t[i:];t=t.replace('## Log\n','## Log\n\n- **23 October 2026, Codex — '+now()+' C-39:** '+text+' No merge, protected push, deployment or automation change.\n',1);p.write_text(t)
def commit(message):
 sh(['git','diff','--check']);sh(['git','add','docs','src','test','index.html']);sh(['git','commit','-m',message]);sh(['git','-c','credential.helper=!gh auth git-credential','push','origin','HEAD:refs/heads/codex/c39-route-driving']);s['pushedHead']=sh(['git','rev-parse','HEAD']).strip();save()
def sources():
 assert tracked(B)==s['branchSHA256'],'Branch source changed during route acceptance'
 assert tracked(R)==s['sourceSHA256'],'Candidate source changed during route acceptance'
def run(name,args,env=None,timeout=5400):
 sources();j={'name':name,'args':args,'env':env or {},'start':now(),'log':'c39-route-final-'+name+'.log'};s['jobs'].append(j);s['phase']=name;save();print('START',name,flush=True)
 with (OUT/j['log']).open('w') as log:
  p=subprocess.Popen(args,cwd=R,env={**os.environ,'QA_BASE':'http://127.0.0.1:8375','QA_BROWSER':'/usr/bin/chromium',**(env or {})},stdout=log,stderr=subprocess.STDOUT,start_new_session=True);j['pid']=p.pid;save()
  try:code=p.wait(timeout=timeout)
  except subprocess.TimeoutExpired:os.killpg(p.pid,signal.SIGTERM);raise RuntimeError(name+' timed out')
 j.update(exit=code,end=now());save();print('END',name,code,flush=True);assert code==0,name+' failed; see '+str(OUT/j['log']);sources()

for j in s['jobs']:
 j.setdefault('candidateRevision',s['candidateRevision'])
 if j['name']=='resources' and j.get('exit'):j['name']='resources-before-shutdown-fix';j['diagnosticManifest']='../c39-route-shutdown-diagnostic/manifest.json'
s.setdefault('previousRuns',[]).append({k:s[k] for k in ['candidateRevision','sourceSHA256','branchSHA256']})
s.update(phase='corrected shutdown fixture resources',candidateRevision=sh(['git','rev-parse','HEAD'],R).strip(),sourceSHA256=tracked(R),branchSHA256=tracked(B));s.pop('error',None);save()
try:
 run('shutdown-fixture-unit',['node','test/fproutelessonfixture.js'])
 run('current-english-source-guard',['node','test/englishtext.js'])
 run('resumed-resources',['node','test/fpquality.js'],{'QA_ROUTELESSON_ONLY':'1','QA_PROFILES':'accessible-low,fallback-low','QA_TAG':'c39-route-final-resources'})
 old=json.loads(Path('/tmp/c39-route-resources-before-shutdown-fix.json').read_text());new=json.loads((OUT/'c39-route-final-resources-quality.json').read_text())
 kept=[p for p in old['profiles'] if p['id'] in ['loaded-low','loaded-high']];assert len(kept)==2 and all(p['exit']==0 for p in kept)
 for p in kept:p['candidateRevision']='11c15b336fb050d8c615ced59c6d67a7d62d715d'
 for p in new['profiles']:p['candidateRevision']=s['candidateRevision']
 new['profiles']=kept+new['profiles'];new['scopeNotes']='Twelve loaded views at 11c15b33; twelve accessible/fallback views after awaiting outgoing-scene shutdown. Product runtime unchanged; strict checkpoint/workday assertions and all ceilings unchanged.'
 (OUT/'c39-route-final-resources-quality.json').write_text(json.dumps(new,indent=2)+'\n')
 q=json.loads((OUT/'c39-route-final-resources-quality.json').read_text());assert q['scope']=='route-planning-module' and len(q['profiles'])==4 and sum(len(p['views']) for p in q['profiles'])==24 and all(p['exit']==0 for p in q['profiles'])
 verify="const fs=require('fs'),a=require('assert/strict'),q=require('./test/fpquality'),o='test/out/fp-review/',s=JSON.parse(fs.readFileSync(o+'c39-route-final-resources-quality.json'));for(const p of s.profiles){const r={...q.PROFILES.find(x=>x.id===p.id),views:q.ROUTELESSON_VIEWS};a.deepEqual(p.views,r.views.split(','));a.deepEqual(q.checkReport(JSON.parse(fs.readFileSync(o+p.report)),r,'c39-route-final-resources-'+p.id),p.peak);}console.log('All 24 route-planning resource views independently revalidated.');"
 s['resourceValidation']=sh(['node','-e',verify],R).strip();sources()
 sh(['git','-c','credential.helper=!gh auth git-credential','fetch','origin','pilot']);assert sh(['git','rev-parse','origin/pilot']).strip()=='90844ac5ab146bbc1be29bcd387926007a0a591b','New pilot; read the inbox before handoff'
 dest=B/'docs/review/set-10/c39-route-acceptance';raw=dest/'raw';raw.mkdir(parents=True,exist_ok=True)
 for pattern in ['c39-route-final-*','bench-c39-route-final-*']:
  for p in OUT.glob(pattern):
   if p.is_file():shutil.copy2(p,raw/p.name)
 shutil.copy2(__file__,dest/'acceptance.py');s.update(phase='route-planning slice validated; remaining driving adapters are doing',validationComplete=now());save();shutil.copy2(P,dest/'validation-state.json')
 (dest/'README.md').write_text('# C-39 route-planning acceptance\n\nThis is the second adapter, not the completed C-39 task. The nine native runs and 12 loaded Low/High resource views retain product source 11c15b33. After an outgoing-scene baseline race, two asynchronous handoff cases and the 12 accessible/fallback views are checked at the corrected fixture source, with the product runtime unchanged. The original failed accessible report is retained under ../c39-route-shutdown-diagnostic/. Per-profile source scopes are in the quality summary. No assertion or product save code was changed. The registered route-satnav uses the parked physical cab screen and the original town planner graph, manifests and score scale. Native controls exercise all three manifests in eight English/Tamil normal/larger Low/High layouts and an additional missed-commitment path. Assessments keep their attempt and same-id records. Suspended workday events, saves and checkpoints remain unchanged. Seven model/HUD cases with 36 actual 2D scorer comparisons, 11 retained HUD and 13 runner cases, and 18 resource-report guards are scoped under ../c39-route-progress/. The unchanged shared English-source assertion guard passes here. The existing-catalogue i18n check passed at the candidate before the native bad-path fixture was added; no catalogue was authored. All 24 focused four-profile resource views pass unchanged ceilings, and raw reports were independently checked. This does not claim a fresh whole-workday 224-view run or native Intel FPS (O-1). Shared registry and A-30 integration remain with Claude; no default switch is made. Driving, hazard, junction, school and night adapters still follow.\n')
 m={**s,'complete':True,'quality':q,'files':[{'file':str(p.relative_to(dest)),'bytes':p.stat().st_size,'sha256':sha(p)} for p in sorted(dest.rglob('*')) if p.is_file() and p.name!='manifest.json']};(dest/'manifest.json').write_text(json.dumps(m,indent=2)+'\n')
 for f in m['files']:assert sha(dest/f['file'])==f['sha256']
 figures='; '.join(p['id']+' **'+' / '.join(str(p['peak'][k]) for k in ['calls','triangles','textures','attachmentBytes','phaserBytes'])+'**' for p in q['profiles'])
 text='**C-39 route-planning progress (23 October 2026; task still doing):** all 24 focused registered-module resource views pass at candidate `'+s['candidateRevision'][:8]+'`. '+figures+' (calls / triangles / Three textures / attachment bytes / Phaser estimate bytes). The default workday gate and ceilings stay unchanged. The vector map is cached between edits and uses no new image/Three texture or pass. Native good/bad same-id results, assessment and layout cases pass. Evidence: `docs/review/set-10/c39-route-acceptance/manifest.json`. This does not accept the remaining C-39 adapters or certify native Intel FPS (O-1).'
 for f in ['docs/PERF.md','docs/FRAME-BUDGET.md']:
  p=B/f;t=p.read_text();i=t.index('\n')+1;p.write_text(t[:i]+'\n'+text+'\n'+t[i:])
 note('**C-39 route-planning adapter is tested; remaining driving adapters continue.** All native eight-layout good plans and the missed-commitment path, assessment/record isolation and all 24 focused resource views pass at candidate `'+s['candidateRevision'][:8]+'`. The route uses the mounted sat nav, original graph/windows/closures and existing score scale. Exact source, commands, reports, screenshots and figures: `docs/review/set-10/c39-route-acceptance/manifest.json` and PERF/FRAME-BUDGET. Shared registry/A-30 proposals remain for Claude. C-39 stays doing while the remaining driving/hazard/junctions/school/night adapters are built.')
 commit('Record mounted sat-nav route-planning evidence while continuing C-39');s.update(complete=True,evidence=str(dest/'manifest.json'));save()
 d=json.loads(a.read_text());d.update(active_task='C-39; pre-trip and route-planning slices validated; continue driving adapter',pushed_head=s['pushedHead']);d['c39_route_next']={**d.get('c39_route_next',{}),**{k:s[k] for k in ['phase','candidateRevision','pushedHead','evidence']}};a.write_text(json.dumps(d,indent=2)+'\n');print('ROUTE-PLANNING SLICE PUSHED; C-39 remains doing.',flush=True)
except Exception as error:
 s.update(error=repr(error),phase='stopped on failed validation or new information');save();print('STOP',repr(error),flush=True);raise
