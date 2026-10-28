from pathlib import Path
import datetime,hashlib,json,os,shutil,subprocess,signal
B=Path('/workspace/c38-scenario-runner');R=Path('/workspace/c38-pilot-acceptance');OUT=R/'test/out/fp-review';OUT.mkdir(parents=True,exist_ok=True);STATE=Path('/tmp/c38-acceptance.json')
def now():return datetime.datetime.now(datetime.timezone.utc).isoformat()
def sha(p):return hashlib.sha256(p.read_bytes()).hexdigest()
def sh(args,root=B):return subprocess.check_output(args,cwd=root,text=True,stderr=subprocess.STDOUT)
def tracked(root):return {p:sha(root/p) for p in sh(['git','ls-files','src','data','assets/3d','index.html','test/*.js','test/tools'],root).splitlines() if (root/p).is_file()}
def save():STATE.write_text(json.dumps(state,indent=2)+'\n')
def sources():
 assert tracked(B)==state['branchSHA256'],'Branch source changed'
 assert tracked(R)==state['sourceSHA256'],'Candidate source changed'
def run(name,args,env=None,timeout=3600):
 sources();j={'name':name,'args':args,'env':env or {},'start':now(),'log':'c38-final-'+name+'.log'};state['jobs'].append(j);state['phase']=name;save();print('START',name,flush=True)
 with (OUT/j['log']).open('w') as log:
  p=subprocess.Popen(args,cwd=R,env={**os.environ,'QA_BASE':'http://127.0.0.1:8371','QA_BROWSER':'/usr/bin/chromium',**(env or {})},stdout=log,stderr=subprocess.STDOUT,start_new_session=True);j['pid']=p.pid;save()
  try:code=p.wait(timeout=timeout)
  except subprocess.TimeoutExpired:os.killpg(p.pid,signal.SIGTERM);raise RuntimeError(name+' timed out')
 j.update(exit=code,end=now());save();print('END',name,code,flush=True);assert code==0,name+' failed; see '+str(OUT/j['log']);sources()
def row(s,task,status):return '\n'.join(l.rsplit(' | ',1)[0]+' | '+status+' |' if l.startswith('| '+task+' |') else l for l in s.splitlines())+'\n'
def inbox(s,msg,status):
 marker='| --- | --- | --- | --- |';i=s.index(marker,s.index('## Inbox for Claude'))+len(marker);return s[:i]+'\n| 22 Oct | Codex | '+msg+' | '+status+' |'+s[i:]
