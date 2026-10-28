/* Optional one-stop protocols reuse the existing action sequences and common StopScene grading. */
window.OTR=window.OTR||{};
OTR.fpCustomerProtocol={
  create(content,spec,{coaching=true}={}){
    if(!['intercom','reception','locker'].includes(spec?.kind)||content?.stops?.length!==1||content.stops[0].packages?.length!==1||content.stops[0].packages[0].id!==spec.parcel)throw Error('Invalid protocol lesson content');
    const sequence=OTR.fpStops.create(spec);if(!sequence)throw Error('Invalid protocol lesson specification');
    const original=content.stops[0],extra=spec.kind==='locker'?0:30;
    const stop={...original,par:(original.par||120)+extra};
    const s=OTR.fpCustomerStop.create({...content,stops:[stop]},['service','safety','efficiency'],{coaching});
    s.protocol={spec:{...spec},sequence,elapsed:0,evaluated:false};return s;
  },
  begin(s){return OTR.fpCustomerStop.begin(s);},
  step(s,seconds,active=true){
    if(!active||!OTR.fpCustomerStop.active(s))return false;
    const dt=Math.max(0,Math.min(.05,Number(seconds)||0));s.protocol.elapsed+=dt;
    return OTR.fpCustomerStop.step(s,dt,true);
  },
  action(s,action,value){
    const K=OTR.fpCustomerStop,p=s.protocol,S=s.state;
    if(!K.active(s)||S.inVan||p.evaluated)return false;
    if(p.spec.kind==='locker'){
      if(action==='scan'){
        if(!S.carrying.includes(value)||!K.scan(s,value,false))return false;
      }
      if(action==='deposit'&&(!S.carrying.includes(p.spec.parcel)||!S.scanned[p.spec.parcel]))return false;
    }else if(action==='handover'&&!this.canHandOver(s))return false;
    if(!OTR.fpStops.act(p.sequence,p.spec,action,value,p.elapsed))return false;
    if(p.spec.kind==='locker'){
      if(action==='deposit')S.carrying=S.carrying.filter(id=>id!==p.spec.parcel);
      if(action==='retrieve'&&!S.carrying.includes(p.spec.parcel))S.carrying.push(p.spec.parcel);
      if(OTR.fpStops.assessment(p.sequence).complete)this.recordPackage(s,'locker');
      else if(S.outcome==='delivered'){S.outcome=null;S.type=null;S.delivered=[];}
    }else if(p.spec.kind==='reception'&&p.sequence.handed){
      S.signer=p.sequence.role==='recipient'?p.spec.recipient:p.spec.receptionist;this.recordPackage(s,'reception');
    }
    s.version++;return true;
  },
  canHandOver(s){
    const S=s.state,id=s.protocol.spec.parcel;
    return OTR.fpCustomerStop.canDeliver(s)&&!S.inVan&&S.carrying.includes(id)&&!!S.scanned[id];
  },
  handOver(s){
    if(s.protocol.spec.kind!=='intercom'||!this.canHandOver(s)||!OTR.fpStops.assessment(s.protocol.sequence).complete)return false;
    this.recordPackage(s,'recipient');s.version++;return true;
  },
  recordPackage(s,type){
    const S=s.state,id=s.protocol.spec.parcel;S.carrying=S.carrying.filter(p=>p!==id);S.delivered=[id];S.outcome='delivered';S.type=type;
  },
  ready(s){
    const S=s.state;
    return OTR.fpCustomerStop.active(s)&&S.inVan&&S.exitSafe!==null&&S.enterSafe!==null&&S.outcome==='delivered'&&S.delivered.includes(s.protocol.spec.parcel)&&OTR.fpStops.assessment(s.protocol.sequence).complete;
  },
  evaluate(s){
    if(s.protocol.evaluated||!this.ready(s))return false;
    const common=new OTR.ScoreLog(s.def.id),ref={S:s.state,def:s.def,log:common,collapsed:false,heat:null};
    StopScene.prototype.evaluate.call(ref);s.log.setGroup(s.def.id);
    // Named protocol checks replace the generic recipient service rules, preserving common grading verbatim.
    for(const item of common.items){
      if(item.cat!=='safety'&&item.cat!=='efficiency')continue;
      if(item.kind==='check')s.log.check(item.cat,item.got,item.max,item.label,item);
      else if(item.kind==='penalty')s.log.penalty(item.cat,-item.got,item.label,item);
    }
    const observed=OTR.fpStops.assessment(s.protocol.sequence),def=OTR_DATA.workdayEvents[observed.type];
    s.log.check(def.cat,observed.ok?def.max:0,def.max,observed.ok?def.label:def.fail,{lesson:def.lesson,critical:!!def.critical,severity:def.severity,type:observed.type});
    s.protocol.evaluated=true;s.state.done=true;s.summaries.push({...ref.stopSummary,id:s.def.id});s.phase='report';s.version++;return true;
  },
  next(s){return s.protocol.evaluated&&OTR.fpCustomerStop.next(s);},
  result(s,reason='complete'){
    if(s.result)return s.result;
    if(reason==='complete'&&(s.phase!=='done'||!s.protocol.evaluated))return null;
    const complete=reason==='complete'&&s.phase==='done'&&s.protocol.evaluated;
    if(!complete){s.state.done=true;s.phase='incomplete';s.version++;}
    s.result={score:complete?s.log.score():0,ratios:complete?s.log.ratios(s.categories):{service:0,safety:0,efficiency:0},log:s.log,lessons:[],stats:{completed:complete,stops:s.summaries.slice(),protocol:{...OTR.fpStops.assessment(s.protocol.sequence),failed:s.protocol.sequence.failed}}};return s.result;
  }
};
