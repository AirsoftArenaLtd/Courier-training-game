/* Deterministic street-centre paths. Display and workday reporting are separate adapters. */
window.OTR=window.OTR||{};
OTR.fpNav={
  prepare(plan){const out=OTR.fpMission.clone(plan);out.navigation=1;return out;},
  enabled(m){return !!(m&&m.kind==='campaign'&&m.town&&m.routePlan.navigation===1);},
  aid(m){return m.workdayRules&&m.workdayRules.satnav||'full';},
  destination(m){return OTR.fpRadio&&OTR.fpRadio.destination(m)||(m.phase==='return'?{x:2.84,z:8}:m.stop(m.activeStop).park);},
  context(m){return OTR.fpRadio&&OTR.fpRadio.destination(m)?'radio':m.phase==='return'?'return':String(m.activeStop);},
  configure(m){if(this.enabled(m))m.navigation={context:this.context(m),aid:this.aid(m),tickAt:-1,reversing:false,origin:{x:m.van.x,z:m.van.z},progress:0,pending:null};},
  validState(m,n,raw){
    const point=p=>p&&Number.isFinite(p.x)&&Number.isFinite(p.z)&&p.x>=m.bounds.x0&&p.x<=m.bounds.x1&&p.z>=m.bounds.z0&&p.z<=m.bounds.z1;
    if(!n||typeof n.reversing!=='boolean'||!Number.isFinite(n.tickAt)||n.tickAt< -1||n.tickAt>raw.elapsed||!['full','line','off'].includes(n.aid)||!['return',...(m.routePlan.radio===1&&m.routePlan.day%2===1?['radio']:[]),...m.stops.map(s=>String(s.id))].includes(n.context)||!point(n.origin)||!Number.isFinite(n.progress)||n.progress<0||n.progress>2000)return false;
    const p=n.pending;if(p===null)return true;
    return !!p&&Number.isSafeInteger(p.leg)&&p.leg>=0&&p.leg<=raw.leg&&Number.isFinite(p.at)&&p.at>=0&&p.at<=raw.elapsed&&
      (p.stop===null||Number.isSafeInteger(p.stop)&&p.stop>=1&&p.stop<=m.stops.length)&&point(p.where)&&Number.isFinite(p.where.mph)&&p.where.mph>=0&&p.where.mph<200;
  },
  // Both obstacles replace existing decorative car placements. They add no model or pass.
  obstacles(m){
    if(!this.enabled(m)||m.routePlan.day<4)return [];
    if(!this.obstacleCache)this.obstacleCache=new WeakMap();if(this.obstacleCache.has(m))return this.obstacleCache.get(m);
    const t=m.town,half=t.road/2,out=[],s=m.stops.find((s,i)=>!m.routePlan.route[i].stop.dog&&Math.abs(s.x-s.side*3.2-s.park.x)>2.1);
    // The van still parks at the public curb. The private approach is walkable around the car.
    if(s){const x=s.x-s.side*3.2;out.push({id:'blocked-drive',stop:s.id,x,z:s.z,w:1.7,d:3.8,h:1.35,driveway:true});}
    outer:for(const cx of t.xs.slice(1))for(let i=1;i<t.zs.length;i++){
      const z=(t.zs[i-1]+t.zs[i])/2;
      if(m.roadworks&&Math.abs(cx-m.roadworks.x)<1&&Math.abs(z-m.roadworks.z)<10)continue;
      if(m.stops.some(s=>Math.abs(s.park.x-cx)<half+4&&Math.abs(s.park.z-z)<12))continue;
      out.push({id:'double-parked',roadX:cx,x:cx+.65,z,w:1.8,d:3.8,h:1.35});break outer;
    }
    this.obstacleCache.set(m,out);return out;
  },
  layout(m){if(this.enabled(m))m.solids.push(...this.obstacles(m));},
  valid(m,p){
    if(!m||!m.town||!p||!Number.isFinite(p.x)||!Number.isFinite(p.z))return false;
    const b=m.bounds;if(p.x<b.x0||p.x>b.x1||p.z<b.z0||p.z>b.z1)return false;
    return OTR.fpRoute.onStreet(m,p.x,p.z)||(p.x>=1&&p.x<=8&&p.z>=-7&&p.z<=17);
  },
  allowed(m,a,b,oneway){
    const eps=.00001;
    if(m.routePlan.damage===1&&OTR.fpDamageFlow)for(const r of OTR.fpDamageFlow.clearances(m)){
      if(Math.abs(a.x-b.x)<eps&&Math.abs(a.x-r.x)<eps&&Math.min(a.z,b.z)<r.z+3&&Math.max(a.z,b.z)>r.z-3)return false;
    }
    for(const r of [m.roadworks,...this.obstacles(m).filter(o=>!o.driveway)].filter(Boolean)){
    if(r&&Math.abs(a.x-b.x)<eps&&Math.abs(a.x-(r.roadX===undefined?r.x:r.roadX))<eps){
      const clearance=r.d/2+2.7;
      if(Math.min(a.z,b.z)<r.z+clearance&&Math.max(a.z,b.z)>r.z-clearance)return false;
    }
    }
    if(oneway&&Math.abs(a.z-oneway.roadZ)<eps&&Math.abs(b.z-oneway.roadZ)<eps&&a.x>b.x){
      const half=m.town.road/2;
      if(Math.max(b.x,oneway.from+half)<Math.min(a.x,oneway.to-half)-eps)return false;
    }
    return true;
  },
  path(m,from,to){
    if(!this.valid(m,from)||!this.valid(m,to))return null;
    const nodes=[],edges=[],ids=new Map(),eps=.00001;
    const point=p=>{const key=p.x.toFixed(5)+':'+p.z.toFixed(5);if(ids.has(key))return ids.get(key);const id=nodes.length;ids.set(key,id);nodes.push({x:p.x,z:p.z});edges.push([]);return id;};
    for(const x of m.town.xs)for(const z of m.town.zs)point({x,z});
    const source=point(from),goal=point(to),snap=p=>{
      const x=m.town.xs.reduce((a,b)=>Math.abs(a-p.x)<=Math.abs(b-p.x)?a:b);
      const z=m.town.zs.reduce((a,b)=>Math.abs(a-p.z)<=Math.abs(b-p.z)?a:b);
      return point(Math.abs(x-p.x)<=Math.abs(z-p.z)?{x,z:p.z}:{x:p.x,z});
    },start=snap(from),end=snap(to);
    const oneway=OTR.fpSigns&&OTR.fpSigns.enabled(m)?OTR.fpSigns.runtime(m).oneway:null;
    const link=(a,b,connector=false)=>{
      if(a===b||!connector&&!this.allowed(m,nodes[a],nodes[b],oneway))return;
      edges[a].push({to:b,distance:Math.hypot(nodes[a].x-nodes[b].x,nodes[a].z-nodes[b].z)});
    };
    for(const x of m.town.xs){const line=nodes.map((p,i)=>({p,i})).filter(a=>Math.abs(a.p.x-x)<eps).sort((a,b)=>a.p.z-b.p.z);for(let i=1;i<line.length;i++){link(line[i-1].i,line[i].i);link(line[i].i,line[i-1].i);}}
    for(const z of m.town.zs){const line=nodes.map((p,i)=>({p,i})).filter(a=>Math.abs(a.p.z-z)<eps).sort((a,b)=>a.p.x-b.p.x);for(let i=1;i<line.length;i++){link(line[i-1].i,line[i].i);link(line[i].i,line[i-1].i);}}
    link(source,start,true);link(start,source,true);link(goal,end,true);link(end,goal,true);
    const distance=Array(nodes.length).fill(Infinity),previous=Array(nodes.length).fill(-1),visited=Array(nodes.length).fill(false);distance[source]=0;
    for(let step=0;step<nodes.length;step++){
      let at=-1;for(let i=0;i<nodes.length;i++)if(!visited[i]&&Number.isFinite(distance[i])&&(at<0||distance[i]<distance[at]))at=i;
      if(at<0||at===goal)break;visited[at]=true;
      for(const edge of edges[at]){const d=distance[at]+edge.distance;if(d<distance[edge.to]-eps){distance[edge.to]=d;previous[edge.to]=at;}}
    }
    if(!Number.isFinite(distance[goal]))return null;
    const points=[];for(let at=goal;at>=0;at=previous[at]){points.push({...nodes[at]});if(at===source)break;}
    points.reverse();return {points,distance:distance[goal]};
  },
  simplify(points){
    const out=[];for(const p of points){while(out.length>1){const a=out[out.length-2],b=out[out.length-1];if(Math.abs((b.x-a.x)*(p.z-b.z)-(b.z-a.z)*(p.x-b.x))>.001||(b.x-a.x)*(p.x-b.x)+(b.z-a.z)*(p.z-b.z)<0)break;out.pop();}out.push(p);}return out;
  },
  nearest(m,p){
    const x=m.town.xs.reduce((a,b)=>Math.abs(a-p.x)<=Math.abs(b-p.x)?a:b),z=m.town.zs.reduce((a,b)=>Math.abs(a-p.z)<=Math.abs(b-p.z)?a:b);
    const q=Math.abs(x-p.x)<=Math.abs(z-p.z)?{x,z:p.z}:{x:p.x,z};
    return {x:OTR.fp.clamp(q.x,m.bounds.x0,m.bounds.x1),z:OTR.fp.clamp(q.z,m.bounds.z0,m.bounds.z1)};
  },
  route(m){
    if(!m||!m.town||m.kind!=='campaign')return null;
    if(!this.routes)this.routes=new WeakMap();
    const n=m.navigation,origin=n?n.origin:m.van,key=this.context(m)+'|'+(n?origin.x+':'+origin.z:'legacy');
    let r=this.routes.get(m);if(!n&&r&&this.project(r,m.van).distance>m.town.road/2+5)r=null;
    if(!r||r.key!==key){
      const path=this.path(m,this.valid(m,origin)?origin:this.nearest(m,origin),this.destination(m));
      const points=path?this.simplify(path.points):[];
      if(points.length>2&&Math.hypot(points[1].x-points[0].x,points[1].z-points[0].z)<4.5)points.shift();
      const distance=points.reduce((n,p,i)=>i?n+Math.hypot(p.x-points[i-1].x,p.z-points[i-1].z):0,0);
      r={key,points,distance};this.routes.set(m,r);
    }return r;
  },
  project(route,p){
    let best={distance:Infinity,along:0,index:0,t:0},walked=0;
    for(let i=1;i<route.points.length;i++){
      const a=route.points[i-1],b=route.points[i],dx=b.x-a.x,dz=b.z-a.z,length=Math.hypot(dx,dz),t=length?OTR.fp.clamp(((p.x-a.x)*dx+(p.z-a.z)*dz)/(length*length),0,1):0;
      const distance=Math.hypot(p.x-a.x-dx*t,p.z-a.z-dz*t);
      if(distance<best.distance-.0001)best={distance,along:walked+t*length,index:i-1,t};walked+=length;
    }
    if(route.points.length===1)best={distance:Math.hypot(p.x-route.points[0].x,p.z-route.points[0].z),along:0,index:0,t:0};return best;
  },
  reroute(m){const n=m.navigation;n.origin={x:m.van.x,z:m.van.z};n.progress=0;this.routes&&this.routes.delete(m);m.touch();return this.route(m);},
  report(m){
    const p=m.navigation.pending;if(!p)return;const key='nav:'+p.leg;
    if(!m.events[key]){m.log(key,'driving','needs','Left the planned route without following the reroute in time.');
      if(OTR.workday)OTR.fpMission.emit(m,'drive.route',{key:p.leg,stop:p.stop===null?undefined:p.stop,ok:false,where:p.where});}
    m.navigation.pending=null;m.touch();
  },
  tick(m,old){
    if(!this.enabled(m)||m.paused)return;const n=m.navigation;if(!n)return;
    // The elapsed simulation clock persists through saves. Menus do not consume the grace period.
    const aid=this.aid(m);
    if(aid!==n.aid){const wasOff=n.aid==='off';n.aid=aid;if(wasOff)this.reroute(m);m.touch();}
    if(aid==='off'){if(n.pending){n.pending=null;m.touch();}return;}
    if(n.pending&&m.elapsed-n.pending.at>=30)this.report(m);
    if(m.mode!=='cab'||!m.departed||!['route','return'].includes(m.phase))return;
    if(m.elapsed-n.tickAt<.15&&n.context===this.context(m))return;n.tickAt=m.elapsed;
    if(n.context!==this.context(m)){n.context=this.context(m);this.reroute(m);}
    let r=this.route(m);
    if(m.van.gear===-1){n.reversing=true;return;}
    if(n.reversing){n.reversing=false;r=this.reroute(m);}
    let p=this.project(r,m.van);const moving=m.van.gear===1&&Math.abs(m.van.speed)>.3,arrived=Math.hypot(m.van.x-this.destination(m).x,m.van.z-this.destination(m).z)<9;
    if(n.pending&&arrived){n.pending=null;m.touch();}
    if(moving&&n.pending&&p.distance<3.5&&p.along>=Math.min(8,r.distance)&&p.along>n.progress+.001){n.pending=null;m.touch();}
    const missed=moving&&!arrived&&(p.distance>m.town.road/2+5||p.along<n.progress-12);
    if(missed){
      if(!n.pending&&!m.events['nav:'+m.leg])n.pending={at:m.elapsed,leg:m.leg,stop:m.phase==='route'?m.activeStop+1:null,where:{x:m.van.x,z:m.van.z,mph:Math.abs(m.van.speed)*2.2369362921}};
      r=this.reroute(m);p=this.project(r,m.van);
    }
    if(Number.isFinite(p.along)&&p.along>n.progress){n.progress=p.along;}
  },
  street(m,a,b){
    const c=OTR.fpSigns&&OTR.fpSigns.runtime(m).catalog;if(!c)return '';
    return (c.streets.find(s=>Math.abs(a.x-b.x)<.001?s.axis==='x'&&Math.abs(s.x-(a.x+m.town.road/2+.7))<.001:s.axis==='z'&&Math.abs(s.z-(a.z+m.town.road/2+.7))<.001)||{}).name||'';
  },
  instruction(m){
    if(this.aid(m)==='off')return 'The trainer has turned navigation off.';
    if(m.phase==='prepare')return 'Prepare the van before departure.';
    const warning=m.damage&&OTR.fpDamageFlow.warning(m);if(warning)return warning;
    const r=this.route(m);if(!r||!r.points.length)return 'Rejoin a public street when it is safe.';
    const checkin=OTR.fpRadio&&OTR.fpRadio.destination(m),destination=this.destination(m);
    if(Math.hypot(m.van.x-destination.x,m.van.z-destination.z)<9)return checkin?'You have reached the dispatch check-in. Park safely at the curb.':m.phase==='return'?'You have reached the depot. Park safely.':'You have reached the stop. Park safely at the curb.';
    const p=this.project(r,m.van),a=r.points[p.index],b=r.points[p.index+1];
    if(!b)return 'Continue safely to the destination.';
    const dx=b.x-a.x,dz=b.z-a.z,length=Math.hypot(dx,dz),direction=dx*Math.sin(m.van.yaw)-dz*Math.cos(m.van.yaw);
    if(length>4&&direction<-.45*length&&m.van.gear!==-1)return 'Turn around when it is safe and follow the route.';
    let i=p.index,distance=Math.max(0,length*(1-p.t));
    // Ignore the final lateral move from the road centre to the existing delivery curb.
    while(i+2<r.points.length){const u=r.points[i+1],v=r.points[i+2];if(Math.hypot(v.x-u.x,v.z-u.z)<4.5)break;
      const cross=(u.x-r.points[i].x)*(v.z-u.z)-(u.z-r.points[i].z)*(v.x-u.x),street=this.street(m,u,v),feet=Math.max(0,Math.round(distance*3.28084/10)*10);
      if(street&&Math.abs(cross)>.01)return cross>0?`In ${feet} feet, turn right onto ${street}.`:`In ${feet} feet, turn left onto ${street}.`;
      distance+=Math.hypot(v.x-u.x,v.z-u.z);i++;
    }
    const feet=Math.max(10,Math.round(Math.max(0,r.distance-p.along)*3.28084/10)*10);
    return checkin?`Continue for ${feet} feet to the dispatch check-in.`:m.phase==='return'?`Continue for ${feet} feet to the depot.`:`Continue for ${feet} feet to the stop.`;
  }

};
