/* Deterministic street-centre paths. Display and workday reporting are separate adapters. */
window.OTR=window.OTR||{};
OTR.fpNav={
  valid(m,p){
    if(!m||!m.town||!p||!Number.isFinite(p.x)||!Number.isFinite(p.z))return false;
    const b=m.bounds;if(p.x<b.x0||p.x>b.x1||p.z<b.z0||p.z>b.z1)return false;
    return OTR.fpRoute.onStreet(m,p.x,p.z)||(p.x>=1&&p.x<=8&&p.z>=-7&&p.z<=17);
  },
  allowed(m,a,b,oneway){
    const eps=.00001,r=m.roadworks;
    if(r&&Math.abs(a.x-b.x)<eps&&Math.abs(a.x-r.x)<eps){
      const clearance=r.d/2+2.7;
      if(Math.min(a.z,b.z)<r.z+clearance&&Math.max(a.z,b.z)>r.z-clearance)return false;
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
  }
};
