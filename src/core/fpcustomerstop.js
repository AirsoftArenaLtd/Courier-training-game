/* Tricky Doorsteps state. The unchanged StopScene evaluator and TalkController own its local ScoreLog checks. */
window.OTR=window.OTR||{};
OTR.fpCustomerStop={
  create(content,categories,{coaching=true}={}){
    if(!content?.stops?.length||content.stops.length>8||!categories?.length||content.stops.some(d=>!d.packages?.length||d.packages.length+(d.decoys?.length||0)>8||new Set(d.packages.concat(d.decoys||[]).map(p=>p.id)).size!==d.packages.length+(d.decoys?.length||0)))throw Error('Invalid customer stop set');
    const s={content,categories:categories.slice(),coaching,log:new OTR.ScoreLog(),index:0,phase:'brief',summaries:[],result:null,version:0};this.prepare(s);return s;
  },
  prepare(s){
    s.def=s.content.stops[s.index];s.log.setGroup(s.def.id);s.packages=s.def.packages.map(p=>({...p,mine:true,onShelf:true})).concat((s.def.decoys||[]).map(p=>({...p,mine:false,onShelf:true})));
    s.state={inVan:true,carrying:[],scanned:{},scannedInVan:false,pulls:0,wrongPulls:0,addressChecked:false,knocks:0,answered:false,talked:false,vanTrips:0,outcome:null,type:null,signer:null,code:null,tagPrinted:false,tagAttached:false,spot:null,photo:null,idResult:null,exitSafe:null,enterSafe:null,hazards:{},delivered:[],elapsed:0,done:false};
    s.waiting=null;s.talk=null;s.talkKey=null;s.talkFlags={};s.heard=[];s.signature=null;s.stranger=false;s.version++;
  },
  begin(s){if(s.phase!=='brief')return false;s.phase='active';return true;},
  active(s){return s.phase==='active'&&!s.state.done;},
  parcel(s,id){return s.packages.find(p=>p.id===id);},
  take(s,id){
    const p=this.parcel(s,id);if(!this.active(s)||!p||!p.onShelf)return false;
    p.onShelf=false;s.state.carrying.push(id);s.state.pulls++;if(!p.mine)s.state.wrongPulls++;s.version++;return true;
  },
  replace(s,id){
    const p=this.parcel(s,id);if(!this.active(s)||!p||p.onShelf||!s.state.carrying.includes(id))return false;
    p.onShelf=true;s.state.carrying=s.state.carrying.filter(k=>k!==id);s.version++;return true;
  },
  scan(s,id,atVan=false){
    if(!this.active(s)||!s.state.carrying.includes(id))return false;s.state.scanned[id]=true;if(atVan)s.state.scannedInVan=true;s.version++;return true;
  },
  heavyCarried(s){for(const p of s.packages)if(p.weight>=50&&s.state.carrying.includes(p.id))return true;return false;},
  heavy(s,how){
    if(!this.active(s)||s.state.heavy!==undefined||!['truck','carry','ask'].includes(how)||!s.packages.some(p=>s.state.carrying.includes(p.id)&&(p.weight||0)>=50))return false;
    s.state.heavy=how;s.version++;return true;
  },
  exit(s,safe){
    if(!this.active(s)||!s.state.inVan||typeof safe!=='boolean')return false;
    s.state.exitSafe=s.state.exitSafe===null?safe:s.state.exitSafe&&safe;s.state.inVan=false;s.version++;return true;
  },
  enter(s,safe){
    if(!this.active(s)||s.state.inVan||typeof safe!=='boolean')return false;
    const S=s.state;S.enterSafe=S.enterSafe===null?safe:S.enterSafe&&safe;S.inVan=true;
    if(S.carrying.length){S.returned=S.carrying.slice();for(const id of S.carrying)this.parcel(s,id).onShelf=true;S.carrying=[];}
    if(!S.outcome&&S.pulls>0)S.vanTrips++;s.version++;return true;
  },
  knock(s){
    if(!this.active(s)||s.waiting||s.state.inVan||s.state.outcome)return false;
    s.state.knocks++;s.state.elapsed+=3;s.waiting=1+(s.def.answer?.delay??(s.def.answer?2:4));s.version++;return true;
  },
  step(s,seconds,active=true){
    if(!active||!this.active(s))return false;const dt=Math.max(0,Math.min(.05,Number(seconds)||0));
    if(!s.talk||s.talk.phase==='done')s.state.elapsed+=dt;
    if(s.waiting!==null){s.waiting=Math.max(0,s.waiting-dt);if(s.waiting<=1e-8){s.waiting=null;s.state.answered=!!s.def.answer;s.stranger=!!s.def.stranger;s.version++;return true;}}
    return false;
  },
  startTalk(s){
    if(!this.active(s)||s.talk||(!s.state.answered&&!s.stranger))return false;
    const answer=s.def.answer,key=answer?.talk||Object.keys(s.def.talks||{})[0],graph=s.def.talks?.[key];if(!graph)return false;
    const person=answer||s.def.stranger,speaker=answer?key:'stranger',cast={[speaker]:{name:person.name,portrait:person.spec,moodStart:person.moodStart||0}};
    s.talkKey=key;s.talk=OTR.fpCustomerTalk.create({...graph,cast},s.categories,{coaching:s.coaching,log:s.log,flags:s.talkFlags});OTR.fpCustomerTalk.begin(s.talk);s.version++;return true;
  },
  finishTalk(s){if(!this.active(s)||s.state.talked||s.talk?.phase!=='done')return false;s.state.talked=true;s.heard.push(s.talkKey);s.version++;return true;},
  canDeliver(s){return this.active(s)&&!s.state.outcome&&s.state.carrying.length>0&&s.state.carrying.every(id=>s.state.scanned[id]);},
  requestSignature(s,type){
    const T=OTR_DATA.handheld.deliveryTypes[type];if(!this.canDeliver(s)||!T||T.pod!=='signature'||!s.state.answered||!s.def.answer)return false;
    s.state.type=type;s.signature={name:s.def.answer.name,ready:false,names:null,page:0};s.version++;return true;
  },
  signed(s){if(!this.active(s)||!s.signature||s.signature.ready||s.state.outcome)return false;s.signature.ready=true;s.signature.names=OTR.util.shuffle(this.names(s));s.version++;return true;},
  names(s){if(s.signature?.names)return s.signature.names;return [s.def.answer?.name,s.def.packages[0].to.split(',')[0],'Occupant',...(s.def.extraNames||[])].filter((n,i,a)=>n&&a.indexOf(n)===i);},
  recordSigner(s,name){
    if(!this.canDeliver(s)||!s.signature?.ready||!this.names(s).includes(name))return false;
    s.state.signer=name;s.state.outcome='delivered';s.state.delivered=s.state.carrying.slice();s.state.carrying=[];s.signature=null;s.version++;return true;
  },
  leave(s,photo){
    if(!this.canDeliver(s)||!photo||!['good','ok','private','bad'].includes(photo.grade))return false;
    const S=s.state;S.type='left';S.spot='mat';S.photo={...photo};S.outcome='delivered';S.delivered=S.carrying.slice();S.carrying=[];s.version++;return true;
  },
  exception(s,code){
    const ex=OTR_DATA.handheld.exceptions.find(e=>e.id===code);if(!this.active(s)||s.state.outcome||!ex)return false;
    s.state.outcome='exception';s.state.code=code;s.state.exDef=ex;s.version++;return true;
  },
  printTag(s){if(!this.active(s)||s.state.outcome!=='exception'||!s.state.exDef?.doorTag||s.state.tagPrinted)return false;s.state.tagPrinted=true;s.version++;return true;},
  attachTag(s){if(!this.active(s)||!s.state.tagPrinted||s.state.tagAttached)return false;s.state.tagAttached=true;s.version++;return true;},
  evaluate(s){
    if(!this.active(s)||!s.state.inVan)return false;const ref={S:s.state,def:s.def,log:s.log,collapsed:false,heat:null};
    // Call the shared rule implementation; neither the world nor this model duplicates its points or labels.
    StopScene.prototype.evaluate.call(ref);s.state.done=true;s.summaries.push({...ref.stopSummary,id:s.def.id});s.phase='report';s.version++;return true;
  },
  next(s){if(s.phase!=='report')return false;if(s.index+1===s.content.stops.length){s.phase='done';s.version++;return true;}s.index++;this.prepare(s);s.phase='active';return true;},
  result(s){if(s.result)return s.result;if(s.phase!=='done')return null;s.result={score:s.log.score(),ratios:s.log.ratios(s.categories),log:s.log,lessons:s.content.keyLessons||[],stats:{stops:s.summaries.slice(),log:s.log.toJSON()}};return s.result;}
};
