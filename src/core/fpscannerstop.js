/* Physical M5 action state. Original StopScene callbacks/evaluation own the checks, points and result scale. */
window.OTR=window.OTR||{};
OTR.fpScannerStop={
  create(id,content,categories,options){
    if(!['m5-pod','m5-exceptions','m5-adult'].includes(id))throw Error('Invalid scanner scenario');
    const s=OTR.fpCustomerStop.create(content,categories,options);s.scannerId=id;this.prepare(s);return s;
  },
  prepare(s){s.identity=null;s.photoPending=false;s.photoMode=false;s.photo=null;s.photoPreview=null;s.captureToken=null;},
  spots(s){return s.def.spots||[{id:'mat',label:'On the doormat',x:0,grade:'good'}];},
  place(s,id){
    const K=OTR.fpCustomerStop,spot=this.spots(s).find(p=>p.id===id);
    if(!spot||!K.canDeliver(s)||s.photoPending)return false;
    const S=s.state;S.type='left';S.spot=id;S.delivered=S.carrying.slice();S.carrying=[];s.identity=null;s.signature=null;s.photoPending=true;s.photoMode=true;s.photo=null;s.version++;return true;
  },
  capture(s,photo){
    if(!OTR.fpCustomerStop.active(s)||!s.photoPending||!s.photoMode||s.state.outcome||!['good','ok','private','bad'].includes(photo?.grade))return false;
    s.state.photo={...photo};s.photo=s.state.photo;s.photoMode=false;s.version++;return true;
  },
  retake(s){
    if(!OTR.fpCustomerStop.active(s)||!s.photoPending||s.photoMode||!s.photo||s.state.outcome)return false;
    s.state.retakes=(s.state.retakes||0)+1;s.photoMode=true;s.version++;return true;
  },
  usePhoto(s){
    if(!OTR.fpCustomerStop.active(s)||!s.photoPending||s.photoMode||!s.photo||s.state.outcome)return false;
    s.state.outcome='delivered';s.photoPending=false;s.version++;return true;
  },
  request(s,type){
    const K=OTR.fpCustomerStop,T=OTR_DATA.handheld.deliveryTypes[type];
    if(!K.canDeliver(s)||!T||T.pod!=='signature'||!s.state.answered||!s.def.answer||s.photoPending)return false;
    s.identity=null;s.signature=null;
    if(s.def.packages[0].service==='adult'){s.state.type=type;s.identity={person:s.def.answer,type};s.version++;return 'identity';}
    return K.requestSignature(s,type)?'signature':false;
  },
  card(s){
    if(!s.identity)return null;const person=s.identity.person,id=person.id||{};
    // This is the authored training date, never the browser's current date or a computed answer.
    return {name:person.name,spec:person.spec,dob:id.dob||'03/12/1990',exp:id.exp,no:id.no,today:s.content.today||'Today: 09/17/2026'};
  },
  decide(s,result){
    const K=OTR.fpCustomerStop,pending=s.identity;
    if(!pending||!K.canDeliver(s)||!['ok','under','invalid'].includes(result))return false;
    s.state.idResult=result;s.identity=null;s.version++;
    // A refusal only records the observation. The exception and tag still require separate actions.
    if(result==='ok')return K.requestSignature(s,pending.type)?'signature':false;
    return 'refused';
  },
  cancelIdentity(s){if(!OTR.fpCustomerStop.active(s)||!s.identity)return false;s.identity=null;s.version++;return true;},
  next(s){if(!OTR.fpCustomerStop.next(s))return false;this.prepare(s);return true;}
};
