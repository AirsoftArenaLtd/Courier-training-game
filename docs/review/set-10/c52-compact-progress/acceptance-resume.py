from pathlib import Path
import datetime,hashlib,json,os,shutil,signal,subprocess
B=Path('/workspace/c52-device-design');R=Path('/workspace/c52-pilot-acceptance');OUT=R/'test/out/fp-review';OUT.mkdir(parents=True,exist_ok=True);STATE=Path('/tmp/c52-acceptance.json')
def now():return datetime.datetime.now(datetime.timezone.utc).isoformat()
def digest(p):return hashlib.sha256(p.read_bytes()).hexdigest()
def sh(args,root=B):return subprocess.check_output(args,cwd=root,text=True,stderr=subprocess.STDOUT)
def tracked(root):return {p:digest(root/p) for p in sh(['git','ls-files','src','data','assets/3d','index.html','test/*.js','test/tools'],root).splitlines() if (root/p).is_file()}
def save():STATE.write_text(json.dumps(state,indent=2)+'\n')
def sources():
 assert tracked(B)==state['branchSHA256'],'Work branch source changed'
 assert tracked(R)==state['sourceSHA256'],'Candidate source changed'
def run(name,args,env=None,timeout=3600):
 sources();j={'name':name,'args':args,'env':env or {},'start':now(),'log':'c52-final-'+name+'.log'};state['jobs'].append(j);state['phase']=name;save();print('START',name,flush=True)
 with (OUT/j['log']).open('w') as log:
  p=subprocess.Popen(args,cwd=R,env={**os.environ,'QA_BASE':'http://127.0.0.1:8369','QA_BROWSER':'/usr/bin/chromium',**(env or {})},stdout=log,stderr=subprocess.STDOUT,start_new_session=True);j['pid']=p.pid;save()
  try:code=p.wait(timeout=timeout)
  except subprocess.TimeoutExpired:os.killpg(p.pid,signal.SIGTERM);raise RuntimeError(name+' timed out')
 j.update(exit=code,end=now());save();print('END',name,code,flush=True);assert code==0,name+' failed; see '+str(OUT/j['log']);sources()
def codexInbox(s):return s[s.index('## Inbox for Codex'):s.index('## Inbox for Claude')]
def row(s,task,status):return '\n'.join(x.rsplit(' | ',1)[0]+' | '+status+' |' if x.startswith('| '+task+' |') else x for x in s.splitlines())+'\n'
def inbox(s,msg,status):
 marker='| --- | --- | --- | --- |';i=s.index(marker,s.index('## Inbox for Claude'))+len(marker);return s[:i]+'\n| 22 Oct | Codex | '+msg+' | '+status+' |'+s[i:]
def top(p,text):
 s=p.read_text();i=s.index('\n')+1;p.write_text(s[:i]+'\n'+text+'\n'+s[i:])
