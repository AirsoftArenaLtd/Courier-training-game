/* One reusable inspection canvas, reachable only beside the real part. No result feedback before sign-off. */
window.OTR=window.OTR||{};
OTR.fpPretripUI={
  note(m,it){
    const s=m.pretripLesson,bad=s.defects.has(it.id);
    if(it.needs==='lights')return OTR.fpPretrip.lampOn(m,it.id)?(bad?'The lamp does not illuminate.':'The lamp illuminates.'):'The lamp is switched off.';
    if(it.needs==='gauge')return s.tests[it.id]?`The gauge reads ${s.readings[it.id]}/32 inches.`:'The tread has not been measured.';
    if(it.needs==='press'&&!s.tests[it.id])return 'The mechanical test has not been performed.';
    if(it.kind==='horn')return bad?'The horn makes no sound.':'The horn sounds immediately.';
    if(it.kind==='pedal')return bad?'The pedal continues to sink under steady pressure.':'The pedal holds its position under steady pressure.';
    // These are observations, without the verdict, legal limit or lesson.
    return (bad?it.defect:it.ok).replace(/[.!?]$/,'')+'.';
  },
  inspect(scene,id,reopen=false){
    const m=scene.model,A=OTR.fpPretrip,s=m.pretripLesson,it=A.item(s,id);
    if(!it||!(reopen?A.canInspect(m,id):A.inspect(m,id)))return;
    const options=[],again=()=>this.inspect(scene,id,true),close=()=>scene.closePanel();
    if(it.needs==='gauge')options.push({label:s.tests[id]?'Measure the other half of the tread.':'Measure the tread.',action:()=>{A.measure(m,id,s.tests[id]?!s.halves[id]:false);again();}});
    if(it.needs==='press'&&!s.tests[id])options.push({label:it.kind==='pedal'?'Hold the service brake for three seconds.':'Test this part.',action:()=>{
      if(it.kind!=='pedal'){A.press(m,id);if(it.kind==='horn'&&!s.defects.has(id)){OTR.audio.play('horn');scene.workdaySound.note('The horn sounds.');}again();return;}
      scene.showPanel('The brake test is running.','Steady pressure is applied to the service brake.',[{label:'Release the brake.',action:close}],{accessibleText:true,diagram:true,back:close});const token=scene.panel.root;
      scene.time.delayedCall(3000,()=>{if(scene.panel?.root===token&&A.press(m,id,3))again();});
    }});
    if(A.canJudge(m,id))options.push({label:'Record this part as serviceable.',action:()=>{A.mark(m,id,'pass');close();}},{label:'Flag this part as defective.',action:()=>{A.mark(m,id,'flag');close();}});
    options.push({label:'Return to the van.',action:close});
    // Three choices per page leave the observation and translated labels at their requested text size.
    if(options.length>3){options.splice(1,0,{label:'Record the condition.',action:()=>this.verdict(scene,id)});options.splice(2,options.length-3);}
    scene.showPanel('Inspect this part.',it.name+'\n\n'+this.note(m,it),options,{accessibleText:true,diagram:true,back:close});
    this.picture(scene,it);
  },
  verdict(scene,id){
    const m=scene.model,A=OTR.fpPretrip,it=A.item(m.pretripLesson,id);if(!A.canJudge(m,id))return;
    const close=()=>scene.closePanel();scene.showPanel('Record this condition.',it.name+'\n\n'+this.note(m,it),[
      {label:'Record this part as serviceable.',action:()=>{A.mark(m,id,'pass');close();}},
      {label:'Flag this part as defective.',action:()=>{A.mark(m,id,'flag');close();}},
      {label:'Return to the inspection.',action:()=>this.inspect(scene,id,true)}
    ],{accessibleText:true,diagram:true,back:close});this.picture(scene,it);
  },
  picture(scene,it){
    const state=scene.model.pretripLesson,bad=state.defects.has(it.id),key='fp-pretrip-closeup',W=520,H=330;
    if(scene.textures.exists(key))scene.textures.remove(key);
    const texture=scene.textures.createCanvas(key,W,H),ctx=texture.getContext(),text=ctx.fillText,stroke=ctx.strokeText;
    ctx.fillStyle='#29333d';ctx.fillRect(0,0,W,H);
    // Reuse the existing geometric painters; all readings and descriptions are translated Phaser text beside it.
    ctx.fillText=ctx.strokeText=()=>{};
    try{OTR.truckArt['close_'+it.kind](ctx,W,H,{bad,seed:0,lights:OTR.fpPretrip.lampOn(scene.model,it.id),pressed:!!state.tests[it.id],gauged:false,variant:bad?it.tread?.variant:null,reading:state.readings[it.id]},OTR.scenery.rng(it.id));}
    finally{ctx.fillText=text;ctx.strokeText=stroke;}
    if(it.needs==='gauge'&&state.tests[it.id]){
      const x=state.halves[it.id]?450:120;
      ctx.strokeStyle='#BBC5CB';ctx.lineWidth=9;ctx.beginPath();ctx.moveTo(x,154);ctx.lineTo(x,232);ctx.stroke();
      ctx.fillStyle='#273A44';OTR.cv.rr(ctx,x-40,130,80,38,5);ctx.fill();ctx.strokeStyle='#9CAEB6';ctx.lineWidth=3;ctx.stroke();
      ctx.fillStyle='#D5DFDF';ctx.fillRect(x-26,140,52,8);ctx.fillStyle='#C97646';ctx.fillRect(x-24+Math.min(12,state.readings[it.id])*3.5,138,3,12);
    }
    texture.refresh();
    const image=scene.add.image(303,330,key);scene.panel.root.add(image);
    scene.panel.root.once('destroy',()=>{image.destroy();if(scene.textures.exists(key))scene.textures.remove(key);});
  },
  records(scene,index=0){
    const r=scene.scenarioSession,s=scene.model.pretripLesson,items=s.content.items;index=Math.max(0,Math.min(items.length-1,index));const it=items[index],options=[];
    const coach=OTR.fpScenario.coaching(r),verdict=s.marks[it.id],status=verdict==='pass'?'This part is recorded as serviceable.':verdict==='flag'?'This part is recorded as defective.':'This part has no recorded condition.';
    // The record contains decisions the trainee already made. No checklist of answers is exposed in assessments.
    if(coach&&index>0)options.push({label:'Review the previous part.',onPick:()=>this.records(scene,index-1)});
    if(coach&&index+1<items.length)options.push({label:'Review the next part.',onPick:()=>this.records(scene,index+1)});
    options.push({label:'Sign off the inspection.',onPick:()=>{
      if(OTR.fpPretrip.complete(scene.model)){scene.finishScenario();return;}
      scene.handheld.show({title:'The inspection is incomplete.',lines:['Every part needs a recorded condition before sign-off.'],options:[{label:'Return to the van.',onPick:()=>scene.handheld.close()}]});
    }});
    scene.handheld.show({title:'Review the inspection.',lines:coach?[it.name,status]:[r.definition.goal],options,back:()=>scene.handheld.close()});
  }
};
