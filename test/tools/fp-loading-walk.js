/* Real-key cargo navigation. Frame batching must not turn a passed waypoint into an orbit. */
module.exports=({page,frames,ok})=>async(x,z,{stopOnPanel=false}={})=>{
 const held=new Set();let n=0,interrupted=false;
 const set=async(code,on)=>{if(on&&!held.has(code)){held.add(code);await page.keyboard.down(code);}else if(!on&&held.has(code)){held.delete(code);await page.keyboard.up(code);}};
 try{for(;n<3000;n++){
  const state=await page.evaluate(()=>{const s=OTR.game.scene.getScene('FirstPersonScenarioScene');return {player:s.model.player,controlsOpen:!!s.panel||!!s.handheld?.isOpen};});
  if(stopOnPanel&&state.controlsOpen){interrupted=true;break;}
  const p=state.player,dx=x-p.x,dz=z-p.z,distance=Math.hypot(dx,dz);
  // Observations can span several 5cm careful steps. Actual motor collision and
  // every subsequent physical ray remain required; no position or clock is set.
  if(distance<.12)break;
  // Walk forwards/backwards and strafe in the current view. Repeated 180-degree
  // turns at every cart/shelf waypoint waste time and can orbit a missed point.
  const sy=Math.sin(p.yaw),cy=Math.cos(p.yaw);let best=-Infinity,forward=0,right=0;
  for(const [f,r]of [[1,0],[-1,0],[0,1],[0,-1],[1,1],[1,-1],[-1,1],[-1,-1]]){
   const length=Math.hypot(f,r),wx=(sy*f+cy*r)/length,wz=(-cy*f+sy*r)/length;
   // Do not quantize a nearly straight route into a step away from its centre
   // line: a narrow rack entrance needs lateral correction before progressing.
   if(Math.abs(dx)>.03&&wx*dx<0||Math.abs(dz)>.03&&wz*dz<0)continue;
   const score=wx*dx+wz*dz;if(score>best){best=score;forward=f;right=r;}
  }
  await set('ShiftLeft',distance<.8);await set('KeyW',forward>0);await set('KeyS',forward<0);await set('KeyD',right>0);await set('KeyA',right<0);await frames(1);
 }}finally{for(const code of held)await page.keyboard.up(code);}
 ok(n<3000,'the physical walking route is clear '+JSON.stringify({goal:{x,z},player:n>=3000?await page.evaluate(()=>OTR.game.scene.getScene('FirstPersonScenarioScene').model.player):undefined}));await frames();return {interrupted};
};
