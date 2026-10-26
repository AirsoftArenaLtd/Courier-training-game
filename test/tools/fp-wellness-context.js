/* Renderer-free original M8 sources and local safety model. No data/default/save changes. */
const fs=require('node:fs'),path=require('node:path'),vm=require('node:vm'),ROOT=path.resolve(__dirname,'../..');
module.exports=()=>{
 const c={Date:class extends Date{static now(){return 123;}}};c.window=c;vm.createContext(c);
 for(const f of ['data/theme.js','data/config.js','data/modules.js','data/m8_stops.js','data/scanner.js','src/core/theme.js','src/core/scoring.js','src/core/scorelog.js','src/core/scenery.js','src/core/talk.js','src/core/fpcustomertalk.js','src/core/fpcustomerstop.js','src/core/fpscannerstop.js','src/core/fpwellnessstop.js'])vm.runInContext(fs.readFileSync(path.join(ROOT,f),'utf8'),c);
 const O=c.OTR;O.util.shuffle=a=>a;O.audio={play(){}};O.fx={shake(){},flash(){}};O.registerScene=C=>{O.ReferenceStop=C;};c.BaseScenarioScene=class{};vm.runInContext(fs.readFileSync(path.join(ROOT,'src/scenes/stops/StopScene.js'),'utf8'),c);
 const specs=c.OTR_DATA.modules.find(m=>m.id==='m8').scenarios.filter(s=>s.id!=='m8-incident'),K=O.fpWellnessStop,B=O.fpCustomerStop,P=O.ReferenceStop.prototype,plain=x=>JSON.parse(JSON.stringify(x));
 function fixture(id='m8-steps',index=0,coaching=true){const spec=specs.find(s=>s.id===id),content=c.OTR_DATA.stopSets[spec.dataKey.split('.')[1]],s=K.create(id,content,spec.categories,{coaching});if(index){s.index=index;B.prepare(s);K.prepare(s);}B.begin(s);return s;}
 function step(s,seconds,facts={}){for(let n=0;n<Math.round(seconds*20);n++)K.step(s,.05,true,facts);}
 function reference(s){
  let now=0,serial=0;const timers=[],zones=[],clears=[],ref=Object.create(P),rig=(x=0)=>({x,itemKind:null,moving:false,c:{active:true,alpha:1},face(){},setFacing(){},stop(){this.moving=false;},play(){},setExpression(){},emote(){},hold(value){this.itemKind=value;},setAlpha(value){this.c.alpha=value;return this;},setMood(value){this.mood=value;return this;},bark(){},playOnce(k,fn){fn?.();},walkTo(x,fn){this.x=x;fn?.();}}),schedule=(ms,fn,repeat=0)=>{const t={id:++serial,at:now+ms,delay:ms,repeat,fn,active:true};timers.push(t);return {remove(){t.active=false;}};};
  Object.assign(ref,{S:plain(s.state),def:s.def,set:s.content,log:new O.ScoreLog(s.def.id),cats:s.categories,collapsed:false,running:true,shiftMode:false,lotX:1120,lot:{...s.wellness.ref.lot},van:{...s.wellness.ref.van},talkFlags:{},_openModals:0,talkCtl:null,_heatHudAcc:0,
   me:rig(s.wellness.ref.me.x),resident:s.def.answer?rig():null,dog:s.def.dog?rig(s.wellness.ref.dog.x):null,dogDef:s.def.dog,dogGone:false,dogBusy:false,
   stage:{G:640,walkSpeed:230,locked:0,lock(){this.locked++;},unlock(){this.locked=Math.max(0,this.locked-1);},focus(){},zone(q){zones.push(q);},interact(q){clears.push(q);return q;}},
   time:{now:0,delayedCall(ms,fn){return schedule(ms,fn);},addEvent(t){return schedule(t.delay,t.callback,t.repeat||0);}},tweens:{add(t){return schedule(t.duration||0,()=>t.onComplete?.());}},cameras:{main:{shake(){},fade(){},fadeIn(){},resetFX(){}}},
   say(){},updateCarryVisual(){},refreshObjectives(){},updateHeatHud(){},heatGlow:{setAlpha(){}},shadeTag:{setVisible(){}},shade:false,inShade(){return this.shade;},inInterior:false,
   pending:[],runSituation(key){this.pending.push(key);},setGate(open){if(this.gate)this.gate.open=!!open;}
  });ref.S.hazards={};ref.heat=s.wellness.ref.heat?plain(s.wellness.ref.heat):null;if(s.wellness.ref.gate)ref.gate=plain(s.wellness.ref.gate);
  for(const p of s.def.props||[])if(p.hazard){let width;const tex=O.tex,rigAPI=O.rig,cv=O.cv;O.tex={make(scene,key,w){width=w;return key;}};O.rig={hash:JSON.stringify};O.cv={};try{O.scenery.prop({},p.type,p.art);}finally{O.tex=tex;O.rig=rigAPI;O.cv=cv;}const image={displayWidth:width,x:0,y:0,setVisible(){}};P.addHazard.call(ref,p,image,P.resolveX.call(ref,p.x,1120));}
  if(s.def.stepHazard)P.addHazard.call(ref,{hazard:s.def.stepHazard,id:'steps',label:'the steps'},null,(ref.lot.stepsX0+ref.lot.porchX0)/2,ref.lot.stepsX0-10,ref.lot.porchX0+10);
  ref.zones=zones;ref.clears=clears;
  ref.advance=function(ms,update=true){now+=ms;this.time.now=now;let n=0;for(;;){const due=timers.filter(t=>t.active&&t.at<=now+1e-8).sort((a,b)=>a.at-b.at||a.id-b.id)[0];if(!due)break;if(++n>300)throw Error('Reference timer loop');if(due.repeat>0){due.repeat--;due.at+=due.delay;}else due.active=false;due.fn();}if(update&&this.running&&!this.S.done){if(!this._openModals&&!this.talkCtl)this.S.elapsed+=ms/1000;P.updateHeat.call(this,ms/1000);}};
  return ref;
 }
 return {c,O,K,B,P,specs,plain,fixture,step,reference};
};
