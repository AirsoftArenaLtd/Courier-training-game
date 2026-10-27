/* Bounded, reusable standard-Gamepad input. Scene actions, settings writes and motor integration stay separate. */
window.OTR=window.OTR||{};
OTR.fpGamepad=(()=>{
 const names=['interact','back','gear','focus','signalLeft','signalRight','handheld','pause','handbrake','belt','lookForward','menuUp','menuDown','menuLeft','menuRight','careful'];
 const axisNames=['steer','moveY','lookX','lookY'],empty=[];
 const defaults=Object.freeze({deadzone:.18,axes:Object.freeze({steer:0,moveY:1,lookX:2,lookY:3}),buttons:Object.freeze({throttle:7,brake:6,interact:0,back:1,gear:2,focus:3,signalLeft:4,signalRight:5,handheld:8,pause:9,handbrake:13,belt:12,lookForward:11,menuUp:12,menuDown:13,menuLeft:14,menuRight:15,careful:10})});
 const actions=Object.freeze(Object.fromEntries(names.map((name,i)=>[name,1<<i])));
 const clamp=(v,lo,hi)=>Math.max(lo,Math.min(hi,v));
 const index=(value,fallback,limit)=>value===undefined?fallback:Number.isInteger(value)&&value>=-1&&value<limit?value:-1;
 const standard=pad=>!!pad&&pad.connected===true&&pad.mapping==='standard';
 return Object.freeze({defaults,actions,
  create(reader){
   const read=reader||(()=>typeof navigator!=='undefined'&&navigator.getGamepads?navigator.getGamepads():empty);
   const axes=new Int8Array(4),buttons=new Int8Array(names.length+2);
   const frame={connected:false,active:false,device:-1,steer:0,moveX:0,moveY:0,lookX:0,lookY:0,throttle:0,brake:0,careful:false,held:0,pressed:0,released:0};
   let device=-1,identity='',armed=false,previous=0,deadzone=defaults.deadzone,disposed=false;
   const clear=connected=>{frame.connected=connected;frame.active=false;frame.device=connected?device:-1;frame.steer=frame.moveX=frame.moveY=frame.lookX=frame.lookY=frame.throttle=frame.brake=0;frame.careful=false;frame.held=frame.pressed=frame.released=0;return frame;};
   const reset=(dropDevice=false)=>{if(dropDevice){device=-1;identity='';}armed=false;previous=0;return clear(false);};
   const axis=(pad,n)=>{if(axes[n]<0)return 0;const v=pad.axes?.[axes[n]];if(!Number.isFinite(v))return 0;const a=clamp(v,-1,1),m=Math.abs(a);return m<=deadzone?0:Math.sign(a)*(m-deadzone)/(1-deadzone);};
   const button=(pad,n)=>{if(buttons[n]<0)return 0;const b=pad.buttons?.[buttons[n]];if(b===undefined||b===null)return 0;const value=typeof b==='number'?b:Number.isFinite(b.value)?b.value:b.pressed?1:0;return Number.isFinite(value)?clamp(value,0,1):0;};
   const trigger=value=>value<=.05?0:(value-.05)/.95;
   const configure=options=>{
    options=options||defaults;const zone=Number.isFinite(options.deadzone)?clamp(options.deadzone,.05,.45):defaults.deadzone;let changed=zone!==deadzone;deadzone=zone;
    for(let n=0;n<axes.length;n++){const value=index(options.axes?.[axisNames[n]],defaults.axes[axisNames[n]],8);if(axes[n]!==value)changed=true;axes[n]=value;}
    for(let n=0;n<buttons.length;n++){const name=n===0?'throttle':n===1?'brake':names[n-2],value=index(options.buttons?.[name],defaults.buttons[name],32);if(buttons[n]!==value)changed=true;buttons[n]=value;}
    if(changed)reset();return changed;
   };
   configure();
   return {frame,configure,reset,
    poll(enabled=true){
     if(disposed)return clear(false);
     let pads;try{pads=read()||empty;}catch{reset(true);return frame;}
     let selected=device>=0&&standard(pads[device])?device:-1;
     if(selected<0)for(let n=0;n<4;n++)if(standard(pads[n])){selected=n;break;}
     if(selected<0){reset(true);return frame;}
     const pad=pads[selected],id=typeof pad.id==='string'?pad.id:'';
     if(selected!==device||id!==identity){device=selected;identity=id;armed=false;previous=0;}
     const steer=axis(pad,0),moveY=-axis(pad,1),lookX=axis(pad,2),lookY=axis(pad,3),throttle=trigger(button(pad,0)),brake=trigger(button(pad,1));
     let held=0;for(let n=0;n<names.length;n++)if(button(pad,n+2)>.5)held|=1<<n;
     if(!enabled){armed=false;previous=0;return clear(true);}
     if(!armed){if(!held&&!steer&&!moveY&&!lookX&&!lookY&&!throttle&&!brake)armed=true;return clear(true);}
     frame.connected=frame.active=true;frame.device=device;frame.steer=frame.moveX=steer;frame.moveY=moveY;frame.lookX=lookX;frame.lookY=lookY;frame.throttle=throttle;frame.brake=brake;frame.careful=!!(held&actions.careful);frame.held=held;frame.pressed=held&~previous;frame.released=previous&~held;previous=held;return frame;
    },
    dispose(){disposed=true;reset(true);}
   };
  }
 });
})();
