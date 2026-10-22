from pathlib import Path
import datetime,hashlib,json,os,re,shutil,signal,subprocess,time
R=Path('/workspace/c51-pilot-acceptance');B=Path('/workspace/c51-visible-people');OUT=R/'test/out/fp-review';STATE=Path('/tmp/c51-acceptance.json');SCRIPT=Path(__file__)
def now():return datetime.datetime.now(datetime.timezone.utc).isoformat()
def digest(p):return hashlib.sha256(p.read_bytes()).hexdigest()
def sh(args,cwd=B):return subprocess.check_output(args,cwd=cwd,text=True,stderr=subprocess.STDOUT)
def tracked(root):
 names=sh(['git','ls-files','src','data','assets/3d','index.html','test/*.js','test/tools'],root).splitlines()
 return {p:digest(root/p) for p in names if (root/p).is_file()}
def save():STATE.write_text(json.dumps(state,indent=2)+'\n')
def sources():
 assert tracked(R)==state['sourceSHA256'],'Frozen validation candidate changed'
 assert tracked(B)==state['branchSHA256'],'Frozen work-branch source changed'
def run(name,args,env=None,timeout=3600):
 sources();job={'name':name,'args':args,'env':env or {},'start':now(),'log':'c51-final-'+name+'.log'};state['jobs'].append(job);state['phase']=name;save();print('START',name,flush=True)
 with (OUT/job['log']).open('w') as log:
  proc=subprocess.Popen(args,cwd=R,env={**os.environ,'QA_BASE':'http://127.0.0.1:8367','QA_BROWSER':'/usr/bin/chromium',**(env or {})},stdout=log,stderr=subprocess.STDOUT,start_new_session=True)
  job['pid']=proc.pid;save()
  try:code=proc.wait(timeout=timeout)
  except subprocess.TimeoutExpired:
   os.killpg(proc.pid,signal.SIGTERM);raise RuntimeError(name+' timed out')
 job.update(exit=code,end=now());save();print('END',name,code,flush=True);assert code==0,name+' failed; see '+str(OUT/job['log']);sources()
def boardInbox(s):return s[s.index('## Inbox for Codex'):s.index('## Inbox for Claude')]
def row(s,task,status):return '\n'.join(x.rsplit(' | ',1)[0]+' | '+status+' |' if x.startswith('| '+task+' |') else x for x in s.splitlines())+'\n'
def inbox(s,msg,status):
 marker='| --- | --- | --- | --- |';at=s.index(marker,s.index('## Inbox for Claude'))+len(marker);return s[:at]+'\n| 22 Oct | Codex | '+msg+' | '+status+' |'+s[at:]
def top(file,paragraph):
 s=file.read_text();at=s.index('\n')+1;file.write_text(s[:at]+'\n'+paragraph+'\n'+s[at:])
