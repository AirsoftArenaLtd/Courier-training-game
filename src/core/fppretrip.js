/* The pre-trip module keeps the existing content, test gates and scoring scale in a local session. */
window.OTR=window.OTR||{};
OTR.fpPretrip={
  locations:{
    tire_front:[-1.22,.42,-1.6,'driver'],tire_rear:[-1.22,.42,1.7,'driver'],leak:[-.6,.12,-2,'driver'],
    mirror_l:[-1.29,2.13,-2.95,'driver'],fuel_cap:[-1.17,1.05,.15,'driver'],
    tire_front_p:[1.22,.42,-1.6,'passenger'],steps:[1.18,.55,-1.8,'passenger'],door_latch:[1.17,1.55,-1.2,'passenger'],
    headlight_l:[-.68,1,-2.82,'front'],signal_r:[.8,1.25,-2.82,'front'],windshield:[0,2.4,-2.7,'front'],wipers:[.6,2.05,-2.72,'front'],
    taillight_l:[-.85,1.25,2.82,'rear'],rear_door:[0,1.8,2.82,'rear'],reflector_rear:[.8,.7,2.82,'rear'],
    horn:[0,-.34,-.75,'cab'],seatbelt:[.27,-.66,-.37,'cab'],brake_pedal:[-.12,-.85,-.95,'cab'],
    gauges:[0,-.235,-1.005,'cab'],extinguisher:[1.2,-.75,-.2,'cab'],triangles:[.85,-.75,.05,'cab']
  },
  create(content,random=Math.random){
    const pool=content.items.slice(),range=content.defects||{min:3,max:5},n=range.min+Math.floor(random()*(range.max-range.min+1));
    for(let i=pool.length-1;i>0;i--){const j=Math.floor(random()*(i+1));[pool[i],pool[j]]=[pool[j],pool[i]];}
    return {content,defects:new Set(pool.slice(0,n).map(it=>it.id)),marks:{},tests:{},readings:{},halves:{},visited:new Set(),locations:{},scored:false};
  },
  item(state,id){return state.content.items.find(it=>it.id===id);},
  lampOn(m,id){return id==='signal_r'?m.signal===1:!!m.van.headlights;},
  canInspect(m,id){
    const s=m.pretripLesson,it=s&&this.item(s,id),at=s&&(s.locations[id]||this.locations[id]);
    if(!it||!at||!m.parked()||m.heldId)return false;
    if(it.view==='cab')return m.mode==='cab';
    if(m.mode!=='walk')return false;
    const dx=m.player.x-m.van.x,dz=m.player.z-m.van.z,c=Math.cos(m.van.yaw),sin=Math.sin(m.van.yaw),x=c*dx+sin*dz,z=-sin*dx+c*dz;
    const outside=it.view==='driver'?x< -1.1:it.view==='passenger'?x>1.1:it.view==='front'?z< -2.7:z>2.7;
    return outside&&(x-at[0])**2+(z-at[2])**2<2.4**2;
  },
  inspect(m,id){if(!this.canInspect(m,id))return false;const s=m.pretripLesson;s.visited.add(id);if(this.item(s,id).needs==='press')delete s.tests[id];return true;},
  measure(m,id,outer=false){
    if(!this.canInspect(m,id))return null;
    const s=m.pretripLesson,it=this.item(s,id);if(it.needs!=='gauge'||!s.visited.has(id))return null;
    const t=it.tread||{},bad=s.defects.has(id),n=bad?(t.variant==='edge'?(outer?t.outer:t.inner):t.bad):(t.good||9);
    s.readings[id]=n;s.halves[id]=outer;s.tests[id]=true;return n;
  },
  press(m,id,heldSeconds=0){
    if(!this.canInspect(m,id))return false;
    const s=m.pretripLesson,it=this.item(s,id);if(it.needs!=='press'||!s.visited.has(id)||it.kind==='pedal'&&heldSeconds<3)return false;
    s.tests[id]=true;return true;
  },
  canJudge(m,id){
    const s=m.pretripLesson,it=s&&this.item(s,id);return !!it&&s.visited.has(id)&&this.canInspect(m,id)&&
      (it.needs==='lights'?this.lampOn(m,id):it.needs==='press'||it.needs==='gauge'?!!s.tests[id]:true);
  },
  mark(m,id,verdict){
    if(!['pass','flag'].includes(verdict)||!this.canJudge(m,id))return false;
    m.pretripLesson.marks[id]=verdict;return true;
  },
  complete(m){return m.pretripLesson.content.items.every(it=>!!m.pretripLesson.marks[it.id]);},
  result(run){
    const s=run.model.pretripLesson,C=s.content;
    if(!s.scored){
      const caught=C.items.filter(it=>s.defects.has(it.id)&&s.marks[it.id]==='flag'),missed=C.items.filter(it=>s.defects.has(it.id)&&s.marks[it.id]!=='flag'),falseFlags=C.items.filter(it=>!s.defects.has(it.id)&&s.marks[it.id]==='flag');
      run.log.check('safety',caught.length,s.defects.size,`Caught the defects (${caught.length} of ${s.defects.size})`,{lesson:missed.length?missed[0].lesson:null,critical:missed.length>0});
      if(falseFlags.length)run.log.penalty('safety',falseFlags.length,`Flagged ${falseFlags.length} good part${falseFlags.length===1?'':'s'}`,{lesson:C.lessons.falseFlag});
      const par=C.parTime||220,accuracy=s.defects.size+falseFlags.length?caught.length/(s.defects.size+falseFlags.length):1;
      const time=run.elapsed<=par?1:run.elapsed<=par*1.4?2/3:run.elapsed<=par*1.8?1/3:0;
      run.log.check('efficiency',Math.round(OTR.scoring.gateTime(time,accuracy)*3),3,`Walked it in good time (${Math.round(run.elapsed)}s, par ${par}s)`,
        {lesson:accuracy<1?'A quick walkaround only counts if it finds what is wrong. Look properly, then decide.':null});
      s.summary={caught:caught.length,missed:missed.map(it=>it.id),falseFlags:falseFlags.length};s.scored=true;
    }
    const a=s.summary;return {score:run.log.score(),ratios:run.log.ratios(run.scenario.categories),log:run.log,
      lessons:!a.missed.length&&!a.falseFlags?[C.lessons.perfect]:a.missed.length?[C.lessons.missed]:[],
      summary:`${a.caught} caught · ${a.missed.length} missed · ${a.falseFlags} wrongly flagged · ${Math.round(run.elapsed)}s`,
      headlineCap:a.falseFlags?'GOOD EFFORT':undefined,stats:{missed:a.missed}};
  }
};
OTR.fpScenario.register('pretrip-van',{
  piece:'depot',goal:'Inspect every part of the parked van and record its condition before signing off.',seconds:880,
  setup(run,m){m.pretripLesson=OTR.fpPretrip.create(run.content);m.parcels=[];m.cargoOpen=false;m.repaired=true;Object.assign(m.van,{gear:2,hand:true,headlights:false});Object.assign(m.player,{x:m.van.x-2.6,z:m.van.z-1.6,yaw:Math.PI/2});},
  interact(run,scene,id){
    if(id&&id.startsWith('pretrip-')){OTR.fpPretripUI.inspect(scene,id.slice(8));return true;}
    if(id==='tyres'){OTR.fpPretripUI.inspect(scene,'tire_front');return true;}
    if(id==='lights'){OTR.fpPretripUI.inspect(scene,'headlight_l');return true;}
    if(id==='cargo'&&run.model.mode==='walk'){OTR.fpPretripUI.inspect(scene,'rear_door');return true;}
    if(id==='secure')return true;
    if(id==='dispatch'){OTR.fpPretripUI.records(scene);return true;}return false;
  },
  hint(run,id,key){const it=id&&id.startsWith('pretrip-')&&OTR.fpPretrip.item(run.model.pretripLesson,id.slice(8));return it?`Inspect the ${it.name.toLowerCase()}. Press ${key} to interact.`:null;},
  handheld(run,scene){OTR.fpPretripUI.records(scene);},
  result(run){return OTR.fpPretrip.result(run);}
});
