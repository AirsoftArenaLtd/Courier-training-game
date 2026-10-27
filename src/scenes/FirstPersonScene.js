/* Connected prototype: shared interactions and local checkpoints, separate from course records. */
class FirstPersonScene extends Phaser.Scene {
  constructor() { super('FirstPersonScene'); }
  create(data) {
    Object.assign(this,{view:null,model:null,assetBank:null,area:'hub',panel:null,handheld:null,external:false,target:null,lastAim:0,lastSave:0,transitioning:false,notice:'',noticeUntil:0,ui:{},hints:null,guideTarget:null,guideText:'',guideUntil:0,soundCaption:'',soundSource:null,lightSource:null,saved:true,loading:true});
    this.cabVoice=null;this.hubWorkday=!!(data&&data.workday);
    this.held=Object.create(null);this.progress=OTR.fpStore.read();
    if(this.hubWorkday&&!data.workday.resume){this.progress.campaign=null;this.write();}
    this.sensitivity=OTR.fp.clamp(Number(new URLSearchParams(location.search).get('sensitivity'))||0.002,0.0005,0.006);
    this.hubMotion=OTR.fp.create();Object.assign(this.hubMotion.player,{x:0,z:4.6,yaw:0,pitch:0});
    this.hubMotion.blocked=(x,z)=>Math.abs(x)>7.5||z< -5.5||z>7||[[-4,-2.4],[0,-3.3],[4,-2.4]].some(([sx,sz])=>OTR.fp.circleBox(x,z,0.26,{x:sx,z:sz,w:1.8,d:0.8}));
    OTR.fpAccess.textResolution(this);this.makeHud();this.workdaySound=new OTR.fpSound(this);if(OTR.a11y)OTR.a11y.applyColour(this);const token={};this.loadingToken=token;
    const recovery=this.glRecovery=OTR.fpContext.attach(this);
    const assetAbort=new AbortController();
    this.events.once('shutdown',()=>{this.loadingToken=null;assetAbort.abort();this.checkpoint();if(this.art){this.art.dispose();this.art=null;}if(this.assetBank)this.assetBank.dispose();if(OTR.a11y)OTR.a11y.hush();});
    // keys can be remapped in Settings while this scene waits: build the key hints again when it comes back
    const freshHints=()=>{this.hints=null;OTR.fp.applyDriveRules(this.model);};this.events.on('resume',freshHints);this.events.on('wake',freshHints);
    OTR.world3d.load().then(async()=>{
      if(!await recovery.ready()||!this.sys.isActive()||this.loadingToken!==token)return;
      const logo=await OTR.fpBrand.loadLogo(this);if(!await recovery.ready()||!this.sys.isActive()||this.loadingToken!==token)return;this.companyLogo=logo;
      const bar=this.add.graphics().setDepth(21);this.events.once('shutdown',()=>bar.destroy());
      this.setText('objective','Your workday is loading.',1220);if(OTR.a11y)OTR.a11y.say('Your workday is loading.');
      const bank=await OTR.fpAssets.preload({high:OTR.gfx.high(),signal:assetAbort.signal,progress:ratio=>{
        if(this.loadingToken!==token)return;bar.clear();bar.fillStyle(0x42556A);bar.fillRect(24,84,600,8);bar.fillStyle(0xEBC889);bar.fillRect(24,84,600*ratio,8);
      }});
      if(!await recovery.ready()||!this.sys.isActive()||this.loadingToken!==token){bank.dispose();return;}this.assetBank=bank;bar.destroy();
      this.view=OTR.world3d.create(this);this.art=OTR.fpWorld.build(this);
      this.handheld=new OTR.fpHandheld(this);
      this.labels=OTR.fpBrand.labels(this);
      this.installInput();this.loading=false;this.sync();
      if(this.hubWorkday){this.launch('campaign');return;}
      if(!this.progress.welcomed)this.showPanel('Welcome to On The Route',
        `Move with ${OTR.fpAccess.key('KeyW')}/${OTR.fpAccess.key('KeyA')}/${OTR.fpAccess.key('KeyS')}/${OTR.fpAccess.key('KeyD')} and look with ${OTR.fpAccess.lookKeys()} or the mouse. Press ${OTR.fpAccess.key('KeyP')} to select a visible nearby target, then ${OTR.fpAccess.key('KeyE')} to interact.\n\nChoose a workday or cargo practice from the hub menu. Press ${OTR.fpAccess.key('KeyH')} for Controls and guidance. Your progress is saved on this device.`,
        [{label:'Enter the hub',action:()=>{this.progress.welcomed=true;this.write();this.closePanel();}}]);
      else this.showPause();
    }).catch(error=>{
      if(!this.sys.isActive()||this.loadingToken!==token)return;
      if(this.view)this.view.dispose();this.view=null;this.loading=false;
      this.showPanel('The prototype could not start','WebGL is required. Reload to try again.',[{label:'Reload',action:()=>location.reload()}]);
      console.warn('first-person prototype',error);
    });
  }
  makeHud() {
    this.headerBack=this.add.rectangle(0,0,1280,100,0x1B2634,0.93).setOrigin(0).setDepth(20);
    this.title=OTR.txt(this,24,25,'ON THE ROUTE',18,'#EBC889',{ox:0,fit:410}).setDepth(21);
    this.status=OTR.txt(this,1256,25,'',16,'#ffffff',{ox:1,fit:790}).setDepth(21);
    this.objective=OTR.txt(this,24,48,'Loading…',OTR.a11y&&OTR.a11y.large?23:19,'#ffffff',{ox:0,oy:0,wrap:1220}).setDepth(21);
    this.soundCue=OTR.txt(this,24,82,'',17,'#D5DEDF',{ox:0,oy:0,wrap:1220}).setResolution(OTR.gfx.high()?2:1).setDepth(21);
    this.hintBack=this.add.rectangle(640,574,1210,48,0x1B2634,0.88).setDepth(19);
    this.hint=OTR.txt(this,640,574,'',18,'#ffffff',{fit:1160}).setDepth(21);
    this.controls=OTR.txt(this,640,638,'',18,'#ffffff',{wrap:1000,align:'center',stroke:'#1B2634',strokeW:4}).setDepth(21);
    this.help=OTR.txt(this,640,683,'',18,'#D5DEDF',{wrap:1000,align:'center',stroke:'#1B2634',strokeW:4}).setDepth(21);
    this.reticle=this.add.graphics().setDepth(18);this.reticle.lineStyle(2,0xffffff,0.95);this.reticle.lineBetween(634,360,646,360);this.reticle.lineBetween(640,354,640,366);
    this.scanBeam=this.add.graphics().setDepth(18);
    this.mirrorLabel=OTR.txt(this,184,112,'Left mirror',16,'#ffffff',{stroke:'#1B2634',strokeW:4}).setDepth(21).setVisible(false);
    this.fade=this.add.rectangle(640,360,1280,720,0x000000,1).setDepth(2000).setAlpha(0);
    OTR.fpHud.create(this);
    if(OTR.fpSigns)OTR.fpSigns.createUI(this);
  }
  setText(key,value,max) {
    if(this.ui[key]===value&&this.ui[key+'Width']===max)return;this.ui[key]=value;this.ui[key+'Width']=max;const object=this[key];object.setText(value).setScale(1);
    if(['objective','hint','soundCue','controls','help'].includes(key)){object.setWordWrapWidth(max);return;}
    if(object.width>max)object.setScale(max/object.width);
  }
  showPanel(title,body,choices,options) {
    if(this.signUI)for(const slot of this.signUI.pool){slot.text.setVisible(false);slot.back.setVisible(false);slot.entry=null;}
    if(this.handheld)this.handheld.close(false);
    options=options||{};this.closePanel(false);this.held=Object.create(null);
    const textSize=n=>options.accessibleText&&OTR.a11y&&OTR.a11y.large&&n<=19?n+4:n;
    if(this.model){this.model.paused=true;if(OTR.fpMirrors&&!options.preserveGaze)OTR.fpMirrors.reset(this.model);}this.hubMotion.paused=true;
    const root=this.add.container(0,0).setDepth(100);
    this.panel={root,choices,index:0,preserveGaze:!!options.preserveGaze,type:options.inspect?'inspect':'normal',buttons:[],back:options.back||null};this.releaseMouse();
    root.add(this.add.rectangle(640,360,1280,720,0x101A25,options.inspect?0.27:0.7));
    const cx=options.inspect?958:640,w=options.inspect?570:1040;
    root.add(this.add.rectangle(cx,360,w,544,0x263545,0.98));root.add(OTR.txt(this,cx,127,title,textSize(27),'#EBC889',{fit:w-60}));
    const columns=choices.length>4&&!options.inspect?2:1,rows=Math.ceil(choices.length/columns),heights=Array(rows).fill(46),items=[];
    const text=OTR.txt(this,cx-w/2+32,170,body,textSize(19),'#ffffff',{ox:0,oy:0,wrap:w-64,bold:false,lineSpacing:4});root.add(text);
    choices.forEach((choice,i)=>{
      const bw=(w-80)/columns-12,x=cx+(columns===1?0:(i%2?1:-1)*(bw+20)/2);
      const hit=this.add.rectangle(x,0,bw,46,0x42556A,1).setInteractive({useHandCursor:true});
      const label=OTR.txt(this,x,0,`${i+1}. ${OTR.i18n.t(choice.label)}`,textSize(18),'#ffffff',{wrap:bw-24,align:'center'});
      heights[Math.floor(i/columns)]=Math.max(heights[Math.floor(i/columns)],label.height+10);items.push({hit,label,bw});
      hit.on('pointerover',()=>{if(this.panel){this.panel.index=i;this.highlight();}});hit.on('pointerdown',()=>this.choose(i));
      root.add([hit,label]);this.panel.buttons.push(hit);
    });
    const firstY=612-heights.reduce((sum,h)=>sum+h+12,0);let top=firstY;
    for(let row=0;row<rows;row++){for(let col=0;col<columns;col++){const item=items[row*columns+col];if(!item)continue;item.hit.setY(top+heights[row]/2).setDisplaySize(item.bw,heights[row]);item.label.setY(top+heights[row]/2);}top+=heights[row]+12;}
    if(text.height>firstY-190)text.setScale(Math.min(1,(firstY-190)/text.height));
    if(options.inspect)root.add(OTR.txt(this,303,514,`Use ${OTR.fpAccess.key('KeyA')}/${OTR.fpAccess.key('KeyD')} to rotate. Press ${OTR.fpAccess.key('Space')} to scan. Escape returns.`,17,'#ffffff',{wrap:530,align:'center',stroke:'#1B2634',strokeW:4}));
    this.highlight();if(OTR.a11y)OTR.a11y.say([title,body,...choices.map(c=>c.label)].map(t=>OTR.i18n?OTR.i18n.t(t):t).join('. '));this.refresh();
  }
  highlight(speak=false){if(this.panel){this.panel.buttons.forEach((b,i)=>{b.setFillStyle(i===this.panel.index?0x97713D:0x42556A);b.setStrokeStyle(i===this.panel.index?3:0,0xffffff);});if(speak&&OTR.a11y)OTR.a11y.say(this.panel.choices[this.panel.index].label);}}
  choose(index){if(this.glRecovery?.lost||!this.panel||this.transitioning)return;const choice=this.panel.choices[index];if(choice){this.inputBlockedUntil=this.time.now+180;choice.action();}}
  closePanel(resume=true){
    if(this.panel){this.panel.root.destroy();this.panel=null;}this.held=Object.create(null);if(OTR.a11y)OTR.a11y.hush();
    if(resume){if(this.model)this.model.paused=this.model.phase==='debrief';this.hubMotion.paused=false;this.capture();}
  }
  capture(){const canvas=this.sys.game.canvas;if(this.keyboardMode||!canvas.requestPointerLock||document.pointerLockElement===canvas)return;
    try{const p=canvas.requestPointerLock();if(p&&p.catch)p.catch(()=>{});}catch(_){/* Drag look remains available. */}}
  releaseMouse(){if(document.pointerLockElement===this.sys.game.canvas)document.exitPointerLock();}
  message(text){this.notice=text||'';this.noticeUntil=this.time.now+5000;if(text&&OTR.a11y){if(this.model&&this.model.mode==='cab')OTR.fpAccess.voiceHint(this,text);else OTR.a11y.say(text);}}
  write(){this.saved=OTR.fpStore.write(this.progress);return this.saved;}
  checkpoint(){if(!this.progress)return;if(this.model&&this.model.phase!=='debrief')this.progress[this.model.kind]=this.model.snapshot();this.write();this.lastSave=this.time?this.time.now:0;}
  transition(action){
    if(this.handheld)this.handheld.close(false);
    if(this.transitioning)return;this.transitioning=true;this.closePanel(false);this.checkpoint();this.capture();
    if(OTR.fpAccess&&OTR.fpAccess.reduced()){action();this.sync();this.transitioning=false;if(!this.panel){if(this.model)this.model.paused=false;this.hubMotion.paused=false;}return;}
    this.tweens.add({targets:this.fade,alpha:1,duration:180,onComplete:()=>{action();this.sync();this.tweens.add({targets:this.fade,alpha:0,duration:240,onComplete:()=>{this.transitioning=false;if(!this.panel){if(this.model)this.model.paused=false;this.hubMotion.paused=false;}}});}});
  }
  launch(kind,spot){this.transition(()=>{
    let m=spot?null:OTR.fpMission.restore(this.progress[kind]);const resumed=!!m;if(!m){this.progress.sequence++;const day=((OTR.save.data.route||{}).days||0)+1;
      let plan=null;
      if(kind==='campaign'){
        plan=OTR.fpStopFlow.prepare(OTR.fpRoute.plan(day,this.progress.sequence),true);
        plan=OTR.fpDamageFlow.prepare(OTR.fpTraffic.prepare(OTR.fpNav.prepare(OTR.fpSigns.prepare(OTR.fpLater.prepare(plan)))));
        plan=OTR.fpRadio.prepare(plan);
        plan=OTR.fpWalkaroundFlow.prepare(plan);
      }
      m=OTR.fpMission.create(kind,kind==='parking'?Math.max(1,OTR.fpRear.spots.indexOf(spot)+1):this.progress.sequence,plan);if(kind==='campaign'){OTR.fpLoadout.configure(m);OTR.fpDriving.configure(m);}}
    if(!resumed)OTR.fpDay.configure(m);
    if(!resumed)OTR.fpDoors.configure(m);
    if(!resumed)OTR.fpStopFlow.configure(m);
    this.model=m;if(OTR.fpReplayUI)OTR.fpReplayUI.bind(this);this.rebuildWorld();this.area='route';this.target=null;this.checkpoint();
    if(kind==='campaign'&&!m.briefing&&!m.departed){
      const day=OTR.shift.generate(m.seed,m.seed);
      m.briefing={day:day.day,weather:day.weather,clockMin:day.clockMin};m.touch();this.checkpoint();
    }
    OTR.fp.applyDriveRules(m);
    const body=kind==='parking'?(OTR.fpRear.requiresWalk(m)?`The trainer requires a walk-around in this tight space. Park and get out. Stand behind the van, face the reversing path and press ${OTR.fpAccess.key('KeyG')} to record the check. Then use the camera and mirrors to reverse into the bay.`:'Select reverse at the shifter, check the camera and mirrors, and reverse slowly into the marked bay. Stop and set the parking brake when aligned.'):kind==='practice'?'Scan and load the three parcels into positions you choose. Then retrieve the requested parcel, put it back and secure the load. Return to Dispatch to finish.':
      m.stops.map(s=>`${s.address} — ${m.serviceLabel(s.id)}`).join('\n')+'\n\nCheck the tires and lights, scan the parcels and secure the load. Deliver each stop, bring retained parcels to Returns, then check in at Dispatch.';
    if(OTR.fpGuide&&kind==='campaign'&&OTR.fpGuide.opening(this,resumed))return;
    this.showPanel(resumed?'Resume your shift':kind==='parking'?'Practice reversing safely.':kind==='practice'?'Cargo practice':'Your workday',kind==='campaign'&&m.briefing&&!m.events[m.briefKey]?'Walk to Dispatch and read the morning brief, then the route manifest.':body,[{label:resumed?'Continue':kind==='parking'?'Begin reversing practice.':'Begin preparation',action:()=>this.closePanel()},{label:'Back to hub',action:()=>this.toHub()}],{preserveGaze:resumed,accessibleText:kind==='parking'});
  });}
  rebuildWorld(){
    if(this.labels)this.labels.forEach(({object})=>object.destroy());
    if(this.art)this.art.dispose();
    this.art=OTR.fpWorld.build(this,this.model);
    this.labels=OTR.fpBrand.labels(this);
  }
  toHub(){
    if(this.hubWorkday){this.checkpoint();this.closePanel(false);this.releaseMouse();OTR.workday.pause(this);return;}
    this.transition(()=>{this.model=null;this.area='hub';this.target=null;Object.assign(this.hubMotion.player,{x:0,z:4.6,yaw:0,pitch:0});});
  }
  showPause(preserveGaze=false){
    if(this.loading||this.external||this.transitioning)return;if(this.model&&this.model.phase==='debrief'){this.showDebrief(this.progress.last);return;}
    const choices=[{label:'Continue',action:()=>this.closePanel()}];
    if(this.area==='hub')choices.push({label:this.progress.campaign?'Resume workday':'Start workday',action:()=>this.launch('campaign')},{label:this.progress.practice?'Resume cargo practice':'Cargo practice',action:()=>this.launch('practice')},{label:'Last debrief',action:()=>this.showDebrief(this.progress.last)});
    else choices.push({label:'Save and return to hub',action:()=>this.toHub()},{label:'Handheld',action:()=>this.showScanner()});
    choices.push({label:'Choose a reversing space.',action:()=>this.showParkingMenu()});
    choices.push({label:'Controls and guidance',action:()=>OTR.fpGuide.open(this)},{label:'Settings',action:()=>this.showSettings()},{label:'Main game',action:()=>this.leavePrototype()});
    this.showPanel(this.area==='hub'?'Your training hub':'Paused',this.area==='hub'?`Choose a station or use the menu below. Press ${OTR.fpAccess.key('KeyP')} to select a visible nearby target, then ${OTR.fpAccess.key('KeyE')} to interact. Use ${OTR.fpAccess.lookKeys()} or the mouse to look.`:'The shift is paused. Progress is saved on this device; you can resume from the hub.',choices,{preserveGaze});this.checkpoint();
  }
  showParkingMenu(){
    const choices=OTR.fpRear.spots.map((spot,i)=>({label:OTR.fpRear.names[i],action:()=>this.launch('parking',spot)}));
    if(this.progress.parking&&!this.progress.parking.parking.done)choices.push({label:'Resume reversing practice.',action:()=>this.launch('parking')});
    choices.push({label:'Back',action:()=>this.showPause()});
    this.showPanel('Choose a reversing space.','Practice uses a separate checkpoint. Your workday and cargo lesson stay saved.',choices,{accessibleText:true,back:()=>this.showPause()});
  }
  leavePrototype(){if(this.hubWorkday){this.toHub();return;}this.checkpoint();const q=new URLSearchParams(location.search);q.delete('lab');q.delete('bench');location.assign('index.html'+(q.toString()?'?'+q.toString():''));}
  showSettings(){
    const quality=level=>{this.checkpoint();const q=new URLSearchParams(location.search);q.set('gfx',level);location.assign('index.html?'+q.toString());};
    this.showPanel('Settings',`Graphics: ${OTR.gfx.level()}\nMouse sensitivity: ${this.sensitivity.toFixed(4)}\nExisting key remaps apply. Course settings and trainer tools are available through Main game.`,[
      {label:'Low graphics',action:()=>quality('low')},{label:'High graphics',action:()=>quality('high')},
      {label:'Slower mouse look',action:()=>{this.sensitivity=Math.max(0.0005,this.sensitivity-0.0005);this.showSettings();}},
      {label:'Faster mouse look',action:()=>{this.sensitivity=Math.min(0.006,this.sensitivity+0.0005);this.showSettings();}},
      {label:'Language',action:()=>this.showLanguages()},{label:'Accessibility',action:()=>OTR.fpAccess.menu(this)},{label:'Sound settings',action:()=>this.workdaySound.menu()},{label:'Back',action:()=>this.showPause()}],{back:()=>this.showPause()});
  }
  showLanguages(){
    this.closePanel(false);this.external=true;const before=new Set(this.children.list);OTR.ui.languages(this);
    const root=this.children.list.find(o=>!before.has(o)&&o.type==='Container');
    if(root)root.once('destroy',()=>{this.external=false;this.showSettings();});else{this.external=false;this.showSettings();}
  }
  showScanner(){if(this.model&&this.model.kind==='parking'){this.message('Use the cab camera and mirrors for this practice.');return;}if(!this.model){this.showPanel('Start a workday first','The handheld is available during a workday or cargo practice. Start one from the hub, then open the handheld.',[{label:'Back',action:()=>this.showPause()}]);return;}if(this.handheld)this.handheld.toggle();}
  showRoute(){
    const m=this.model,choices=m.pending().map(s=>({label:s.address,action:()=>{m.activeStop=s.id;m.touch();this.checkpoint();this.closePanel();}}));choices.push({label:'Back',action:()=>this.closePanel()});
    this.showPanel('Route',m.kind==='practice'?'Driving is outside this cargo lesson.':m.pending().length?(m.roadworks?'The map shows your van and numbered stops. The red bar marks road works; use another cross street.':m.town?'The map shows the streets and numbered stops. D marks the depot; the yellow dot marks your van.':'Choose your next stop. Maple Ave runs north from the depot. Birch Lane is at the far junction. Use the turning area at the north end to return.'):'All stops have a recorded outcome. Return south to the depot. Bring retained parcels to Returns, then check in at Dispatch.',choices,{back:()=>this.closePanel()});
    if(m.town)this.drawRouteMap();
  }
  drawRouteMap(){
    const m=this.model,b=m.bounds,root=this.panel.root,g=this.add.graphics();root.add(g);
    const scale=Math.min(500/(b.x1-b.x0),160/(b.z1-b.z0)),x=v=>640+(v-(b.x0+b.x1)/2)*scale,y=v=>330+(v-(b.z0+b.z1)/2)*scale;
    g.fillStyle(0x789069);g.fillRect(x(b.x0),y(b.z0),(b.x1-b.x0)*scale,(b.z1-b.z0)*scale);
    g.lineStyle(m.town.road*scale,0x4B5058);
    m.town.xs.forEach(v=>g.lineBetween(x(v),y(b.z0),x(v),y(b.z1)));m.town.zs.forEach(v=>g.lineBetween(x(b.x0),y(v),x(b.x1),y(v)));
    if(m.roadworks){const r=m.roadworks;g.lineStyle(7,0x111820);g.lineBetween(x(r.x-r.w/2),y(r.z),x(r.x+r.w/2),y(r.z));g.lineStyle(4,0xF06D58);g.lineBetween(x(r.x-r.w/2),y(r.z),x(r.x+r.w/2),y(r.z));}
    for(const s of m.stops)root.add(OTR.txt(this,x(s.x),y(s.z),String(s.id+1),18,s.resolved?'#c9d5d0':'#ffffff',{stroke:'#243039',strokeW:4}));
    const checkin=OTR.fpRadio&&OTR.fpRadio.destination(m);if(checkin){const tx=x(checkin.x),ty=y(checkin.z);g.lineStyle(2,0xffffff);g.lineBetween(tx,ty-6,tx+6,ty);g.lineBetween(tx+6,ty,tx,ty+6);g.lineBetween(tx,ty+6,tx-6,ty);g.lineBetween(tx-6,ty,tx,ty-6);}
    root.add(OTR.txt(this,x(4),y(8),'D',18,'#ffffff',{stroke:'#243039',strokeW:4}));
    g.fillStyle(0xFFE35A);g.fillCircle(x(m.van.x),y(m.van.z),4);
  }
  showParcel(id){
    if(!id)this.aimTarget();
    const m=this.model,p=m&&m.parcel(id||m.heldId||this.target);if(!m||!m.canParcel(p))return;this.inspectId=p.id;this.inspectAngle=0;
    this.showPanel('Parcel label',[p.address,p.tracking,m.routePlan?`Weight: ${p.weight} lb`:`Weight: ${p.weight} kg`,m.serviceLabel(p.stop),p.scanned?'Scanned':'Not scanned'].join('\n'),[
      {label:'Use scanner',action:()=>this.handheld.scan()},
      {label:p.location==='held'?'Return to walking':'Pick up',action:()=>{if(p.location!=='held')this.message(m.pickup(p.id));this.checkpoint();this.closePanel();}},
      {label:'Back',action:()=>this.closePanel()}],{inspect:true,back:()=>this.closePanel()});
  }
  showGoal(){
    const m=this.model;if(!m||!m.driving)return;
    this.showPanel('Check the reversing path','For a tight space, park and secure the van, then walk behind it and look along the reversing path. This check is optional unless the trainer requires it in this scenario. Keep people and traffic clear.',[
      {label:'Confirm the path check',action:()=>{this.message(OTR.fpDriving.checkGoal(m));this.checkpoint();this.closePanel();}},
      {label:'Back',action:()=>this.closePanel()}],{back:()=>this.closePanel()});
  }
  showInspection(part){
    const m=this.model;if(!m||!m.near(part))return;const bad=!m.repaired&&m.fault===part;
    const condition=part==='tyres'?(bad?'A bulge is visible in the tire sidewall.':'The tire sidewalls are intact and the tread is visible.'):(bad?'The left headlamp does not illuminate during the light test.':'Both headlamps illuminate during the light test.');
    const choose=decision=>{this.message(m.inspectVan(part,decision));this.checkpoint();this.closePanel();};
    this.showPanel(part==='tyres'?'Tire inspection':'Light test',condition,[{label:'Mark serviceable',action:()=>choose('ready')},{label:'Request repair',action:()=>choose('repair')},{label:'Back',action:()=>this.closePanel()}],{back:()=>this.closePanel()});
  }
  showDoor(id,entry=false){
    const m=this.model,s=m.stop(id);if(!s||!m.near('door'+id))return;if(s.resolved){this.message('This stop already has a recorded outcome.');return;}
    if(m.deliveryStops&&!entry&&m._deliverySpecs[id].protocol){OTR.fpStopScene.show(this,id);return;}
    const held=m.parcel(m.heldId),body=[s.address,m.serviceLabel(id),'',s.contacted?(s.service==='handover'?'The resident confirms the address.':'Nobody answers.'):'Attempt contact, then follow the shipment requirements.',`Carrying: ${held?held.address:'No parcel'}`].join('\n');
    if(m.doorsteps&&m._doorSpecs[id].dog&&!m.doorsteps.stops[id].dogSecured){this.showGate(id);return;}
    const choices=s.contacted?[{label:'Record on handheld',action:()=>this.handheld.delivery(id)}]:[{label:'Knock / ring',action:()=>{this.workdaySound.effect('door','You knock on the door.');this.message(m.contact(id));this.checkpoint();this.showDoor(id);}}];
    if(m.deliveryStops)choices.push({label:'Arrange a failed delivery and reattempt.',action:()=>OTR.fpStopScene.reattempt(this,id)});
    choices.push({label:'Back',action:()=>this.closePanel()});this.showPanel('Delivery',body,choices,{back:()=>this.closePanel()});
  }
  showGate(id){
    const m=this.model;if(!m.doorsteps||!m.near('gate'+id))return;
    this.showPanel('A dog is loose in the yard','Keep the gate shut. Call the owner to secure the dog before entering, or record an unsafe-access exception.',[
      {label:'Call the owner to secure the dog',action:()=>{this.message(OTR.fpDoors.secureDog(m,id));this.checkpoint();this.closePanel();}},
      {label:'Record an unsafe-access exception',action:()=>{m.stops[id].contacted=true;m.touch();this.handheld.delivery(id);}},
      {label:'Open the gate with the dog loose',action:()=>{this.message(OTR.fpDoors.openGate(m,id));this.checkpoint();this.closePanel();}},
      {label:'Back',action:()=>this.closePanel()}]);
  }
  showIdentity(id){
    const m=this.model,T=OTR.fpDoors;if(!T.viewID(m,id))return;const a=m._doorSpecs[id];
    this.showPanel('Check the photo ID',[`Person at the door: ${a.person}`,`Name on ID: ${a.idName}`,`Date of birth: ${a.dob}`,`Expires: ${a.exp}`,`Training date: ${m.doorsteps.date}`,'Compare both photos. In this exercise, the recipient must be 21 or older.'].join('\n'),[
      {label:'Accept the photo ID',action:()=>{this.message(T.checkID(m,id,true));this.checkpoint();this.handheld.checks(id);}},
      {label:'Decline the photo ID and retain the parcel',action:()=>{this.message(T.checkID(m,id,false));this.checkpoint();this.handheld.checks(id);}},
      {label:'Back',action:()=>this.handheld.checks(id)}]);
    const body=this.panel.root.list.find(o=>o.type==='Text'&&o.y===170);body.setWordWrapWidth(610);
    const g=this.add.graphics();this.panel.root.add(g);
    for(const [x,photo] of [[870,false],[1040,true]]){
      g.fillStyle(0xE4E8EB);g.fillRoundedRect(x-62,190,124,156,8);
      g.fillStyle(photo&&!a.photoMatch?0x43515E:a.shirt);g.fillRect(x-40,280,80,55);
      g.fillStyle(photo&&!a.photoMatch?0xE4BE9C:a.skin);g.fillRoundedRect(x-29,217,58,65,16);
      g.fillStyle(photo&&!a.photoMatch?0xD3B58F:0x343B46);g.fillRect(x-29,212,58,18);
      g.fillStyle(0x243039);g.fillRect(x-16,244,5,5);g.fillRect(x+11,244,5,5);
      this.panel.root.add(OTR.txt(this,x,367,photo?'Photo on ID':'At the door',17,'#ffffff',{wrap:155}));
    }
  }
  showCustomer(id){
    const m=this.model,a=m._doorSpecs[id];
    this.showPanel('Speak with the customer',a.opening||'The customer is upset about a late delivery.',[
      {label:'Acknowledge the problem and offer a clear next step',action:()=>{this.message(OTR.fpDoors.respond(m,id,true));this.checkpoint();this.handheld.checks(id);}},
      {label:'Blame the customer and argue',action:()=>{this.message(OTR.fpDoors.respond(m,id,false));this.checkpoint();this.handheld.checks(id);}},
      {label:'Back',action:()=>this.handheld.checks(id)}]);
  }
  showMorningBrief(nodeId,feedback){
    const m=this.model;if(!m||!m.briefing||!m.near('dispatch'))return;
    const brief=OTR_DATA.briefs[(m.briefing.day-1)%OTR_DATA.briefs.length],nodes=brief.talk.nodes;
    const node=nodes[nodeId||brief.talk.start],back=()=>this.closePanel();
    if(!node||node.type==='end'){this.showManifest(0,true);return;}
    if(feedback){this.showPanel('Morning briefing',feedback,[{label:'Continue',action:()=>this.showMorningBrief(nodeId)}],{back});return;}
    const choices=node.choices?[{label:'View answers',action:()=>this.showBriefAnswer(nodeId||brief.talk.start,0)}]:[{label:'Continue',action:()=>this.showMorningBrief(node.next)}];
    const locker=!nodeId||nodeId===brief.talk.start?OTR.fpStopFlow.brief(m):'';
    this.showPanel(brief.topic,[node.text,locker].filter(Boolean).join('\n\n'),choices,{back});
  }
  showBriefAnswer(nodeId,index){
    const m=this.model;if(!m||!m.briefing||!m.near('dispatch'))return;
    const brief=OTR_DATA.briefs[(m.briefing.day-1)%OTR_DATA.briefs.length],node=brief.talk.nodes[nodeId],choice=node.choices[index];
    this.showPanel('Morning safety check',choice.text,[
      {label:'Choose this answer',action:()=>this.showMorningBrief(choice.next,choice.feedback)},
      {label:'Next answer',action:()=>this.showBriefAnswer(nodeId,(index+1)%node.choices.length)},
      {label:'Read question',action:()=>this.showMorningBrief(nodeId)}
    ],{back:()=>this.closePanel()});
  }
  showManifest(page=0,complete=false){
    const m=this.model;if(!m||!m.near('dispatch'))return;
    const s=m.stops[page],p=m.parcels.find(p=>p.stop===s.id),day=m.briefing;
    const body=[day?`Day ${day.day}`:'Route manifest',day?day.weather:'',day?`Start: ${OTR.shift.clockStr(day.clockMin)}`:'',s.address,p.tracking,m.serviceLabel(s.id),m.routePlan?`Load the parcel for stop ${s.id+1} on ${OTR.fpMission.slots[s.id].name}.`:null].filter(Boolean).join('\n');
    const choices=[];
    if(page+1<m.stops.length)choices.push({label:'Next',action:()=>this.showManifest(page+1,complete)});
    else choices.push({label:'Begin preparation',action:()=>{
      const begin=()=>{if(complete)m.readBrief();this.checkpoint();this.closePanel();};
      if(complete&&m.damage&&m.damage.enabled)this.showPanel('Know the van height.',
        ['Your van is 10 feet 10 inches tall. Follow the sat nav around low clearances. Secure the load before departure.',
          m.walkaround?'Walk around the parked van with empty hands and record each area’s condition before departure.':''].filter(Boolean).join('\n\n'),
        [{label:'Begin preparation.',action:begin}],{accessibleText:true,back:()=>this.showManifest(page,complete)});
      else begin();
    }});
    if(page>0)choices.push({label:'Previous',action:()=>this.showManifest(page-1,complete)});
    this.showPanel('Route manifest',body,choices,{back:()=>this.closePanel()});
  }
  showLoadCount(){
    const m=this.model;if(!m.loadout||!m.near('dispatch'))return;
    const choices=Array.from({length:OTR.fpMission.slots.length+1},(_,n)=>({label:n===1?'I counted one package.':`I counted ${n} packages.`,action:()=>{this.message(OTR.fpLoadout.count(m,n));this.checkpoint();this.closePanel();}}));
    choices.push({label:'Back',action:()=>this.handheld.loadCheck()});
    this.showPanel('Load count',`The manifest lists ${m.stops.length} packages. Count the packages in the van before confirming.`,choices,{back:()=>this.handheld.loadCheck()});
  }
  showDispatch(){
    if(this.model.kind==='parking'){this.showParkingMenu();return;}
    if(this.model.briefing&&!this.model.events[this.model.briefKey]){this.showMorningBrief();return;}
    const m=this.model;this.showPanel('Dispatch',this.objectiveText(),[
      {label:m.kind==='practice'?'Finish practice':'Finish workday',action:()=>{const message=m.finish();if(message){this.message(message);this.closePanel();return;}
        this.progress.last={kind:m.kind,seed:m.seed,logs:OTR.fpMission.clone(m.logs),elapsed:Math.round(m.elapsed)};this.progress[m.kind]=null;this.write();
        if(this.hubWorkday&&m.kind==='campaign'){
          this.closePanel(false);this.releaseMouse();
          if(OTR.fpReplayUI)OTR.fpReplayUI.capture(this);
          const record=OTR.workday.finish(this,{seconds:Math.round(m.elapsed),stops:m.stops.map(s=>({stop:s.id+1,delivered:s.outcome==='handover'||s.outcome==='safeplace',address:s.address,x:s.x,z:s.z})),depot:{x:4,z:8}});if(OTR.fpReplayUI)OTR.fpReplayUI.complete(this,record);
        }else this.showDebrief(this.progress.last);}},
      ...(OTR.fpLater&&OTR.fpLater.enabled(m)?[{label:'View the workday plan',action:()=>OTR.fpLater.open(this)}]:[]),{label:'View manifest',action:()=>this.showManifest()},...(m.loadout?[{label:'Check the load',action:()=>this.handheld.loadCheck()}]:[]),{label:'Back',action:()=>this.closePanel()}],{back:()=>this.closePanel()});
  }
  showDebrief(result,page=0){
    if(!result){this.showPanel('Last debrief','Complete a workday or a cargo lesson to see its results.',[{label:'Back',action:()=>this.showPause()}]);return;}
    const logs=result.logs,good=logs.filter(l=>l.outcome==='good').length,needs=logs.filter(l=>l.outcome==='needs').length;
    const sorted=logs.filter(l=>l.outcome!=='good').concat(logs.filter(l=>l.outcome==='good')),pages=Math.max(1,Math.ceil(sorted.length/5));page=OTR.fp.clamp(page,0,pages-1);
    const body=[`Good decisions: ${good} · To review: ${needs}`,'',sorted.slice(page*5,page*5+5).map(l=>(l.outcome==='good'?'✓ ':l.outcome==='recovered'?'↺ ':'• ')+l.text).join('\n'),'',`Page ${page+1} / ${pages}`].join('\n');
    const choices=[];if(page>0)choices.push({label:'Previous',action:()=>this.showDebrief(result,page-1)});if(page+1<pages)choices.push({label:'Next',action:()=>this.showDebrief(result,page+1)});
    const back=()=>this.area==='hub'?this.showPause():this.toHub();
    choices.push({label:'Return to hub',action:back});this.showPanel(result.kind==='practice'?'Practice debrief':'Workday debrief',body,choices,{back});
  }
  aimTarget(){this.sync();this.target=this.art?this.art.pick():null;return this.target;}
  interact(){
    if(this.panel||this.external||this.transitioning||(this.handheld&&this.handheld.isOpen))return;const id=this.aimTarget(),m=this.model;
    if(!id&&(!m||m.mode==='walk')&&!(m&&m.heldId)){this.message(`No target is selected. Move closer or press ${OTR.fpAccess.key('KeyP')} to select a visible nearby target.`);return;}
    if(this.area==='hub'){if(id==='hub-day')this.launch('campaign');else if(id==='hub-practice')this.launch('practice');else if(id==='hub-record')this.showDebrief(this.progress.last);return;}
    if(id&&id.startsWith('mirror-'))return;
    if(m.mode==='cab'){if(id&&id.startsWith('cab-')&&id!=='cab-exit'){this.cabAction(id);return;}if(!m.exit())this.message('Stop and set the parking brake before exiting.');else this.workdaySound.effect('door','The cab door opens.');this.checkpoint();return;}
    const before={mode:m.mode,cargo:m.cargoOpen,held:m.heldId,secured:m.secured};let result='';
    if(id==='driver')result=m.enter();else if(id==='cargo')result=m.toggleCargo();else if(id==='secure')result=m.secure();
    else if(id&&id.startsWith('wear-')){OTR.fpWalkaroundUI.inspect(this,id.slice(5));return;}
    else if(id==='tyres'||id==='lights'){this.showInspection(id);return;}else if(id==='dispatch'){this.showDispatch();return;}
    else if(id==='returns'){this.handheld.scan();return;}else if(id&&id.startsWith('visit')){const stop=Number(id.slice(5));if(m.stops[stop].resolved)this.message('This stop already has a recorded outcome.');else OTR.fpStopScene.show(this,stop);return;}else if(id&&id.startsWith('gate')){this.showGate(Number(id.slice(4)));return;}else if(id&&id.startsWith('hazard')){result=OTR.fpDoors.clearHazard(m,Number(id.slice(6)));}
    else if(id&&id.startsWith('door')){this.showDoor(Number(id.slice(4)));return;}
    else if(id&&id.startsWith('slot'))result=m.place(id);else if(id&&id.startsWith('parcel')){if(m.heldId)result=m.putBack();else result=m.pickup(id);}
    else if(m.heldId)result=m.putBack();if(result)this.message(result);
    if(!result){if(before.mode!==m.mode)this.workdaySound.effect('door','The cab door closes.');else if(before.cargo!==m.cargoOpen)this.workdaySound.effect('cargo',m.cargoOpen?'The cargo doors open.':'The cargo doors close.');else if(before.held!==m.heldId)this.workdaySound.effect('cargo',m.heldId?'You pick up the package.':'You put down the package.');else if(!before.secured&&m.secured)this.workdaySound.effect('cargo','The cargo restraints are secure.');}
    this.checkpoint();this.sync();this.refresh();
  }
  cabAction(id){
    if(id==='cab-camera'){this.message(OTR.fpHud.screenHint(this.model));return;}
    const result=OTR.fpCab.act(this.model,id);
    this.message(result||OTR.fpCab.hint(id,this.model,OTR.fpAccess.key('KeyE')));
    this.checkpoint();this.sync();this.refresh();
  }
  installInput(){
    OTR.fpAccess.syncKeys();
    const canvas=this.sys.game.canvas,handlers=[],listen=(o,name,fn)=>{o.addEventListener(name,fn);handlers.push(()=>o.removeEventListener(name,fn));};
    listen(canvas,'pointerdown',e=>{this.keyboardMode=false;if(this.glRecovery?.lost||e.button!==0||this.loading||this.panel||this.external||this.transitioning||this.time.now<(this.inputBlockedUntil||0))return;
      this.pointerRearm=false;
      if(this.handheld&&this.handheld.isOpen){if(this.handheld.aiming){this.handheld.trigger=true;this.capture();}return;}
      if(document.pointerLockElement===canvas)this.interact();else this.pointerStart={x:e.clientX,y:e.clientY};});
    listen(window,'pointerup',e=>{if(e.button===0)this.pointerRearm=false;if(this.handheld)this.handheld.trigger=false;});
    listen(canvas,'pointerup',e=>{const start=this.pointerStart;this.pointerStart=null;if(this.glRecovery?.lost||!start||this.panel||this.external||this.transitioning)return;
      if(Math.hypot(e.clientX-start.x,e.clientY-start.y)<4){this.capture();this.interact();}});
    listen(window,'mousemove',e=>{if(this.glRecovery?.lost||this.pointerRearm||this.panel||this.external||this.transitioning||(this.handheld&&this.handheld.isOpen&&!this.handheld.aiming))return;if(document.pointerLockElement!==canvas&&!(e.buttons&1&&e.target===canvas))return;
      const p=this.area==='hub'?this.hubMotion.player:this.model.player;
      if(this.model&&this.model.mode==='cab')this.model.van.look=OTR.fp.clamp(this.model.van.look+e.movementX*this.sensitivity,-1.5,1.5);else p.yaw+=e.movementX*this.sensitivity;
      p.pitch=OTR.fp.clamp(p.pitch+e.movementY*this.sensitivity,-1.05,1.05);});
    const codes=new Set(['KeyW','KeyS','KeyA','KeyD','ArrowUp','ArrowDown','ArrowLeft','ArrowRight','KeyE','KeyF','KeyG','KeyP','KeyJ','KeyL','KeyK','KeyR','KeyB','KeyQ','KeyC','KeyH','KeyV','ShiftLeft','ShiftRight','Tab','Space','Escape','Enter','Backspace',...Array.from({length:9},(_,i)=>'Digit'+(i+1))]);
    listen(window,'keydown',e=>{
      if(this.glRecovery?.lost||this.loading||this.external||!codes.has(e.code)||e.ctrlKey||e.metaKey||e.altKey)return;e.preventDefault();if(e.repeat&&!this.held[e.code])return;this.keyboardMode=true;const first=!this.held[e.code];this.held[e.code]=true;if(!first||e.repeat||this.transitioning)return;
      if(this.handheld&&this.handheld.isOpen){
        const hh=this.handheld;
        if(e.code==='Tab')hh.close();
        else if(e.code==='Escape'){if(hh.aiming)hh.home();else hh.close();}
        else if(e.code==='KeyH'){hh.close(false);this.showPause();}
        else if(e.code==='Backspace'){const back=hh.device.current&&hh.device.current.back;if(back)back();else hh.home();}
        else if(/^Digit[1-9]$/.test(e.code))hh.choose(Number(e.code.slice(5))-1);
        else if(!hh.aiming&&e.code==='Enter')hh.choose(hh.index||0);
        else if(!hh.aiming&&/^Arrow/.test(e.code)){hh.index=(hh.index||0)+(e.code==='ArrowUp'||e.code==='ArrowLeft'?-1:1);OTR.fpAccess.deviceFocus(hh);}
        else if(hh.aiming&&e.code==='KeyP')OTR.fpAccess.focus(this);
        return;
      }
      if(this.panel){
        if(e.code==='Escape'){if(this.panel.back)this.panel.back();else this.closePanel();return;}
        if(this.panel.type==='inspect'&&e.code==='Space'){this.handheld.scan();return;}
        if(/^Digit[1-9]$/.test(e.code)){this.choose(Number(e.code.slice(5))-1);return;}
        if(this.panel.type==='inspect'&&(e.code==='ArrowLeft'||e.code==='ArrowRight'))return;
        if(/^Arrow/.test(e.code)||e.code==='Tab'){this.panel.index=(this.panel.index+(e.code==='ArrowUp'||e.code==='ArrowLeft'||e.code==='Tab'&&e.shiftKey?-1:1)+this.panel.choices.length)%this.panel.choices.length;this.highlight(true);return;}
        if(e.code==='Enter')this.choose(this.panel.index);return;
      }
      if(e.code==='Escape'||e.code==='KeyH'){this.showPause();return;}if(e.code==='KeyE'||e.code==='Enter'){this.interact();return;}
      if(e.code==='Tab'){this.showScanner();return;}if(e.code==='KeyF'){this.showParcel();return;}
      if(e.code==='KeyG'&&this.model&&this.model.mode==='walk'){this.showGoal();return;}
      if(e.code==='KeyP'){OTR.fpAccess.focus(this);return;}
      if(e.code==='KeyJ'&&OTR.fpSigns){OTR.fpSigns.read(this);return;}
      const m=this.model;if(m&&m.mode==='cab'){
        if(e.code==='Space')this.cabAction('cab-handbrake');if(e.code==='KeyB')this.cabAction('cab-belt');
        if(e.code==='KeyL')this.cabAction('cab-headlights');if(e.code==='KeyK')this.cabAction('cab-wipers');
        if(e.code==='KeyR')this.cabAction(m.van.gear===1?'cab-reverse':'cab-drive');
        if(e.code==='KeyQ')this.cabAction('cab-signal-left');if(e.code==='KeyC')this.cabAction('cab-signal-right');if(e.code==='KeyV'){m.van.look=0;m.player.pitch=0;}m.touch();
      }
    });
    listen(window,'keyup',e=>{delete this.held[e.code];});
    const pause=()=>{if(this.glRecovery?.lost)return;this.held=Object.create(null);if(this.handheld)this.handheld.close(false);if(this.model)this.model.paused=true;this.hubMotion.paused=true;this.checkpoint();if(!this.panel&&!this.external&&!this.transitioning)this.showPause(true);};
    listen(window,'blur',pause);listen(document,'visibilitychange',()=>{if(document.hidden)pause();});
    listen(document,'pointerlockchange',()=>{if(document.pointerLockElement!==canvas&&!this.panel&&!this.external&&!this.transitioning&&!(this.handheld&&this.handheld.isOpen&&!this.handheld.aiming))pause();});
    listen(window,'pagehide',()=>this.checkpoint());this.events.once('shutdown',()=>{handlers.forEach(remove=>remove());this.held=Object.create(null);this.releaseMouse();});
  }
  objectiveText(){
    const m=this.model;if(!m)return 'Choose a workday or a focused cargo lesson.';
    if(m.kind==='parking')return m.parking.done?'You parked in the practice bay. Open the menu to choose another space.':OTR.fpRear.requiresWalk(m)&&!OTR.fpRear.checked(m)&&!m.driving.reverseActive?'The trainer requires a walk-around here. Park, get out and look behind the van before reversing.':m.van.gear===-1?OTR.fpRear.hint(m):'Select reverse and back into the marked bay. Stop and set the parking brake when aligned.';
    if(m.kind==='practice'){if(!m.requested)return 'Scan and place all three parcels in the van. Choose your shelf positions.';
      if(!m.retrievals)return `Retrieve ${m.parcel(m.requested).address} from the shelf where you loaded it.`;return 'Replace the parcel, secure the load, then finish at Dispatch.';}
    if(m.briefing&&!m.events[m.briefKey])return 'Walk to Dispatch to read the morning brief and route manifest.';
    if(m.driving&&m.mode==='cab'){const warning=OTR.fpDriving.hint(m);if(warning)return warning;}
    if(m.routeDay){const update=OTR.fpDay.hint(m);if(update)return update;}
    if(m.mode==='cab'&&m.phase==='prepare')return `${m.stop(m.activeStop).address} · ${m.driveHint()}`;
    if(m.phase==='prepare'&&m.walkaround&&m.damage.enabled)return 'Record the van’s condition, check the tires and lights, then scan and load the parcels. Secure the load and close cargo before departure.';
    if(m.phase==='prepare'&&m.routePlan)return 'Check tires and lights, scan and load five parcels in stop order, then secure the load and close cargo.';
    if(m.phase==='prepare')return 'Check tires and lights, scan and load three parcels, then secure the load and close cargo.';
    if(OTR.fpRadio&&OTR.fpRadio.destination(m))return 'Complete the dispatch check-in, then continue the route or return to the depot.';
    if(m.phase==='return'&&m.walkaround&&m.damage.enabled&&m.mode==='walk')return 'Return to the depot, scan retained parcels at Returns and record the van’s condition before finishing at Dispatch.';
    if(m.phase==='return'&&m.routePlan)return m.mode==='cab'?`Return to the depot. ${m.driveHint()}`:'Return to the depot. Scan retained parcels at Returns, then finish at Dispatch.';
    if(m.phase==='return')return 'Return south to the depot. Scan retained parcels at Returns, then finish at Dispatch.';
    if(m.phase==='debrief')return 'Review the shift, then return to the hub.';
    const s=m.stop(m.activeStop),p=m.mode==='cab'?m.van:m.player;
    if(m.mode==='walk'&&m.heldId){const parcel=m.parcel(m.heldId);if(parcel.stop===s.id&&!parcel.stopScanned)return `${s.address} · Scan the parcel at the door before recording the outcome.`;}
    return m.mode==='cab'?`${s.address} · ${m.driveHint()}`:s.address+' · '+Math.round(Math.hypot(p.x-s.x,p.z-s.z))+' m · '+m.serviceLabel(s.id);
  }
  // parcels on the cargo shelves, counted without making a new array (refresh runs every frame)
  cargoLine(m){let n=0;for(let i=0;i<m.parcels.length;i++)if(m.parcels[i].location.startsWith('slot'))n++;return n===1?'1 parcel in cargo':`${n} parcels in cargo`;}
  refresh(){
    if(this.loading)return;const m=this.model,mode=m?m.mode:'walk';
    const device=!!(this.handheld&&this.handheld.isOpen),aiming=device&&this.handheld.aiming;
    // Detailed workday context is available on the handheld; the live cab supplies its own gauges.
    this.setText('objective','',1220);
    const k=code=>OTR.a11y?OTR.a11y.label(OTR.a11y.physical(code)):code;
    let hint='';const id=this.target;
    if(this.area==='hub')hint=id==='hub-day'?(this.progress.campaign?`${k('KeyE')} resumes the workday.`:`${k('KeyE')} starts the workday.`):id==='hub-practice'?`${k('KeyE')} starts cargo practice.`:id==='hub-record'?`${k('KeyE')} opens the last debrief.`:`${k('KeyH')} opens the hub menu.`;
    else if(mode==='cab'){hint=(id==='cab-camera'?OTR.fpHud.screenHint(m):'')||OTR.fpMirrors.hint(id,m)||OTR.fpCab.hint(id,m,k('KeyE'))||(m.driving?OTR.fpDriving.hint(m):'')||(OTR.fpTraffic?OTR.fpTraffic.hint(m):'');
      if(!hint)hint=m.van.hand?'Check mirrors and signals before moving.':m.town&&OTR.fpRoute.limit(m)===25?'Keep right. The speed limit is 25 mph.':'Keep right. The speed limit is 15 mph.';}
    else if(id==='driver')hint=`${k('KeyE')} enters the cab.`;else if(id==='cargo')hint=m.driving?(m.cargoOpen?`${k('KeyE')} closes cargo. ${k('KeyG')} checks the reversing path.`:`${k('KeyE')} opens cargo. ${k('KeyG')} checks the reversing path.`):m.cargoOpen?`${k('KeyE')} closes the cargo doors.`:`${k('KeyE')} opens the cargo doors.`;else if(id==='secure')hint=`${k('KeyE')} secures the load.`;
    else if(id&&id.startsWith('wear-'))hint=`Press ${k('KeyE')} to inspect this area and record its condition on the handheld.`;
    else if(id==='tyres'||id==='lights')hint=id==='tyres'?`${k('KeyE')} inspects the tires.`:`${k('KeyE')} inspects the lights.`;else if(id==='dispatch')hint=`${k('KeyE')} checks in at Dispatch.`;else if(id==='returns')hint=`${k('KeyE')} opens the scanner to return the retained parcel.`;
    else if(id&&id.startsWith('parcel')){const p=m.parcel(id);hint=p.address+' · '+`${k('KeyE')} picks up the parcel. ${k('KeyF')} inspects it. ${k('Tab')} opens the handheld.`;}
    else if(id&&id.startsWith('slot'))hint=OTR.fpMission.slots.find(s=>s.id===id).name+' · '+`${k('KeyE')} places the parcel.`;
    else if(id&&id.startsWith('gate'))hint=`${k('KeyE')} checks the gate. Keep outside while the dog is loose.`;else if(id&&id.startsWith('hazard'))hint=`${k('KeyE')} inspects the path. Hold ${k('ShiftLeft')} for short, careful steps.`;
    else if(id&&id.startsWith('door'))hint=m.stop(id.slice(4)).address+' · '+`${k('KeyE')} attempts delivery.`;else if(m.heldId)hint='Choose an empty cargo shelf, or approach the correct delivery point.';
    if(id&&id.startsWith('visit'))hint=`Press ${k('KeyE')} to use the delivery controls.`;
    if(mode==='cab'&&!(id&&(id.startsWith('cab-')||id.startsWith('mirror-')))&&m.routeDay&&!m.parked()&&!(m.driving&&OTR.fpDriving.hint(m))&&OTR.fpDay.active(m))hint=OTR.fpDay.driveText(m);
    if(OTR.fpGuide){const guide=OTR.fpGuide.hint(this,id);if(guide)hint=guide;}
    if(this.notice&&this.time.now<this.noticeUntil)hint=this.notice;
    if(aiming)hint=this.handheld.focusId?`Barcode in sight · Hold ${k('Space')} or left click to scan`:'Aim at the barcode, or pick up the parcel to bring its label closer.';
    const blocked=!!this.panel||this.external||this.transitioning||(device&&!aiming);
    OTR.fpHud.refresh(this,hint,blocked,device,aiming);
    OTR.fpAccess.voiceTick(this,blocked);
    this.scanBeam.clear();
    if(aiming){const color=this.handheld.focusId?0x2BC48A:0xF0435A;this.scanBeam.lineStyle(2,color,0.9);this.scanBeam.strokeRect(609,340,62,40);
      if(this.handheld.progress>0){this.scanBeam.fillStyle(0x1B2634,0.9);this.scanBeam.fillRect(570,395,140,8);this.scanBeam.fillStyle(color,1);this.scanBeam.fillRect(570,395,140*Math.min(1,this.handheld.progress/0.45),8);}}
  }
  sync(){if(this.art)this.art.sync(this.model,this.hubMotion.player,this.area);}
  update(time,delta){
    if(this.glRecovery?.lost||this.loading||!this.view)return;const h=this.held,controls={forward:!!h.KeyW,back:!!h.KeyS,left:!!h.KeyA,right:!!h.KeyD,careful:!!(h.ShiftLeft||h.ShiftRight)};
    if(!this.panel&&!this.external&&!this.transitioning&&!(this.handheld&&this.handheld.isOpen&&!this.handheld.aiming)&&OTR.fpAccess)OTR.fpAccess.look(this,h,delta/1000);
    if(this.panel&&this.panel.type==='inspect')this.inspectAngle+=(Number(!!(h.KeyD||h.ArrowRight))-Number(!!(h.KeyA||h.ArrowLeft)))*Math.min(delta/1000,0.05)*1.8;
    if(this.model){const visible=!this.panel&&!this.external&&!this.transitioning&&!(this.handheld&&this.handheld.isOpen);if(!visible&&!(this.panel&&this.panel.preserveGaze)&&OTR.fpMirrors)OTR.fpMirrors.reset(this.model);this.model.mirrorVisible=visible;this.model.rearVisible=visible&&!!(this.art.rear&&this.art.rear.inView);}
    if(!this.panel&&!this.external&&!this.transitioning){if(this.model)this.model.step(controls,delta/1000);else this.hubMotion.step(controls,delta/1000);}if(this.model&&this.model.loadout&&this.model.loadout.notice){this.model.loadout.notice=false;this.message('A previously missed package has turned up in cargo. Scan it and check the address.');}this.sync();if(OTR.fpReplayUI)OTR.fpReplayUI.capture(this);
    if(this.model&&this.model.dayNotice){this.message(this.model.dayNotice);this.model.dayNotice='';}
    if(this.model&&this.model.doorNotice){this.message(this.model.doorNotice);this.model.doorNotice='';}
    if(OTR.fpStopScene)OTR.fpStopScene.tick(this);
    const sound=this.workdaySound.tick(time),light=this.art.lighting?this.art.lighting.caption():'';
    if(sound!==this.soundSource||light!==this.lightSource){this.soundSource=sound;this.lightSource=light;this.soundCaption=sound&&light?sound+' · '+light:sound||light;}
    if(this.handheld&&this.handheld.aiming&&!this.panel&&!this.external&&!this.transitioning)this.handheld.tick(delta/1000,!!h.Space||this.handheld.trigger);
    if(time-this.lastAim>90){this.target=(!this.panel&&!this.external&&(!this.model||this.model.mode==='walk'||this.model.mode==='cab'))?this.art.pick():null;this.lastAim=time;const occupied=[];
      this.labels.forEach(({label,object})=>{
        if(label.clearance){const size=OTR.fpAccess.settings().large?22:17;if(parseFloat(object.style.fontSize)!==size)object.setFontSize(size);}
        if(label.gauge&&this.model){const text=label.gauge==='speed'?`The speed is ${Math.round(Math.abs(this.model.van.speed)*2.23694)} mph.`:`The engine is at ${Math.round((this.model.motion?this.model.motion.rpm:800)/100)*100} RPM.`;if(label.text!==text){label.text=text;object.setText(text);}}
        const p=!this.panel&&!this.external&&!(this.handheld&&this.handheld.isOpen)?this.art.labelPosition(label):null;
        const w=object.displayWidth,h=object.displayHeight;
        if(!p||label.clearance&&(p.x-w/2<12||p.x+w/2>1268||p.y-h/2<20||p.y+h/2>700)||!label.gear&&occupied.some(q=>
          Math.abs(q.x-p.x)<(label.clearance||q.clearance?(w+(q.w||230))/2+12:230)&&Math.abs(q.y-p.y)<(label.clearance||q.clearance?(h+(q.h||35))/2+8:35))){object.setVisible(false);return;}
        if(!label.gear)occupied.push(label.clearance?{x:p.x,y:p.y,w,h,clearance:true}:p);object.setPosition(p.x,p.y).setVisible(true);});if(this.signUI)this.signUI.occupied=occupied;}
    OTR.fpHud.navigation(this);
    if(this.model&&!this.model.paused&&time-this.lastSave>3000)this.checkpoint();this.refresh();if(OTR.fpSigns)OTR.fpSigns.updateUI(this,this.signUI.occupied);
  }
}
OTR.registerScene(FirstPersonScene);
