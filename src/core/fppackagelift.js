/* Local lifting mechanics, in the original assessment's units. The 3D adapter maps metres onto this kernel. */
window.OTR=window.OTR||{};
OTR.fpPackageLift={
  create(content){return {content,index:-1,lift:null,phase:'brief',postureOn:false,health:100,score:0,qualities:[],mistakes:[],helper:false,strain:0,peakLoad:0,gripGap:0,gripSquat:0,gripStoop:0,result:null,
    pose:{x:640,dir:1,squat:0,stoop:0,hold:false,reach:0,twist:0,elevate:0},box:{mode:'static',x:0,bottom:600},held:{x:0,bottom:0},measure:{load:0,gap:0,needed:0,reachable:false}};},
  next(s){
    if(!['brief','verdict'].includes(s.phase)||s.result)return false;
    if(++s.index>=s.content.lifts.length){s.phase='done';return false;}
    const L=s.lift=s.content.lifts[s.index];s.helper=false;s.postureOn=false;s.phase='assess';Object.assign(s.pose,{x:L.high?640:560,dir:1,squat:0,stoop:0,hold:false,reach:0,twist:0,elevate:0});
    s.box={mode:'static',x:640+20+L.w/2,bottom:L.high?400:600};return true;
  },
  hurt(s,amount,mistake){if(amount>0)s.health=Math.max(0,s.health-amount);if(mistake&&!s.mistakes.includes(mistake))s.mistakes.push(mistake);},
  choose(s,index){
    if(s.phase!=='assess'||!Number.isInteger(index)||!s.lift.options[index])return false;
    const o=s.lift.options[index];s.qualities.push(o.grade==='good'?1:o.grade==='ok'?.6:.15);
    if(o.effect==='strain')this.hurt(s,Math.abs(o.health||15),o.mistake);
    const effect=o.effect==='strain'?o.then||'normal':o.effect;
    if(effect==='equipment'){this.finishLift(s);return true;}
    s.helper=effect==='helper';s.pose.elevate=effect==='stool'?60:0;s.phase='approach';s.postureOn=true;s.strain=0;s.peakLoad=0;s.gripGap=0;s.gripSquat=0;s.gripStoop=0;s.pose.reach=0;this.solve(s,0);return true;
  },
  heldBox(s){
    const P=s.pose,L=s.lift,h=s.held;h.x=P.x-P.dir*P.squat*26+P.dir*(20+L.w/2);h.bottom=600-P.elevate-124*(1-.48*P.squat)+22+P.squat*62+P.stoop*48;
    if(P.elevate===0)h.bottom=Math.min(h.bottom,600);if(P.hold&&h.x+L.w/2>180&&h.x-L.w/2<420)h.bottom=Math.min(h.bottom,582);return h;
  },
  overPallet(s){const h=this.heldBox(s),half=s.lift.w/2,slack=s.lift.w*.1;return h.x-half>=180-slack&&h.x+half<=420+slack;},
  solve(s,dt){
    const P=s.pose,L=s.lift,m=s.measure;let needed,gap,reachable;
    if(P.hold){needed=(s.gripStoop||0)*(s.gripSquat>.02?OTR.util.clamp01(P.squat/s.gripSquat):0);gap=0;reachable=true;}
    else{const b=s.box.mode==='held'?this.heldBox(s):s.box,hipY=600-P.elevate-124*(1-.48*P.squat);needed=(b.bottom-hipY-22-P.squat*62)/48;gap=Math.abs(b.x-(P.x+P.dir*(20+L.w/2)));reachable=needed<=1.02&&gap<52;if(gap>=52)needed=0;}
    if(!Number.isFinite(needed))needed=0;P.stoop=OTR.util.clamp(needed,0,1);P.reach=P.hold||gap>=52?0:OTR.util.clamp(gap/44,0,1);
    const lever=(P.hold?14+L.w*.12+(s.gripGap||0)*.6:22+gap*.9)+P.stoop*92,load=OTR.util.clamp01(L.weight*lever/2600/(s.helper?1.9:1));
    if(s.phase==='carry'||s.phase==='set'){
      s.peakLoad=Math.max(s.peakLoad,load);if(load>.5){s.strain+=(load-.5)*dt;s.health=Math.max(0,s.health-(load-.5)*26*dt);if(load>.8){if(P.stoop>.45)this.hurt(s,0,'stoop');if((s.gripGap||0)>20)this.hurt(s,0,'far');}}
    }
    m.load=load;m.gap=gap;m.needed=needed;m.reachable=reachable;return m;
  },
  advance(s,input={},seconds=0,active=true){
    if(!active||!s.postureOn)return false;const dt=Math.max(0,Math.min(.05,Number(seconds)||0)),P=s.pose,L=s.lift,speed=150*dt,bend=1.5*dt/(L.speed||1);
    if(input.left){P.x-=speed;if(s.phase!=='approach')P.dir=-1;}if(input.right){P.x+=speed;if(s.phase!=='approach')P.dir=1;}
    P.x=OTR.util.clamp(P.x,P.hold?160:420,900);if(input.down)P.squat=Math.min(1,P.squat+bend);if(input.up)P.squat=Math.max(0,P.squat-bend);
    this.solve(s,dt);
    if(s.phase==='approach')P.hold=false;
    else if(s.phase==='carry'){const dx=300-this.heldBox(s).x;if(this.overPallet(s)&&Math.abs(dx)<=40)s.phase='set';}
    else if(s.phase==='set'&&!this.overPallet(s))s.phase='carry';
    // The original stool lowers the courier to the floor over 450 ms after gripping.
    if(P.hold&&L.high&&P.elevate>0)P.elevate=Math.max(0,P.elevate-60*dt/.45);
    return true;
  },
  action(s){
    if(!s.postureOn)return false;const P=s.pose,L=s.lift;
    if(s.phase==='approach'){
      const m=this.solve(s,0);if(!m.reachable)return false;
      const b=s.box.mode==='held'?this.heldBox(s):s.box;s.gripGap=Math.abs(b.x-(P.x+P.dir*(20+L.w/2)));if(s.gripGap>20)this.hurt(s,0,'far');s.gripStoop=P.stoop;s.gripSquat=Math.max(P.squat,.02);P.hold=true;s.box={mode:'held'};s.phase='carry';if(P.stoop>.45)this.hurt(s,0,'stoop');return true;
    }
    if(s.phase!=='carry'&&s.phase!=='set')return false;
    const h=this.heldBox(s),x=h.x,bottom=h.bottom,gap=582-bottom,onPallet=this.overPallet(s);s.box={mode:'static',x,bottom};
    if(!onPallet){this.hurt(s,12,'twist');s.box.bottom=x>180&&x<420?582:600;this.finishPosture(s,.2);}
    else if(gap>26){this.hurt(s,0,'drop');s.box.bottom=582;this.finishPosture(s,.35);}
    else{s.box.bottom=582;this.finishPosture(s,(gap<=8?1:.85)*(s.gripGap>20?.6:1));}return true;
  },
  finishPosture(s,quality){
    if(!s.postureOn)return false;const strainQ=OTR.util.clamp01(1-s.strain/2.2);s.qualities.push(quality===undefined?strainQ:Math.min(quality,strainQ));s.postureOn=false;s.pose.hold=false;this.finishLift(s);return true;
  },
  finishLift(s){if(!['assess','carry','set'].includes(s.phase))return false;s.score+=Math.round(100+s.health);s.phase='verdict';s.postureOn=false;return true;},
  result(s){
    if(s.result)return s.result;if(s.phase!=='done')return null;
    const avg=s.qualities.length?s.qualities.reduce((a,b)=>a+b,0)/s.qualities.length:0,order=['climb','heavy','twist','overhead','drop','yank','awkward','jerk','stoop','far','brace'],rank=m=>order.includes(m)?order.indexOf(m):order.length;
    const lessons=s.mistakes.slice().sort((a,b)=>rank(a)-rank(b)).map(m=>s.content.lessons[m]).filter(Boolean);if(!lessons.length)lessons.push(s.content.lessons.perfect);
    s.result={score:s.score,ratios:{safety:s.health/100,efficiency:Math.pow(avg,1.6)},lessons,mistakes:s.mistakes.length,summary:`Your back health is ${Math.round(s.health)} out of 100. Your lifting technique is ${Math.round(avg*100)} percent.`,stats:{health:s.health,avg}};return s.result;
  }
};
