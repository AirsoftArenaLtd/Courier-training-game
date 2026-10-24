/* Physical bay coordinates and inputs around the unchanged five-load lifting kernel. */
window.OTR=window.OTR||{};
OTR.fpPackageLiftBay={
  scale:.01,originX:-16.4,rowZ:13.45,loadZ:12.65,
  x(value){return this.originX+value*this.scale;},
  create(content){const s=OTR.fpPackageLift.create(content);s.bay={mode:'idle',transport:0,pushing:false,helperReady:false,unloaded:false,unloadNotice:false,sourceX:0,sourceBottom:0,offset:0,pivoted:false,placedZ:this.loadZ,
    input:{left:false,right:false,up:false,down:false},body:{x:0,y:0,z:0,eye:1.65},parcel:{x:0,y:0,z:0,w:0,h:0,d:.46},truck:{x:0,y:0,z:0}};return s;},
  next(s){if(!OTR.fpPackageLift.next(s))return false;Object.assign(s.bay,{mode:'assess',transport:0,pushing:false,helperReady:false,unloaded:false,unloadNotice:false,sourceX:s.box.x,sourceBottom:s.box.bottom,offset:0,pivoted:false,placedZ:this.loadZ});this.project(s);return true;},
  choose(s,index){
    const choice=s.lift?.options[index];if(!choice)return false;const effect=choice.effect==='strain'?choice.then||'normal':choice.effect;
    if(!OTR.fpPackageLift.choose(s,index))return false;
    s.bay.mode=effect==='equipment'?'equipment':effect==='helper'?'waiting-helper':'posture';this.project(s);return true;
  },
  requestHelper(s){if(s.bay.mode!=='waiting-helper')return false;s.bay.helperReady=true;s.bay.mode='posture';return true;},
  takeHandle(s){
    const b=s.bay;if(b.mode!=='equipment'||b.pushing||s.pose.x<b.sourceX+55)return false;
    b.pushing=true;b.offset=s.pose.x-b.sourceX;return true;
  },
  unload(s){if(s.bay.mode!=='unload'||s.bay.unloaded)return false;s.bay.unloaded=true;s.bay.mode='verdict';this.project(s);return true;},
  step(s,input,seconds){
    const b=s.bay,dt=Math.max(0,Math.min(.05,Number(seconds)||0)),P=s.pose;if(b.mode!=='posture'&&b.mode!=='equipment')return false;
    if(b.mode==='equipment'){
      if(!b.pushing)P.x=OTR.util.clamp(P.x+(Number(!!input.right)-Number(!!input.left))*150*dt,420,900);
      else{const distance=Math.max(1,b.sourceX-475);b.transport=OTR.util.clamp01(b.transport+(Number(!!input.left)-Number(!!input.right))*150*dt/distance);P.x=b.sourceX+b.offset-distance*b.transport;if(b.transport>=1)b.mode='unload';}
    }else{
      const old=P.dir,k=b.input;const platform=s.lift.high&&P.elevate>0;k.left=!!input.left&&!platform;k.right=!!input.right&&!platform;k.up=!!input.up;k.down=!!input.down;
      OTR.fpPackageLift.advance(s,k,dt);if(P.hold&&old!==P.dir)b.pivoted=true;
    }
    this.project(s);return true;
  },
  grip(s){
    if(s.bay.mode!=='posture')return false;const releasing=s.pose.hold;if(releasing)s.bay.placedZ=s.bay.parcel.z;
    if(!OTR.fpPackageLift.action(s))return false;if(s.phase==='verdict')s.bay.mode='verdict';this.project(s);return true;
  },
  project(s){
    if(!s.lift)return;const b=s.bay,P=s.pose,L=s.lift,parcel=b.parcel,body=b.body,carrying=P.hold;
    // A shelf lift steps down off the platform before travelling along the clear pallet aisle.
    const stepBack=L.high&&carrying?.5*(1-P.elevate/60)*OTR.util.clamp01((P.x-400)/240):0;
    body.x=this.x(P.x);body.y=P.elevate*.01;body.z=this.rowZ+stepBack;body.eye=1.65+body.y-P.squat*.6-P.stoop*.25;
    parcel.w=L.w*.01;parcel.h=L.h*.01;parcel.d=.46;
    if(b.pushing||b.mode==='equipment'){parcel.x=this.x(b.unloaded?360:b.sourceX+(475-b.sourceX)*b.transport);parcel.y=(b.unloaded?.18:.12)+parcel.h/2;parcel.z=this.loadZ;}
    else{const point=carrying?OTR.fpPackageLift.heldBox(s):s.box;parcel.x=this.x(point.x);parcel.y=(600-point.bottom)*.01+parcel.h/2;parcel.z=carrying?body.z-.8:s.phase==='verdict'?b.placedZ:this.loadZ;}
    b.truck.x=b.mode==='equipment'||b.pushing?this.x(b.sourceX+(475-b.sourceX)*b.transport):-7.4;b.truck.y=0;b.truck.z=b.mode==='equipment'||b.pushing?this.loadZ:14.6;
  }
};