state=json.loads(Path('/tmp/c51-acceptance-before-lifecycle.json').read_text())
oldSource=state['sourceSHA256'];oldBranch=state['branchSHA256'];allowed=['test/fpambientworld.js','test/fpbench.js']
assert sorted(p for p,h in oldSource.items() if digest(R/p)!=h)==allowed,'Unexpected candidate source change'
assert sorted(p for p,h in oldBranch.items() if digest(B/p)!=h)==allowed,'Unexpected branch source change'
state['previousSourceVersions'].append({'candidateRevision':state['candidateRevision'],'sourceSHA256':oldSource,'branchSHA256':oldBranch})
state['priorFailedJobs'] += [{**j,'interruptedByAgent':True,'reason':'Correct the non-restorable benchmark setup before its long gate; no runtime change','retainedLog':'diagnostics/'+j['log']} for j in state['jobs'] if j.get('exit')!=0]
state['jobs']=[j for j in state['jobs'] if j.get('exit')==0]
state.update(sourceSHA256=tracked(R),branchSHA256=tracked(B),candidateRevision=sh(['git','rev-parse','HEAD'],R).strip(),resumed=now(),fixtureRevision='bf37a0cb3276d4528ec795847fe48c4ef98056df',phase='resume after lifecycle fixture correction')
state.pop('error',None);save()
knownInbox=set(boardInbox(sh(['git','show','90844ac5:docs/COORDINATION.md'])).splitlines())
try:
 run('people-fixture-regression',['node','test/fpambientworld.js'])
 run('translated-guard-lifecycle',['node','test/englishtext.js'])
 run('focused-quality',['node','/tmp/c51-focused-quality.js'],timeout=3600)
 run('quality',['node','test/fpquality.js'],{'QA_TAG':'c51-final'},timeout=14400)
 quality=json.loads((OUT/'c51-final-quality.json').read_text());assert quality['scope']=='complete' and len(quality['profiles'])==4 and all(p['exit']==0 for p in quality['profiles']);assert sum(len(p['views']) for p in quality['profiles'])==224
 verify="const fs=require('fs'),a=require('assert/strict'),q=require('./test/fpquality'),o='test/out/fp-review/',s=JSON.parse(fs.readFileSync(o+'c51-final-quality.json'));for(const p of s.profiles){const required=q.PROFILES.find(x=>x.id===p.id);a.deepEqual(p.views,required.views.split(','));a.deepEqual(q.checkReport(JSON.parse(fs.readFileSync(o+p.report)),required,'c51-final-'+p.id),p.peak);}console.log('All 224 resource views revalidated.');"
 state['resourceValidation']=sh(['node','-e',verify],R).strip();sources()
 sh(['git','-c','credential.helper=!gh auth git-credential','fetch','origin','pilot']);latest=sh(['git','rev-parse','origin/pilot']).strip();latestBoard=sh(['git','show','origin/pilot:docs/COORDINATION.md'])
 assert not [x for x in boardInbox(latestBoard).splitlines() if x.startswith('|') and x.endswith(' open |') and x not in knownInbox],'New Codex inbox items need reading before handoff'
 for path in sh(['git','diff','--name-only','90844ac5','origin/pilot','--','src','data','index.html','assets']).splitlines():
  assert (R/path).is_file() and hashlib.sha256(subprocess.check_output(['git','show','origin/pilot:'+path],cwd=B)).hexdigest()==digest(R/path),'New untested pilot source: '+path
 assert sh(['git','branch','--show-current']).strip()=='codex/c51-visible-people';assert not sh(['git','status','--porcelain']).strip(),'Work branch has pending changes'
 dest=B/'docs/review/set-10/c51-acceptance';raw=dest/'raw';raw.mkdir(parents=True,exist_ok=True)
 for pattern in ['c51-final-*','bench-c51-final-*','c51-focused-*','bench-c51-focused-*','c51-route-coverage.json','c51-initial-town-high-failed.log','c51-before-town-fix.json','c28-*.json','c28-*.png','c27-*.json','c27-*.png']:
  for p in OUT.glob(pattern):
   if p.is_file() and (p.suffix!='.png' or 'ambient' in p.name or 'people' in p.name or p.name.startswith(('c28-','c27-'))):shutil.copy2(p,raw/p.name)
 repo=dest/'repository';repo.mkdir(exist_ok=True)
 for p in (R/'test/out/run-all').glob('*.log'):shutil.copy2(p,repo/p.name)
 shutil.copytree(OUT/'c51-interrupted-quality',dest/'diagnostics',dirs_exist_ok=True)
 for f in [SCRIPT,STATE,Path('/tmp/c51-focused-quality.js'),Path('/tmp/c51-prepared.json'),Path('/tmp/c51-model-audit.json')]:shutil.copy2(f,dest/f.name)
 sweeps={k:json.loads((OUT/('c51-final-'+k+'-geometry.json')).read_text()) for k in ['loaded','fallback']}
 text='# C-51 current-pilot acceptance\n\nCandidate `'+state['candidateRevision']+'` combines pilot `90844ac5` with the owned B-164/C-49/C-50 stack and C-51 runtime `32623203`. All final jobs passed. The sole initial failure was the High town fixture still expecting eight groups before the new bench. The corrected fixture expects nine and proves the bench changes 1,470 native pixels; its 65 checks pass. Both attempts and both source versions are retained. Runtime is unchanged by both fixture corrections, so previously passed runtime checks are retained with their original source scope. The new benchmark setup now calls the real later/walkaround departure adapters and retains generated weather. A regression exercises every actual benchmark page-evaluation function against real mission restore and rendering adapters, and the 17 new resource views are checked separately before the complete gate. The intentionally interrupted earlier gate is excluded and retained as diagnostics. The superseded pre-car-priority run is excluded. The complete resource gate has 224 views, including 17 new people/bench views. Native pixel tests cover High, Low, missing High character files and Tamil larger/colour/reduced Low; original actors, asset recovery and town rendering are checked separately.\n\nThe source-equivalence check reproduces all three uploaded exports; geometry/skin/idle-walk samples and original licences are retained. CPU geometry sweeps cover 285,600 views per loaded/fallback profile; these are not frame-rate measurements. The route-range audit covers 60 generated routes and is potential selection range, not pixel proof for every route. Collision-bearing parked cars keep priority over optional Low people.\n\nRaw reports, logs and selected task screenshots are retained here. The runner captures every resource screenshot locally; this archive includes new ambient views and the separate people/actor/town views. No new event, save field, setting, text or control. Cloud FPS does not certify the owner’s Intel 60 fps; O-1 remains. No preview deployment.\n'
 (dest/'README.md').write_text(text)
 manifest={**state,'complete':True,'status':'All final current-pilot acceptance jobs passed','latestPilot':latest,'quality':quality,'focusedQuality':json.loads((OUT/'c51-focused-quality.json').read_text()),'sweeps':sweeps,'files':[]}
 for p in sorted(dest.rglob('*')):
  if p.is_file() and p.name!='manifest.json':manifest['files'].append({'file':str(p.relative_to(dest)),'bytes':p.stat().st_size,'sha256':digest(p)})
 (dest/'manifest.json').write_text(json.dumps(manifest,indent=2)+'\n')
 for f in manifest['files']:assert digest(dest/f['file'])==f['sha256']
 figures='; '.join(p['id']+' **'+' / '.join(str(p['peak'][k]) for k in ['calls','triangles','textures','attachmentBytes','phaserBytes'])+'**' for p in quality['profiles'])
 paragraph='**C-51 visible people (22 October 2026):** all 224 current-pilot resource views pass on candidate `'+state['candidateRevision'][:8]+'`, carrying B-164/C-49/C-50 and owned runtime `32623203`. '+figures+' (calls / triangles / Three textures / attachment bytes / Phaser estimate bytes). Ceilings are unchanged. Two High uploaded adults and up to four benches use no additional texture; Low adds a bounded silhouette only after collision-bearing cars have their original budget priority. All final repository, source-equivalence, native people/asset/actor/town and loaded/fallback geometry checks pass. Exact commands, figures, hashes and screenshots: `docs/review/set-10/c51-acceptance/manifest.json`. Cloud FPS cannot certify Intel 60 fps; O-1 remains.'
 for f in ['docs/PERF.md','docs/FRAME-BUDGET.md']:top(B/f,paragraph)
 p=B/'docs/3D-PEOPLE.md';s=p.read_text().replace('current-pilot acceptance is in progress.','current-pilot acceptance has passed; C-51 is ready for review.');s+='\nFinal acceptance: all 224 resource views and every job in `review/set-10/c51-acceptance/manifest.json` pass. The earlier measurements above are historical progress; use the final manifest and PERF for the corrected renderer.\n';p.write_text(s)
 sh(['python3','/tmp/otr-refresh-board.py',str(B)]);p=B/'docs/COORDINATION.md';s=row(p.read_text(),'C-51','review (codex/c51-visible-people)');msg='**C-51 is ready on `codex/c51-visible-people`, stacked on C-50.** Uploaded animated adults are visible during ordinary routes, with safe derived placements, reduced-motion idle, missing-pack fallback and bounded High benches. The corrected Low reservation keeps collision-bearing cars ahead of optional people. All 224 current-pilot resource views and final repository/source-equivalence/native/geometry jobs pass. Figures and screenshots: `docs/review/set-10/c51-acceptance/manifest.json`, PERF and FRAME-BUDGET. Credits were regenerated with the authorised tool. No scoring/save/shared setting/i18n edit or preview deployment.';s=inbox(s,msg,'review (codex/c51-visible-people)');s=s.replace('## Log\n','## Log\n\n- **22 October 2026, Codex — '+now()+' C-51 handoff:** '+msg+' Hourly automation remains enabled and untouched.\n',1);p.write_text(s)
 sh(['git','diff','--check']);sh(['git','add','docs']);sh(['git','commit','-m','Record complete people acceptance and hand over for review']);sh(['git','-c','credential.helper=!gh auth git-credential','push','origin','HEAD:refs/heads/codex/c51-visible-people']);state['pushedHead']=sh(['git','rev-parse','HEAD']).strip();state['evidence']=str(dest/'manifest.json');state['phase']='review';save();print('PUSHED C-51 FOR REVIEW',state['pushedHead'],flush=True)
 # Start the next visual task on the completed owned stack, without waiting for a merge.
 ref='codex/c52-device-design';N=Path('/workspace/c52-device-design');nextrow=next(x for x in latestBoard.splitlines() if x.startswith('| C-52 |'))
 if '| todo' in nextrow and not N.exists() and not sh(['git','-c','credential.helper=!gh auth git-credential','ls-remote','origin','refs/heads/'+ref]).strip() and subprocess.run(['git','show-ref','--verify','--quiet','refs/heads/'+ref],cwd=B).returncode:
  sh(['git','worktree','add','-b',ref,str(N),state['pushedHead']]);sh(['python3','/tmp/otr-refresh-board.py',str(N)],N);p=N/'docs/COORDINATION.md';s=row(row(p.read_text(),'C-51','review (codex/c51-visible-people)'),'C-52','doing ('+ref+'; stacked on pushed C-51)');msg2='**C-52 started on `'+ref+'`, stacked on the pushed C-51 renderer.** The first source audit records the physical cab, HUD and handheld files and their hashes; the next implementation is the coherent instrument/device visual pass, retaining controls, remapping, narration, larger text and both quality budgets. No new visual or performance result is claimed by this audit.';s=inbox(s,msg2,'doing ('+ref+')');s=s.replace('## Log\n','## Log\n\n- **22 October 2026, Codex — C-52 started immediately after C-51:** '+msg2+'\n',1);p.write_text(s)
  audit={f:{'sha256':digest(N/f),'bytes':(N/f).stat().st_size} for f in ['src/core/fpcab.js','src/core/fphud.js','src/core/fphandheld.js','src/scenes/FirstPersonScene.js','docs/ASSETS.md'] if (N/f).is_file()};d=N/'docs/review/set-10/c52-source-audit';d.mkdir(parents=True,exist_ok=True);(d/'manifest.json').write_text(json.dumps({'status':'Source audit only; no new visual claim','date':now(),'base':state['pushedHead'],'files':audit},indent=2)+'\n');(N/'docs/3D-DEVICE-DESIGN.md').write_text('# Cab and handheld visual design\n\nC-52 is doing, stacked on pushed C-51. The source audit in `review/set-10/c52-source-audit/manifest.json` records the actual inherited instrument/HUD/handheld files. C-51’s complete acceptance is the baseline.\n\nNext implementation: one coherent physical instrument and device appearance, with readable instrument hierarchy, consistent spacing and contrast. Retain all physical control targets, mirrors, navigation/rear-camera mounts, keyboard/remapping routes, translated whole-sentence readings, narration and the gentle first-day guidance. Larger text must wrap without shrinking, and colour-blind and reduced-motion settings must keep working. No shared settings, scoring, save or translation changes without Claude.\n\nBefore review: native cab/handheld screenshots, English and Tamil normal/larger layouts, remapped keyboard/narration checks, and the combined fpbench gate with figures in PERF. This initial source audit is not a visual implementation or a performance measurement.\n');sh(['git','add','docs/COORDINATION.md','docs/3D-DEVICE-DESIGN.md','docs/review/set-10/c52-source-audit'],N);sh(['git','commit','-m','Start the cab and device visual pass with a source audit'],N);sh(['git','-c','credential.helper=!gh auth git-credential','push','origin','HEAD:refs/heads/'+ref],N);state['nextTask']={'task':'C-52','branch':ref,'worktree':str(N),'head':sh(['git','rev-parse','HEAD'],N).strip(),'status':'doing; source audit pushed'}
 state['complete']=True;save();active=Path('/tmp/otr-active-work.json');a=json.loads(active.read_text());a['c51_acceptance']=state;a['c51'].update(status='review',pushed_head=state['pushedHead'],evidence=state['evidence']);n=state.get('nextTask');a.update(active_task='C-52 device design source audit; continue implementation' if n else 'Take next todo after fresh board',active_worktree=n['worktree'] if n else str(B),branch=n['branch'] if n else 'codex/c51-visible-people',pushed_head=n['head'] if n else state['pushedHead']);active.write_text(json.dumps(a,indent=2)+'\n');print('C-51 acceptance and handoff complete.',flush=True)
except Exception as e:
 state['error']=repr(e);state['phase']='blocked on failed validation or new information';save();print('STOP',repr(e),flush=True);raise
