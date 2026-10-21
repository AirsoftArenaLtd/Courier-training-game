/* Detached memory replay. No live driving, reports, checkpoints, course records or saved settings. */
class FPReplayScene extends Phaser.Scene{
  constructor(){super('FPReplayScene');}
  create(data){
    this.d=data||{};this.loading=true;this.leaving=false;this.view=this.art=this.assetBank=this.model=null;this.focusIndex=-1;this.lastSpoken=null;this.lastReadout='';this.refreshAt=-Infinity;
    this.clip=OTR.fpReplayUI.clip;const abort=this.abort=new AbortController();
    this.releasedUI=OTR.fpReplayUI.releasePreviousUI(this);OTR.fpAccess.textResolution(this);if(OTR.a11y)OTR.a11y.applyColour(this);
    this.events.once('shutdown',()=>{this.abort.abort();document.removeEventListener('visibilitychange',this.onHidden);window.removeEventListener('blur',this.onHidden);if(this.art)this.art.dispose();if(this.view)this.view.dispose();if(this.assetBank)this.assetBank.dispose();if(OTR.a11y)OTR.a11y.hush();if(this.onKey)this.input.keyboard.off('keydown',this.onKey);});
    this.onHidden=()=>{if(this.player){this.player.pause();this.readout(true);}};document.addEventListener('visibilitychange',this.onHidden);window.addEventListener('blur',this.onHidden);
    this.header=this.add.rectangle(0,0,OTR.W,100,0x10263c,.95).setOrigin(0).setDepth(20);
    this.texts=[];const text=(words,size)=>{const t=OTR.txt(this,24,0,words,size,'#ffffff',{ox:0,oy:0,wrap:OTR.W-48}).setDepth(21);this.texts.push(t);return t;};
    this.title=text('Review the last mistake.',24);this.mistake=text('',19);this.lesson=text('',OTR.fpAccess.settings().large?19:17);this.scope=text('The replay is loading.',OTR.fpAccess.settings().large?19:17);this.timeText=text('',OTR.fpAccess.settings().large?19:17);
    this.controls=[
      OTR.fpReplayUI.button(this,166,650,282,'Play the replay.',()=>this.toggle()),
      OTR.fpReplayUI.button(this,482,650,282,'Step back half a second.',()=>this.step(-.5)),
      OTR.fpReplayUI.button(this,798,650,282,'Step forward half a second.',()=>this.step(.5)),
      OTR.fpReplayUI.button(this,1114,650,282,'Return to the previous screen.',()=>this.back())
    ];
    this.controlBack=this.add.rectangle(0,OTR.H,OTR.W,90,0x10263c,.95).setOrigin(0,1).setDepth(20);this.layout();
    this.focus=OTR.ui.focus(this,this.controls,{start:3});
    this.onKey=e=>{if(e.key==='Escape'){if(e.preventDefault)e.preventDefault();this.back();}};this.input.keyboard.on('keydown',this.onKey);
    if(!this.clip||this.d.recordId!==this.clip.recordId){this.unavailable('There is no replay for this workday. Replays stay in memory until this tab closes or another workday starts.');return;}
    this.player=new OTR.fpReplay.Player(this.clip,OTR.fpAccess.reduced());this.mistake.setText(this.clip.mistake.label);this.lesson.setText(this.clip.mistake.lesson);this.readout(true);
    OTR.world3d.load().then(async()=>{
      if(!this.sys.isActive()||abort.signal.aborted||this.abort!==abort)return;
      const bank=await OTR.fpAssets.preload({high:OTR.gfx.high(),signal:abort.signal});
      if(!this.sys.isActive()||abort.signal.aborted||this.abort!==abort){bank.dispose();return;}this.assetBank=bank;
      this.model=OTR.fpReplay.restore(this.clip);if(!this.model)throw Error('Invalid replay context');
      this.view=OTR.world3d.create(this);this.art=OTR.fpWorld.build(this,this.model);this.loading=false;this.renderPose();this.readout(true);
      if(OTR.a11y)OTR.a11y.say([this.title.text,this.mistake.text,this.lesson.text,this.scope.text].join(' '));
    }).catch(error=>{if(abort.signal.aborted||this.abort!==abort||!this.sys.isActive())return;console.warn('Replay unavailable',error);if(this.art){this.art.dispose();this.art=null;}if(this.view){this.view.dispose();this.view=null;}if(this.assetBank){this.assetBank.dispose();this.assetBank=null;}this.unavailable('The replay could not open. You can return to your results.');});
  }
  layout(){
    let y=16;for(const t of this.texts){t.y=y;if(t.text)y+=t.height+7;}this.header.setDisplaySize(OTR.W,y+5);
    const h=Math.max(...this.controls.map(b=>b.height)),cy=OTR.H-14-h/2;for(const b of this.controls)b.y=cy;this.controlBack.setDisplaySize(OTR.W,h+28);
  }
  unavailable(text){this.loading=false;this.player=null;this.scope.setText(text);this.timeText.setText('');for(let i=0;i<3;i++)this.controls[i].setEnabled(false);this.layout();if(OTR.a11y)OTR.a11y.say(text);}
  renderPose(){
    if(!this.view||!this.art||!this.model)return;
    // World sync poses the van/actors; the second application preserves the actual recorded camera, rather than a new smoothing history.
    OTR.fpReplay.sample(this.clip,this.player.time,this.model,this.view.camera);this.art.sync(this.model,null,'route');OTR.fpReplay.sample(this.clip,this.player.time,this.model,this.view.camera);this.view.camera.updateProjectionMatrix();
  }
  readout(force=false){
    if(!this.player)return;const p=this.player,pos=(p.time-this.clip.start).toFixed(1),duration=(this.clip.end-this.clip.start).toFixed(1);
    const words=p.paused?`The replay is paused at ${pos} of ${duration} seconds.`:`The replay is playing at ${pos} of ${duration} seconds.`;
    if(force||words!==this.lastReadout){this.lastReadout=words;this.timeText.setText(words);}
    this.scope.setText(this.loading?'The replay is loading.':p.reduced?'Reduced motion is on. Use the step buttons to review the van and camera.':this.clip.end===this.clip.start?'Only a still frame was recorded before this mistake.':'This replay shows the van and camera before the mistake.');
    this.controls[0].setLabel(p.paused?'Play the replay.':'Pause the replay.').setEnabled(!this.loading&&!p.reduced&&this.clip.end>this.clip.start);
    this.controls[1].setEnabled(!this.loading&&p.time>this.clip.start);this.controls[2].setEnabled(!this.loading&&p.time<this.clip.end);this.layout();
  }
  toggle(){if(!this.player||this.loading)return;if(this.player.paused)this.player.play();else this.player.pause();this.readout(true);if(OTR.a11y)OTR.a11y.say(this.timeText.text);}
  step(seconds){if(!this.player||this.loading)return;this.player.step(seconds);this.renderPose();this.readout(true);if(OTR.a11y)OTR.a11y.say(this.timeText.text);}
  back(){if(this.leaving)return;this.leaving=true;this.scene.start(this.d.back||'HubScene',this.d.backData||{});}
  update(time,delta){
    if(this.player){const reduced=OTR.fpAccess.reduced();if(reduced!==this.player.reduced){this.player.motion(reduced);this.readout(true);}if(!this.loading){const before=this.player.time;this.player.advance(delta/1000,document.hidden);if(this.player.time!==before)this.renderPose();}if(time-this.refreshAt>=100){this.refreshAt=time;this.readout();}}
    const focused=this.focus&&this.focus.current();if(focused!==this.lastSpoken){this.lastSpoken=focused;if(focused&&OTR.a11y)OTR.a11y.say(focused.label.text);}
  }
}
OTR.registerScene(FPReplayScene);
