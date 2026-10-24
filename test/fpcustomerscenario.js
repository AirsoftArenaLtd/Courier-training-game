/* Real isolated mission/world/controller combination; browser tests validate actual keys and text layout. */
const test=require('node:test'),assert=require('node:assert/strict'),fs=require('node:fs'),vm=require('node:vm'),THREE=require('../lib/three.min.js');
const c={THREE};c.window=c;vm.createContext(c);
for(const f of ['data/theme.js','data/config.js','data/workday_events.js','data/m3_dialogues.js','src/core/theme.js','src/core/scoring.js','src/core/scorelog.js','src/core/talk.js','src/core/workday.js','src/core/firstperson.js','src/core/fpmission.js','src/core/fpcamera.js','src/core/fpcab.js','src/core/fpmirrors.js','src/core/fprear.js','src/core/fpdriving.js','src/core/fpsignal.js','src/core/fpday.js','src/core/fpdoors.js','src/core/world3d.js','src/core/fpbranding.js','src/core/fpscenario.js','src/core/fpcustomertalk.js','src/core/fpcustomerstage.js','src/core/fpcustomerworld.js','src/core/fpworld.js','src/core/fpcustomerscenario.js'])vm.runInContext(fs.readFileSync(__dirname+'/../'+f,'utf8'),c);
const O=c.OTR,F=O.fpScenario,K=O.fpCustomerTalk,S=O.fpCustomerStage,A=O.fpCustomerScenario,graphs=c.OTR_DATA.dialogues;O.gfx={high:()=>false};O.fpAccess={reduced:()=>true,key:k=>k};O.academy={assessing:null,coaching(){return !this.assessing;},abandon(){this.assessing=null;}};let completed=[];
const specs={missing:{id:'m3-missing',key:'m3_missing',cats:['service','efficiency']},signature:{id:'m3-signature',key:'m3_signature',cats:['service','safety']},twostops:{id:'m3-twostops',key:'m3_twostops',cats:['service','safety','efficiency']}};
function fixture(kind='missing',assess=false){const spec=specs[kind],entry={id:spec.id,scene:'DialogueScene',scene3d:'customer-conversation',categories:spec.cats};O.registry={get:()=>entry,content:()=>graphs[spec.key]};O.academy.assessing=assess?spec.id:null;O.flow={complete:(scene,id,result)=>completed.push({id,result})};const r=F.create(spec.id),m=F.model(r),world=new THREE.Scene(),camera=new THREE.PerspectiveCamera(68,16/9,.08,180);world.add(camera);
 const scene={scenarioSession:r,model:m,view:{world,camera,mirror:{camera:new THREE.PerspectiveCamera(),on:false}},panel:null,loading:false,external:false,transitioning:false,handheld:{isOpen:false,show(p){this.isOpen=true;this.page=p;},close(){this.isOpen=false;}},closePanel(){this.panel=null;m.paused=false;},showPanel(title,body,choices,options){this.panel={title,body,choices,back:options?.back,root:{list:[{type:'Text',y:170,setText(text){this.value=text;}}]}};m.paused=true;},showPause(){this.showPanel('Paused.','The conversation is paused.',[{action:()=>this.closePanel()}]);},sync(){this.art.sync(m,null,'route');},message(t){this.notice=t;},finishScenario(){F.finish(r,this);},toHub(){F.abandon(r);}};
 scene.art=O.fpWorld.build(scene,m);F.begin(r);m.paused=false;scene.sync();return scene;}