knownInbox=set(codexInbox(sh(['git','show','90844ac5:docs/COORDINATION.md'])).splitlines())
state=json.loads(Path('/tmp/c52-acceptance-before-gap-fix.json').read_text())
allowed=['test/fpdevicedesignbrowser.js']
assert sorted(p for p,h in state['sourceSHA256'].items() if digest(R/p)!=h)==allowed,'Unexpected candidate change'
assert sorted(p for p,h in state['branchSHA256'].items() if digest(B/p)!=h)==allowed,'Unexpected work-branch change'
state['previousSourceVersions']=[{'candidateRevision':state['candidateRevision'],'sourceSHA256':state['sourceSHA256'],'branchSHA256':state['branchSHA256']}]
state['priorFailedJobs']=[{**j,'reason':'The new test required a five-pixel gap; merged fpAccess intentionally uses two to six pixels on dense translated pages. Corrected test also checks actual rendered faces and 46-pixel hit heights.'} for j in state['jobs'] if j.get('exit')!=0]
state['jobs']=[j for j in state['jobs'] if j.get('exit')==0]
state.update(sourceSHA256=tracked(R),branchSHA256=tracked(B),candidateRevision=sh(['git','rev-parse','HEAD'],R).strip(),ownedFixture='afec37a9',resumed=now(),phase='resume after compact-gap assertion correction')
state.pop('error',None);state['jobs'].append({'name':'compact-gap-regression','args':['node','test/fpdevicedesignbrowser.js'],'env':{'QA_QUALITIES':'low','QA_LANGS':'ml','QA_TAG':'c52-compact-gap'},'exit':0,'log':'c52-final-compact-gap-regression.log','candidateRevision':state['candidateRevision'],'result':'23 checks pass; larger-text nominal and rendered gaps 3.75px; hit heights 46,46,46,46,56.'});save()
try:
 run('device-low-all-languages',['node','test/fpdevicedesignbrowser.js'],{'QA_QUALITIES':'low','QA_LANGS':'en,es,fr,hi,bn,mr,te,ta,gu,kn,ml,pa','QA_TAG':'c52-final-design-low'},timeout=7200)
 run('device-high',['node','test/fpdevicedesignbrowser.js'],{'QA_QUALITIES':'high','QA_TAG':'c52-final-design-high'},timeout=3600)
 run('hud-low',['node','test/fphudbrowser.js'],{'QA_GFX':'low'})
 run('hud-high',['node','test/fphudbrowser.js'],{'QA_GFX':'high'})
 run('cab-controls',['node','test/fpcabbrowser.js'])
 run('delivery-layouts',['node','test/fpdoorsbrowser.js'])
 run('theme-and-cleanup',['node','test/fpbrandingbrowser.js'])
 run('narration',['node','test/fpnarrationbrowser.js'])
 run('sign-clearance-low',['node','test/fpsignlayoutbrowser.js'],{'QA_GFX':'low','QA_TAG':'c52-final-signs-low'},timeout=7200)
 run('sign-clearance-high',['node','test/fpsignlayoutbrowser.js'],{'QA_GFX':'high','QA_TAG':'c52-final-signs-high'},timeout=7200)
 sweep={k:'1' for k in ['QA_DAMAGE','QA_STOPS','QA_WALKAROUND','QA_TRAFFIC','QA_NAV','QA_SIGNS','QA_LATER','QA_CAMERA','QA_CAB','QA_MIRRORS','QA_REAR','QA_LIGHTING','QA_WEATHER','QA_CARGO']}
 run('sweep-loaded',['node','test/fproute.js'],{**sweep,'QA_ASSETS':'1','QA_TAG':'c52-final-loaded'})
 run('sweep-fallback',['node','test/fproute.js'],{**sweep,'QA_ASSETS':'0','QA_TAG':'c52-final-fallback'})
 run('quality',['node','test/fpquality.js'],{'QA_TAG':'c52-final'},timeout=14400)
 quality=json.loads((OUT/'c52-final-quality.json').read_text());assert quality['scope']=='complete' and len(quality['profiles'])==4 and sum(len(p['views']) for p in quality['profiles'])==224 and all(p['exit']==0 for p in quality['profiles'])
 verify="const fs=require('fs'),a=require('assert/strict'),q=require('./test/fpquality'),o='test/out/fp-review/',s=JSON.parse(fs.readFileSync(o+'c52-final-quality.json'));for(const p of s.profiles){const r=q.PROFILES.find(x=>x.id===p.id);a.deepEqual(p.views,r.views.split(','));a.deepEqual(q.checkReport(JSON.parse(fs.readFileSync(o+p.report)),r,'c52-final-'+p.id),p.peak);}console.log('All 224 resource views revalidated.');"
 state['resourceValidation']=sh(['node','-e',verify],R).strip();sources()
 sh(['git','-c','credential.helper=!gh auth git-credential','fetch','origin','pilot']);latest=sh(['git','rev-parse','origin/pilot']).strip();board=sh(['git','show','origin/pilot:docs/COORDINATION.md'])
 assert not [x for x in codexInbox(board).splitlines() if x.startswith('|') and x.endswith(' open |') and x not in knownInbox],'New unread Codex inbox before handoff'
 for path in sh(['git','diff','--name-only','90844ac5','origin/pilot','--','src','data','index.html','assets']).splitlines():assert (R/path).is_file() and hashlib.sha256(subprocess.check_output(['git','show','origin/pilot:'+path],cwd=B)).hexdigest()==digest(R/path),'Untested new pilot source: '+path
 assert sh(['git','branch','--show-current']).strip()=='codex/c52-device-design';assert not sh(['git','status','--porcelain']).strip(),'Uncommitted branch changes before handoff'
 dest=B/'docs/review/set-10/c52-acceptance';raw=dest/'raw';raw.mkdir(parents=True,exist_ok=True)
 for pattern in ['c52-final-*','c52-compact-gap*','bench-c52-final-*','c47-*','c22-cab.json','c13-themes.json','b30-narration.json','b30-*.png','c9-*.json','c9-*.png','c13-*.png','c22-*.png']:
  for p in OUT.glob(pattern):
   if p.is_file():shutil.copy2(p,raw/p.name)
 repo=dest/'repository';repo.mkdir(exist_ok=True)
 for p in (R/'test/out/run-all').glob('*.log'):shutil.copy2(p,repo/p.name)
 shutil.copy2(__file__,dest/'acceptance.py');shutil.copy2(STATE,dest/'validation-state.json');shutil.copytree(OUT/'c52-initial-gap-failure',dest/'diagnostics',dirs_exist_ok=True)
 (dest/'README.md').write_text('# C-52 current-pilot acceptance\n\nAll final jobs pass on candidate `'+state['candidateRevision']+'`, built from tested current-pilot candidate `055415cf` plus the owned C-52 patch. The code branch is stacked on pushed C-51. Runtime `9b16fbd0` is unchanged; fixture `afec37a9` corrects the dense translated gap assertion. The 81-suite repository pass is retained at its original source scope, and both fixture versions and the first failed attempt are recorded. Rendered face separation and 46-pixel hit heights are checked. All 12 languages run at normal/larger text with colour-blind/reduced-motion settings on Low; English and Tamil run on High. Native instrument pixels, live values, real pointer input and remapped keys are checked. Original HUD, physical cab controls, delivery layouts, theme/shared-texture cleanup, narration and all-language sign/selector clearance pass. Loaded/fallback geometry sweeps and all 224 rendered resource views pass under unchanged ceilings.\n\nNo new control, string, report type, save field, setting, image, Three texture or render pass. Low uses vector case art, High reuses the original bounded canvas, and dials reuse the two-triangle face. Code-made art provenance is in ASSETS. Earlier fixture failures and the mixed-source exploratory 95/186 checks are excluded, under `../c52-exploratory/`. These final figures supersede them. Cloud SwiftShader FPS does not prove the owner’s Intel 60 fps; O-1 remains. No preview deployment or permanent automation change.\n')
 manifest={**state,'complete':True,'latestPilot':latest,'quality':quality,'files':[]}
 for p in sorted(dest.rglob('*')):
  if p.is_file() and p.name!='manifest.json':manifest['files'].append({'file':str(p.relative_to(dest)),'bytes':p.stat().st_size,'sha256':digest(p)})
 (dest/'manifest.json').write_text(json.dumps(manifest,indent=2)+'\n')
 for f in manifest['files']:assert digest(dest/f['file'])==f['sha256']
 figures='; '.join(p['id']+' **'+' / '.join(str(p['peak'][k]) for k in ['calls','triangles','textures','attachmentBytes','phaserBytes'])+'**' for p in quality['profiles'])
 paragraph='**C-52 cab and device appearance (22 October 2026):** all 224 resource views pass on candidate `'+state['candidateRevision'][:8]+'`, carrying current pilot and the pushed B-164/C-49/C-50/C-51 stack. '+figures+' (calls / triangles / Three textures / attachment bytes / Phaser estimated bytes). Ceilings are unchanged. Native instrument/device checks, normal/larger layouts in all 12 languages on Low and English/Tamil on High, controls, delivery layouts, narration, theme cleanup, sign/selector clearance and both geometry sweeps pass. Exact source scopes, reports and screenshots: `docs/review/set-10/c52-acceptance/manifest.json`. Cloud FPS does not certify Intel 60 fps (O-1).'
 for file in ['docs/PERF.md','docs/FRAME-BUDGET.md']:top(B/file,paragraph)
 p=B/'docs/3D-DEVICE-DESIGN.md';p.write_text(p.read_text()+'\nFinal acceptance has passed. Use `review/set-10/c52-acceptance/manifest.json` and the current PERF entry for final evidence; earlier implementation-stage notes above are historical. C-52 is ready for review.\n')
 sh(['python3','/tmp/otr-refresh-board.py',str(B)]);p=B/'docs/COORDINATION.md';s=row(row(p.read_text(),'C-51','review (codex/c51-visible-people)'),'C-52','review (codex/c52-device-design)');msg='**C-52 is ready on `codex/c52-device-design`, stacked on pushed C-51.** Recessed live instrument dials, restrained switch colours, matching rugged High/Low handheld case, vector page choices and framed navigation preserve all physical/input/accessibility behavior. Final repository/native/layout/narration/theme/geometry checks and all 224 resource views pass. All 12 languages were checked at normal/larger sizes on Low, with English/Tamil also on High. Screenshots, raw figures and hashes: `docs/review/set-10/c52-acceptance/manifest.json`; unchanged ceilings in PERF/FRAME-BUDGET. No shared scoring/save/Settings/i18n source change or preview deployment.';s=inbox(s,msg,'review (codex/c52-device-design)');s=s.replace('## Log\n','## Log\n\n- **22 October 2026, Codex — '+now()+' C-52 handoff:** '+msg+' Hourly automation remains enabled and untouched.\n',1);p.write_text(s)
 sh(['git','diff','--check']);sh(['git','add','docs']);sh(['git','commit','-m','Record complete device acceptance and hand over for review']);sh(['git','-c','credential.helper=!gh auth git-credential','push','origin','HEAD:refs/heads/codex/c52-device-design']);state.update(pushedHead=sh(['git','rev-parse','HEAD']).strip(),evidence=str(dest/'manifest.json'),phase='review');save();print('PUSHED C-52 FOR REVIEW',state['pushedHead'],flush=True)
 ref='codex/c38-scenario-runner';N=Path('/workspace/c38-scenario-runner');nextrow=next((x for x in board.splitlines() if x.startswith('| C-38 |')),'');dependencies=[next((x for x in board.splitlines() if x.startswith('| '+task+' |')),'') for task in ['C-24','C-27']]
 if '| todo' in nextrow and all('| done' in x for x in dependencies) and not N.exists() and not sh(['git','-c','credential.helper=!gh auth git-credential','ls-remote','origin','refs/heads/'+ref]).strip() and subprocess.run(['git','show-ref','--verify','--quiet','refs/heads/'+ref],cwd=B).returncode:
  sh(['git','worktree','add','-b',ref,str(N),state['pushedHead']]);sh(['python3','/tmp/otr-refresh-board.py',str(N)],N);p=N/'docs/COORDINATION.md';s=row(row(row(p.read_text(),'C-51','review (codex/c51-visible-people)'),'C-52','review (codex/c52-device-design)'),'C-38','doing ('+ref+'; stacked on pushed C-52)');msg2='**C-38 started on `'+ref+'`, stacked on pushed C-52.** Initial source/contract audit only; the next implementation is the scenario runner in `docs/3D-MODULES.md`, retaining the existing result/scoring contracts and 2D fallback. No new gameplay or performance result is claimed.';s=inbox(s,msg2,'doing ('+ref+')');s=s.replace('## Log\n','## Log\n\n- **22 October 2026, Codex — C-38 started after C-52:** '+msg2+'\n',1);p.write_text(s)
  d=N/'docs/review/set-10/c38-source-audit';d.mkdir(parents=True,exist_ok=True);files=['docs/3D-MODULES.md','docs/WORKDAY-EVENTS.md','src/scenes/FirstPersonScene.js','src/core/fpmission.js'];(d/'manifest.json').write_text(json.dumps({'date':now(),'status':'Initial source audit only','base':state['pushedHead'],'taskRow':nextrow,'files':{f:{'sha256':digest(N/f),'bytes':(N/f).stat().st_size} for f in files if (N/f).is_file()}},indent=2)+'\n');sh(['git','add','docs/COORDINATION.md','docs/review/set-10/c38-source-audit'],N);sh(['git','commit','-m','Start the scenario runner with a contract and source audit'],N);sh(['git','-c','credential.helper=!gh auth git-credential','push','origin','HEAD:refs/heads/'+ref],N);state['nextTask']={'task':'C-38','branch':ref,'worktree':str(N),'head':sh(['git','rev-parse','HEAD'],N).strip(),'status':'doing; initial source audit'}
 state['complete']=True;save();active=Path('/tmp/otr-active-work.json');a=json.loads(active.read_text());a['c52'].update(status='review',pushed_head=state['pushedHead'],evidence=state['evidence']);n=state.get('nextTask');a.update(active_task='C-38 scenario runner; continue implementation' if n else 'Take next todo after fresh board',active_worktree=n['worktree'] if n else str(B),branch=n['branch'] if n else 'codex/c52-device-design',pushed_head=n['head'] if n else state['pushedHead']);active.write_text(json.dumps(a,indent=2)+'\n');print('Acceptance and handoff complete.',flush=True)
except Exception as e:
 state['error']=repr(e);state['phase']='blocked on failed validation or new information';save();print('STOP',repr(e),flush=True);raise
