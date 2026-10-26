/* Read-only physical staging for the original incident dialogue. Decisions remain in TalkController. */
window.OTR=window.OTR||{};
OTR.fpIncidentStage={
  create(id,content){
    if(id!=='m8-incident'||!content?.nodes||!content.cast?.ray||!content.cast?.neighbor)throw Error('Invalid incident stage');
    const points={damage:{x:1.1,y:.7,z:-37.85,kind:'damage'},driver:{x:4.8,y:1.05,z:-37.79,kind:'window'},witness:{x:10.8,y:1.2,z:-42.7,kind:'person'},cab:{x:1.35,y:1.85,z:-43.6,kind:'phone'}};
    const actors=Object.entries(content.cast).map(([key,person])=>{const site=key==='neighbor'?'witness':key==='dispatch'?'cab':'driver',p=points[site];return {key,person,site,remote:!!person.remote,visible:false,x:key==='ray'?6:p.x,z:key==='ray'?-36.9:p.z,solid:{x:10000,z:10000,w:.55,d:.45}};});
    const s={id,content,points,actors,site:'damage',stamp:-1,node:null,time:0,routeChanged:false,speaker:null,phone:false,secured:false,target:{x:0,y:0,z:0,kind:null},car:{x:3.2,z:-36.8,w:4.6,d:1.9}};
    this.target(s);return s;
  },
  siteFor(s,talk){
    const id=talk.nodeId;
    if(id==='n2_call'||id==='n6'||id==='n7'||id==='n7_text'||id==='n10'||id==='n10_cash'||talk.phase==='done')return 'cab';
    if(id==='n9')return 'witness';
    if(id==='n2'||id==='n3'||id==='n3b'||id==='n4'||id==='n5'||id==='n5_cash')return 'driver';
    return 'damage';
  },
  apply(s,talk){
    if(s.stamp===talk.entries||!talk.presentation)return false;
    const before=s.site,n=talk.presentation;s.stamp=talk.entries;s.node=talk.nodeId;s.site=this.siteFor(s,talk);s.routeChanged=s.site!==before;s.speaker=n.speaker||null;s.phone=s.site==='cab';
    if(n.hide)for(const a of s.actors)if(n.hide===true||n.hide===a.key)a.visible=false;
    if(n.show)for(const a of s.actors)if(n.show===a.key)a.visible=!a.remote;
    if(n.stage?.some(a=>a.hazards))s.secured=true;
    this.target(s);return true;
  },
  target(s){
    const p=s.points[s.site],t=s.target;let actor=null;
    for(const a of s.actors){a.solid.x=a.visible&&!a.remote?a.x:10000;a.solid.z=a.visible&&!a.remote?a.z:10000;if(a.visible&&!a.remote&&a.site===s.site)actor=a;}
    t.x=actor?actor.x:p.x;t.y=p.y;t.z=actor?actor.z:p.z;t.kind=actor?'person':p.kind;return t;
  },
  step(s,seconds){s.time+=Math.max(0,Math.min(.05,Number(seconds)||0));},
  solids(s){return [{x:s.car.x,z:s.car.z,w:s.car.w,d:s.car.d},{x:12,z:-47,w:7,d:4},...s.actors.filter(a=>!a.remote).map(a=>a.solid)];},
  destination(s){return s.site==='cab'?'Use the communication device in the parked cab to continue the incident report.':s.site==='witness'?'Speak with the witness beside the house.':s.site==='driver'?'Check on the person beside the damaged sedan.':'Inspect the damaged fender beside the rear of the van.';}
};
