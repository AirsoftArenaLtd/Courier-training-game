#!/usr/bin/env python3
"""Verify each frozen phase and its artifacts before publishing the scoped UI handoff."""
import hashlib,json
from pathlib import Path
OUT=Path(__file__).resolve().parent;ROOT=OUT.parents[4]
sha=lambda p:hashlib.sha256(p.read_bytes()).hexdigest()
phases={}
for name in ['ui','menu']:
 plan=json.loads((OUT/(name+'-plan.json')).read_text());state=json.loads((OUT/(name+'-status.json')).read_text())
 assert state['phase']=='complete' and state['serverExited'] and state['leaseReleased'],name
 assert len(state['jobs'])==len(plan['jobs']) and all(j['accepted'] for j in state['jobs']),name
 assert all(sha(ROOT/p)==h for p,h in plan['sources'].items()),name+' source changed'
 for job in state['jobs']:
  for artifact in job['artifacts']:assert sha(OUT/'artifacts'/artifact['file'])==artifact['sha256'],artifact['file']
 phases[name]={'jobs':len(state['jobs']),'assertions':sum(j['checks'] for j in state['jobs']),'sourceInputs':len(plan['sources']),'planSHA256':sha(OUT/(name+'-plan.json')),'statusSHA256':sha(OUT/(name+'-status.json')),'cleanup':True}
peaks={}
for job in json.loads((OUT/'menu-status.json').read_text())['jobs']:
 r=json.loads((OUT/'artifacts'/job['tag']/(job['tag']+'.json')).read_text());assert r['complete'] and not r['errors']
 peaks[job['tag']]={k:max(v['peak'][k] for v in r['views']) for k in ['calls','triangles','textures','attachmentBytes','phaserBytes']}
 peaks[job['tag']]['views']=len(r['views'])
summary={'status':'owned runtime and session-remapping UI validated; B-2 blocked on shared durable writer and translations','phases':phases,'menuResourcePeaks':peaks,'CPU':{'cases':93,'suites':['fpgamepadcapture:7','fpgamepadscene:13','fpgamepad:8','fpgamepadaffinity:1','fpaccess:12','workday:26','savesize:26']},'translation':{'newStrings':31,'newTemplates':9,'freshCatalogueGuard':'expected failure in all eleven translated languages; raw log retained; shared catalogue unchanged','delta':'catalogue-delta.json'},'scope':['Session drafts are explicitly labeled and released on scene disposal; no shared settings writer, saved payload or hardware identity.','Real-menu tests cover raw unbound-button and axis capture, entry-held gate, release-to-commit, conflicts, cancellation, disabled inputs, deadzone, reset confirmation, existing remapped keyboard and scene reload.','Actual Tamil profile uses the current shared translations. New UI strings remain English; full Tamil and twelve-language acceptance are pending.','The first attempted native gesture was a test error: A was pressed after capture was already armed, correctly causing a conflict. Corrected test opens capture with A held; no application patch.','The earlier resource/render/keyboard oracle proofs retain their prior explicit source scopes. No full-route matrix, pending graphics-stack or Intel FPS claim.'],'remaining':['Claude bounded shared Controls/Accessibility writer and SCORM capacity policy, preserving keyboard remaps.','Claude 31 strings/nine templates and translated screen acceptance.','B-3 context-recovery reproduction is claimed independently from pilot and underway.']}
(OUT/'verification.json').write_text(json.dumps(summary,indent=2)+'\n')
print(json.dumps({'phases':phases,'peaks':peaks},indent=2))
