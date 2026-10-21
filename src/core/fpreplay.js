/* A fixed ten-second memory recording. This module never reports, steps a mission or writes a save. */
window.OTR=window.OTR||{};
OTR.fpReplay=(()=>{
  const SECONDS=10,INTERVAL=.05,CAPACITY=202,MAX_CONTEXT=131072;
  const states=['waiting','developing','crossing','resolved','beside','clear','done','approaching','flashing','leaving','passing'];
  const fields=[],add=(path,kind='number',values)=>fields.push({path,kind,values});
  add(['elapsed']);
  for(const key of ['x','z','speed','steer'])add(['van',key]);
  add(['van','yaw'],'angle');add(['van','look'],'angle');add(['van','gear'],'discrete');
  for(const key of ['headlights','wipers','belt','hand'])add(['van',key],'boolean');
  for(const key of ['pitch','roll','heave'])add(['motion',key]);
  for(const key of ['x','z'])add(['player',key]);
  for(const key of ['yaw','pitch'])add(['player',key],'angle');
  add(['mode'],'enum',['walk','cab']);add(['phase'],'enum',['prepare','route','return','debrief']);
  add(['activeStop'],'discrete');add(['signal'],'discrete');add(['cargoOpen'],'boolean');add(['repaired'],'boolean');
  for(let i=0;i<2;i++){for(const key of ['x','z','speed'])add(['traffic',i,key]);add(['traffic',i,'yaw'],'angle');}
  for(const path of [['crossing'],['trafficControl','cyclist'],['driving','bus'],['driving','siren']]){
    for(const key of ['x','z','clock'])add([...path,key]);
    add([...path,'yaw'],'angle');add([...path,'state'],'enum',states);
  }
  const axes=['x','y','z'],CAMERA=fields.length,STRIDE=CAMERA+7,angle=n=>Math.atan2(Math.sin(n),Math.cos(n));
  const at=(object,path)=>{for(const key of path){if(object===undefined||object===null)return undefined;object=object[key];}return object;};
  const put=(object,path,value)=>{for(let i=0;i<path.length-1;i++){object=object[path[i]];if(!object)return;}object[path[path.length-1]]=value;};
  function write(buffer,offset,m,camera){
    for(let i=0;i<fields.length;i++){
      const f=fields[i],value=at(m,f.path);
      buffer[offset+i]=value===undefined?NaN:f.kind==='boolean'?(value?1:0):f.kind==='enum'?f.values.indexOf(value):Number.isFinite(value)?value:NaN;
    }
    const p=camera.position,r=camera.rotation;
    buffer[offset+CAMERA]=p.x;buffer[offset+CAMERA+1]=p.y;buffer[offset+CAMERA+2]=p.z;
    buffer[offset+CAMERA+3]=r.x;buffer[offset+CAMERA+4]=r.y;buffer[offset+CAMERA+5]=r.z;buffer[offset+CAMERA+6]=camera.fov;
  }
  const valid=(m,c)=>m&&m.kind==='campaign'&&Number.isFinite(m.elapsed)&&m.elapsed>=0&&m.van&&Number.isFinite(m.van.x)&&Number.isFinite(m.van.z)&&c&&c.position&&c.rotation&&Number.isFinite(c.position.x)&&Number.isFinite(c.position.y)&&Number.isFinite(c.position.z)&&Number.isFinite(c.rotation.x)&&Number.isFinite(c.rotation.y)&&Number.isFinite(c.rotation.z)&&Number.isFinite(c.fov);
  class Recorder{
    constructor(){
      this.frames=new Float64Array(CAPACITY*STRIDE);this.tail=new Float64Array(STRIDE);this.saved=new Float64Array((CAPACITY+1)*STRIDE);
      this.reset();
    }
    reset(){this.model=null;this.identity=null;this.stream=null;this.observed=0;this.head=0;this.count=0;this.lastTime=-Infinity;this.sampleAt=-Infinity;this.latest=null;this.completed=false;}
    bind(m,events,identity){
      this.reset();this.model=m;this.stream=events;this.observed=events.length;this.identity=identity;
    }
    row(index){return (this.head+index)%CAPACITY*STRIDE;}
    frame(m,camera,events,identity,hidden=false){
      if(this.model!==m||this.identity!==identity)this.bind(m,events,identity);
      if(this.completed)return;
      if(this.stream!==events||events.length<this.observed){this.stream=events;this.observed=events.length;this.head=this.count=0;this.sampleAt=-Infinity;this.latest=null;}
      let mistake=null;
      for(let i=this.observed;i<events.length;i++){
        const e=events[i],def=window.OTR_DATA&&OTR_DATA.workdayEvents&&OTR_DATA.workdayEvents[e.type];
        if(def&&(def.kind==='penalty'||def.kind==='check'&&e.ok===false))mistake=e;
      }
      this.observed=events.length;
      if(hidden||!valid(m,camera)){this.head=this.count=0;this.sampleAt=-Infinity;if(mistake)this.latest=null;return;}
      const now=m.elapsed;
      if(now<this.lastTime||now-this.lastTime>.5||this.count&&Math.hypot(m.van.x-this.frames[this.row(this.count-1)+1],m.van.z-this.frames[this.row(this.count-1)+2])>5){this.head=this.count=0;this.sampleAt=-Infinity;}
      this.lastTime=now;
      if(!m.paused&&now-this.sampleAt>=INTERVAL-1e-8){
        if(this.count===CAPACITY){this.head=(this.head+1)%CAPACITY;this.count--;}
        write(this.frames,this.row(this.count++),m,camera);this.sampleAt=now;
      }
      while(this.count>1&&this.frames[this.row(1)]<=now-SECONDS){this.head=(this.head+1)%CAPACITY;this.count--;}
      if(!mistake)return;
      write(this.tail,0,m,camera);
      let count=this.count;
      for(let i=0;i<count;i++){const row=this.row(i);for(let j=0;j<STRIDE;j++)this.saved[i*STRIDE+j]=this.frames[row+j];}
      if(count&&this.saved[(count-1)*STRIDE]===now)count--;
      this.saved.set(this.tail,count*STRIDE);count++;
      let context;try{context=JSON.stringify(m.snapshot());}catch{this.latest=null;return;}
      if(typeof context!=='string'||context.length>MAX_CONTEXT){this.latest=null;return;}
      const def=OTR_DATA.workdayEvents[mistake.type];
      this.latest={identity,seed:m.seed,day:m.routePlan&&m.routePlan.day||1,start:Math.max(now-SECONDS,this.saved[0]),end:now,count,context,
        mistake:{type:mistake.type,key:mistake.key,stop:mistake.stop,label:def.kind==='penalty'?def.label:def.fail||def.label,lesson:def.lesson||'',critical:!!def.critical}};
    }
    finish(record){
      this.completed=true;
      if(!this.latest||!record||typeof record.id!=='string'||!record.id||record.id!==this.identity||record.day!==this.latest.day)return null;
      return Object.assign({},this.latest,{frames:this.saved.slice(0,this.latest.count*STRIDE),recordId:record.id});
    }
    get bytes(){return this.frames.byteLength+this.tail.byteLength+this.saved.byteLength;}
  }
  function sample(clip,time,model,camera){
    const t=Number.isFinite(time)?Math.max(clip.start,Math.min(clip.end,time)):clip.start,data=clip.frames;
    let lo=0,hi=clip.count-1;
    while(lo+1<hi){const mid=(lo+hi)>>1;if(data[mid*STRIDE]<=t)lo=mid;else hi=mid;}
    const a=lo*STRIDE,b=(data[hi*STRIDE]<=t?hi:Math.min(lo+1,clip.count-1))*STRIDE,span=data[b]-data[a],mix=span>0?Math.max(0,Math.min(1,(t-data[a])/span)):0;
    for(let i=0;i<fields.length;i++){
      const f=fields[i],x=data[a+i],y=data[b+i];if(!Number.isFinite(x))continue;
      const v=f.kind==='angle'?x+angle(y-x)*mix:f.kind==='number'?x+(y-x)*mix:mix>=1?y:x;
      if(f.kind==='enum'){if(f.values[v]!==undefined)put(model,f.path,f.values[v]);}
      else put(model,f.path,f.kind==='boolean'?!!v:v);
    }
    model.elapsed=t;model.paused=true;
    const p=camera.position,r=camera.rotation;
    for(let i=0;i<7;i++){const x=data[a+CAMERA+i],y=data[b+CAMERA+i],v=i>=3&&i<=5?x+angle(y-x)*mix:x+(y-x)*mix;if(i<3)p[axes[i]]=v;else if(i<6)r[axes[i-3]]=v;else camera.fov=v;}
    return t;
  }
  class Player{
    constructor(clip,reduced=false){this.clip=clip;this.time=clip.start;this.paused=true;this.reduced=!!reduced;}
    motion(reduced){if(reduced)this.paused=true;this.reduced=!!reduced;}
    play(){
      if(this.reduced||this.clip.end<=this.clip.start)return false;
      if(this.time>=this.clip.end)this.time=this.clip.start;
      this.paused=false;return true;
    }
    pause(){this.paused=true;}
    seek(time){this.paused=true;this.time=Number.isFinite(time)?Math.max(this.clip.start,Math.min(this.clip.end,time)):this.clip.start;return this.time;}
    step(seconds){return this.seek(this.time+(Number.isFinite(seconds)?seconds:0));}
    advance(seconds,hidden=false){
      if(hidden)this.paused=true;
      if(!this.paused&&Number.isFinite(seconds)&&seconds>0){this.time=Math.min(this.clip.end,this.time+Math.min(.1,seconds));if(this.time>=this.clip.end)this.paused=true;}
      return this.time;
    }
  }
  return {SECONDS,INTERVAL,CAPACITY,STRIDE,MAX_CONTEXT,Recorder,Player,sample,matches:(clip,record)=>!!(clip&&record&&clip.recordId===record.id&&clip.day===record.day)};
})();
