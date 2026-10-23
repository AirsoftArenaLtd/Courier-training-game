/* The existing hazard-perception windows and score scale, with bounded scripted first-person road clips. */
window.OTR=window.OTR||{};
OTR.fpHazardLesson={
  create(content,reduced=false){
    return {content,index:0,time:0,flags:[],presses:0,results:[],recorded:false,ended:false,finished:false,reduced,
      clip:content.clips[0],cueZ:0,vanZ:14,vanSpeed:0,carX:4.4,carZ:0,carYaw:0,personX:6.6,personZ:0,personVisible:false,
      ballX:5.2,ballVisible:false,doorAngle:0,lamps:false,phone:false,revision:0};
  },
  reset(m,index){
    const s=m.hazardLesson;s.index=index;s.clip=s.content.clips[index];s.time=0;s.flags=[];s.presses=0;s.recorded=false;s.ended=false;s.revision++;
    s.cueZ=14-s.clip.mph*.44704*s.clip.at-18;m.van.look=0;m.player.pitch=0;this.pose(m);
  },
  pose(m){
    const s=m.hazardLesson,c=s.clip,t=s.time,age=t-c.at,speed=c.mph*.44704;
    // The ordinary clip van brakes automatically. Reduced motion keeps the cab fixed at the clue's
    // viewing position; actor movement and exactly the same response window remain observable.
    const brake=c.at+1.6,coast=Math.min(t,brake)*speed,braking=Math.min(Math.max(0,t-brake),speed/7),distance=coast+speed*braking-3.5*braking*braking;
    s.vanZ=s.reduced?s.cueZ+18:Math.max(s.cueZ+8,14-distance);s.vanSpeed=s.reduced?0:s.vanZ<=s.cueZ+8?0:Math.max(0,speed-7*Math.max(0,t-brake));
    const v=m.van;v.x=1.7;v.z=s.vanZ;v.yaw=0;v.speed=s.vanSpeed;v.steer=0;v.gear=1;v.hand=false;v.belt=true;
    s.carX=4.4;s.carZ=s.cueZ;s.carYaw=0;s.personX=6.6;s.personZ=s.cueZ;s.personVisible=false;s.ballVisible=false;s.doorAngle=0;s.lamps=age>=0&&(c.kind==='door'||c.kind==='reversing');s.phone=false;
    if(c.kind==='ball'){s.ballVisible=age>=0;s.ballX=3.4-Math.min(3.6,Math.max(0,age)*2.6);s.personVisible=age>=1.4;s.personX=6.6-Math.min(5,Math.max(0,age-1.4)*1.6);}
    if(c.kind==='reversing'){s.carYaw=-Math.PI/2;s.carX=8-Math.min(6.5,Math.max(0,age-1.5)*3);}
    if(c.kind==='phone'){s.personVisible=true;s.phone=age>=0;s.personZ=s.cueZ+Math.max(0,1.2-age)*1.2;s.personX=6.6-Math.min(5,Math.max(0,age-1.2)*1.5);}
    if(c.kind==='door')s.doorAngle=-Math.min(1.2,Math.max(0,age-1.3)*2.4);
    if(c.kind==='runner'){s.carYaw=Math.PI/2;s.carX=16-Math.min(22,Math.max(0,age+1)*4.7);}
  },
  advance(m,seconds){
    const s=m.hazardLesson;if(!s||s.ended||m.paused)return;
    const dt=Math.max(0,Math.min(.05,Number(seconds)||0));m.elapsed+=dt;s.time=Math.min(s.clip.at+s.content.window+2,s.time+dt);
    s.ended=s.time>=s.clip.at+s.content.window+2;this.pose(m);if(OTR.fp.suspension)OTR.fp.suspension(m,dt);
  },
  flag(run){
    const m=run.model,s=m.hazardLesson;if(run.phase!=='active'||m.paused||s.ended||s.finished)return false;
    s.presses++;if(s.flags.length<=s.content.maxFlags)s.flags.push(s.time);s.revision++;return true;
  },
  record(run){
    const s=run.model.hazardLesson;if(s.recorded)return s.results[s.results.length-1];
    // The original pure points method handles first valid press, inclusive bounds and spam invalidation.
    const p=HazardScene.prototype.points.call({content:s.content},s.flags,s.clip);
    const result={id:s.clip.id,pts:p.pts,flags:s.presses,tooMany:p.tooMany};s.results.push(result);s.recorded=true;
    run.log.check('safety',p.pts,5,`Spotted it: ${s.clip.title}`,{lesson:s.clip.why});return result;
  },
  next(run){
    const m=run.model,s=m.hazardLesson;if(!s.ended||!s.recorded||s.finished)return false;
    if(s.index+1<s.content.clips.length)this.reset(m,s.index+1);else s.finished=true;return true;
  },
  result(run){
    const s=run.model.hazardLesson;if(!s.recorded)this.record(run);
    // Unseen clips remain missed on expiry, with the same five-point maximum and lesson.
    while(s.results.length<s.content.clips.length){const c=s.content.clips[s.results.length];s.results.push({id:c.id,pts:0,flags:0,tooMany:false});run.log.check('safety',0,5,`Spotted it: ${c.title}`,{lesson:c.why});}
    s.finished=true;const total=s.results.reduce((n,r)=>n+r.pts,0),max=s.content.clips.length*5;
    return {score:total*100,ratios:{safety:total/max},log:run.log,lessons:[total>=max-2?s.content.lessons.perfect:s.content.lessons.late],
      summary:'Clips: '+s.results.map((r,i)=>`${i+1}: ${r.pts}/5`).join('  ·  ')};
  }
};
OTR.fpScenario.register('hazard-road-clips',{
  piece:'street',goal:'Watch each road scene and mark the moment a hazard begins to develop.',seconds:180,observation:true,
  brief(run){return [`The van drives automatically. Press ${OTR.fpAccess.key('Space')} or click when a hazard starts to develop. Earlier marks inside the response window earn more points. More than ${run.content.maxFlags} marks in one clip score zero. With reduced motion, the cab stays still while the road scene develops.`];},
  controls(run,scene){OTR.fpHazardLessonUI.controls(scene);},
  setup(run,m){
    m.hazardLesson=OTR.fpHazardLesson.create(run.content,!!OTR.fpAccess?.reduced());m.bounds.z0=-110;m.mode='cab';m.parcels=[];m.cargoOpen=false;m.secured=true;m.repaired=true;m.driving=null;m.phase='route';m.departed=true;m.crossing.x=1e6;
    m.step=(input,seconds)=>OTR.fpHazardLesson.advance(m,seconds);OTR.fpHazardLesson.reset(m,0);
  },
  key(run,scene,code){if(code==='Space'){if(OTR.fpHazardLesson.flag(run))OTR.audio.play('tick');return true;}if(code==='KeyJ'&&run.model.hazardLesson.clip.kind==='runner'){OTR.fpHazardLessonUI.sign(scene);return true;}return !['ArrowUp','ArrowDown','ArrowLeft','ArrowRight','Tab','KeyV'].includes(code);},
  interact(run){OTR.fpHazardLesson.flag(run);return true;},
  hint(run,id,key){const s=run.model.hazardLesson,k=OTR.fpAccess.key('Space'),stamp=s.index+'|'+s.presses+'|'+k;if(run.hazardHintStamp!==stamp){run.hazardHintStamp=stamp;run.hazardHint=`Clip ${s.index+1} of ${s.content.clips.length}. Press ${k} or click when a hazard starts to develop. You have made ${s.presses} marks.`;}return run.hazardHint;},
  update(run,scene){const s=run.model.hazardLesson;if(s.ended&&!scene.panel){if(!s.recorded)OTR.fpHazardLesson.record(run);OTR.fpHazardLessonUI.between(scene);}},
  handheld(run,scene){OTR.fpHazardLessonUI.controls(scene);},
  result(run){return OTR.fpHazardLesson.result(run);}
});
