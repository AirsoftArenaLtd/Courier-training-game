/* Quiet procedural workday audio. Shared audio owns the context, master volume and saved mute. */
window.OTR=window.OTR||{};
OTR.fpSound=class {
  constructor(scene){
    this.scene=scene;this.nodes=[];this.engine=null;this.rain=null;this.caption='';this.captionUntil=0;this.indicatorAt=-1000;this.dogAt=-2000;this.sirenAt=-1000;this.braking=false;this.disposed=false;
    this.onPause=()=>this.silence();this.onHide=()=>{if(document.hidden)this.silence();};this.onShutdown=()=>this.dispose();
    scene.events.once('shutdown',this.onShutdown);scene.events.on('pause',this.onPause);scene.events.on('sleep',this.onPause);window.addEventListener('blur',this.onPause);document.addEventListener('visibilitychange',this.onHide);
  }
  speaking(){return !!(OTR.a11y&&OTR.a11y.settings().narrate&&window.speechSynthesis&&window.speechSynthesis.speaking);}
  mix(){
    const a=OTR.audio;if(!a||!a.ctx||!a.master)return;
    const duck=this.speaking();if(this.appliedMaster!==a.master||this.duck!==duck||this.volume!==a.volume||this.muted!==a.muted){
      this.appliedMaster=a.master;this.duck=duck;this.volume=a.volume;this.muted=a.muted;a.master.gain.setTargetAtTime(duck||a.muted?0:a.volume,a.ctx.currentTime,.02);
    }
  }
  playable(){const a=OTR.audio;return !this.disposed&&!!(a&&a.ctx&&a.ctx.state==='running'&&!a.muted&&!this.speaking()&&!document.hidden);}
  voices(){
    if(this.engine||!this.playable())return;const a=OTR.audio,c=a.ctx;
    const voice=source=>{const filter=c.createBiquadFilter(),gain=c.createGain();gain.gain.value=0;source.connect(filter);filter.connect(gain);gain.connect(a.master);this.nodes.push(source,filter,gain);return {source,filter,gain,level:0,frequency:0};};
    const osc=c.createOscillator();osc.type='triangle';osc.frequency.value=45;this.engine=voice(osc);this.engine.filter.type='lowpass';this.engine.filter.frequency.value=240;
    const noise=c.createBufferSource();noise.buffer=a._noiseBuf;noise.loop=true;this.rain=voice(noise);this.rain.filter.type='highpass';this.rain.filter.frequency.value=1200;
    osc.start();noise.start();
  }
  level(voice,value){if(voice&&voice.level!==value){voice.level=value;voice.gain.gain.setTargetAtTime(value,OTR.audio.ctx.currentTime,.18);}}
  silence(){this.level(this.engine,0);this.level(this.rain,0);}
  note(text){this.caption=text;this.captionUntil=this.scene.time.now+1600;this.lastTick=-Infinity;}
  effect(kind,text){
    if(text)this.note(text);this.mix();if(!this.playable())return;const a=OTR.audio;
    if(kind==='door'){a.noise(.09,{freq:550,vol:.055});a.tone(115,.13,{type:'triangle',slideTo:65,vol:.045});}
    else if(kind==='cargo'){a.noise(.13,{freq:850,vol:.045});a.tone(165,.09,{slideTo:85,vol:.025});}
    else if(kind==='brake')a.play('brake');
    else if(kind==='indicator')a.tone(1000,.025,{type:'sine',vol:.035});
    else if(kind==='dog'){a.noise(.12,{freq:450,vol:.06});a.noise(.12,{freq:350,vol:.05,delay:.18});}
    else if(kind==='siren'){a.tone(650,.45,{type:'triangle',vol:.07,slideTo:1000});a.tone(1000,.45,{type:'triangle',vol:.07,slideTo:650,delay:.45});}
  }
  tick(time){
    this.mix();const s=this.scene,m=s.model,active=!!(m&&!m.paused&&!s.panel&&!s.external&&!s.transitioning&&!document.hidden&&m.phase!=='debrief');
    if(this.lastActive===active&&time-this.lastTick<100)return this.lastCaption||'';this.lastActive=active;this.lastTick=time;
    const driving=active&&m.mode==='cab',weather=active&&m.routeDay&&m.routeDay.weather,wet=weather==='rain'||weather==='storm',speed=driving?Math.abs(m.van.speed):0;
    if(active)this.voices();this.level(this.engine,driving?.025:0);this.level(this.rain,wet?.025:0);
    if(this.engine){
      const rpm=m&&m.motion&&m.motion.rpm,frequency=Math.round(45+(driving&&Number.isFinite(rpm)?Math.max(0,Math.min(3200,rpm-800))/50:Math.min(16,speed)*4));
      if(frequency!==this.engine.frequency){this.engine.frequency=frequency;this.engine.source.frequency.setTargetAtTime(frequency,OTR.audio.ctx.currentTime,.1);}
      const impact=driving&&m.cameraMotion&&Number.isFinite(m.cameraMotion.roadImpact)?m.cameraMotion.roadImpact:0,cutoff=Math.round(240+Math.max(0,Math.min(1,impact))*80);
      if(cutoff!==this.engine.cutoff){this.engine.cutoff=cutoff;this.engine.filter.frequency.setTargetAtTime(cutoff,OTR.audio.ctx.currentTime,.1);}
    }
    const brake=driving&&!!s.held.KeyS&&speed>1;if(brake&&!this.braking)this.effect('brake','The brakes are slowing the van.');this.braking=brake;
    const signal=driving&&m.signal;if(signal&&time-this.indicatorAt>=600){this.indicatorAt=time;this.effect('indicator');}
    if(active&&m.dogNearby&&time-this.dogAt>=1800){this.dogAt=time;this.effect('dog');}
    const sirenState=active&&m.driving&&m.driving.siren.state,siren=sirenState==='approaching'||sirenState==='passing';if(siren&&time-this.sirenAt>=1000){this.sirenAt=time;this.effect('siren');}
    const cues=[];if(driving)cues.push('The engine is running.');if(wet)cues.push('Rain is falling.');if(signal)cues.push(signal<0?'The left turn signal is on.':'The right turn signal is on.');if(active&&m.dogNearby)cues.push('A dog is barking nearby.');if(siren)cues.push('An emergency vehicle is approaching.');if(active&&time<this.captionUntil&&this.caption)cues.push(this.caption);
    return this.lastCaption=cues.join(' · ');
  }
  menu(){
    const s=this.scene,a=OTR.audio,change=value=>{a.setVolume(Math.round(value*100)/100);this.mix();if(OTR.save)OTR.save.setVolume(a.volume);this.menu();};
    s.showPanel('Sound settings',[`Sound effects volume is ${Math.round(a.volume*100)}%.`,a.muted?'Sound effects are muted.':'Sound effects are on.','Sounds pause for narration. Text cues remain visible when muted.'].join('\n'),[
      {label:'Make sound quieter',action:()=>change(a.volume-.1)},{label:'Make sound louder',action:()=>change(a.volume+.1)},
      {label:a.muted?'Turn sound effects on':'Mute sound effects',action:()=>{a.setMuted(!a.muted);this.mix();if(OTR.save)OTR.save.setMuted(a.muted);this.menu();}},
      {label:'Back',action:()=>s.showSettings()}
    ]);
  }
  dispose(){
    if(this.disposed)return;this.disposed=true;this.scene.events.off('pause',this.onPause);this.scene.events.off('sleep',this.onPause);this.scene.events.off('shutdown',this.onShutdown);window.removeEventListener('blur',this.onPause);document.removeEventListener('visibilitychange',this.onHide);
    for(const node of this.nodes){try{if(node.stop)node.stop();node.disconnect();}catch(_){/* A browser may already have stopped its context. */}}this.nodes.length=0;
    if(this.duck&&OTR.audio&&OTR.audio.ctx&&OTR.audio.master)OTR.audio.master.gain.setTargetAtTime(OTR.audio.muted?0:OTR.audio.volume,OTR.audio.ctx.currentTime,.02);
  }
};
