/* Readable handheld records. Inspection still requires the real parked van and a visible target. */
window.OTR=window.OTR||{};
OTR.fpWalkaroundUI={
  show(scene,def){def.lines=(def.lines||[]).map(text=>({text,size:17}));return scene.handheld.show(def);},
  inspect(scene,zone){
    const seen=OTR.fpWalkaroundFlow.inspect(scene.model,zone);
    if(!seen){scene.message('Park safely, put down the package and move beside this area of the van. Close cargo before checking the rear.');return;}
    scene.checkpoint();this.describe(scene,zone,0);
  },
  describe(scene,zone,page=0){
    const m=scene.model,F=OTR.fpWalkaroundFlow,A=OTR.fpWalkaround,t=F.target(zone),phase=F.phase(m);
    if(!t||!phase||!F.canInspect(m,zone)){this.records(scene);return;}
    const i=A.zones.indexOf(zone),mask=phase==='pretrip'?m.walkaround.preSeen:m.walkaround.postSeen;
    if(!(mask&(1<<i))){this.records(scene,i);return;}
    const level=phase==='pretrip'?m.damage.baseline[i]:Math.max(m.damage.baseline[i],m.damage.added[i]);
    const options=A.descriptions.slice(page*2,page*2+2).map((label,n)=>({label,onPick:()=>{
      const result=F.record(m,zone,page*2+n);scene.checkpoint();
      if(!result){scene.message('Inspect this area beside the parked van before recording its condition.');scene.handheld.close();return;}
      this.show(scene,{title:'It is recorded.',lines:[t.name,A.descriptions[page*2+n]],options:[
        {label:'Review the walkaround.',onPick:()=>this.records(scene,i)},
        {label:'Put away the handheld.',onPick:()=>scene.handheld.close()}
      ],back:()=>this.records(scene,i)});
    }}));
    options.push({label:page?'See the first descriptions.':'See more descriptions.',onPick:()=>this.describe(scene,zone,1-page)});
    this.show(scene,{title:'Inspect the van.',lines:[t.name,A.descriptions[level]],options,back:()=>this.records(scene,i)});
  },
  records(scene,index=0){
    const m=scene.model,F=OTR.fpWalkaroundFlow,A=OTR.fpWalkaround,phase=F.phase(m);
    if(!phase){this.show(scene,{title:'Check the van.',lines:['Inspect before departure or after returning the van to the depot.'],options:[{label:'Back',onPick:()=>scene.handheld.home()}],back:()=>scene.handheld.home()});return;}
    index=Math.max(0,Math.min(6,index));const t=F.targets[index],level=(phase==='pretrip'?m.walkaround.pre:m.walkaround.post)[index],options=[];
    if(index>0)options.push({label:'See the previous area.',onPick:()=>this.records(scene,index-1)});
    if(index<6)options.push({label:'See the next area.',onPick:()=>this.records(scene,index+1)});
    options.push({label:'Put away the handheld.',onPick:()=>scene.handheld.close()},{label:'Back',onPick:()=>scene.handheld.home()});
    this.show(scene,{title:'Review the van.',lines:[t.name,level<0?'This area has no recorded condition.':A.descriptions[level]],options,back:()=>scene.handheld.home()});
  }
};
