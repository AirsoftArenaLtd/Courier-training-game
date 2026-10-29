/* Static physical poses for original-budget measurements only. */
module.exports=name=>{
 const scene=OTR.game.scene.getScene('FirstPersonScenarioScene'),r=scene.scenarioSession,m=scene.model,a=m.iceFatigue,s=a.state;
 scene.closePanel(false);OTR.fpScenario.begin(r);m.paused=true;m.mode='cab';m.van.look=0;m.player.pitch=0;
 if(name==='fatiguepark'||name==='fatiguebreak')Object.assign(m.van,{x:a.park.x,z:a.park.z,yaw:Math.PI,speed:0,hand:true,gear:2});
 const poses={icenotice:{x:6.2,z:-37.1,yaw:0,pitch:.05},icerail:{x:6.3,z:-40.25,yaw:Math.atan2(1.4,-.6),pitch:Math.atan2(.67,Math.hypot(1.4,.6))},icegrit:{x:6.2,z:-41.35,yaw:Math.PI/2,pitch:.35}};
 if(poses[name]){m.mode='walk';Object.assign(m.player,poses[name]);}
 if(name==='fatiguewarning'){s.prompted=true;OTR.fpIceFatigueUI.tick(r,scene);}
 if(name==='fatiguebreak'){s.prompted=true;s.resting=true;OTR.fpIceFatigueUI.handheld(r,scene);}
 scene.sync();if(name==='icenotice'&&scene.art.pick()!=='wellness-road-notice'||name==='icerail'&&scene.art.pick()!=='wellness-handrail')throw Error('Static wellness target ray is blocked: '+name);
};
