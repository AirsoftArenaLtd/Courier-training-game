/* Scene-private, bounded presentation state for the authored customer dialogues. It never grades or saves. */
window.OTR=window.OTR||{};
OTR.fpCustomerStage={
  houseZ:-47,officeZ:-33,
  create(talk){
    const two=!!talk.cast.morgan,signature=!!talk.cast.priya,actors=Object.entries(talk.cast).map(([key,person],i)=>({key,person,remote:!!person.remote,dog:person.portrait?.kind==='dog',visible:false,x:key==='alvarez'?9.3:key==='biscuit'?9.2:11,z:key==='morgan'?-30.8:key==='chen'?-44.5:key==='dana'?-44.5:-44,y:0,goalX:0,goalZ:0,moving:false,solid:{x:10000,z:10000,w:person.portrait?.kind==='dog'?.85:.5,d:person.portrait?.kind==='dog'?.55:.4}}));
    const s={two,signature,site:two?'office':'house',stamp:-1,time:0,held:two?'stack':'box',floorBox:false,floorSolid:{x:10000,z:10000,w:.45,d:.36},phone:false,speaker:null,actors,target:{x:11,y:1.2,z:two?-29.6:-44.9,kind:two?'counter':'door'},script:[],scriptAt:0,routeChanged:false};
    const initial=actors.find(a=>a.key===(two?'morgan':'dana'));if(initial)initial.visible=true;this.target(s);return s;
  },
  target(s){
    const t=s.target;let actor=null;for(const a of s.actors)if(a.visible&&!a.remote){if(!actor)actor=a;if(a.key===s.speaker){actor=a;break;}}
    if(s.phone){t.x=10;t.y=1.18;t.z=-43.5;t.kind='phone';}
    else if(s.site==='office'){t.x=11;t.y=1.18;t.z=-29.6;t.kind='counter';}
    else if(actor){t.x=actor.x;t.y=actor.dog?.65:1.2;t.z=actor.z;t.kind=actor.dog?'dog':'person';}
    else{t.x=11;t.y=1.2;t.z=-44.9;t.kind='door';}
    for(const a of s.actors){a.solid.x=a.visible&&!a.remote?a.x:10000;a.solid.z=a.visible&&!a.remote?a.z:10000;}
    s.floorSolid.x=s.floorBox?11:10000;s.floorSolid.z=s.floorBox?-44.1:10000;return t;
  },
  hold(s,value){if(!value&&s.held)s.floorBox=true;if(value)s.floorBox=false;s.held=value;},
  act(s,act,arg){
    if(act==='hold')this.hold(s,arg);
    if(act==='hide'){for(const a of s.actors)if(arg===true||a.key===arg)a.visible=false;if(arg===true||s.actors.some(a=>a.key===arg&&a.remote))s.phone=false;}
  },
  apply(s,talk){
    if(s.stamp===talk.entries)return false;s.stamp=talk.entries;s.routeChanged=false;
    if(talk.lastAct){this.act(s,talk.lastAct.act,talk.lastAct.arg);talk.lastAct=null;}
    const n=talk.presentation;if(!n)return false;
    const setting=typeof n.setting==='string'?n.setting:n.setting?.name;
    if(setting){const site=setting==='office'?'office':'house';s.routeChanged=site!==s.site;s.site=site;}
    if(n.hide)this.act(s,'hide',n.hide);
    if(n.show){const actor=s.actors.find(a=>a.key===n.show);if(actor){actor.visible=!actor.remote;if(actor.remote)s.phone=true;}}
    if(n.hold!==undefined)this.hold(s,n.hold);s.speaker=n.speaker;
    s.script=n.stage||[];s.scriptAt=0;for(const a of s.actors)a.moving=false;this.target(s);return true;
  },
  step(s,seconds,reduced=false){
    const dt=Math.max(0,Math.min(.05,Number(seconds)||0));s.time+=dt;
    // The authored courier's scripted movement remains voluntary first-person movement. NPC waypoints are bounded.
    let limit=0;while(s.scriptAt<s.script.length&&limit++<8){
      const action=s.script[s.scriptAt];if(action.hold!==undefined){this.hold(s,action.hold);s.scriptAt++;continue;}
      const walk=action.walk;let actor=null;if(walk)for(const a of s.actors)if(a.key===walk.who&&!a.remote){actor=a;break;}
      if(!actor){s.scriptAt++;continue;}
      const gx=actor.dog?(walk.x<=320?10.2:9.2):walk.x>1000?13:11,gz=actor.dog?(walk.x<=320?-43.3:-43.8):-44.5,dx=gx-actor.x,dz=gz-actor.z,d=Math.hypot(dx,dz),step=reduced?d:dt*(actor.dog?1.8:1.2);
      actor.moving=!reduced&&d>.01;if(d<=step+.001){actor.x=gx;actor.z=gz;actor.moving=false;s.scriptAt++;continue;}
      actor.x+=dx/d*step;actor.z+=dz/d*step;break;
    }
    this.target(s);
  },
  solids(s){return [{x:12,z:-47,w:7,d:4},{x:10,z:-43.5,w:.6,d:.5},...(s.two?[{x:12,z:-33,w:7,d:4},{x:11,z:-30,w:2.5,d:.7}]:[]),s.floorSolid,...s.actors.filter(a=>!a.remote).map(a=>a.solid)];},
  destination(s){return s.site==='office'?'The conversation is at the business reception.':'The conversation is at the house farther along this street.';}
};
