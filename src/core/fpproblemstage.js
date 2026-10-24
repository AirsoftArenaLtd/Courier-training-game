/* Bounded, read-only presentation of the four authored problem-solving graphs. No scores, saves or camera moves. */
window.OTR=window.OTR||{};
OTR.fpProblemStage={
  create(id,content){
    if(!['m4-address','m4-recover','m4-damaged','m4-storm'].includes(id)||!content?.nodes||Object.keys(content.cast||{}).length>4)throw Error('Invalid problem-solving stage');
    const points={cab:{x:1.35,y:1.85,z:-43.6,kind:'cab-phone'},cargo:{x:1.7,y:1.15,z:-38.2,kind:'parcel'},house:{x:12,y:1.2,z:-44.5,kind:'door'},other:{x:12,y:1.2,z:-30.5,kind:'door'},gate:{x:14,y:1.25,z:-42.98,kind:'gate'},safe:{x:8.3,y:1.2,z:-39.5,kind:'phone'}};
    const two=id==='m4-address'||id==='m4-recover',site=id==='m4-address'?'house':id==='m4-damaged'?'cargo':'cab';
    const actors=Object.entries(content.cast||{}).map(([key,person])=>{const home=['jo','lena'].includes(key)?'other':'house',p=points[home];return {key,person,remote:!!person.remote,site:home,x:p.x,z:p.z,visible:false,solid:{x:10000,z:10000,w:.5,d:.4}};});
    const s={id,content,two,points,actors,site,stamp:-1,node:null,time:0,routeChanged:false,speaker:null,phone:false,held:id==='m4-damaged'?'leakbox':id==='m4-address'?'box':null,isolated:false,exposed:false,flooded:false,lightning:id==='m4-storm',rain:id==='m4-storm',target:{x:0,y:0,z:0,kind:null},isolationSolid:{x:10000,z:10000,w:.55,d:.45},addresses:two?[{site:'house',number:id==='m4-address'?'412':'214',street:id==='m4-address'?'Maple Avenue':'Birch Court',mailbox:id==='m4-address'?null:'KOWALSKI'},{site:'other',number:id==='m4-address'?'421':'214',street:id==='m4-address'?'Maple Court':'Birch Lane',mailbox:id==='m4-address'?'RIVERA':'BROOKS'}]:[]};
    // Behind the rear doors and clear of the van's cargo footprint and walking exit.
    s.isolation={x:3.6,z:-37.5};this.target(s);return s;
  },
  siteFor(s,talk){
    const id=talk.nodeId,n=talk.presentation;
    if(s.id==='m4-address'){if(id==='n3_dispatch')return 'cab';if(n.setting?.number==='421')return 'other';}
    if(s.id==='m4-recover'){if(id==='n1')return 'house';if(id==='n3')return 'cargo';if(id==='n4')return 'other';if(id==='n7')return 'cab';}
    if(s.id==='m4-damaged'&&id==='n2')return 'house';
    if(s.id==='m4-storm'){if(talk.flags.flooded)return 'safe';if(id==='n4')return 'cab';if(id==='n5')return 'gate';if(id==='n6'||id==='n3')return 'cab';}
    return s.site;
  },
  apply(s,talk){
    if(s.stamp===talk.entries)return false;
    const before=s.site,n=talk.presentation;if(!n)return false;s.stamp=talk.entries;s.node=talk.nodeId;s.site=this.siteFor(s,talk);s.routeChanged=s.site!==before;s.speaker=n.speaker||null;
    if(n.hide)for(const a of s.actors)if(n.hide===true||n.hide===a.key)a.visible=false;
    if(n.show)for(const a of s.actors)if(a.key===n.show)a.visible=!a.remote;
    s.phone=!!s.actors.find(a=>a.key===s.speaker&&a.remote);
    const hold=n.hold!==undefined?n.hold:talk.lastAct?.act==='hold'?talk.lastAct.arg:undefined;
    if(hold!==undefined){if(!hold&&s.held==='leakbox')s.isolated=true;s.held=hold;}
    if(s.id==='m4-recover'&&talk.nodeId==='n3')s.held='box';
    if(s.id==='m4-recover'&&talk.nodeId==='n7')s.held=null;
    if(s.id==='m4-address'&&talk.phase==='done')s.held=null;
    s.exposed=!!talk.flags.exposed;s.flooded=!!talk.flags.flooded;
    if(s.id==='m4-storm'&&talk.nodeId==='n5')s.lightning=false;
    this.target(s);return true;
  },
  target(s){
    const point=s.points[s.site],t=s.target;let actor=null;
    for(const a of s.actors){const visible=a.visible&&!a.remote&&a.site===s.site;a.solid.x=visible?a.x:10000;a.solid.z=visible?a.z:10000;if(visible&&(!actor||a.key===s.speaker))actor=a;}
    t.x=actor?actor.x:point.x;t.y=point.y;t.z=actor?actor.z:point.z;t.kind=actor?'person':point.kind;
    s.isolationSolid.x=s.isolated?s.isolation.x:10000;s.isolationSolid.z=s.isolated?s.isolation.z:10000;return t;
  },
  step(s,seconds){s.time+=Math.max(0,Math.min(.05,Number(seconds)||0));},
  solids(s){return [{x:12,z:-47,w:7,d:4},...(s.two?[{x:12,z:-33,w:7,d:4}]:[]),...(s.id==='m4-storm'?[{x:14,z:-43.2,w:2,d:.18},{x:14,z:-46.3,w:4,d:5.8},{x:s.points.safe.x,z:s.points.safe.z,w:.35,d:.3}]:[]),s.isolationSolid,...s.actors.filter(a=>!a.remote).map(a=>a.solid)];},
  destination(s){return s.site==='safe'?'Stay on high ground and use the phone to report the incident.':s.site==='cab'?'Continue from the parked van’s communication device.':s.site==='cargo'?'Continue at the parked van’s cargo doors.':s.site==='gate'?'Inspect the locked gate from the safe side.':s.site==='other'?'Walk along the sidewalk to the second address.':'Continue at the first address.';}
};
