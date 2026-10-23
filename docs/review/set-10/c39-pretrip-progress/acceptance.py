from pathlib import Path
import datetime,hashlib,json,os,shutil,signal,subprocess
B=Path('/workspace/c39-route-driving');R=Path('/workspace/c39-pilot-acceptance');OUT=R/'test/out/fp-review';OUT.mkdir(parents=True,exist_ok=True);P=Path('/tmp/c39-acceptance.json')
def now():return datetime.datetime.now(datetime.timezone.utc).isoformat()
def sha(p):return hashlib.sha256(p.read_bytes()).hexdigest()
def sh(args,root=B):return subprocess.check_output(args,cwd=root,text=True,stderr=subprocess.STDOUT)
def tracked(root):return {p:sha(root/p) for p in sh(['git','ls-files','src','data','assets/3d','index.html','test/*.js','test/tools'],root).splitlines() if (root/p).is_file()}
s=json.loads(Path('/tmp/c39-acceptance.json').read_text())
s['previousRuns'].append({'candidateRevision':s['candidateRevision'],'sourceSHA256':s['sourceSHA256'],'branchSHA256':s['branchSHA256']})
s['jobs']=[{**j,'name':'native-before-brake-fix'} if j['name']=='native' and j.get('exit') else j for j in s['jobs']]
s['jobs'][1].update(candidateRevision=s['candidateRevision'],scope='82 of 83 repository suites pass at 0a70929a. The sole failing shared English guard is rerun unchanged after renaming the plain-data English-source field; later runtime changes cache pre-trip lookups/prompts and fix the three-second focused brake hold, covered by twelve current cases and native/resources.')
s['resolvedFailures']=[{'job':'repository','candidate':'0a70929a','failure':'English guard misidentified plain-data text field','resolutionJob':'english-source-guard'}]
s.update(resumed=now(),phase='final pre-trip guard/native/resource checks',runtime=sh(['git','rev-parse','HEAD']).strip(),candidateRevision=sh(['git','rev-parse','HEAD'],R).strip(),sourceSHA256=tracked(R),branchSHA256=tracked(B));s.pop('error',None)
def save():P.write_text(json.dumps(s,indent=2)+'\n')
def sources():
 assert tracked(B)==s['branchSHA256'],'Branch source changed'
 assert tracked(R)==s['sourceSHA256'],'Candidate source changed'
def run(name,args,env=None,timeout=5400):
 sources();j={'name':name,'args':args,'env':env or {},'start':now(),'log':'c39-pretrip-final-'+name+'.log'};s['jobs'].append(j);s['phase']=name;save();print('START',name,flush=True)
 with (OUT/j['log']).open('w') as log:
  p=subprocess.Popen(args,cwd=R,env={**os.environ,'QA_BASE':'http://127.0.0.1:8374','QA_BROWSER':'/usr/bin/chromium',**(env or {})},stdout=log,stderr=subprocess.STDOUT,start_new_session=True);j['pid']=p.pid;save()
  try:code=p.wait(timeout=timeout)
  except subprocess.TimeoutExpired:os.killpg(p.pid,signal.SIGTERM);raise RuntimeError(name+' timed out')
 j.update(exit=code,end=now());save();print('END',name,code,flush=True);assert code==0,name+' failed; see '+str(OUT/j['log']);sources()