function aim(scene){const t=scene.model.customerStage.target,p=scene.model.player;p.yaw=Math.atan2(t.x-p.x,-(t.z-p.z));p.pitch=Math.atan2(1.65-t.y,Math.hypot(t.x-p.x,t.z-p.z));scene.sync();assert.equal(scene.art.pick(),'customer-conversation','nearest actual physical ray');}
function walk(scene,x,z){scene.closePanel();let n=0;while(Math.hypot(scene.model.player.x-x,scene.model.player.z-z)>.09&&n++<2000){const p=scene.model.player;p.yaw=Math.atan2(x-p.x,-(z-p.z));scene.model.step({forward:true},.025);}assert.ok(n<2000,'the voluntary walking route is clear');scene.sync();}
test('the conversation point is a real nearby target and distant or wrong actions cannot advance',()=>{
 const scene=fixture(),r=scene.scenarioSession,s=scene.model.customerTalk;assert.ok(scene.art.customer);assert.equal(scene.model.blocked(11,-42.6),false);r.definition.interact(r,scene,'driver');assert.equal(s.phase,'brief');scene.closePanel();aim(scene);r.definition.interact(r,scene,'customer-conversation');assert.equal(s.phase,'line');assert.equal(scene.panel.customer,true);scene.art.dispose();
});
test('all three authored good paths finish through their panels, with a real walk between the two stops',()=>{
 O.workday.begin();O.workday.report('brief.read',{key:'suspended-customer'});const before=JSON.stringify(O.workday.events);completed=[];
 for(const kind of Object.keys(specs)){const scene=fixture(kind),r=scene.scenarioSession,s=scene.model.customerTalk;aim(scene);r.definition.interact(r,scene,'customer-conversation');let n=0,moved=false;
  while(r.phase==='active'&&n++<150){
   if(!scene.panel){assert.equal(scene.model.customerStage.site,'house');walk(scene,7.5,-27.9);walk(scene,7.5,-42.6);walk(scene,11,-42.6);moved=true;aim(scene);r.definition.interact(r,scene,'customer-conversation');continue;}
   if(s.phase==='choices'){let best=0;for(let i=1;i<s.choices.length;i++){const score=ch=>O.scoring.CATS.reduce((n,c)=>n+(ch.effects?.[c]||0),0);if(score(s.choices[i])>score(s.choices[best]))best=i;}A.present(scene,best);}
   scene.panel.choices[0].action();
  }
  assert.ok(n<150);assert.equal(r.phase,'finished');assert.equal(r.result,K.result(s));assert.equal(r.result.log,s.log);assert.ok(r.result.score>0);for(const ratio of Object.values(r.result.ratios))assert.equal(ratio,1);if(kind==='twostops')assert.equal(moved,true);scene.art.dispose();
 }
 assert.equal(completed.length,3);assert.equal(JSON.stringify(O.workday.events),before);
});
test('reply/question/history pages share one decision deadline; pause and handheld freeze it',()=>{
 const scene=fixture('twostops',true),r=scene.scenarioSession,s=scene.model.customerTalk;K.enter(s,'n5');K.advance(s);A.present(scene);const initial=s.remaining;assert.equal(r.definition.clockActive(r,scene,false),true);
 A.question(scene);r.definition.tick(r,scene,.05,r.definition.clockActive(r,scene,false));assert.ok(s.remaining<initial);A.history(scene);const second=s.remaining;r.definition.tick(r,scene,.05,true);assert.ok(s.remaining<second);
 scene.showPause();const paused=s.remaining;assert.equal(r.definition.clockActive(r,scene,false),false);r.definition.tick(r,scene,.05,false);assert.equal(s.remaining,paused);scene.closePanel();scene.handheld.isOpen=true;assert.equal(r.definition.clockActive(r,scene,false),false);scene.handheld.isOpen=false;
 A.present(scene);const old=scene.panel.choices[0].action;s.remaining=.01;r.definition.tick(r,scene,.05,true);assert.equal(s.history.length,1);assert.equal(s.feedback,null);const log=JSON.stringify(s.log.toJSON());old();assert.equal(JSON.stringify(s.log.toJSON()),log,'a stale timed-out reply cannot grade again');scene.art.dispose();
});
test('assessment ending/expiry is neutral, retains criticals and never invents an incomplete result',()=>{
 const scene=fixture('signature',true),r=scene.scenarioSession,s=scene.model.customerTalk;K.enter(s,'n1');K.advance(s);const bad=s.choices.findIndex(ch=>ch.critical);K.choose(s,bad);assert.ok(s.log.items.some(i=>i.critical));assert.equal(s.transcript.some(t=>t.speaker==='trainer'),false);
 assert.throws(()=>r.definition.result(r),/incomplete/);r.definition.timeout(r,scene);assert.equal(r.phase,'timed-out');assert.ok(scene.panel.body.includes('not completed'));scene.panel.choices[0].action();assert.equal(r.phase,'abandoned');assert.equal(O.academy.assessing,null);scene.art.dispose();
});
