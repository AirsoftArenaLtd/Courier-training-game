/* Clip instructions and transitions retain keyboard access, narration and assessment answer suppression. */
window.OTR=window.OTR||{};
OTR.fpHazardLessonUI={
  sign(scene){scene.showPanel('Read the road sign.','Stop fully before entering the junction.',[{label:'Return to the road scene.',action:()=>scene.closePanel()}],{accessibleText:true,back:()=>scene.closePanel()});},
  between(scene){
    const r=scene.scenarioSession,s=scene.model.hazardLesson,coach=OTR.fpScenario.coaching(r),last=s.index+1===s.content.clips.length;
    const result=s.results[s.results.length-1],body=coach?`You scored ${result.pts} of 5 points.\n\n${s.clip.why}`:'This road scene has ended. Your response has been recorded.';
    scene.showPanel('This clip is complete.',body,[{label:last?'See the results.':'Watch the next clip.',action:()=>{
      if(!OTR.fpHazardLesson.next(r))return;if(s.finished)scene.finishScenario();else{scene.closePanel();scene.sync();scene.refresh();}
    }}],{accessibleText:true,back:()=>scene.showPause()});
  },
  controls(scene){
    const key=OTR.fpAccess.key('Space');scene.showPanel('Watch for the developing hazard.',`The van drives automatically. Press ${key} or click when a hazard begins to develop.\n\nWith reduced motion, the cab stays still while the road scene develops.`,[
      {label:'Continue watching the clip.',action:()=>scene.closePanel()}
    ],{accessibleText:true,back:()=>scene.closePanel()});
  }
};
