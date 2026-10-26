/* M8 safety state. Original StopScene hazard/heat/actions/evaluation and TalkController remain authoritative. */
window.OTR=window.OTR||{};
OTR.fpWellnessStop={
  create(id,content,categories,options){
    if(!['m8-steps','m8-dog','m8-heat'].includes(id))throw Error('Invalid wellness stop set');
    const s=OTR.fpCustomerStop.create(content,categories,options);s.wellnessId=id;this.prepare(s);return s;
  },
  prepare(s){
    const K=this,P=StopScene.prototype,scenery=OTR.scenery,def=s.def,layout=def.lot.kind==='house'?scenery.houseLayout(def.lot.spec):scenery.buildingLayout({...def.lot.spec,style:def.lot.kind}),base=1120;
    const w=s.wellness={clock:0,timerSerial:0,timers:Array.from({length:16},()=>({active:false})),zones:[],clears:[],events:[],pending:null,notice:null,actStamp:-1,actionQueue:[],acting:false,resume:false,command:null,walkTask:null,walkDone:null,collapsedReady:false,ownerAtGate:false,returned:false,ref:null};
    const graphic={setDepth(){return this;},setScrollFactor(){return this;},destroy(){}};
    const rig=(x=0,dog=false)=>({x,itemKind:null,moving:false,c:{active:true,alpha:1},face(){},setFacing(){},stop(){this.moving=false;},play(name){this.animation=name;},setExpression(name){this.expression=name;},emote(){},hold(value){this.itemKind=value;},setAlpha(value){this.c.alpha=value;return this;},setMood(value){this.mood=value;return this;},bark(){},playOnce(name,done){this.animation=name;if(done)done();},walkTo(to,done,options){
      if(!dog&&this===w.ref.me){w.walkTask={sourceX:to,act:w.command?.name||'walk',keepFacing:!!options?.keepFacing};w.walkDone=()=>{this.x=to;w.walkTask=w.walkDone=null;if(done)done();};return;}
      this.x=to;if(done)done();
    }});
    const ref=w.ref=Object.create(P);Object.assign(ref,{S:s.state,def,set:s.content,log:s.log,cats:s.categories,collapsed:false,running:true,shiftMode:false,lotX:base,_openModals:0,_heatHudAcc:0,talkCtl:null,talkFlags:s.talkFlags,stopIndex:s.index,
      lot:{doorX:base+layout.doorX,porchX0:base+layout.porchX0,porchX1:base+layout.porchX1,stepsX0:base+layout.stepsX0,numberX:base+layout.numberX,bellX:base+(layout.bellX||layout.panelX||layout.doorX),floorY:scenery.GROUND-(layout.h-layout.floorY),setDoor(){}},
      van:{doorX:110+(scenery.vanLayout().doorX0+scenery.vanLayout().doorX1)/2},me:rig(),dogDef:def.dog,dogGone:false,dogBusy:false,resident:def.answer?rig():null,
      stage:{G:scenery.GROUND,walkSpeed:230,locked:0,lock(){this.locked++;},unlock(){this.locked=Math.max(0,this.locked-1);},focus(){},zone(zone){w.zones.push(zone);},interact(interaction){w.clears.push(interaction);return interaction;}},
      time:{now:0,delayedCall(ms,fn){return K.schedule(s,ms,fn);},addEvent(event){return K.schedule(s,event.delay,event.callback,event.repeat||0);}},
      cameras:{main:{shake(){},fade(){},fadeIn(){},resetFX(){}}},add:{rectangle(){return graphic;}},
      tweens:{add(options){return K.schedule(s,options.duration||0,()=>options.onComplete?.());}},
      say(text){if(s.coaching)w.notice=text;},refreshObjectives(){},updateCarryVisual(){},updateHeatHud(){},heatGlow:{setAlpha(){}},shadeTag:{setVisible(){}},inShade(){return !!w.shade;},inInterior:false,
      runSituation(key){if(!w.pending&&(!s.talk||s.talk.phase==='done'))w.pending=key;},
      setGate(open){if(this.gate)this.gate.open=!!open;},
      heatCollapse(done){
        // Reuse the original critical/prelude; the 3D adapter supplies its own delayed report presentation.
        const clock=this.time;this.time={...clock,delayedCall(ms){return K.schedule(s,ms,()=>{w.collapsedReady=true;if(done)done();});}};
        try{P.heatCollapse.call(this,done);}finally{this.time=clock;}
      }
    });
    ref.me.x=ref.van.doorX-6;
    if(def.answer)ref.resident.setAlpha(0);
    if(def.fence)ref.gate={x:P.resolveX.call(ref,def.fence.gate,base),open:!!def.fence.open,locked:!!def.fence.locked};
    if(def.dog){ref.dog=rig(P.resolveX.call(ref,def.dog.x,base),true);ref.dog.setAlpha(def.dog.hidden?0:1).setMood(def.dog.mood||'alert');}
    if(s.content.heat){const initial=s.content.heat,c=s.heatCarry;ref.heat={hyd:c?c.hyd:initial.hydration||70,temp:c?c.temp:initial.bodyHeat||35,drinks:0,cools:0,maxTemp:0,minHyd:100,warned:false};}else ref.heat=null;
    for(const p of def.props||[])if(p.hazard){
      const width=p.art?.w||({hose:150,toys:90,crack:90,puddle:160,ice:140}[p.type]||100),image={displayWidth:width,x:0,y:0,setVisible(){}};
      P.addHazard.call(ref,p,image,P.resolveX.call(ref,p.x,base));
    }
    if(def.stepHazard)P.addHazard.call(ref,{hazard:def.stepHazard,id:'steps',label:'the steps'},null,(ref.lot.stepsX0+ref.lot.porchX0)/2,ref.lot.stepsX0-10,ref.lot.porchX0+10);
    w.hazards=Object.values(s.state.hazards);w.triggers=(def.triggers||[]).map(t=>({...t,fired:false}));w.acts=P.acts.call(ref,P.castFor.call(ref));
    OTR.fpScannerStop.prepare(s);return w;
  },
  schedule(s,ms,callback,repeat=0){
    const w=s.wellness,slot=w.timers.find(t=>!t.active);if(!slot)throw Error('Wellness timer capacity exceeded');
    Object.assign(slot,{active:true,id:++w.timerSerial,left:Math.max(0,Number(ms)||0)/1000,delay:Math.max(.001,Number(ms)||0)/1000,repeat,callback});
    const id=slot.id;return {remove(){if(slot.id===id)slot.active=false;}};
  },
  timers(s,dt){
    const w=s.wellness,last=w.timerSerial;
    for(const t of w.timers){if(!t.active||t.id>last)continue;t.left-=dt;if(t.left>1e-8)continue;const callback=t.callback;if(t.repeat>0){t.repeat--;t.left+=t.delay;}else t.active=false;callback();}
  },
  active(s){return OTR.fpCustomerStop.active(s);},
  hazard(s,id,moving,careful,seconds){
    if(!this.active(s)||s.state.inVan)return false;const w=s.wellness,index=w.hazards.findIndex(h=>h.id===id);if(index<0)return false;
    w.ref.me.moving=!!moving;w.zones[index].onInside(w.ref.me,!!careful,Math.max(0,Math.min(.05,Number(seconds)||0)));return true;
  },
  clear(s,id){
    const w=s.wellness;if(!this.active(s)||s.state.inVan||w.ref.stage.locked)return false;const hazard=w.hazards.find(h=>h.id===id);if(!hazard||!['hose','toys'].includes(hazard.type))return false;
    const index=w.hazards.filter(h=>['hose','toys'].includes(h.type)).indexOf(hazard),interaction=w.clears[index];if(!interaction?.when())return false;interaction.onUse();s.version++;return true;
  },
  water(s){const w=s.wellness;if(!this.active(s)||!w.ref.heat||w.ref.collapsed||w.ref.stage.locked||s.talk&&s.talk.phase!=='done')return false;StopScene.prototype.drinkWater.call(w.ref);return true;},
  rest(s,ms){const w=s.wellness;if(!this.active(s)||!w.ref.heat||w.ref.collapsed||w.ref.stage.locked||!s.state.inVan&&!w.shade||s.talk&&s.talk.phase!=='done')return false;StopScene.prototype.coolDown.call(w.ref,null,ms|| (s.state.inVan?3500:3000));return true;},
  gate(s){
    const w=s.wellness;if(!this.active(s)||s.state.inVan||!w.ref.gate||s.talk&&s.talk.phase!=='done')return false;
    if(w.ref.gate.locked){s.state.gateTried=true;return false;}const trigger=w.triggers.find(t=>t.on==='gate'&&!t.fired);if(trigger){trigger.fired=true;return this.situation(s,trigger.talk);}w.ref.setGate(true);return true;
  },
  trigger(s,index){
    const w=s.wellness,t=w.triggers[index];if(!this.active(s)||s.state.inVan||!t||t.on==='gate'||s.talk&&s.talk.phase!=='done'||s.state.outcome)return false;
    if(t.fired){if(t.rearm&&w.ref.dog&&!w.ref.dogGone&&!w.ref.stage.locked){w.command={name:'backAway',arg:'van'};StopScene.prototype.dogRecharge.call(w.ref);return true;}return false;}
    if(t.if&&!OTR.talk.test(t.if,s.talkFlags))return false;t.fired=true;return this.situation(s,t.talk);
  },
  situation(s,key){
    const w=s.wellness,graph=s.def.talks?.[key]||s.content.talks?.[key];if(!this.active(s)||!graph||s.talk&&s.talk.phase!=='done'||w.ref.collapsed)return false;
    const cast=StopScene.prototype.castFor.call(w.ref);s.talkKey=key;s.talk=OTR.fpCustomerTalk.create({...graph,cast},s.categories,{coaching:s.coaching,log:s.log,flags:s.talkFlags});w.pending=null;w.actStamp=-1;w.acting=w.resume=false;w.talkLock=true;w.ref.stage.lock();OTR.fpCustomerTalk.begin(s.talk);s.version++;return true;
  },
  presentation(s){
    const w=s.wellness,t=s.talk;if(!t)return true;
    if(w.actStamp!==t.entries){w.actStamp=t.entries;w.actionQueue=[];if(t.lastAct){w.actionQueue.push({name:t.lastAct.act,arg:t.lastAct.arg});t.lastAct=null;}if(t.presentation?.act)w.actionQueue.push({name:t.presentation.act,arg:t.presentation.arg});this.nextAct(s);}
    return !w.acting;
  },
  nextAct(s){
    const w=s.wellness;if(!this.active(s)||w.ref.collapsed)return;
    const command=w.actionQueue.shift();if(!command){w.acting=false;w.resume=true;return;}w.command=command;w.events.push({act:command.name,arg:command.arg??null});
    const action=w.acts[command.name];if(!action){this.nextAct(s);return;}
    if(command.name==='ownerAppears')w.ownerAtGate=command.arg==='gate';
    w.acting=true;let called=false;const done=()=>{if(called||s.wellness!==w||!this.active(s))return;called=true;this.nextAct(s);};if(action.length>=2)action(command.arg,done);else{action(command.arg);done();}
  },
  completeWalk(s){const w=s.wellness;if(!this.active(s)||!w.walkDone)return false;const done=w.walkDone;done();return true;},
  finishSituation(s){
    const w=s.wellness;if(!this.active(s)||s.talk?.phase!=='done'||w.acting||w.finishedTalk===s.talk)return false;w.finishedTalk=s.talk;s.heard.push(s.talkKey);if(s.def.answer?.talk===s.talkKey)s.state.talked=true;w.ref.dogBusy=false;if(w.ref.dog&&!w.ref.dogGone&&s.def.dog&&!s.def.dog.patrol)w.ref.dog.walkTo(StopScene.prototype.resolveX.call(w.ref,s.def.dog.x,w.ref.lotX),()=>w.ref.dog.face(w.ref.me.x));if(w.talkLock){w.ref.stage.unlock();w.talkLock=false;}w.actStamp=-1;s.version++;return true;
  },
  step(s,seconds,active=true,facts=null){
    if(!active||!this.active(s))return false;const dt=Math.max(0,Math.min(.05,Number(seconds)||0)),w=s.wellness,r=w.ref;
    w.clock+=dt;r.time.now=w.clock*1000;w.shade=!!facts?.shade;r.inInterior=!!facts?.interior;r.me.moving=!!facts?.moving;r.me.itemKind=s.state.carrying.length?'box':null;
    this.timers(s,dt);if(w.walkTask&&facts?.atWalkGoal)this.completeWalk(s);if(r.collapsed)return w.collapsedReady;
    const waiting=w.acting&&s.talk?.phase==='done'?false:OTR.fpCustomerStop.step(s,dt,true);r.talkCtl=s.talk&&(s.talk.phase!=='done'||w.acting)?s.talk:null;r.updateHeat(dt);
    if(s.talk&&s.talk.phase!=='done'&&!w.acting)OTR.fpCustomerTalk.step(s.talk,dt,true);return waiting||!!w.pending||w.resume;
  },
  evaluate(s){
    const w=s.wellness;if(!this.active(s)||!s.state.inVan&&!w.ref.collapsed)return false;
    StopScene.prototype.evaluate.call(w.ref);s.state.done=true;s.summaries.push({...w.ref.stopSummary,id:s.def.id});s.phase='report';s.version++;return true;
  },
  next(s){
    if(s.phase!=='report')return false;const w=s.wellness,h=w.ref.heat;s.heatCarry=!h?null:w.ref.collapsed?{hyd:80,temp:35}:{hyd:Math.min(100,Math.max(50,h.hyd+10)),temp:Math.min(50,Math.max(30,h.temp-15))};
    if(!OTR.fpCustomerStop.next(s))return false;if(s.phase!=='done')this.prepare(s);return true;
  },
  result(s){return OTR.fpCustomerStop.result(s);}
};