try:
 run('english-source-guard',['node','test/englishtext.js']);run('pretrip-unit',['node','test/fppretrip.js'])
 run('brake-unit',['node','test/fppretripui.js'])
 run('native',['node','test/fppretripbrowser.js'],{'QA_TAG':'c39-pretrip-final-native'})
 run('runner-native',['node','test/fpscenariobrowser.js'],{'QA_TAG':'c39-pretrip-final-runner'})
 run('resources',['node','test/fpquality.js'],{'QA_PRETRIP_ONLY':'1','QA_TAG':'c39-pretrip-final-resources'})
 q=json.loads((OUT/'c39-pretrip-final-resources-quality.json').read_text());assert q['scope']=='pretrip-module' and len(q['profiles'])==4 and sum(len(p['views']) for p in q['profiles'])==32 and all(p['exit']==0 for p in q['profiles'])
 verify="const fs=require('fs'),a=require('assert/strict'),q=require('./test/fpquality'),o='test/out/fp-review/',s=JSON.parse(fs.readFileSync(o+'c39-pretrip-final-resources-quality.json'));for(const p of s.profiles){const r={...q.PROFILES.find(x=>x.id===p.id),views:q.PRETRIP_VIEWS};a.deepEqual(p.views,r.views.split(','));a.deepEqual(q.checkReport(JSON.parse(fs.readFileSync(o+p.report)),r,'c39-pretrip-final-resources-'+p.id),p.peak);}console.log('All 32 pre-trip resource views independently revalidated.');"
 s['resourceValidation']=sh(['node','-e',verify],R).strip();sources()
 sh(['git','-c','credential.helper=!gh auth git-credential','fetch','origin','pilot']);latest=sh(['git','rev-parse','origin/pilot']).strip();assert latest=='90844ac5ab146bbc1be29bcd387926007a0a591b','Pilot changed; read new inbox before handoff'
 assert sh(['git','branch','--show-current']).strip()=='codex/c39-route-driving';assert not sh(['git','status','--porcelain']).strip(),'Uncommitted branch before evidence'
 s.update(validationComplete=now(),phase='validated pre-trip slice; remaining C-39 adapters are doing',latestPilot=latest);save()
 dest=B/'docs/review/set-10/c39-pretrip-progress';raw=dest/'raw';raw.mkdir(parents=True,exist_ok=True)
 for pattern in ['c39-pretrip-final-*','bench-c39-pretrip-final-*']:
  for p in OUT.glob(pattern):
   if p.is_file():shutil.copy2(p,raw/p.name)
 repo=dest/'repository';repo.mkdir(exist_ok=True)
 for p in (R/'test/out/run-all').glob('*.log'):
  if p.name!='englishtext.log':shutil.copy2(p,repo/p.name)
 shutil.copy2(OUT/'c39-pretrip-final-english-source-guard.log',repo/'englishtext-current-isolated.log')
 shutil.copy2(__file__,dest/'acceptance.py');shutil.copy2(P,dest/'validation-state.json')
 (dest/'README.md').write_text('# C-39 pre-trip implementation progress\n\nThis is the first adapter of C-39, not the completed Route and Driving module. The registered `pretrip-van` preserves all 21 `m1-pretrip` content items, required physical tests, original score scale, false-flag penalties and critical missed defects. Its twelve model/UI/world cases include 72 direct comparisons with the actual existing 2D sign-off scorer. Native inputs walk the nearby target selection, cab entry/exit and switches, tread gauges, mechanical/brake holds, condition recording and actual results. Travel and defect seeds are fixtures. No workday reports or checkpoints change and the inspection canvas is reused and released. The corrected broad run passes 82 of 83 repository suites at `0a70929a`, including the retained runner; its sole English-assertion naming failure is corrected and the unchanged shared guard passes at the final source. No shared test was edited. The later runtime changes cache pre-trip lookups/prompts and measure the brake hold in focused real time, covered by twelve current cases and native/resource checks. The earlier native timing failure and slow-frame reproduction are retained under `../c39-brake-timing-diagnostic/`. Current native pre-trip and retained runner checks pass. All 32 focused pre-trip resource views pass unchanged Low/High ceilings, including larger text/colour/reduced motion and missing-model fallback; their raw reports were independently revalidated.\n\nExact candidate and source inventories are in the manifest. The earlier exploratory 198-check Low English run preceded the final gauge artwork and neutral target prompts; it is not relabelled as final evidence. The initial optional-hint failure is fixed and retained under `../c39-optional-hint-diagnostic/`. The later broad run passes every suite except the English assertion-name guard, separately retained under `../c39-english-source-diagnostic/`; the unchanged current guard is archived as `repository/englishtext-current-isolated.log`. No single 83/83 batch is claimed. No shared course data, flow, academy, scoring, saves, settings or translations were authored. The proposed shared registry entry is with Claude; the default is unchanged until A-31. Remaining C-39 route/driving/hazard and new junctions/school/night adapters are still required. Cloud FPS does not certify the owner Intel floor; O-1 remains.\n')
 m={**s,'complete':True,'quality':q,'files':[]}
 for p in sorted(dest.rglob('*')):
  if p.is_file() and p.name!='manifest.json':m['files'].append({'file':str(p.relative_to(dest)),'bytes':p.stat().st_size,'sha256':sha(p)})
 (dest/'manifest.json').write_text(json.dumps(m,indent=2)+'\n')
 for f in m['files']:assert sha(dest/f['file'])==f['sha256']
 figures='; '.join(p['id']+' **'+' / '.join(str(p['peak'][k]) for k in ['calls','triangles','textures','attachmentBytes','phaserBytes'])+'**' for p in q['profiles'])
 text='**C-39 pre-trip progress (23 October 2026; whole task still doing):** all 32 focused registered-module resource views pass at candidate `'+s['candidateRevision'][:8]+'`. '+figures+' (calls / triangles / Three textures / attachment bytes / Phaser estimate bytes). Ceilings stay unchanged. All repository checks are covered by the 82 passing broad suites and the corrected current shared English-assertion guard; native pre-trip and retained-runner checks pass. One inspection canvas is reused and released; no new Three texture/pass/asset. Source, commands, raw reports and screenshots: `docs/review/set-10/c39-pretrip-progress/manifest.json`. This is not acceptance of the remaining C-39 adapters, a fresh 224-view workday gate or native Intel FPS (O-1).'
 for f in ['docs/PERF.md','docs/FRAME-BUDGET.md']:
  p=B/f;t=p.read_text();i=t.index('\n')+1;p.write_text(t[:i]+'\n'+text+'\n'+t[i:])
 p=B/'docs/COORDINATION.md';t=p.read_text();msg='**C-39 first adapter implemented and tested on `codex/c39-route-driving`, stacked on C-38.** The physical `pretrip-van` covers all 21 original items and required tests; twelve model/UI/world cases include 72 direct comparisons with the existing 2D scorer. The 82 broad repository suites plus the corrected unchanged shared English-source guard, current native all-part input/results/assessment/layout checks, retained runner regression and all 32 focused resource views pass on current-pilot candidate `'+s['candidateRevision'][:8]+'`. The canvas is bounded and released, reports/checkpoints are isolated, and budgets are unchanged. Evidence: `docs/review/set-10/c39-pretrip-progress/manifest.json`; figures in PERF/FRAME-BUDGET. The shared registry proposal is still for Claude. Remaining route/driving/hazard/junctions/school/night adapters are doing, so C-39 is not ready for review.'
 marker='| --- | --- | --- | --- |';i=t.index(marker,t.index('## Inbox for Claude'))+len(marker);t=t[:i]+'\n| 23 Oct | Codex | '+msg+' | doing (codex/c39-route-driving) |'+t[i:];t=t.replace('## Log\n','## Log\n\n- **23 October 2026, Codex — '+now()+' C-39 pre-trip progress:** '+msg+' No merge, protected push, deployment or automation change.\n',1);p.write_text(t)
 sh(['git','diff','--check']);sh(['git','add','docs']);sh(['git','commit','-m','Record the physical pre-trip adapter evidence while continuing C-39']);sh(['git','-c','credential.helper=!gh auth git-credential','push','origin','HEAD:refs/heads/codex/c39-route-driving']);s.update(complete=True,pushedHead=sh(['git','rev-parse','HEAD']).strip(),evidence=str(dest/'manifest.json'),phase='pre-trip slice validated; continue remaining C-39 adapters');save()
 a=Path('/tmp/otr-active-work.json');d=json.loads(a.read_text());d.update(active_task='C-39; pre-trip slice validated, implement remaining adapters',active_worktree=str(B),branch='codex/c39-route-driving',pushed_head=s['pushedHead']);d['c39']={**d.get('c39',{}),**{k:s[k] for k in ['phase','candidateRevision','pushedHead','evidence']}};a.write_text(json.dumps(d,indent=2)+'\n');print('PRE-TRIP PROGRESS EVIDENCE PUSHED; C-39 remains doing.',flush=True)
except Exception as error:
 s.update(error=repr(error),phase='stopped on failed validation or new information');save();print('STOP',repr(error),flush=True);raise