def codexInbox(s):return s[s.index('## Inbox for Codex'):s.index('## Inbox for Claude')]
knownInbox=set(codexInbox(sh(['git','show','90844ac5:docs/COORDINATION.md'])).splitlines())
state=json.loads(Path('/tmp/c38-before-guidance.json').read_text())
state['previousSourceVersions'].append({'candidateRevision':state['candidateRevision'],'sourceSHA256':state['sourceSHA256'],'branchSHA256':state['branchSHA256']})
state['jobs'][0].update(candidateRevision=state['candidateRevision'],scope='82 repository suites pass at 7aed62d2 with the merged signal/replay entries restored. The only later runtime change returns no workday guidance for module sessions; four current guidance checks cover the original workday behavior and module suppression, and the native scenario suite covers the guarded entry.')
state.update(ownedRuntime='1532980c',candidateRevision=sh(['git','rev-parse','HEAD'],R).strip(),sourceSHA256=tracked(R),branchSHA256=tracked(B),resumed=now(),phase='resume after module guidance guard')
state.pop('error',None);save()
try:
 run('guidance-unit',['node','test/fpguide.js'])
 run('lifecycle-unit',['node','test/fpscenario.js'])
 run('translated-assertion-guard',['node','test/englishtext.js'])
 run('scenario-native',['node','test/fpscenariobrowser.js'],{'QA_TAG':'c38-final-native'})
 run('cab-controls',['node','test/fpcabbrowser.js'])
 run('signals',['node','test/fpsignalbrowser.js'])
 run('signals-high',['node','test/fpsignalbrowser.js'],{'QA_GFX':'high','QA_TAG':'c38-final-high'})
 run('replay',['node','test/fpreplaybrowser.js'],{'QA_TAG':'c38-final-replay'})
 run('narration',['node','test/fpnarrationbrowser.js'])
 run('module-resources',['node','test/fpquality.js'],{'QA_MODULES_ONLY':'1','QA_TAG':'c38-final-modules'},timeout=7200)
 q=json.loads((OUT/'c38-final-modules-quality.json').read_text());assert q['scope']=='module-set-pieces' and len(q['profiles'])==4 and sum(len(p['views']) for p in q['profiles'])==24 and all(p['exit']==0 for p in q['profiles'])
 verify="const fs=require('fs'),a=require('assert/strict'),q=require('./test/fpquality'),o='test/out/fp-review/',s=JSON.parse(fs.readFileSync(o+'c38-final-modules-quality.json'));for(const p of s.profiles){const r={...q.PROFILES.find(x=>x.id===p.id),views:q.MODULE_VIEWS};a.deepEqual(p.views,r.views.split(','));a.deepEqual(q.checkReport(JSON.parse(fs.readFileSync(o+p.report)),r,'c38-final-modules-'+p.id),p.peak);}console.log('All 24 module resource views independently revalidated.');"
 state['resourceValidation']=sh(['node','-e',verify],R).strip();sources()
 sh(['git','-c','credential.helper=!gh auth git-credential','fetch','origin','pilot']);latest=sh(['git','rev-parse','origin/pilot']).strip();board=sh(['git','show','origin/pilot:docs/COORDINATION.md'])
 assert not [l for l in codexInbox(board).splitlines() if l.startswith('|') and l.endswith(' open |') and l not in knownInbox],'New unread Codex inbox'
 for p in sh(['git','diff','--name-only','90844ac5','origin/pilot','--','src','data','index.html','assets']).splitlines():assert (R/p).is_file() and hashlib.sha256(subprocess.check_output(['git','show','origin/pilot:'+p],cwd=B)).hexdigest()==sha(R/p),'Untested new pilot source: '+p
 assert sh(['git','branch','--show-current']).strip()=='codex/c38-scenario-runner';assert not sh(['git','status','--porcelain']).strip(),'Uncommitted branch before handoff'
 state.update(validationComplete=now(),phase='validated',latestPilot=latest);save()
 dest=B/'docs/review/set-10/c38-acceptance';raw=dest/'raw';raw.mkdir(parents=True,exist_ok=True)
 for pattern in ['c38-final-*','bench-c38-final-*','c22-*','b138-*','b30-*']:
  for p in OUT.glob(pattern):
   if p.is_file():shutil.copy2(p,raw/p.name)
 repo=dest/'repository';repo.mkdir(exist_ok=True)
 for p in (R/'test/out/run-all').glob('*.log'):shutil.copy2(p,repo/p.name)
 shutil.copy2(__file__,dest/'acceptance.py');shutil.copy2(STATE,dest/'validation-state.json')
 (dest/'README.md').write_text('# C-38 runner acceptance\n\nCurrent-pilot candidate `'+state['candidateRevision']+'` carries the owned C-38 patch over the fully tested C-52 candidate. The pushed code branch is stacked on C-52; merged owned signal, replay and accessibility changes were retained. No shared scoring, save, settings, translations, course data or flow source was authored. The shared A-30 selection hook is a proposed patch in `../c38-runner-api/flow-selection.patch`, for Claude. No course is enabled by default and no production exercise is claimed before C-39 to C-46. The test-only adapter uses an existing id to prove the actual results and assessment contracts.\n\nAll 82 repository suites pass at candidate `7aed62d2`, with merged signal/replay entries restored. The only later runtime change suppresses saved workday guidance in modules; four current guidance cases and the native guard cover it. Thirteen current module unit checks pass. Current native scenario/input/results/assessment, repeated entry, retained merged signals and replay, cab and narration checks pass. An earlier signal check found the stacked entry page omitted the merged signal and replay script entries. These were restored; the failure and old source inventories are retained separately, and the broad suite was rerun after restoring those entries, and the affected browser checks run at the final candidate. Native workday start/pause and module abandonment preserve the actual campaign checkpoint and saved day, with exactly one abandoned assessment attempt. Runtime failure transfers that same attempt to the existing 2D scene. Assessment notices and captions omit coaching while keeping sensory cues and physical controls. All 24 focused module resource views pass under unchanged Low/High ceilings, including real reverse camera, handheld, larger text/colour/reduced motion and missing models. Their raw reports were independently revalidated. C-52’s earlier 224-view workday gate remains at its own source; it is not relabelled as a fresh C-38 run. Cloud FPS does not prove Intel 60 fps; O-1 remains.\n\nEarlier native/resource progress and the caption/fixture diagnostics are separately source scoped under `../c38-progress/`. These final checks supersede that evidence.\n')
 manifest={**state,'complete':True,'quality':q,'files':[]}
 for p in sorted(dest.rglob('*')):
  if p.is_file() and p.name!='manifest.json':manifest['files'].append({'file':str(p.relative_to(dest)),'bytes':p.stat().st_size,'sha256':sha(p)})
 (dest/'manifest.json').write_text(json.dumps(manifest,indent=2)+'\n')
 for f in manifest['files']:assert sha(dest/f['file'])==f['sha256']
 figures='; '.join(p['id']+' **'+' / '.join(str(p['peak'][k]) for k in ['calls','triangles','textures','attachmentBytes','phaserBytes'])+'**' for p in q['profiles'])
 text='**C-38 focused module gate (22 October 2026):** all 24 rendered set-piece views pass on candidate `'+state['candidateRevision'][:8]+'`. '+figures+' (calls / triangles / Three textures / attachment bytes / Phaser estimate bytes). Original ceilings are unchanged. Depot, street, doorstep, cab, live reverse camera and handheld are measured in the actual runner, with native workday/checkpoint isolation. Repository, native practice/assessment/results/fallback, cab, signal and narration checks pass. Exact source, commands, reports and screenshots: `docs/review/set-10/c38-acceptance/manifest.json`. C-52’s 224-view workday baseline retains its original source scope. Intel FPS remains O-1.'
 for f in ['docs/PERF.md','docs/FRAME-BUDGET.md']:
  p=B/f;s=p.read_text();i=s.index('\n')+1;p.write_text(s[:i]+'\n'+text+'\n'+s[i:])
 sh(['python3','/tmp/otr-refresh-board.py',str(B)]);p=B/'docs/COORDINATION.md';s=p.read_text()
 for task,ref in [('C-51','c51-visible-people'),('C-52','c52-device-design'),('C-38','c38-scenario-runner')]:s=row(s,task,'review (codex/'+ref+')')
 msg='**C-38 is ready on `codex/c38-scenario-runner`, stacked on pushed C-52.** The isolated runner loads bounded depot/street/doorstep/cab pieces, shows goal/time, pauses correctly, suppresses assessment coaching, routes physical observations to a module-local adapter and finishes through the existing result contract with the original id. Actual workday checkpoints/reports remain unchanged; quitting keeps the attempt, and runtime failure transfers the same attempt to the real 2D scene. All 82 repository suites pass at `7aed62d2` with merged signal/replay entries restored. The only later runtime change suppresses saved workday guidance in modules, covered by four current guidance cases and the native guard. Thirteen current module cases and the native/control/narration checks pass at the final candidate. All 24 focused module resource views pass. Evidence: `docs/review/set-10/c38-acceptance/manifest.json`, figures in PERF/FRAME-BUDGET. The shared A-30 flow selection proposal remains with you under `c38-runner-api/flow-selection.patch`; no course data/default or shared source was authored.'
 s=inbox(s,msg,'review (codex/c38-scenario-runner)');s=s.replace('## Log\n','## Log\n\n- **22 October 2026, Codex — '+now()+' C-38 handoff:** '+msg+' No merge, protected push, preview deployment or automation change.\n',1);p.write_text(s)
 sh(['git','diff','--check']);sh(['git','add','docs']);sh(['git','commit','-m','Record scenario runner acceptance and hand over for review']);sh(['git','-c','credential.helper=!gh auth git-credential','push','origin','HEAD:refs/heads/codex/c38-scenario-runner']);state.update(pushedHead=sh(['git','rev-parse','HEAD']).strip(),evidence=str(dest/'manifest.json'),phase='review');save();print('PUSHED C-38 FOR REVIEW',state['pushedHead'],flush=True)
 ref='codex/c39-route-driving';N=Path('/workspace/c39-route-driving');nextrow=next((l for l in board.splitlines() if l.startswith('| C-39 |')),'')
 if '| todo' in nextrow and not N.exists() and not sh(['git','-c','credential.helper=!gh auth git-credential','ls-remote','origin','refs/heads/'+ref]).strip() and subprocess.run(['git','show-ref','--verify','--quiet','refs/heads/'+ref],cwd=B).returncode:
  sh(['git','worktree','add','-b',ref,str(N),state['pushedHead']]);p=N/'docs/COORDINATION.md';s=row(p.read_text(),'C-39','doing ('+ref+'; stacked on pushed C-38)');msg2='**C-39 started on `'+ref+'`, stacked on pushed C-38.** Initial contract/source audit only; production Route and Driving adapters follow `docs/3D-MODULES.md`, preserving old ids/scales and the optional new-id rules. No production exercise, default switch or performance result is claimed by this audit.';s=inbox(s,msg2,'doing ('+ref+')');s=s.replace('## Log\n','## Log\n\n- **22 October 2026, Codex — C-39 started after C-38:** '+msg2+'\n',1);p.write_text(s)
  d=N/'docs/review/set-10/c39-source-audit';d.mkdir(parents=True,exist_ok=True);files=['docs/3D-MODULES.md','src/core/fpscenario.js','src/scenes/FirstPersonScenarioScene.js','data/m1_pretrip.js','data/modules.js'];(d/'manifest.json').write_text(json.dumps({'date':now(),'status':'Initial source audit only','base':state['pushedHead'],'taskRow':nextrow,'files':{f:{'sha256':sha(N/f),'bytes':(N/f).stat().st_size} for f in files if (N/f).is_file()}},indent=2)+'\n');sh(['git','add','docs/COORDINATION.md','docs/review/set-10/c39-source-audit'],N);sh(['git','commit','-m','Start the 3D driving module with a source and contract audit'],N);sh(['git','-c','credential.helper=!gh auth git-credential','push','origin','HEAD:refs/heads/'+ref],N);state['nextTask']={'task':'C-39','branch':ref,'worktree':str(N),'head':sh(['git','rev-parse','HEAD'],N).strip(),'status':'doing; initial source audit'}
 state['complete']=True;save();a=Path('/tmp/otr-active-work.json');d=json.loads(a.read_text());d['c38']={**d.get('c38',{}),'status':'review','pushed_head':state['pushedHead'],'evidence':state['evidence']};n=state.get('nextTask');d.update(active_task='C-39 Route and Driving; continue implementation' if n else 'Take next todo after fresh board',active_worktree=n['worktree'] if n else str(B),branch=n['branch'] if n else 'codex/c38-scenario-runner',pushed_head=n['head'] if n else state['pushedHead']);a.write_text(json.dumps(d,indent=2)+'\n');print('Acceptance and handoff complete.',flush=True)
except Exception as e:
 state.update(error=repr(e),phase='blocked on failed validation or new information');save();print('STOP',repr(e),flush=True);raise
