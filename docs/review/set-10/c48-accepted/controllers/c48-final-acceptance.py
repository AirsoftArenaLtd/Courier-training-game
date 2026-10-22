from pathlib import Path
import subprocess, os, json, time, hashlib

root = Path('/workspace/c48-cab-visibility')
out = root / 'test/out/fp-review'
out.mkdir(parents=True, exist_ok=True)
env = {**os.environ, 'NODE_PATH':'/workspace/Courier-training-game/test/node_modules', 'QA_BROWSER':'/usr/bin/chromium', 'QA_BASE':'http://127.0.0.1:8348', 'QA_FPS_FLOOR':'0'}
paths = [p for p in subprocess.check_output(['git','ls-files'],cwd=root,text=True).splitlines() if p.startswith(('src/','test/')) and p.endswith(('.js','.cjs')) or p == 'index.html']
frozen = {p:hashlib.sha256((root/p).read_bytes()).hexdigest() for p in paths}
meta = {'sourceRevision':subprocess.check_output(['git','rev-parse','HEAD'],cwd=root,text=True).strip(), 'sourceSHA256':frozen, 'complete':False, 'jobs':[]}
def save(): (out/('c48-final-'+os.environ.get('C48_GROUP','native')+'-acceptance.json')).write_text(json.dumps(meta,indent=2)+'\n')
def run(name, command, extra=None):
    if any(hashlib.sha256((root/p).read_bytes()).hexdigest()!=h for p,h in frozen.items()): raise RuntimeError('Frozen source changed before '+name)
    job={'name':name,'command':command,'environment':extra or {},'started':time.time()};meta['jobs'].append(job);save();print('START',name,flush=True)
    with (out/('c48-final-'+os.environ.get('C48_GROUP','native')+'-'+name+'.log')).open('w') as log:
        try: job['exit']=subprocess.run(command,cwd=root,env={**env,**(extra or {})},stdout=log,stderr=subprocess.STDOUT,timeout=10800).returncode
        except subprocess.TimeoutExpired: job['exit']=124
    job['ended']=time.time();save();print('END',name,job['exit'],flush=True)
    if job['exit']:meta['blockedAt']=name;save();raise SystemExit(1)

save()
for name in ['firstperson','fpmission','fpworld','fpcamera','fpcab','fpmirrors','fpassets','fprear','fpaccess','fphud','fpsigns','fpdamageworld','fpwalkaroundflow','workday','savesize','i18n']:
    run('node-'+name,['node','test/'+name+'.js'])
if os.environ.get('C48_GROUP')=='quality':
    run('quality',['node','test/fpquality.js'],{'QA_TAG':'c48-final'})
else:
    for name,script,extra in [
        ('mirrors-low','fpmirrorsbrowser',{'QA_GFX':'low','QA_TAG':'c48-final-low','QA_FIRST_ONLY':'1'}),
        ('rear','fprearbrowser',{}),
        ('hud','fphudbrowser',{}),('signs','fpsignsbrowser',{}),('lighting','fplightingbrowser',{}),
        ('walk-high','fpwalkaroundbrowser',{'QA_GFX':'high','QA_LANGS':'en','QA_SIZES':'normal','QA_TAG':'c48-final-high'}),
        ('walk-low','fpwalkaroundbrowser',{'QA_GFX':'low','QA_LANGS':'ta','QA_SIZES':'large','QA_TAG':'c48-final-accessible'}),
    ]: run(name,['node','test/'+script+'.js'],extra)
    run('shared-workday',['node','test/qa.js','--only','workday-3d','--pass','golden','--shots'],{'QA_GFX':'low','QA_PORT':'8351'})
meta['complete']=True;save()
