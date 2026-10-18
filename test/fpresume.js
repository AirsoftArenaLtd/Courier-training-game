/* Seeded model journeys. Travel positions are fixtures; actions, reports and checkpoint readers are real. */
const test=require('node:test'),assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path'),vm=require('node:vm');
const storage=new Map(),c={console,URLSearchParams};c.window=c;c.localStorage={getItem:k=>storage.get(k)||null,setItem:(k,v)=>storage.set(k,String(v)),removeItem:k=>storage.delete(k)};c.addEventListener=()=>{};c.location={search:''};vm.createContext(c);
for(const f of ['data/theme.js','data/config.js','data/m3_doorsteps.js','data/m8_stops.js','data/town.js','data/workday_events.js','src/core/theme.js','src/core/rig.js','src/core/scenery.js','src/core/townart.js','src/core/town.js','src/core/shift.js','src/core/scorelog.js','src/core/scoring.js','src/core/save.js','src/core/workday.js','src/core/firstperson.js','src/core/fpcab.js','src/core/fpmirrors.js','src/core/fprear.js','src/core/fpmission.js','src/core/fproute.js','src/core/fpsigns.js','src/core/fptraffic.js','src/core/fplater.js','src/core/fpdriving.js','src/core/fploadout.js','src/core/fpday.js','src/core/fpdoors.js'])vm.runInContext(fs.readFileSync(path.join(__dirname,'..',f),'utf8'),c);
c.OTR.identity={mode:'local',id:'seeded-model'};const O=c.OTR,M=O.fpMission,W=O.workday,S=O.save;
const later=process.env.QA_LATER==='1',signs=process.env.QA_SIGNS==='1',traffic=process.env.QA_TRAFFIC==='1';
const plain=o=>JSON.parse(JSON.stringify(o)),score=log=>({score:log.score(),ratios:plain(log.ratios(O.scoring.CATS)),criticals:log.criticals().map(i=>[i.cat,i.label])});
const report={resume:[],soak:[],failures:[],phases:[],weathers:[],loadouts:[],scormMax:0,scormChecks:0},coverage=new Set();
const saveReport=()=>{const out=path.join(__dirname,'out','fp-review');fs.mkdirSync(out,{recursive:true});fs.writeFileSync(path.join(out,traffic?'c32-resume-soak.json':signs?'c30-resume-soak.json':later?'c18-resume-soak.json':'c14-resume-soak.json'),JSON.stringify({...report,coverage:[...coverage].sort()},null,2));};
const shuffle=(items,rng)=>{const out=[...items];for(let i=out.length-1;i>0;i--){const j=Math.floor(rng()*(i+1));[out[i],out[j]]=[out[j],out[i]];}return out;};
function play(seed,resume=false,scorm=false){
 let stage='start',checkpoints=0,randomState=seed*2654435761>>>0,m;const random=()=>{randomState=(Math.imul(randomState,1664525)+1013904223)>>>0;return randomState/4294967296;};
 try{
  storage.clear();W.detach();S.data=S.defaults();S.data.townSeed=1;W.begin();let plan=later?O.fpLater.prepare(O.fpRoute.plan(seed,seed)):O.fpRoute.plan(seed,seed);if(signs)plan=O.fpSigns.prepare(plan);if(traffic)plan=O.fpTraffic.prepare(plan);m=M.create('campaign',seed,plan);O.fpLoadout.configure(m);O.fpDriving.configure(m);O.fpDay.configure(m);O.fpDoors.configure(m);m.doorsteps.date='2026-10-16';O.fpDoors.configure(m,m.doorsteps);
  const day=m.routePlan;if(process.env.QA_LIGHTING==='1'){day.timeOfDay=['morning','midday','dusk','night'][seed%4];coverage.add('lighting:'+day.timeOfDay);}m.briefing={day:day.day,weather:day.weather,clockMin:day.clockMin};
  if(!report.weathers.includes(m.routeDay.weather))report.weathers.push(m.routeDay.weather);if(!report.loadouts.includes(m.loadout.kind))report.loadouts.push(m.loadout.kind);
  const checkpoint=label=>{
   stage=label;checkpoints++;coverage.add(label.replace(/:\d+/g,':n'));if(!report.phases.includes(m.phase))report.phases.push(m.phase);
   if(resume){const raw=plain(m.snapshot()),events=plain(W.events),before=score(W.log),p=O.fpStore.empty();p.sequence=seed;p.welcomed=true;p.campaign=raw;assert.equal(O.fpStore.write(p),true,'local checkpoint write');
    const read=O.fpStore.read();assert.ok(read.campaign,'local checkpoint accepted');m=M.restore(read.campaign);assert.ok(m,'restored mission');assert.deepEqual(plain(m.snapshot()),raw,'mission round trip');assert.deepEqual(plain(W.events),events,'restore emits no reports');W.restore({events});assert.deepEqual(score(W.log),before,'scoring round trip');assert.deepEqual(plain(W.events),events,'event keys and places round trip');
   }
   if(scorm&&(label==='prepared'||label.startsWith('outcome:')||label==='complete'||label==='return')){
    const d=S.defaults();d.profile={id:'model-test',name:'Test Courier',createdAt:1};d.settings.a11y={large:true,colour:true,narrate:true,reducedMotion:true,keys:{KeyE:'KeyO',KeyW:'KeyI',KeyP:'KeyN',Tab:'KeyU',Space:'KeyL'}};
    d.workday={current:{id:'seed'+seed,day:seed,seconds:m.elapsed,events:plain(W.events)},last:null};const packed=S.fit(JSON.stringify(d),S.SCORM12_LIMIT);assert.ok(packed.length<=4000,'SCORM 1.2 limit');const decoded=S.unpackDay(JSON.parse(packed).workday.current);assert.deepEqual(score(W.replay(decoded.events).log),score(W.log),'SCORM score round trip');report.scormMax=Math.max(report.scormMax,packed.length);report.scormChecks++;
   }
  };
  const act=(label,fn)=>{stage=label;const result=fn();checkpoint(label);return result;};
  const at=id=>{const p=m.point(id);Object.assign(m.player,{x:p.x,z:p.z+.6});};
  const cargo=()=>{const p=m.point('cargo');Object.assign(m.player,{x:p.x-Math.sin(m.van.yaw)*.7,z:p.z+Math.cos(m.van.yaw)*.7});assert.equal(m.toggleCargo(),'','cargo toggle');};
  const secure=()=>{at('secure');assert.equal(m.secure(),'Load secured.');};
  const enter=()=>{at('driver');assert.equal(m.enter(),'');m.van.belt=true;m.van.hand=true;m.paused=false;const s=O.fpMirrors.specs[0];m.van.look=Math.atan2(s.x+.45,-(s.z+1.85));m.player.pitch=Math.atan2(2.05-s.y,Math.hypot(s.x+.45,s.z+1.85));for(let i=0;i<34;i++)m.step({},.0125);m.van.look=0;m.player.pitch=0;m.van.hand=false;};
  const reverse=()=>{
   act('reverse:start',()=>{m.paused=false;assert.equal(m.selectGear(-1),true);m.van.hand=false;for(let i=0;i<12;i++)m.step({forward:true},.025);assert.equal(m.driving.reverseActive,true);});
   act('reverse:finish',()=>{m.paused=false;for(let i=0;i<20;i++)m.step({back:true},.025);m.van.hand=true;m.step({},.025);assert.equal(m.driving.reverseActive,false);assert.equal(m.selectGear(1),true);m.step({},.025);m.van.hand=false;});
  };
  const move=()=>{m.paused=false;for(let i=0,n=8+Math.floor(random()*7);i<n;i++){m.step({forward:true},.05);if(m.van.hand)break;}assert.ok(m.departed,'actual initial acceleration begins the route');};
  const leaveAt=stop=>{Object.assign(m.van,stop.park,{speed:0,hand:true});assert.equal(m.exit(),true,'parked cab exit');};
  checkpoint('morning');at('dispatch');act('brief',()=>m.readBrief());
  const inspect=()=>{for(const id of shuffle(['tyres','lights'],random)){at(id);act('inspection:'+id,()=>m.inspectVan(id,!m.repaired&&m.fault===id?'repair':'ready'));assert.equal(m.checks[id],true);}};
  const earlyInspection=random()<.5;if(earlyInspection)inspect();
  if(m.loadout.missingId){at('dispatch');act('missing',()=>O.fpLoadout.missing(m));}
  for(const id of shuffle(m.parcels.filter(p=>p.anomaly).map(p=>p.id),random)){at(id);act('unlisted:pickup',()=>assert.equal(m.pickup(id),''));act('unlisted:scan',()=>m.scan());at('dispatch');act('unlisted:aside',()=>O.fpLoadout.aside(m));assert.equal(m.parcel(id).location,'aside');}
  act('open:cargo',cargo);
  for(const id of shuffle(m.parcels.filter(p=>!p.anomaly&&p.location!=='pending').map(p=>p.id),random)){
   at(id);act('load:pickup:'+m.parcel(id).stop,()=>assert.equal(m.pickup(id),''));act('load:scan:'+m.parcel(id).stop,()=>m.scan());const slot='slot'+m.parcel(id).stop;at(slot);act('load:place:'+m.parcel(id).stop,()=>m.place(slot));assert.equal(m.parcel(id).location,slot);
  }
  if(!earlyInspection)inspect();at('dispatch');act('count',()=>O.fpLoadout.count(m,m.parcels.filter(p=>p.location.startsWith('slot')).length));act('secure',secure);act('close:cargo',cargo);act('prepared',enter);if(process.env.QA_CAB==='1'){for(const id of ['cab-park','cab-neutral','cab-reverse','cab-drive','cab-headlights','cab-wipers'])act(id,()=>assert.equal(O.fpCab.act(m,id),''));}if(process.env.QA_REAR==='1')reverse();act('departure',move);assert.equal(m.phase,'route');
  for(const id of shuffle(m.stops.map(s=>s.id),random)){
   m.activeStop=id;m.touch();const stop=m.stops[id];
   // A short real drive exercises actor/mirror state; fixtures cover the long inter-stop distance.
   if(m.mode==='walk'){act('enter:'+id,enter);if(process.env.QA_REAR==='1')reverse();act('move:'+id,move);}
   if(m.routeDay.dispatch&&m.routeDay.dispatch.stop===id){m.routeDay.distance=11;act('dispatch:arrival',()=>O.fpDay.tick(m,.05));}
   act('park:'+id,()=>leaveAt(stop));if(m.routeDay.dispatch&&m.routeDay.dispatch.sent&&!m.routeDay.dispatch.read)act('dispatch:read',()=>O.fpDay.read(m));
   act('cargo:'+id,cargo);m.paused=false;act('late:search:'+id,()=>{at('cargo');m.step({},.025);});
   if(m.routeDay.weather==='heat'&&random()<.8)act('break:'+id,()=>O.fpDay.rest(m));
   const spec=m._doorSpecs[id],secureDog=spec.dog&&random()<.8;
   if(secureDog){Object.assign(m.player,{x:stop.x-stop.side*3.4,z:stop.z});act('dog:'+id,()=>O.fpDoors.secureDog(m,id));assert.equal(m.doorsteps.stops[id].dogSecured,true);}
   if(spec.hazard&&!['wet','ice'].includes(spec.hazard)&&(!spec.dog||secureDog)){Object.assign(m.player,O.fpDoors.point(m,id,'hazard'));act('hazard:'+id,()=>O.fpDoors.clearHazard(m,id));assert.equal(m.doorsteps.stops[id].hazardCleared,true);}
   at('parcel'+id);act('stop:pickup:'+id,()=>assert.equal(m.pickup('parcel'+id),''));
   Object.assign(m.player,{x:stop.x-stop.side*(spec.dog&&!secureDog?3.4:1.5),z:stop.z});act('stop:scan:'+id,()=>m.scan());assert.equal(m.parcels[id].stopScanned,true);act('contact:'+id,()=>m.contact(id));
   if(spec.adult){act('id:view:'+id,()=>O.fpDoors.viewID(m,id));act('id:decision:'+id,()=>O.fpDoors.checkID(m,id,O.fpDoors.validID(m,id)&&random()>.1));}
   if(spec.difficult)act('customer:'+id,()=>O.fpDoors.respond(m,id,random()>.15));
   let choice=O.fpDoors.expected(m,id);if(O.fpDay.planter(m,id)&&choice!=='exception')choice='planter';if(random()<.15)choice='exception';
   if(spec.signature&&spec.present&&choice==='handover')act('signature:'+id,()=>O.fpDoors.sign(m,id,spec.person));
   act('outcome:'+id,()=>m.deliver(id,choice));assert.equal(m.stops[id].resolved,true,'stop resolved');
   if(m.heldId){at('slot'+id);act('retained:'+id,()=>m.place('slot'+id));assert.equal(m.heldId,null);}
   act('secure:'+id,secure);act('close:'+id,cargo);
  }
  assert.equal(m.phase,'return');checkpoint('return');act('return:enter',enter);if(process.env.QA_REAR==='1')reverse();act('return:move',move);act('depot',()=>leaveAt({park:{x:2.84,z:8,yaw:0}}));act('depot:cargo',cargo);
  for(const id of m.parcels.filter(p=>p.returnRequired).map(p=>p.id)){at(id);act('return:pickup:'+m.parcel(id).stop,()=>m.pickup(id));at('returns');act('return:scan:'+m.parcel(id).stop,()=>m.scan());act('return:record:'+m.parcel(id).stop,()=>m.returnParcel());assert.equal(m.parcel(id).location,'returned');}
  at('dispatch');act('complete',()=>assert.equal(m.finish(),''));assert.equal(m.phase,'debrief');assert.equal(m.stops.filter(s=>s.resolved).length,5);assert.equal(W.events.filter(e=>e.type==='deliver.outcome').length,5);
  const rec=W.score(W.log,{seconds:m.elapsed,stops:m.stops.map(s=>({stop:s.id+1,delivered:s.outcome!=='exception'}))}),max=W.log.items.reduce((n,i)=>n+(i.kind==='bonus'?i.got:Math.max(0,i.max||0)),0)*100;
  assert.ok(rec.score>=0&&rec.score<=max);for(const ratio of Object.values(rec.ratios))assert.ok(Number.isFinite(ratio)&&ratio>=0&&ratio<=1);for(const stars of Object.values(rec.stars))assert.ok(Number.isInteger(stars)&&stars>=0&&stars<=3);
  return {model:plain(m.snapshot()),events:plain(W.events),scoring:score(W.log),stars:plain(rec.stars),checkpoints};
 }catch(e){const message=`seed ${seed}, resume=${resume}, stage ${stage}: ${e.message}`;report.failures.push({seed,resume,stage,error:message});saveReport();throw new Error(message,{cause:e});}
}
test('30 seeds finish identically after a real local checkpoint at every action, phase and mid-stop',()=>{
 for(let seed=1;seed<=30;seed++){const uninterrupted=play(seed),resumed=play(seed,true,true);assert.deepEqual(resumed,uninterrupted,'seed '+seed);report.resume.push({seed,checkpoints:resumed.checkpoints,events:resumed.events.length,score:resumed.scoring.score});}
 assert.deepEqual([...new Set(report.phases)].sort(),['debrief','prepare','return','route']);assert.equal(new Set(report.loadouts).size,5);saveReport();
});
test('100 seeded days with shuffled legal actions always resolve five stops and keep scores in range',()=>{
 for(let seed=1;seed<=100;seed++){const result=play(seed);report.soak.push({seed,checkpoints:result.checkpoints,events:result.events.length,score:result.scoring.score});}
 report.phases=[...new Set(report.phases)].sort();report.weathers=[...new Set(report.weathers)].sort();report.loadouts=[...new Set(report.loadouts)].sort();assert.equal(report.failures.length,0);saveReport();
});
