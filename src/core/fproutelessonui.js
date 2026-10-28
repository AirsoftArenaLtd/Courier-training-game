/* Vector map geometry is displayed on the mounted sat nav and its accessible reading panel; no raster text. */
window.OTR=window.OTR||{};
OTR.fpRouteLessonUI={
  brief(scene,index=0){
    if(!OTR.fpRouteLesson.available(scene.model)){scene.message('Park the van before using the sat nav.');return;}
    const s=scene.model.routeLesson,p=s.planner,T=OTR_DATA.town,clock=p.clock.bind(p);
    const pages=[`Route ${s.roundIndex+1} starts at ${clock(p.startMin)}.\n${p.round.brief}`,`The school zone is active between ${clock(s.content.schoolWindow[0])} and ${clock(s.content.schoolWindow[1])}. Driving through it adds ${s.content.schoolDelay} minutes.`];
    for(const c of p.round.closures||[]){const h=c[0]==='h',on=(h?T.streetsH:T.streetsV)[c[1]],cross=h?T.streetsV:T.streetsH;
      pages.push(`The road is closed on ${on} between ${cross[c[2]]} and ${cross[c[2]+1]}.`);
    }
    const choices=[];if(index+1<pages.length)choices.push({label:'Read the next dispatch note.',action:()=>this.brief(scene,index+1)});
    choices.push({label:'Sequence the stops.',action:()=>this.show(scene)},{label:'Return to the van.',action:()=>scene.closePanel()});
    scene.showPanel('Read the dispatch notes.',pages[index],choices,{accessibleText:true,diagram:true,back:()=>scene.closePanel()});this.display(scene);
  },
  show(scene,index=0){
    const m=scene.model,A=OTR.fpRouteLesson;if(!A.available(m)){scene.message('Park the van before using the sat nav.');return;}
    const s=m.routeLesson,p=s.planner;index=(index+p.stops.length)%p.stops.length;if(s.selected!==index+1){s.selected=index+1;s.revision++;}
    const stop=p.stops[index],pos=s.order.indexOf(stop.i),ev=A.plan(s),again=()=>this.show(scene,index);
    const obligation=stop.pickup?`Collect the pickup between ${p.clock(stop.ready)} and ${p.clock(stop.close)}.`:
      stop.by?`Deliver this parcel by ${p.clock(stop.by)}.`:'This parcel has no timed commitment.';
    const arrival=ev.arrive[stop.i]!==undefined?`The estimated arrival is ${p.clock(ev.arrive[stop.i])}.`:'This stop is not in the route.';
    scene.showPanel('Plan this route.',`Stop ${stop.i} is at ${stop.address}.\n${obligation}\n${arrival}`, [
      {label:pos<0?'Add this stop to the route.':'Remove this stop from the route.',action:()=>{A.toggle(m,stop.i);again();}},
      {label:'Read the next stop.',action:()=>this.show(scene,index+1)},
      {label:'Review the route.',action:()=>this.review(scene)}
    ],{accessibleText:true,diagram:true,back:()=>scene.closePanel()});this.display(scene);
  },
  review(scene){
    const m=scene.model,A=OTR.fpRouteLesson,s=m.routeLesson,p=s.planner,ev=A.plan(s),complete=A.canSubmit(m);
    const options=[];
    if(complete)options.push({label:'Accept this route.',action:()=>{if(!A.submit(scene.scenarioSession))return;if(s.finished)scene.finishScenario();else this.brief(scene);}});
    else options.push({label:'Continue sequencing the stops.',action:()=>this.show(scene)});
    options.push({label:'Clear the route.',action:()=>{A.clear(m);this.show(scene);}});
    options.push({label:'Read the dispatch notes.',action:()=>this.brief(scene)});
    let body=`Route ${s.roundIndex+1} contains ${s.order.length} of ${p.stops.length} stops.`;
    if(s.order.length)body+=`\nThe sequence is ${s.order.join(', ')}.`;
    if(complete)body+=`\nThe estimated return is ${p.clock(ev.finish)}.`;
    scene.showPanel('Review this route.',body,options,{accessibleText:true,diagram:true,back:()=>this.show(scene)});this.display(scene);
  },
  display(scene){
    const root=scene.panel.root,s=scene.model.routeLesson,g=scene.add.graphics();root.add(g);
    g.fillStyle(0x101D25,1).fillRoundedRect(32,88,548,544,16);g.lineStyle(3,0x647983).strokeRoundedRect(32,88,548,544,16);
    root.add(OTR.txt(scene,306,126,'The sat nav shows the route.',24,'#ffffff',{wrap:510}));
    this.map(g,s,{x:54,y:165,w:504,h:314});
    const size=OTR.fpAccess.settings().large?22:19;
    root.add(OTR.txt(scene,54,505,'The double ring marks the selected stop. The square marks the depot.',size,'#ffffff',{ox:0,oy:0,wrap:504}));
  },
  map(g,s,r){
    const p=s.planner,T=s.T,k=Math.min((r.w-20)/T.W,(r.h-20)/T.H),ox=r.x+(r.w-T.W*k)/2,oy=r.y+(r.h-T.H*k)/2;
    const x=v=>ox+v*k,y=v=>oy+v*k;
    g.fillStyle(0x1B3038).fillRect(r.x,r.y,r.w,r.h);
    g.lineStyle(4,0x657780);for(const v of T.vx)g.lineBetween(x(v),y(0),x(v),y(T.H));for(const v of T.hy)g.lineBetween(x(0),y(v),x(T.W),y(v));
    const z=OTR_DATA.town.schoolZone;if(z){g.lineStyle(7,0xBAA96A).lineBetween(x(T.vx[z.from]),y(T.hy[z.row]),x(T.vx[z.to]),y(T.hy[z.row]));}
    const ev=OTR.fpRouteLesson.plan(s);g.lineStyle(3,0x7BE6FA);for(const leg of ev.legs)for(let i=1;i<leg.path.length;i++){
      const a=p.nodes[leg.path[i-1]],b=p.nodes[leg.path[i]];g.lineBetween(x(a.x),y(a.y),x(b.x),y(b.y));
    }
    for(const c of p.round.closures||[]){const horiz=c[0]==='h',px=x(horiz?(T.vx[c[2]]+T.vx[c[2]+1])/2:T.vx[c[1]]),py=y(horiz?T.hy[c[1]]:(T.hy[c[2]]+T.hy[c[2]+1])/2);g.lineStyle(3,0xFFFFFF).lineBetween(px-4,py-4,px+4,py+4).lineBetween(px-4,py+4,px+4,py-4);}
    g.lineStyle(2,0xFFFFFF).strokeRect(x(T.depot.x)-4,y(T.depot.y)-4,8,8);
    for(const stop of p.stops){const px=x(stop.lot.x),py=y(stop.lot.curb.y),inRoute=s.order.includes(stop.i);g.lineStyle(2,0xFFFFFF);if(inRoute)g.fillStyle(0xFFFFFF).fillCircle(px,py,3);else g.strokeCircle(px,py,3);if(stop.i===s.selected)g.strokeCircle(px,py,6).strokeCircle(px,py,9);}
  }
};
