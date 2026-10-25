from pathlib import Path
import json,os,sys,time
root=Path('/workspace/c42-problem-solving');out=root/'test/out/pipelines/c42-836a101a-resume';prerequisite=Path('/workspace/c43-scanner-exceptions/test/out/pipelines/c43-8d5fb383-signature/status.json')
(out/'status.json').write_text(json.dumps({'phase':'waiting-for-C43-browser','state':'waiting','runtime':'836a101a','pid':os.getpid()},indent=2)+'\n')
while True:
 try:state=json.loads(prerequisite.read_text())
 except (FileNotFoundError,json.JSONDecodeError):state={}
 if state.get('state') in ['failed','interrupted','blocked']:
  (out/'status.json').write_text(json.dumps({'phase':'C43-prerequisite','state':'blocked','detail':state},indent=2)+'\n');raise SystemExit(1)
 if state.get('phase')=='all-browser-checks' and state.get('state')=='passed':break
 time.sleep(10)
os.execv(sys.executable,[sys.executable,str(root/'test/tools/fp-sequential-jobs.py'),str(out/'plan.json')])
