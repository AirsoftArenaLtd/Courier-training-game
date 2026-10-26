/* Real mission/world/rays and the playable safety adapter; renderer/native-key claims stay in browser suites. */
const fs=require('node:fs'),path=require('node:path'),vm=require('node:vm'),assert=require('node:assert/strict');
module.exports=()=>{
 const context=require('./fp-scanner-context')(),{c,O,THREE,F}=context;
 for(const f of ['data/m8_stops.js','src/core/scenery.js','src/core/fpweather.js','src/core/fplighting.js','src/core/fpwellnessstop.js','src/core/fpwellnessstage.js','src/core/fpwellnessstopworld.js','src/core/fpwellnessscenario.js'])vm.runInContext(fs.readFileSync(path.join(__dirname,'../..',f),'utf8'),c);
 const K=O.fpWellnessStop,B=O.fpCustomerStop,A=O.fpWellnessScenario,S=O.fpWellnessStage;
 function fixture(id='m8-steps',{bank=null,coaching=true,index=0}={}){
  const entry={...c.OTR_DATA.modules.find(m=>m.id==='m8').scenarios.find(s=>s.id===id),scene3d:'wellness-stops'};
  O.registry={get:()=>entry,content:()=>c.OTR_DATA.stopSets[entry.dataKey.split('.')[1]]};O.academy.coaching=()=>coaching;
  O.flow={complete(scene,scenarioId,result){scene.completed={id:scenarioId,result};}};
  const run=F.create(id),m=F.model(run);if(index){m.customerStop.index=index;B.prepare(m.customerStop);K.prepare(m.customerStop);A.configure(run,m);}const world=new THREE.Scene(),camera=new THREE.PerspectiveCamera(76,16/9,.08,180);world.add(camera);
  const scene={assetBank:bank,scenarioSession:run,model:m,view:{world,camera,mirror:{camera:new THREE.PerspectiveCamera(),on:false}},panel:null,loading:false,external:false,transitioning:false,
   handheld:{isOpen:false,show(page){scene.closePanel();this.page=page;this.isOpen=true;m.paused=true;},close(resume=true){this.isOpen=false;this.signatureToken=null;m.paused=!resume;}},
   closePanel(resume=true){this.panel=null;if(resume)m.paused=false;},showPanel(title,body,choices,options){this.panel={title,body,choices,back:options?.back,root:{list:[{type:'Text',y:170,setText(value){this.text=value;}}]}};m.paused=true;},
   showPause(){this.showPanel('Paused.','The scenario is paused.',[]);},message(text){this.notice=text;},
   rebuildWorld(){if(this.art)this.art.dispose();this.art=O.fpWorld.build(this,m);},sync(){this.art.sync(m,null,'route');},finishScenario(){return F.finish(run,this);}
  };
  scene.rebuildWorld();F.begin(run);scene.closePanel();run.definition.tick(run,scene,.01,true);scene.sync();return scene;
 }
 const input=keys=>({forward:false,back:false,left:false,right:false,careful:false,...keys});
 function tick(scene,seconds=.05,keys={}){
  const run=scene.scenarioSession,m=scene.model,active=!m.paused&&!scene.panel&&!scene.external&&!scene.transitioning&&!scene.handheld.isOpen,clock=run.definition.clockActive(run,scene,active);
  if(active)m.step(input(keys),seconds);F.advance(run,seconds,clock);run.definition.tick(run,scene,seconds,clock);scene.sync();
 }
 function wait(scene,seconds){for(let n=0;n<Math.round(seconds*20);n++)tick(scene);}
 function panel(scene,label){const option=scene.panel?.choices.find(choice=>choice.label===label||choice.label.includes(label));assert.ok(option,'panel option '+label+' in '+scene.panel?.title);option.action();}
 function device(scene,label){const option=scene.handheld.page?.options.find(choice=>choice.label===label||choice.label.includes(label));assert.ok(scene.handheld.isOpen&&option,'device option '+label);option.onPick();}
 function walk(scene,x,z,{careful=true,back=false}={}){
  let n=0;while(Math.hypot(scene.model.player.x-x,scene.model.player.z-z)>.08&&n++<5000){
   if(scene.panel)return 'panel';if(scene.handheld.isOpen)return 'handheld';
   const p=scene.model.player;p.yaw=Math.atan2(x-p.x,-(z-p.z))+(back?Math.PI:0);tick(scene,.025,{forward:!back,back,careful});
  }
  assert.ok(n<5000,JSON.stringify({goal:[x,z],actual:scene.model.player,notice:scene.notice,acting:scene.model.customerStop.wellness.acting}));return 'arrived';
 }
 function talk(scene){
  const d=scene.model.customerStop;let n=0;
  while((d.talk?.phase!=='done'||d.wellness.acting)&&n++<3000){
   const w=d.wellness,s=scene.model.wellnessStage;
   if(s.coolTask){walk(scene,s.coolTask.x,s.coolTask.z,{careful:false});continue;}
   if(w.walkTask){tick(scene);const goal=s.walkGoal;if(goal)walk(scene,goal.x,goal.z,{careful:true,back:!!w.walkTask.keepFacing});continue;}
   if(w.acting){tick(scene);continue;}
   if(!scene.panel){A.present(scene);continue;}
   const t=d.talk;if(t.phase==='choices')O.fpCustomerScenario.present(scene,t.choices.findIndex(ch=>ch.grade==='good'));
   assert.ok(scene.panel,'a conversation panel is ready');scene.panel.choices[0].action();
  }
  assert.ok(n<3000,'conversation finished');assert.equal(d.talk.phase,'done');if(d.wellness.finishedTalk!==d.talk)A.present(scene);
 }
 return {...context,c,O,THREE,F,K,B,A,S,fixture,input,tick,wait,panel,device,walk,talk,aim:context.aim,use:context.use,plain:value=>JSON.parse(JSON.stringify(value))};
};
