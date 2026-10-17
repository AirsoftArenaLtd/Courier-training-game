/* Accessibility adapters for the owned 3D scene. Shared settings and remapping stay in OTR.a11y. */
window.OTR=window.OTR||{};
OTR.fpAccess={
  textResolution(scene){
    // The shared text helper requests 2x canvases. On Low, keep native-size glyphs at 1x backing resolution.
    if(!scene.fpTextFactory)scene.fpTextFactory=scene.add.text;
    scene.add.text=(x,y,text,style)=>scene.fpTextFactory.call(scene.add,x,y,text,Object.assign({},style,{resolution:OTR.gfx.high()?2:1}));
  },
  settings(){return OTR.a11y?OTR.a11y.settings():{};},
  reduced(){const a=this.settings();if(typeof a.reducedMotion==='boolean')return a.reducedMotion;if(!this.motionQuery&&window.matchMedia)this.motionQuery=window.matchMedia('(prefers-reduced-motion: reduce)');return !!(this.motionQuery&&this.motionQuery.matches);},
  key(code){return OTR.a11y?OTR.a11y.label(OTR.a11y.physical(code)):code;},
  lookKeys(){return ['ArrowLeft','ArrowRight','ArrowUp','ArrowDown'].map(code=>this.key(code)).join('/');},
  controls:[
    ['KeyW','Move forward or accelerate'],['KeyS','Move back or brake'],['KeyA','Move or steer left'],['KeyD','Move or steer right'],
    ['ArrowLeft','Look left'],['ArrowRight','Look right'],['ArrowUp','Look up'],['ArrowDown','Look down'],
    ['KeyE','Interact or exit the cab'],['KeyP','Select the next nearby target'],['KeyF','Inspect the parcel'],['Tab','Open or close the handheld'],
    ['Space','Scan or set the parking brake'],['ShiftLeft','Walk carefully'],['KeyM','Check the mirror'],['KeyG','Get out and look'],
    ['KeyL','Switch the headlights.'],['KeyK','Switch the wipers.'],['KeyB','Fasten the seatbelt'],['KeyR','Change gear'],['KeyQ','Signal left'],['KeyC','Signal right'],['KeyV','Look forward'],['KeyH','Open the menu']
  ],
  syncKeys(){
    // The shared screen knows the course controls. Give a displaced 3D-only control the freed key.
    if(!OTR.a11y)return;const keys=this.settings().keys,shared=OTR.a11y.ACTIONS.map(a=>a.code),codes=[...new Set([...shared,...this.controls.map(a=>a[0])])];
    const used=new Set(codes.filter(code=>keys[code]).map(code=>keys[code]));
    for(const code of codes)if(!keys[code]&&!used.has(code))used.add(code);
    let changed=false;for(const [code] of this.controls)if(!shared.includes(code)&&!keys[code]&&Object.values(keys).includes(code)){
      const free=codes.find(candidate=>!used.has(candidate));if(free){keys[code]=free;used.add(free);changed=true;}
    }if(changed)OTR.a11y.save();
  },
  look(scene,held,seconds){
    const m=scene.model,p=m?m.player:scene.hubMotion.player,dt=Math.max(0,Math.min(.05,seconds));
    const turn=Number(!!held.ArrowRight)-Number(!!held.ArrowLeft),tilt=Number(!!held.ArrowDown)-Number(!!held.ArrowUp);
    if(m&&m.mode==='cab')m.van.look=OTR.fp.clamp(m.van.look+turn*dt*1.6,-1.5,1.5);else p.yaw+=turn*dt*1.6;
    p.pitch=OTR.fp.clamp(p.pitch+tilt*dt*1.2,-1.05,1.05);
  },
  focus(scene){
    const m=scene.model,p=m?m.player:scene.hubMotion.player,cab=m&&m.mode==='cab';if(m&&m.mode!=='walk'&&!cab)return;
    const ids=[],objects=[],point=new THREE.Vector3(),eye=scene.view.camera.position;
    for(const o of scene.art.interactions){let visible=true;for(let parent=o;parent;parent=parent.parent)if(!parent.visible){visible=false;break;}
      const id=o.userData.interaction;if(!visible||!id)continue;o.getWorldPosition(point);
      if(eye.distanceTo(point)>2.65)continue;if(!ids.includes(id))ids.push(id);objects.push(o);
    }
    const start=ids.indexOf(scene.target),yaw=cab?m.van.look:p.yaw,pitch=p.pitch;
    for(let n=1;n<=ids.length;n++){
      const i=(start+n)%ids.length;for(const object of objects){if(object.userData.interaction!==ids[i])continue;object.getWorldPosition(point);
      const heading=Math.atan2(point.x-eye.x,-(point.z-eye.z));if(cab)m.van.look=OTR.fp.clamp(Math.atan2(Math.sin(heading-m.van.yaw),Math.cos(heading-m.van.yaw)),-1.5,1.5);else p.yaw=heading;p.pitch=OTR.fp.clamp(Math.atan2(eye.y-point.y,Math.hypot(point.x-eye.x,point.z-eye.z)),-1.05,1.05);
      scene.sync();if(scene.art.pick()===ids[i]){scene.target=ids[i];scene.lastAim=-1000;scene.message(cab?OTR.fpCab.hint(ids[i],m,this.key('KeyE')):`Selected ${this.targetName(scene,ids[i])}. Press ${this.key('KeyE')} to interact.`);return ids[i];}}
    }
    if(cab)m.van.look=yaw;else p.yaw=yaw;p.pitch=pitch;scene.sync();scene.message('No nearby target is visible. Move closer or use the arrow keys to look.');return null;
  },
  targetName(scene,id){
    const m=scene.model;if(id.startsWith('parcel')){const p=m&&m.parcel(id);return p?p.address:'the parcel';}
    if(id.startsWith('door'))return m.stop(id.slice(4)).address;
    if(id.startsWith('slot'))return OTR.fpMission.slots.find(s=>s.id===id).name;
    return {driver:'the cab',cargo:'the cargo doors',secure:'the load restraint',tyres:'the tires',lights:'the lights',dispatch:'Dispatch',returns:'Returns','hub-day':'the workday station','hub-practice':'the cargo practice station','hub-record':'the debrief station'}[id]||(id.startsWith('gate')?'the dog gate':id.startsWith('hazard')?'the path hazard':id);
  },
  menu(scene){
    const a=this.settings(),toggle=(key,after)=>{a[key]=key==='reducedMotion'?!this.reduced():!a[key];if(OTR.a11y)OTR.a11y.save();if(after)after();this.menu(scene);};
    scene.showPanel('3D accessibility',`Use ${this.lookKeys()} to look and the movement keys to walk or drive. Every choice also accepts its number key. Enter confirms the selected choice.`,[
      {label:this.reduced()?'Turn reduced motion off':'Turn reduced motion on',action:()=>toggle('reducedMotion')},
      {label:a.colour?'Turn the color-blind filter off':'Turn the color-blind filter on',action:()=>toggle('colour',()=>OTR.a11y.applyColour(scene))},
      {label:a.narrate?'Turn narration off':'Turn narration on',action:()=>toggle('narrate')},
      {label:a.large?'Use normal text':'Use larger text',action:()=>{a.large=!a.large;OTR.a11y.save();scene.checkpoint();scene.scene.restart(scene.hubWorkday?{workday:{resume:true}}:undefined);}},
      {label:'3D controls',action:()=>this.keys(scene,0)},
      {label:'Back',action:()=>scene.showSettings()}
    ]);
  },
  keys(scene,page){
    const list=this.controls.slice(page*4,page*4+4);
    scene.showPanel('3D controls',`The controls use the same saved key map as Settings and Accessibility. Press ${this.key('KeyP')} to select a visible nearby target without the mouse.`,[
      ...list.map(([code,label])=>({label:`${this.key(code)}: ${label}`,action:()=>this.rebind(scene,code,label,page)})),
      {label:'Next page',action:()=>this.keys(scene,(page+1)%Math.ceil(this.controls.length/4))},
      {label:'Back',action:()=>this.menu(scene)}
    ]);
  },
  rebind(scene,code,label,page){
    scene.showPanel('Change a 3D control',`Press the new key for ${label}. Escape cancels.`,[{label:'Cancel',action:()=>{cleanup();this.keys(scene,page);}}]);
    OTR.a11y.capturing=true;
    const cleanup=()=>{window.removeEventListener('keydown',onKey,true);OTR.a11y.capturing=false;};
    const onKey=e=>{e.preventDefault();e.stopImmediatePropagation();cleanup();if(e.code!=='Escape'&&e.code!=='Enter'){
      const keys=this.settings().keys,old=OTR.a11y.physical(code),codes=new Set([...OTR.a11y.ACTIONS.map(a=>a.code),...this.controls.map(a=>a[0])]);
      for(const other of codes)if(other!==code&&OTR.a11y.physical(other)===e.code)keys[other]=old;
      keys[code]=e.code;for(const key of Object.keys(keys))if(keys[key]===key)delete keys[key];OTR.a11y.save();scene.hints=null;
    }this.keys(scene,page);};
    window.addEventListener('keydown',onKey,true);scene.events.once('shutdown',cleanup);
  },
  layoutDevice(hh){
    const d=hh.device;if(!d.optionBtns||!d.screen)return;const t=s=>OTR.i18n?OTR.i18n.t(s):s,opts=d.current.options||[];
    let footerSpace=30;const footer=d.current.footer&&d.screen.list.find(o=>o.type==='Text'&&o.x===d.sx+14&&o.y===d.sy+d.sh-16);
    if(footer){footer.setWordWrapWidth(d.sw-28,true).setOrigin(0,1).setY(d.sy+d.sh-8);footerSpace=Math.max(30,footer.height+16);}
    let total=0;for(let i=0;i<d.optionBtns.length;i++){
      const b=d.optionBtns[i];b.label.setText(`${i+1}  ${t(opts[i].label)}`).setScale(1);
      const h=Math.max(46,b.label.height+10);b.bg.setScale(1,h/b.bg.input.hitArea.height);b.setSize(d.sw-20,h);b._fpHeight=h;total+=h+6;
    }
    let y=d.sy+d.sh-footerSpace-total;for(const b of d.optionBtns){b.setY(y+b._fpHeight/2);y+=b._fpHeight+6;}
    if(this.reduced()){hh.scene.tweens.killTweensOf(d.root);d.root.setY(d.Yopen);}
    hh.index=0;this.deviceFocus(hh,false);
  },
  deviceFocus(hh,speak=true){
    const d=hh.device,opts=d.current&&d.current.options||[];if(!opts.length)return;
    hh.index=((hh.index||0)%opts.length+opts.length)%opts.length;
    if(d.screen&&d.optionBtns){if(hh.focusRing&&hh.focusRing.active)hh.focusRing.destroy();const b=d.optionBtns[hh.index];
      hh.focusRing=hh.scene.add.graphics();d.screen.add(hh.focusRing);hh.focusRing.lineStyle(3,0x193B5A,1);hh.focusRing.strokeRoundedRect(b.x-d.sw/2+12,b.y-b._fpHeight/2+2,d.sw-24,b._fpHeight-4,8);
    }
    if(speak&&OTR.a11y)OTR.a11y.say(opts[hh.index].label);
  }
};
