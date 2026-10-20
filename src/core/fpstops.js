/* Richer-stop action sequences. The scene owns proximity, parcels and reporting. */
window.OTR=window.OTR||{};
OTR.fpStops=(()=>{
  const types={intercom:'stop.intercom',reception:'stop.reception',locker:'stop.locker',reattempt:'stop.reattempt'};
  const text=v=>typeof v==='string'&&v.trim()===v&&v.length>0&&v.length<=80;
  const day=v=>Number.isInteger(v)&&v>=1&&v<=100000;
  const clock=v=>Number.isFinite(v)&&v>=0&&v<=1e9;
  function validSpec(a){
    if(!a||!Object.hasOwn(types,a.kind)||!text(a.parcel))return false;
    if(a.kind==='intercom')return text(a.button)&&typeof a.available==='boolean';
    if(a.kind==='reception')return text(a.recipient)&&text(a.receptionist)&&typeof a.signature==='boolean';
    if(a.kind==='locker')return text(a.compartment);
    return day(a.day)&&day(a.nextDay)&&a.nextDay>a.day&&a.nextDay<=a.day+7&&['morning','afternoon'].includes(a.slot)&&['absent','access','address','id','dispatch'].includes(a.reason);
  }
  function create(a){
    if(!validSpec(a))throw Error('Invalid richer-stop specification');
    const s={version:1,kind:a.kind,parcel:a.parcel,failed:false};
    if(a.kind==='intercom')Object.assign(s,{calledAt:null,callValid:false,opened:false});
    if(a.kind==='reception')Object.assign(s,{role:null,signed:false,handed:false});
    if(a.kind==='locker')Object.assign(s,{open:false,scanned:false,deposited:false,photo:false});
    if(a.kind==='reattempt')Object.assign(s,{card:false,retained:false,booked:false});
    return s;
  }
  function ready(s,a,elapsed){
    return s.kind==='intercom'&&a.available&&s.callValid&&clock(elapsed)&&elapsed>=s.calledAt+2;
  }
  function fail(s){s.failed=true;return false;}
  function act(s,a,action,value,elapsed){
    if(!validSpec(a)||s.kind!==a.kind||s.parcel!==a.parcel)return false;
    if(s.kind==='intercom'){
      if(s.opened)return false;
      if(action==='call'){
        if(!clock(elapsed))return false;
        s.callValid=!!value&&value.button===a.button&&value.purpose==='delivery';
        s.calledAt=elapsed;
        return s.callValid||fail(s);
      }
      if(action==='open'){
        if(!ready(s,a,elapsed))return fail(s);
        s.opened=true;return true;
      }
    }
    if(s.kind==='reception'){
      if(s.handed)return false;
      if(action==='identify'){
        const role=value&&value.role;
        if(!['recipient','reception'].includes(role)||value.name!==(role==='recipient'?a.recipient:a.receptionist))return fail(s);
        if(s.role!==role)s.signed=false;
        s.role=role;return true;
      }
      if(action==='sign'){
        if(!s.role||value!==(s.role==='recipient'?a.recipient:a.receptionist))return fail(s);
        s.signed=true;return true;
      }
      if(action==='handover'){
        if(!s.role||((s.role==='reception'||a.signature)&&!s.signed))return fail(s);
        s.handed=true;return true;
      }
    }
    if(s.kind==='locker'){
      if(action==='open'){
        if(value!==a.compartment)return fail(s);
        s.open=true;s.photo=false;return true;
      }
      if(action==='scan'){
        if(!s.open||value!==a.parcel)return fail(s);
        s.scanned=true;return true;
      }
      if(action==='deposit'){
        if(!s.open||!s.scanned)return fail(s);
        s.deposited=true;return true;
      }
      if(action==='retrieve'){
        if(!s.open||!s.deposited)return fail(s);
        s.deposited=false;s.photo=false;return true;
      }
      if(action==='close'){
        if(!s.open)return false;
        s.open=false;return true;
      }
      if(action==='photo'){
        if(s.open||!s.deposited)return fail(s);
        s.photo=true;return true;
      }
    }
    if(s.kind==='reattempt'){
      if(s.booked)return false;
      if(action==='card'){s.card=true;return true;}
      if(action==='retain'){if(value!==a.reason)return fail(s);s.retained=true;return true;}
      if(action==='book'){
        if(!s.card||!s.retained||!value||value.day!==a.nextDay||value.slot!==a.slot)return fail(s);
        s.booked=true;return true;
      }
    }
    return false;
  }
  function assessment(s){
    const complete=s.kind==='intercom'?s.opened:s.kind==='reception'?s.handed:s.kind==='locker'?s.photo:s.booked;
    return {type:types[s.kind],complete:!!complete,ok:!!complete&&!s.failed};
  }
  function valid(s,a,elapsed){
    if(!validSpec(a)||!s||s.version!==1||s.kind!==a.kind||s.parcel!==a.parcel||typeof s.failed!=='boolean')return false;
    const initial=create(a),keys=Object.keys(initial);
    if(Object.keys(s).length!==keys.length||keys.some(k=>!Object.hasOwn(s,k)))return false;
    if(keys.some(k=>typeof initial[k]==='boolean'&&typeof s[k]!=='boolean'))return false;
    if(s.kind==='intercom')return (s.calledAt===null||clock(s.calledAt)&&clock(elapsed)&&s.calledAt<=elapsed)&&
      (s.calledAt===null||s.callValid||s.failed)&&
      (!s.callValid||s.calledAt!==null)&&(!s.opened||ready(s,a,elapsed));
    if(s.kind==='reception')return [null,'recipient','reception'].includes(s.role)&&(!s.signed||s.role!==null)&&
      (!s.handed||s.role!==null&&(!(s.role==='reception'||a.signature)||s.signed));
    if(s.kind==='locker')return (!s.deposited||s.scanned)&&(!s.photo||s.deposited&&!s.open);
    return !s.booked||s.card&&s.retained;
  }
  function restore(raw,a,elapsed){return valid(raw,a,elapsed)?Object.assign(create(a),raw):null;}
  return {create,act,ready,assessment,valid,restore};
})();
