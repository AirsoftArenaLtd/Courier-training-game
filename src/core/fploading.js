/* Loading action state. The original LoadingScene owns placement rules, checks and result scale. */
window.OTR=window.OTR||{};
OTR.fpLoading={
  create(id,content,categories){
    if(id!=='m6-load'||content?.mode!=='load'||!content.packages?.length||content.packages.length>24||new Set(content.packages.map(p=>p.id)).size!==content.packages.length||!categories?.length)throw Error('Invalid loading set');
    const P=LoadingScene.prototype,g=Object.getOwnPropertyDescriptor(P,'geom').get.call({}),slots=[],width=(g.x1-g.x0)/g.cols.length;
    for(let ci=0;ci<g.cols.length;ci++){const col=g.cols[ci];for(const row of g.rows)for(let k=0;k<2;k++)slots.push({id:`${col.id}-${row.id}-${k}`,col:col.id,row:row.id,x:g.x0+ci*width+10+k*width/2,y:row.y,w:width/2-16,h:row.h,min:col.min,max:col.max,maxWeight:row.maxWeight,level:row.id,pkg:null});}
    for(let k=0;k<2;k++)slots.push({id:`floor-${k}`,col:'floor',row:'floor',x:g.x0+20+k*240,y:g.floorY,w:220,h:g.floorH,maxWeight:999,level:'floor',pkg:null});
    slots.push({id:'haz',col:'haz',row:'floor',x:g.x0+520,y:g.floorY,w:220,h:g.floorH,maxWeight:999,level:'floor',hazmat:true,pkg:null});
    const pkgs=content.packages.map(p=>({...p})),s={id,content,mode:'load',cats:categories.slice(),pkgs,slots,cart:pkgs.slice(),held:null,phase:'brief',elapsed:0,strapped:false,finished:false,reporting:false,extraLessons:[],log:new OTR.ScoreLog(),result:null,report:null,version:0,sprites:{}};
    // The source place callback keeps its own bookkeeping. These are data-only image handles, never Phaser objects.
    for(const p of pkgs)s.sprites[p.id]={width:1,height:1,x:0,y:0,scale:1,setScale(k){this.scale=k;return this;},setPosition(x,y){this.x=x;this.y=y;return this;}};
    s.problemsFor=function(p,slot){return P.problemsFor.call(this,p,slot);};s.hideCard=()=>{};
    s.loadReport=function(right,total,high){this.reporting=true;this.running=false;this.report={right,total,high:high.map(p=>p.id)};this.phase='report';};
    s.finish=function(result){if(this.finished)return;this.finished=true;this.result=result;this.phase='done';};return s;
  },
  active(s){return s.phase==='active'&&!s.finished;},
  begin(s){if(s.phase!=='brief')return false;s.phase='active';s.running=true;s.version++;return true;},
  parcel(s,id){return s.pkgs.find(p=>p.id===id);},
  slot(s,id){return s.slots.find(p=>p.id===id);},
  problems(s,id,slotId){const p=this.parcel(s,id),slot=this.slot(s,slotId);return p&&slot?s.problemsFor(p,slot):null;},
  take(s,id){if(!this.active(s)||s.held||!this.parcel(s,id))return false;s.held=id;s.version++;return true;},
  place(s,slotId){
    const p=this.parcel(s,s.held),slot=this.slot(s,slotId);if(!this.active(s)||!p||!slot)return false;
    if(slot.pkg&&slot.pkg!==p){s.held=null;s.version++;return false;}
    const before=LoadingScene.prototype.floorState.call(s);LoadingScene.prototype.place.call(s,p,slot);s.held=null;
    if(s.strapped&&LoadingScene.prototype.floorState.call(s)!==before)s.strapped=false;s.version++;return true;
  },
  returnToCart(s){
    const p=this.parcel(s,s.held);if(!this.active(s)||!p)return false;const before=LoadingScene.prototype.floorState.call(s);
    if(p.slotRef){p.slotRef.pkg=null;p.slotRef=null;}if(!s.cart.includes(p))s.cart.push(p);s.held=null;
    if(s.strapped&&LoadingScene.prototype.floorState.call(s)!==before)s.strapped=false;s.version++;return true;
  },
  strap(s){if(!this.active(s)||s.held||s.cart.length||s.strapped)return false;s.strapped=true;s.version++;return true;},
  step(s,seconds,active=true){if(!active||!this.active(s))return false;s.elapsed+=Math.max(0,Math.min(.05,Number(seconds)||0));return true;},
  review(s){if(!this.active(s)||s.held||s.cart.length)return false;LoadingScene.prototype.finishLoad.call(s);s.version++;return true;},
  complete(s){if(s.phase!=='report')return false;LoadingScene.prototype.endScenario.call(s);s.version++;return true;},
  result(s){return s.phase==='done'?s.result:null;}
};
