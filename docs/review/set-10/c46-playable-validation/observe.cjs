/* Read-only CDP snapshots of this one owned retry; never sends keys or changes a page. */
const fs=require('node:fs'),path=require('node:path'),cp=require('node:child_process');
const out=__dirname,child=Number(process.argv[2]),deadline=Date.now()+65*60000;
if(!Number.isInteger(child)||child<=0)throw Error('An owned child PID is required');
fs.writeFileSync(path.join(out,'observer-owned.json'),JSON.stringify({observer:process.pid,child,scope:'Read-only Runtime.evaluate; exits when this child changes or finishes.'},null,2)+'\n');
const expression=`(()=>{
 const O=window.OTR,s=O?.game?.scene?.getScene('FirstPersonScenarioScene'),m=s?.model,d=m?.customerStop,w=d?.wellness;
 if(!m||!d)return {frame:O?.game?.loop?.frame,active:false};
 return {frame:O.game.loop.frame,index:d.index,phase:d.phase,player:{x:m.player.x,z:m.player.z,yaw:m.player.yaw},
  clock:w?.clock,elapsed:d.state.elapsed,panel:s.panel?.title||null,handheld:!!s.handheld?.isOpen,paused:!!m.paused,
  node:d.talk?.nodeId,talkPhase:d.talk?.phase,acting:!!w?.acting,locked:w?.ref?.stage?.locked,
  walkGoal:m.wellnessStage?.walkGoal||null,outcome:d.state.outcome};
})()`;
async function observe(){
 const args=cp.execFileSync('ps',['-o','args=','--ppid',String(child)],{encoding:'utf8'});
 const profile=args.match(/--user-data-dir=(\S+)/)?.[1];
 if(!profile)throw Error('Owned browser is not ready');
 const port=fs.readFileSync(path.join(profile,'DevToolsActivePort'),'utf8').trim().split('\n')[0];
 const response=await fetch('http://127.0.0.1:'+port+'/json/list',{signal:AbortSignal.timeout(5000)});
 const target=(await response.json()).find(t=>t.type==='page'&&t.url.includes('index.html'));
 if(!target)throw Error('Owned game page is not ready');
 return new Promise((resolve,reject)=>{
  const ws=new WebSocket(target.webSocketDebuggerUrl),timer=setTimeout(()=>done(Error('Read-only snapshot timed out')),5000);
  let ended=false;
  function done(error,value){if(ended)return;ended=true;clearTimeout(timer);ws.close();if(error)reject(error);else resolve(value);}
  ws.addEventListener('open',()=>ws.send(JSON.stringify({id:1,method:'Runtime.evaluate',params:{expression,returnByValue:true}})));
  ws.addEventListener('message',event=>{const r=JSON.parse(event.data);if(r.id===1)done(r.error?Error(r.error.message):null,r.result?.result?.value);});
  ws.addEventListener('error',()=>done(Error('Owned browser connection ended')));
  ws.addEventListener('close',()=>done(Error('Owned page closed before its snapshot')));
 });
}
(async()=>{
 while(Date.now()<deadline){
  const owned=JSON.parse(fs.readFileSync(path.join(out,'owned-processes.json')));
  if(owned.child!==child)break;
  try{process.kill(child,0);}catch{break;}
  let record={at:new Date().toISOString(),child};
  try{record.state=await observe();}catch(error){record.error=error.message;}
  fs.appendFileSync(path.join(out,'high-steps-observations.jsonl'),JSON.stringify(record)+'\n');
  const temporary=path.join(out,'high-steps-latest.json.tmp');fs.writeFileSync(temporary,JSON.stringify(record,null,2)+'\n');fs.renameSync(temporary,path.join(out,'high-steps-latest.json'));
  await new Promise(resolve=>setTimeout(resolve,30000));
 }
 fs.writeFileSync(path.join(out,'observer-released.json'),JSON.stringify({observer:process.pid,child,released:true},null,2)+'\n');
})().catch(error=>{console.error(error.message);process.exitCode=1;});
