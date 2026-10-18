/* Bounded display state only. No mission state, scoring, checkpoint or shared setting writes. */
window.OTR=window.OTR||{};
OTR.fpHud={
  firstDay(m){return !m||m.kind!=='campaign'||!m.routePlan||m.routePlan.day===1;},
  alpha(state,key,text,now,sticky,reduced){
    if(state.key!==key){state.key=key;state.at=now;}
    if(!text)return 0;if(sticky)return 1;
    // Allow reading time for long translations; reduced motion changes opacity in one step.
    const until=state.at+Math.min(16000,Math.max(7000,text.length*55));
    return reduced?(now<until?1:0):Math.max(0,Math.min(1,(until-now)/900));
  },
  destination(m){
    if(m.kind==='parking')return 'Reverse into the marked bay.';
    if(m.kind==='practice')return 'This lesson takes place in the depot.';
    if(m.phase==='prepare')return 'Prepare the van before departure.';
    return m.phase==='return'?'Return to the depot.':`Drive to ${m.stop(m.activeStop).address}.`;
  },
  navigationAllowed(m){return !!m&&m.mode==='cab'&&m.van.gear!==-1&&(!m.workdayRules||m.workdayRules.satnav!=='off');},
  screenHint(m){return this.navigationAllowed(m)?this.destination(m):OTR.fpRear.hint(m);},
  alert(s){
    const m=s.model;if(!m)return '';
    if(m.mode==='cab'){
      if(m.kind==='parking'&&OTR.fpRear.requiresWalk(m)&&!OTR.fpRear.checked(m)&&!m.driving.reverseActive)return s.objectiveText();
      return OTR.fpDriving.hint(m)||OTR.fpDay.hint(m)||(!m.van.belt?'Fasten the seatbelt before moving.':'');
    }
    return OTR.fpDay.hint(m);
  },
  create(s){
    s.hud={prompt:{},caption:{},navAt:-1000};
    const large=OTR.fpAccess.settings().large;
    s.hint.setFontSize(large?22:18);s.soundCue.setFontSize(large?21:17);
    s.controls.setFontSize(large?22:18);s.help.setFontSize(large?22:18);
    s.hint.setOrigin(.5,1);s.controls.setOrigin(.5,1);s.help.setOrigin(.5,1);
    s.navRoot=s.add.container(0,0).setDepth(10).setVisible(false);
    s.navBack=s.add.rectangle(0,-8,290,100,0x10232E,.98).setOrigin(.5,0);s.navMap=s.add.graphics();
    s.navText=OTR.txt(s,0,0,'',OTR.fpAccess.settings().large?21:17,'#ffffff',{wrap:270,oy:0,align:'center'});
    s.navRoot.add([s.navBack,s.navMap,s.navText]);
  },
  navigation(s){
    if(s.time.now-s.hud.navAt<90)return;s.hud.navAt=s.time.now;
    const m=s.model,cab=s.art&&s.art.cab;
    const p=this.navigationAllowed(m)&&!s.panel&&!s.external&&!s.transitioning&&!(s.handheld&&s.handheld.isOpen)&&cab?s.art.labelPosition(cab.navigation):null;
    s.navRoot.setVisible(!!p);if(!p)return;
    const large=OTR.fpAccess.settings().large,w=large?310:290,text=this.destination(m);
    if(s.navText.text!==(OTR.i18n?OTR.i18n.t(text):text))s.navText.setText(text);
    if(s.hud.navWidth!==w){s.hud.navWidth=w;s.navText.setWordWrapWidth(w-24);}s.navText.setPosition(0,0);
    const mapHeight=m.town?66:0,h=s.navText.height+mapHeight+20;
    // A screen may leave the view as the trainee looks around; never pin it over a mirror.
    if(p.x-w/2<12||p.x+w/2>1268||p.y+h/2>700){s.navRoot.setVisible(false);return;}
    s.navRoot.setPosition(p.x,p.y-h/2);s.navBack.setDisplaySize(w,h);
    const g=s.navMap;g.clear();if(!m.town)return;
    const b=m.bounds,left=-w/2+12,top=s.navText.height+6,mw=w-24;
    const scale=Math.min(mw/(b.x1-b.x0),mapHeight/(b.z1-b.z0));
    const x=v=>(v-(b.x0+b.x1)/2)*scale,y=v=>top+mapHeight/2+(v-(b.z0+b.z1)/2)*scale;
    g.fillStyle(0x233E42).fillRect(left,top,mw,mapHeight);
    g.lineStyle(2,0x8799A3);for(const v of m.town.xs)g.lineBetween(x(v),y(b.z0),x(v),y(b.z1));for(const v of m.town.zs)g.lineBetween(x(b.x0),y(v),x(b.x1),y(v));
    if(m.roadworks){const r=m.roadworks;g.lineStyle(4,0xF5BD63).lineBetween(x(r.x-r.w/2),y(r.z),x(r.x+r.w/2),y(r.z));}
    g.lineStyle(2,0xffffff).strokeRect(x(4)-3,y(8)-3,6,6);
    for(const stop of m.stops){const tx=x(stop.park.x),ty=y(stop.park.z);g.fillStyle(stop.resolved?0x8799A3:0xF5BD63).fillCircle(tx,ty,2);if(stop.id===m.activeStop&&m.phase!=='return')g.lineStyle(2,0xF5BD63).strokeCircle(tx,ty,5);}
    const vx=x(m.van.x),vy=y(m.van.z),a=m.van.yaw,sn=Math.sin(a),cs=Math.cos(a);
    g.fillStyle(0xffffff).fillTriangle(vx+sn*6,vy-cs*6,vx-cs*4-sn*3,vy-sn*4+cs*3,vx+cs*4-sn*3,vy+sn*4+cs*3);
  },
  refresh(s,hint,blocked,device,aiming){
    const m=s.model,mode=m?m.mode:'walk',now=s.time.now,first=this.firstDay(m),reduced=OTR.fpAccess.reduced();
    const busy=!!s.panel||s.external||s.transitioning;
    s.title.setVisible(false);s.objective.setVisible(false);s.status.setVisible(false);
    const keys=first&&!busy&&!device;
    const c=s.hints||(s.hints={});
    if(c.mode!==mode||c.keys!==keys){
      c.mode=mode;c.keys=keys;
      const k=code=>OTR.fpAccess.key(code);
      const controls=mode==='cab'?`Use ${k('KeyW')}/${k('KeyS')} to accelerate or brake and ${k('KeyA')}/${k('KeyD')} to steer. Press ${k('KeyP')} to choose a cab control.`:`Use ${k('KeyW')}/${k('KeyA')}/${k('KeyS')}/${k('KeyD')} to move. Press ${k('KeyP')} to choose a target and ${k('KeyE')} to interact.`;
      s.setText('controls',keys?controls:'',1000);s.setText('help',keys?`Press ${k('Tab')} for the handheld or ${k('KeyH')} for Controls and guidance.`:'',1000);
    }
    s.help.setPosition(640,708).setVisible(keys);
    const controlsBottom=708-s.help.height-8;
    s.controls.setPosition(640,controlsBottom).setVisible(keys);
    const width=device?660:OTR.fpAccess.settings().large?760:620,center=device?390:640;
    s.setText('hint',blocked?'':hint,width);s.hint.setPosition(center,keys?controlsBottom-s.controls.height-14:690);
    const warning=!!(m&&mode==='cab'&&(OTR.fpDriving.hint(m)||OTR.fpDay.hint(m)))||!!(s.notice&&now<s.noticeUntil)||aiming;
    if(blocked)s.hud.prompt.key=null;
    const alpha=blocked?0:this.alpha(s.hud.prompt,(s.target||'')+'|'+hint,s.hint.text,now,warning,reduced);
    s.hint.setAlpha(alpha).setVisible(!blocked&&!!hint&&alpha>0);
    const h=s.hint.height+16,w=Math.min(width+24,s.hint.width+24);
    s.hintBack.setPosition(center,s.hint.y-s.hint.height/2).setDisplaySize(w,h).setAlpha(alpha*.9).setVisible(s.hint.visible);
    // Captions retain every audible cue. Routine light/time captions have the same reading-time fade.
    const alert=this.alert(s),saving=s.saved===false?'Saving is unavailable. Keep this window open.':'';
    let caption=s.soundCaption||'';if(saving)caption=saving+(caption?' · '+caption:'');if(alert)caption=alert+(caption?' · '+caption:'');
    s.setText('soundCue',busy?'':caption,device?650:700);s.soundCue.setPosition(24,18);
    const lightWarning=!!(m&&m.mode==='cab'&&!m.van.headlights&&s.art&&s.art.lighting&&['dusk','night'].includes(OTR.fpLighting.time(m)));
    const captionAlpha=this.alpha(s.hud.caption,caption,s.soundCue.text,now,!!alert||!!s.soundSource||lightWarning||s.saved===false,reduced);
    s.soundCue.setVisible(!busy&&!!caption&&captionAlpha>0).setAlpha(captionAlpha);
    s.headerBack.setPosition(12,10).setDisplaySize(Math.min(device?674:724,s.soundCue.width+24),s.soundCue.height+16).setAlpha(captionAlpha*.9).setVisible(s.soundCue.visible);
    if(s.view)s.view.mirror.top=24;
    s.reticle.setVisible(!blocked);s.mirrorLabel.setVisible(false);
  }
};
