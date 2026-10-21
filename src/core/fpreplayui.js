/* Owned replay adapters. Shared results/map screens opt in with the finished runtime record ID. */
window.OTR=window.OTR||{};
OTR.fpReplayUI={
  clip:null,
  recordStops:null,
  bind(scene){
    const current=OTR.workday&&OTR.workday.current;
    scene.replayRecorder=null;
    if(!scene.hubWorkday||!current||!scene.model||scene.model.kind!=='campaign')return;
    this.clip=this.recordStops=null;scene.replayRecorder=new OTR.fpReplay.Recorder();scene.replayRecorder.bind(scene.model,OTR.workday.events,current.id,current.day);
  },
  capture(scene){
    const current=OTR.workday&&OTR.workday.current,r=scene.replayRecorder;
    if(!r||!current||!scene.view)return;
    r.frame(scene.model,scene.view.camera,OTR.workday.events,current.id,document.hidden||scene.external||scene.transitioning||scene.area!=='route',current.day);
  },
  complete(scene,record){this.clip=scene.replayRecorder&&scene.replayRecorder.finish(record)||null;this.recordStops=this.clip&&record.stops||null;},
  releasePreviousUI(scene){
    // Finished results/map scenes leave generated backgrounds in the global cache. Keep every borrowed/live reference.
    let released=0;
    for(const key of Object.keys(scene.textures.list)){
      const source=scene.textures.list[key].source;
      if(!(key==='rays'||key.endsWith('_bg')||key.startsWith('gfx_')||key.startsWith('panel_'))||!source||!source.some(s=>s.image&&s.image.tagName==='CANVAS'))continue;
      OTR.fpBrand.releaseUnused(scene,key);if(!scene.textures.exists(key))released++;
    }
    return released;
  },
  button(scene,x,y,w,text,action){
    const size=OTR.fpAccess.settings().large?19:17,c=scene.add.container(x,y).setDepth(30),label=OTR.txt(scene,0,0,text,size,'#ffffff',{weight:'900',wrap:w-24,align:'center'}),h=Math.max(54,label.height+20);
    const bg=scene.add.rectangle(0,0,w,h,OTR_DATA.theme.primaryDeep,.97).setStrokeStyle(2,0xffffff).setInteractive({useHandCursor:true});
    c.add([bg,label]);c.label=label;c.setSize(w,h);c.enabled=true;c.lastLabel=text;
    c.press=()=>{if(c.enabled&&c.active&&c.visible)action();};bg.on('pointerup',c.press);
    c.setEnabled=on=>{on=!!on;if(c.enabled===on)return c;c.enabled=on;c.setAlpha(on?1:.5);if(on)bg.setInteractive({useHandCursor:true});else bg.disableInteractive();return c;};
    c.setLabel=text=>{if(text!==c.lastLabel){c.lastLabel=text;label.setText(text);const height=Math.max(54,label.height+20);bg.setDisplaySize(w,height);c.setSize(w,height);}return c;};return c;
  },
  entry(scene,review,options){
    // reviewData passes the finished record's exact stop array. Object identity prevents an older or reloaded day
    // with identical contents from borrowing this clip, without adding anything to shared scoring or saved data.
    if(!this.clip||!review||!this.recordStops||!review.plan||review.plan.stops!==this.recordStops)return null;
    scene.replayLeaving=false;
    const map=scene.sys.settings.key==='DriveReviewScene',o=options||{},button=this.button(scene,o.x||(map?850:1165),o.y||(map?32:180),o.w||(map?460:200),'Replay the last mistake.',()=>{
      if(scene.replayLeaving)return;scene.replayLeaving=true;
      scene.scene.start('FPReplayScene',{recordId:this.clip.recordId,back:scene.sys.settings.key,backData:scene.d});
    });
    return button;
  }
};
