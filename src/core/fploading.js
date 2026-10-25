/* Loading action state. The original LoadingScene owns placement rules, checks and result scale. */
window.OTR=window.OTR||{};
OTR.fpLoading={
  create(id,content,categories){
    if(!['m6-load','m6-find'].includes(id)||content?.mode!==(id==='m6-load'?'load':'find')||!content.packages?.length||content.packages.length>24||new Set(content.packages.map(p=>p.id)).size!==content.packages.length||!categories?.length)throw Error('Invalid loading set');
    const P=LoadingScene.prototype,g=Object.getOwnPropertyDescriptor(P,'geom').get.call({}),slots=[],width=(g.x1-g.x0)/g.cols.length;
    for(let ci=0;ci<g.cols.length;ci++){const col=g.cols[ci];for(const row of g.rows)for(let k=0;k<2;k++)slots.push({id:`${col.id}-${row.id}-${k}`,col:col.id,row:row.id,x:g.x0+ci*width+10+k*width/2,y:row.y,w:width/2-16,h:row.h,min:col.min,max:col.max,maxWeight:row.maxWeight,level:row.id,pkg:null});}
    for(let k=0;k<2;k++)slots.push({id:`floor-${k}`,col:'floor',row:'floor',x:g.x0+20+k*240,y:g.floorY,w:220,h:g.floorH,maxWeight:999,level:'floor',pkg:null});
    slots.push({id:'haz',col:'haz',row:'floor',x:g.x0+520,y:g.floorY,w:220,h:g.floorH,maxWeight:999,level:'floor',hazmat:true,pkg:null});
    const pkgs=content.packages.map(p=>({...p})),s={id,content,mode:content.mode,cats:categories.slice(),pkgs,slots,cart:pkgs.slice(),held:null,phase:'brief',elapsed:0,strapped:false,finished:false,reporting:false,extraLessons:[],log:new OTR.ScoreLog(),result:null,report:null,version:0,sprites:{},score:0,roundIndex:0,cleanRounds:0,wrongPicks:0,round:null,pending:null,hint:null};
    // The source place callback keeps its own bookkeeping. These are data-only image handles, never Phaser objects.
    for(const p of pkgs)s.sprites[p.id]={width:1,height:1,x:0,y:0,scale:1,setScale(k){this.scale=k;return this;},setPosition(x,y){this.x=x;this.y=y;return this;}};
    s.problemsFor=function(p,slot){return P.problemsFor.call(this,p,slot);};s.hideCard=()=>{};
    s.endScenario=function(){return P.endScenario.call(this);};
    s.loadReport=function(right,total,high){this.reporting=true;this.running=false;this.report={right,total,high:high.map(p=>p.id)};this.phase='report';};
    s.finish=function(result){if(this.finished)return;this.finished=true;this.result=result;this.phase='done';};
    if(s.mode==='find'){
      if(!content.rounds?.length||content.rounds.length>24||new Set(content.rounds.map(r=>r.pkg)).size!==content.rounds.length||content.rounds.some(r=>!pkgs.some(p=>p.id===r.pkg)))throw Error('Invalid finding rounds');
      for(const p of pkgs){const slot=slots.find(x=>x.id===p.slot);if(!slot||slot.pkg)throw Error('Invalid finding load');P.place.call(s,p,slot);}
    }
    return s;
  },
  active(s){return s.phase==='active'&&!s.finished;},
  begin(s){if(s.phase!=='brief')return false;s.phase='active';s.running=true;if(s.mode==='find')this.nextRound(s);s.version++;return true;},
  parcel(s,id){return s.pkgs.find(p=>p.id===id);},
  slot(s,id){return s.slots.find(p=>p.id===id);},
  problems(s,id,slotId){const p=this.parcel(s,id),slot=this.slot(s,slotId);return p&&slot?s.problemsFor(p,slot):null;},
  take(s,id){if(s.mode!=='load'||!this.active(s)||s.held||!this.parcel(s,id))return false;s.held=id;s.version++;return true;},
  place(s,slotId){
    const p=this.parcel(s,s.held),slot=this.slot(s,slotId);if(!this.active(s)||!p||!slot)return false;
    if(slot.pkg&&slot.pkg!==p){s.held=null;s.version++;return false;}
    const before=LoadingScene.prototype.floorState.call(s);LoadingScene.prototype.place.call(s,p,slot);s.held=null;
    if(s.strapped&&LoadingScene.prototype.floorState.call(s)!==before)s.strapped=false;s.version++;return true;
  },
  returnToCart(s){
    const p=this.parcel(s,s.held);if(!this.active(s)||!p)return false;const before=LoadingScene.prototype.floorState.call(s);
    if(p.slotRef){p.slotRef.pkg=null;p.slotRef=null;}if(!s.cart.includes(p))s.cart.push(p);s.held=null;
    if(s.strapped&&LoadingScene.prototype.floorState.call(s)!==before)s.strapped=false;s.version++;return true;
  },
  strap(s){if(s.mode!=='load'||!this.active(s)||s.held||s.cart.length||s.strapped)return false;s.strapped=true;s.version++;return true;},
  step(s,seconds,active=true){
    if(!active||!this.active(s))return false;s.elapsed+=Math.max(0,Math.min(.05,Number(seconds)||0));
    if(s.mode==='find'){
      const pending=s.pending;
      if(pending&&!pending.removed&&s.elapsed+1e-9>=pending.removeAt){const p=this.parcel(s,pending.id);if(p.slotRef)p.slotRef.pkg=null;pending.removed=true;s.version++;}
      if(pending&&s.elapsed+1e-9>=pending.nextAt){s.pending=null;this.nextRound(s);s.version++;}
      if(s.round)this.help(s);
    }
    return true;
  },
  review(s){if(s.mode!=='load'||!this.active(s)||s.held||s.cart.length)return false;LoadingScene.prototype.finishLoad.call(s);s.version++;return true;},
  complete(s){if(s.phase!=='report')return false;LoadingScene.prototype.endScenario.call(s);s.version++;return true;},
  result(s){return s.phase==='done'?s.result:null;},
  nextRound(s){
    s.round=s.content.rounds[s.roundIndex]||null;s.hint=null;
    if(!s.round){LoadingScene.prototype.endFind.call(s);return;}
    s.roundStart=s.elapsed;s.roundClean=true;s.roundHelp={nudged:false,shown:false};
  },
  // The source pick callback also creates Phaser effects. Keep only its action transitions here;
  // final checks/results and score clamping still use the original scene methods. Parity tests call
  // the real 2D pick/help/delayed callbacks, including every time band and authored near-match.
  pick(s,id){
    const p=this.parcel(s,id);if(s.mode!=='find'||!this.active(s)||!s.round||!p||p.pulled)return false;
    const t=s.elapsed-s.roundStart;
    if(id===s.round.pkg){
      s.round=null;if(s.roundClean)s.cleanRounds++;
      BaseScenarioScene.prototype.addScore.call(s,Math.max(50,Math.round(400-t*30)));
      const misload=p.slotRef&&p.slotRef.min&&(p.stop<p.slotRef.min||p.stop>p.slotRef.max);
      if(misload&&!s.extraLessons.includes(C_MISLOAD))s.extraLessons.push(C_MISLOAD);
      s.log.check('efficiency',t<=6?2:t<=12?1:0,2,`Found ${p.number} ${p.street} in ${t.toFixed(1)}s${misload?' (misloaded!)':''}`,{lesson:'Work the shelves by section. Hunting for a package is time you do not get back.'});
      p.pulled=true;s.pending={id,removeAt:s.elapsed+.4,nextAt:s.elapsed+.7,removed:false};s.roundIndex++;
      s.hint=misload?{kind:'misload',section:p.slotRef.col}:null;
    }else{
      s.wrongPicks++;s.roundClean=false;BaseScenarioScene.prototype.addScore.call(s,-80);
      const target=this.parcel(s,s.round.pkg),why=p.number!==target.number?'number':p.street!==target.street?'street':p.unit!==target.unit?'unit':'stop';s.hint={kind:'mismatch',id,why};
    }
    s.version++;return true;
  },
  help(s){
    if(!s.round)return;const t=s.elapsed-s.roundStart,h=s.roundHelp;
    if(t>25&&!h.nudged){h.nudged=true;s.hint={kind:'nudge',stop:s.round.stop};s.version++;}
    if(t>45&&!h.shown){h.shown=true;s.roundClean=false;const p=this.parcel(s,s.round.pkg),slot=p.slotRef,misload=slot?.min&&(p.stop<slot.min||p.stop>slot.max);s.hint={kind:'shown',id:p.id,section:slot?.col,misload:!!misload,floor:slot?.level==='floor'};s.version++;}
  }
};
