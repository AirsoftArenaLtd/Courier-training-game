/* Remapping reads all bounded physical inputs, including inputs not currently assigned to an action. */
window.OTR=window.OTR||{};
OTR.fpGamepadCapture={
 create(group,preferred=-1,reader){
  const empty=[],standard=p=>p?.connected===true&&p.mapping==='standard';
  const read=reader||(()=>navigator.getGamepads?navigator.getGamepads():empty),result={stage:'neutral',connected:false,value:-1};
  let device=preferred,identity=null,candidate=-1,disposed=false;
  const reset=()=>{candidate=-1;result.stage='neutral';result.value=-1;};
  const value=b=>typeof b==='number'?b:b&&Number.isFinite(b.value)?b.value:b?.pressed?1:0;
  return {result,reset,dispose(){disposed=true;reset();result.connected=false;},
   poll(enabled=true){
    if(disposed)return result;
    let pads;try{pads=read()||empty;}catch{pads=empty;}
    const previous=device;
    if(!standard(pads[device])){device=-1;for(let n=0;n<4;n++)if(standard(pads[n])){device=n;break;}}
    const pad=pads[device];result.connected=!!pad;
    if(!pad||!enabled){reset();return result;}
    if(device!==previous||identity!==pad.id){identity=pad.id;reset();}
    let neutral=true,count=0,found=-1;
    for(let n=0;n<8;n++){
     const a=pad.axes?.[n],m=Number.isFinite(a)?Math.abs(a):0;
     if(m>.25)neutral=false;if(group==='axes'&&m>=.65){count++;found=n;}
    }
    for(let n=0;n<32;n++){
     const b=value(pad.buttons?.[n]);if(Number.isFinite(b)&&b>.25)neutral=false;
     if(group==='buttons'&&Number.isFinite(b)&&b>=.65){count++;found=n;}
    }
    if(result.stage==='neutral'){if(neutral)result.stage='input';}
    else if(result.stage==='input'){
     if(count===1){candidate=found;result.stage='release';}
     else if(count>1)reset();
    }else if(result.stage==='release'){
     // A second control before release invalidates the gesture; it cannot silently select the first one.
     if(count>1||count===1&&found!==candidate)reset();
     else if(neutral){result.value=candidate;result.stage='complete';}
    }
    return result;
   }
  };
 }
};
