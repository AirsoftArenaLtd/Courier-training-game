/* Connected prototype: shared interactions and local checkpoints, separate from course records. */
class FirstPersonScene extends Phaser.Scene {
  constructor() { super('FirstPersonScene'); }
  create() {
    Object.assign(this,{view:null,model:null,area:'hub',panel:null,handheld:null,external:false,target:null,lastAim:0,lastSave:0,transitioning:false,notice:'',noticeUntil:0,ui:{},saved:true,loading:true});
    this.held=Object.create(null);this.progress=OTR.fpStore.read();
    this.sensitivity=OTR.fp.clamp(Number(new URLSearchParams(location.search).get('sensitivity'))||0.002,0.0005,0.006);
    this.hubMotion=OTR.fp.create();Object.assign(this.hubMotion.player,{x:0,z:4.6,yaw:0,pitch:0});
    this.hubMotion.blocked=(x,z)=>Math.abs(x)>7.5||z< -5.5||z>7||[[-4,-2.4],[0,-3.3],[4,-2.4]].some(([sx,sz])=>OTR.fp.circleBox(x,z,0.26,{x:sx,z:sz,w:1.8,d:0.8}));
    this.makeHud();const token={};this.loadingToken=token;
    this.events.once('shutdown',()=>{this.loadingToken=null;this.checkpoint();if(OTR.a11y)OTR.a11y.hush();});
    OTR.world3d.load().then(()=>{
      if(!this.sys.isActive()||this.loadingToken!==token)return;
      this.view=OTR.world3d.create(this);this.art=OTR.fpWorld.build(this);
      this.handheld=new OTR.fpHandheld(this);
      this.labels=this.art.labels.map(label=>({label,object:OTR.txt(this,0,0,label.text,17,'#ffffff',{stroke:'#243039',strokeW:5,fit:220}).setDepth(9).setVisible(false)}));
      this.installInput();this.loading=false;this.sync();
      if(!this.progress.welcomed)this.showPanel('Welcome to On The Route',
        'Walk to Dispatch to start a workday, or choose Cargo practice for a focused lesson.\n\nMove with WASD, look with the mouse and use E to interact. H opens the same choices as a menu. Your prototype progress is saved on this device.',
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
    const g=this.add.graphics().setDepth(20);g.fillStyle(0x1B2634,0.93);g.fillRect(0,0,1280,100);g.fillRect(0,608,1280,112);
    this.title=OTR.txt(this,24,25,'ON THE ROUTE',18,'#EBC889',{ox:0,fit:410}).setDepth(21);
    this.status=OTR.txt(this,1256,25,'',16,'#ffffff',{ox:1,fit:790}).setDepth(21);
    this.objective=OTR.txt(this,24,64,'Loading…',19,'#ffffff',{ox:0,fit:1220}).setDepth(21);
    this.hintBack=this.add.rectangle(640,574,1210,48,0x1B2634,0.88).setDepth(19);
    this.hint=OTR.txt(this,640,574,'',18,'#ffffff',{fit:1160}).setDepth(21);
    this.controls=OTR.txt(this,640,638,'',15,'#ffffff',{fit:1230}).setDepth(21);
    this.help=OTR.txt(this,640,683,'',14,'#D5DEDF',{fit:1220}).setDepth(21);
    this.reticle=this.add.graphics().setDepth(18);this.reticle.lineStyle(2,0xffffff,0.95);this.reticle.lineBetween(634,360,646,360);this.reticle.lineBetween(640,354,640,366);
    this.scanBeam=this.add.graphics().setDepth(18);
    this.mirrorLabel=OTR.txt(this,184,112,'Left mirror',16,'#ffffff',{stroke:'#1B2634',strokeW:4}).setDepth(21).setVisible(false);
    this.fade=this.add.rectangle(640,360,1280,720,0x000000,1).setDepth(2000).setAlpha(0);
  }
  setText(key,value,max) {
    if(this.ui[key]===value&&this.ui[key+'Width']===max)return;this.ui[key]=value;this.ui[key+'Width']=max;const object=this[key];object.setText(value).setScale(1);
    if(object.width>max)object.setScale(max/object.width);
  }
  showPanel(title,body,choices,options) {
    if(this.handheld)this.handheld.close(false);
    options=options||{};this.closePanel(false);this.held=Object.create(null);
    if(this.model)this.model.paused=true;this.hubMotion.paused=true;
    const root=this.add.container(0,0).setDepth(100);
    this.panel={root,choices,index:0,type:options.inspect?'inspect':'normal',buttons:[],back:options.back||null};this.releaseMouse();
    root.add(this.add.rectangle(640,360,1280,720,0x101A25,options.inspect?0.27:0.7));
    const cx=options.inspect?958:640,w=options.inspect?570:1040;
    root.add(this.add.rectangle(cx,360,w,544,0x263545,0.98));root.add(OTR.txt(this,cx,127,title,27,'#EBC889',{fit:w-60}));
    const columns=choices.length>4&&!options.inspect?2:1,rows=Math.ceil(choices.length/columns),firstY=612-rows*58;
    const text=OTR.txt(this,cx-w/2+32,170,body,19,'#ffffff',{ox:0,oy:0,wrap:w-64,bold:false,lineSpacing:4});root.add(text);
    if(text.height>firstY-190)text.setScale(Math.min(1,(firstY-190)/text.height));
    choices.forEach((choice,i)=>{
      const bw=(w-80)/columns-12,x=cx+(columns===1?0:(i%2?1:-1)*(bw+20)/2),y=firstY+Math.floor(i/columns)*58+24;
      const hit=this.add.rectangle(x,y,bw,46,0x42556A,1).setInteractive({useHandCursor:true});
      const label=OTR.txt(this,x,y,`${i+1}. ${choice.label}`,18,'#ffffff',{fit:bw-24});
      hit.on('pointerover',()=>{if(this.panel){this.panel.index=i;this.highlight();}});hit.on('pointerdown',()=>this.choose(i));
      root.add([hit,label]);this.panel.buttons.push(hit);
    });
    if(options.inspect)root.add(OTR.txt(this,303,514,'A/D rotate · Space use scanner · Esc return',17,'#ffffff',{fit:530,stroke:'#1B2634',strokeW:4}));
    this.highlight();if(OTR.a11y)OTR.a11y.say(OTR.i18n?[title,body].map(t=>OTR.i18n.t(t)).join('. '):title+'. '+body);this.refresh();
  }
  highlight(){if(this.panel)this.panel.buttons.forEach((b,i)=>b.setFillStyle(i===this.panel.index?0x97713D:0x42556A));}
  choose(index){if(!this.panel||this.transitioning)return;const choice=this.panel.choices[index];if(choice){this.inputBlockedUntil=this.time.now+180;choice.action();}}
  closePanel(resume=true){
    if(this.panel){this.panel.root.destroy();this.panel=null;}this.held=Object.create(null);if(OTR.a11y)OTR.a11y.hush();
    if(resume){if(this.model)this.model.paused=this.model.phase==='debrief';this.hubMotion.paused=false;this.capture();}
  }
  capture(){const canvas=this.sys.game.canvas;if(!canvas.requestPointerLock||document.pointerLockElement===canvas)return;
    try{const p=canvas.requestPointerLock();if(p&&p.catch)p.catch(()=>{});}catch(_){/* Drag look remains available. */}}
  releaseMouse(){if(document.pointerLockElement===this.sys.game.canvas)document.exitPointerLock();}
  message(text){this.notice=text||'';this.noticeUntil=this.time.now+5000;}
  write(){this.saved=OTR.fpStore.write(this.progress);return this.saved;}
  checkpoint(){if(!this.progress)return;if(this.model&&this.model.phase!=='debrief')this.progress[this.model.kind]=this.model.snapshot();this.write();this.lastSave=this.time?this.time.now:0;}
  transition(action){
    if(this.handheld)this.handheld.close(false);
    if(this.transitioning)return;this.transitioning=true;this.closePanel(false);this.checkpoint();this.capture();
    this.tweens.add({targets:this.fade,alpha:1,duration:180,onComplete:()=>{action();this.sync();this.tweens.add({targets:this.fade,alpha:0,duration:240,onComplete:()=>{this.transitioning=false;if(!this.panel){if(this.model)this.model.paused=false;this.hubMotion.paused=false;}}});}});
  }
  launch(kind){this.transition(()=>{
    let m=OTR.fpMission.restore(this.progress[kind]);const resumed=!!m;if(!m){this.progress.sequence++;m=OTR.fpMission.create(kind,this.progress.sequence);}
    this.model=m;this.area='route';this.target=null;this.checkpoint();
    const body=kind==='practice'?'Scan and load the three parcels into positions you choose. Then retrieve the requested parcel, put it back and secure the load. Return to Dispatch to finish.':
      m.stops.map(s=>`${s.address} — ${m.serviceLabel(s.id)}`).join('\n')+'\n\nCheck the tires and lights, scan the parcels and secure the load. Deliver each stop, bring retained parcels to Returns, then check in at Dispatch.';
    this.showPanel(resumed?'Resume your shift':kind==='practice'?'Cargo practice':'Your workday',body,[{label:resumed?'Continue':'Begin preparation',action:()=>this.closePanel()},{label:'Back to hub',action:()=>this.toHub()}]);
  });}
  toHub(){this.transition(()=>{this.model=null;this.area='hub';this.target=null;Object.assign(this.hubMotion.player,{x:0,z:4.6,yaw:0,pitch:0});});}
  showPause(){
    if(this.loading||this.external||this.transitioning)return;if(this.model&&this.model.phase==='debrief'){this.showDebrief(this.progress.last);return;}
    const choices=[{label:'Continue',action:()=>this.closePanel()}];
    if(this.area==='hub')choices.push({label:this.progress.campaign?'Resume workday':'Start workday',action:()=>this.launch('campaign')},{label:this.progress.practice?'Resume cargo practice':'Cargo practice',action:()=>this.launch('practice')},{label:'Last debrief',action:()=>this.showDebrief(this.progress.last)});
    else choices.push({label:'Save and return to hub',action:()=>this.toHub()},{label:'Handheld',action:()=>this.showScanner()});
    choices.push({label:'Settings',action:()=>this.showSettings()},{label:'Main game',action:()=>this.leavePrototype()});
    this.showPanel(this.area==='hub'?'Your training hub':'Paused',this.area==='hub'?'Walk to a station, point at it and press E. You can also choose below.\nClick to capture the mouse, or hold the left button and drag to look.':'The shift is paused. Progress is saved on this device; you can resume from the hub.',choices);this.checkpoint();
  }
  leavePrototype(){this.checkpoint();const q=new URLSearchParams(location.search);q.delete('lab');q.delete('bench');location.assign('index.html'+(q.toString()?'?'+q.toString():''));}
  showSettings(){
    const quality=level=>{this.checkpoint();const q=new URLSearchParams(location.search);q.set('gfx',level);location.assign('index.html?'+q.toString());};
    this.showPanel('Settings',`Graphics: ${OTR.gfx.level()}\nMouse sensitivity: ${this.sensitivity.toFixed(4)}\nExisting key remaps apply. Course settings and trainer tools are available through Main game.`,[
      {label:'Low graphics',action:()=>quality('low')},{label:'High graphics',action:()=>quality('high')},
      {label:'Slower mouse look',action:()=>{this.sensitivity=Math.max(0.0005,this.sensitivity-0.0005);this.showSettings();}},
      {label:'Faster mouse look',action:()=>{this.sensitivity=Math.min(0.006,this.sensitivity+0.0005);this.showSettings();}},
      {label:'Language',action:()=>this.showLanguages()},{label:'Back',action:()=>this.showPause()}]);
  }
  showLanguages(){
    this.closePanel(false);this.external=true;const before=new Set(this.children.list);OTR.ui.languages(this);
    const root=this.children.list.find(o=>!before.has(o)&&o.type==='Container');
    if(root)root.once('destroy',()=>{this.external=false;this.showSettings();});else{this.external=false;this.showSettings();}
  }
  showScanner(){if(!this.model){this.showPause();return;}if(this.handheld)this.handheld.toggle();}
  showRoute(){
    const m=this.model,choices=m.pending().map(s=>({label:s.address,action:()=>{m.activeStop=s.id;m.touch();this.checkpoint();this.closePanel();}}));choices.push({label:'Back',action:()=>this.closePanel()});
    this.showPanel('Route',m.kind==='practice'?'Driving is outside this cargo lesson.':m.pending().length?'Choose your next stop. Maple Ave runs north from the depot. Birch Lane is at the far junction. Use the turning area at the north end to return.':'All stops have a recorded outcome. Return south to the depot. Bring retained parcels to Returns, then check in at Dispatch.',choices,{back:()=>this.closePanel()});
  }
  showParcel(id){
    if(!id)this.aimTarget();
    const m=this.model,p=m&&m.parcel(id||m.heldId||this.target);if(!m||!m.canParcel(p))return;this.inspectId=p.id;this.inspectAngle=0;
    this.showPanel('Parcel label',[p.address,p.tracking,`Weight: ${p.weight} kg`,m.serviceLabel(p.stop),p.scanned?'Scanned':'Not scanned'].join('\n'),[
      {label:'Use scanner',action:()=>this.handheld.scan()},
      {label:p.location==='held'?'Return to walking':'Pick up',action:()=>{if(p.location!=='held')this.message(m.pickup(p.id));this.checkpoint();this.closePanel();}},
      {label:'Back',action:()=>this.closePanel()}],{inspect:true,back:()=>this.closePanel()});
  }
  showInspection(part){
    const m=this.model;if(!m||!m.near(part))return;const bad=!m.repaired&&m.fault===part;
    const condition=part==='tyres'?(bad?'A bulge is visible in the tire sidewall.':'The tire sidewalls are intact and the tread is visible.'):(bad?'The left headlamp does not illuminate during the light test.':'Both headlamps illuminate during the light test.');
    const choose=decision=>{this.message(m.inspectVan(part,decision));this.checkpoint();this.closePanel();};
    this.showPanel(part==='tyres'?'Tire inspection':'Light test',condition,[{label:'Mark serviceable',action:()=>choose('ready')},{label:'Request repair',action:()=>choose('repair')},{label:'Back',action:()=>this.closePanel()}],{back:()=>this.closePanel()});
  }
  showDoor(id){
    const m=this.model,s=m.stop(id);if(!s||!m.near('door'+id))return;if(s.resolved){this.message('This stop already has a recorded outcome.');return;}
    const held=m.parcel(m.heldId),body=[s.address,m.serviceLabel(id),'',s.contacted?(s.service==='handover'?'The resident confirms the address.':'Nobody answers.'):'Attempt contact, then follow the shipment requirements.',`Carrying: ${held?held.address:'No parcel'}`].join('\n');
    const choices=s.contacted?[{label:'Record on handheld',action:()=>this.handheld.delivery(id)}]:[{label:'Knock / ring',action:()=>{this.message(m.contact(id));this.checkpoint();this.showDoor(id);}}];
    choices.push({label:'Back',action:()=>this.closePanel()});this.showPanel('Delivery',body,choices,{back:()=>this.closePanel()});
  }
  showDispatch(){
    const m=this.model;this.showPanel('Dispatch',this.objectiveText(),[
      {label:m.kind==='practice'?'Finish practice':'Finish workday',action:()=>{const message=m.finish();if(message){this.message(message);this.closePanel();return;}
        this.progress.last={kind:m.kind,seed:m.seed,logs:OTR.fpMission.clone(m.logs),elapsed:Math.round(m.elapsed)};this.progress[m.kind]=null;this.write();this.showDebrief(this.progress.last);}},
      {label:'View manifest',action:()=>this.showScanner()},{label:'Back',action:()=>this.closePanel()}],{back:()=>this.closePanel()});
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
    if(this.area==='hub'){if(id==='hub-day')this.launch('campaign');else if(id==='hub-practice')this.launch('practice');else if(id==='hub-record')this.showDebrief(this.progress.last);return;}
    if(m.mode==='cab'){if(!m.exit())this.message('Stop and set the parking brake before exiting.');this.checkpoint();return;}
    let result='';
    if(id==='driver')result=m.enter();else if(id==='cargo')result=m.toggleCargo();else if(id==='secure')result=m.secure();
    else if(id==='tyres'||id==='lights'){this.showInspection(id);return;}else if(id==='dispatch'){this.showDispatch();return;}
    else if(id==='returns'){this.handheld.scan();return;}else if(id&&id.startsWith('door')){this.showDoor(Number(id.slice(4)));return;}
    else if(id&&id.startsWith('slot'))result=m.place(id);else if(id&&id.startsWith('parcel')){if(m.heldId)result=m.putBack();else result=m.pickup(id);}
    else if(m.heldId)result=m.putBack();if(result)this.message(result);this.checkpoint();this.sync();this.refresh();
  }
  installInput(){
    const canvas=this.sys.game.canvas,handlers=[],listen=(o,name,fn)=>{o.addEventListener(name,fn);handlers.push(()=>o.removeEventListener(name,fn));};
    listen(canvas,'pointerdown',e=>{if(e.button!==0||this.loading||this.panel||this.external||this.transitioning||this.time.now<(this.inputBlockedUntil||0))return;
      if(this.handheld&&this.handheld.isOpen){if(this.handheld.aiming){this.handheld.trigger=true;this.capture();}return;}
      if(document.pointerLockElement===canvas)this.interact();else this.pointerStart={x:e.clientX,y:e.clientY};});
    listen(window,'pointerup',()=>{if(this.handheld)this.handheld.trigger=false;});
    listen(canvas,'pointerup',e=>{const start=this.pointerStart;this.pointerStart=null;if(!start||this.panel||this.external||this.transitioning)return;
      if(Math.hypot(e.clientX-start.x,e.clientY-start.y)<4){this.capture();this.interact();}});
    listen(window,'mousemove',e=>{if(this.panel||this.external||this.transitioning||(this.handheld&&this.handheld.isOpen&&!this.handheld.aiming))return;if(document.pointerLockElement!==canvas&&!(e.buttons&1&&e.target===canvas))return;
      const p=this.area==='hub'?this.hubMotion.player:this.model.player;
      if(this.model&&this.model.mode==='cab')this.model.van.look=OTR.fp.clamp(this.model.van.look+e.movementX*this.sensitivity,-1.5,1.5);else p.yaw+=e.movementX*this.sensitivity;
      p.pitch=OTR.fp.clamp(p.pitch+e.movementY*this.sensitivity,-1.05,1.05);});
    const codes=new Set(['KeyW','KeyS','KeyA','KeyD','ArrowUp','ArrowDown','ArrowLeft','ArrowRight','KeyE','KeyF','KeyR','KeyB','KeyM','KeyQ','KeyC','KeyH','KeyV','Tab','Space','Escape','Enter','Backspace',...Array.from({length:9},(_,i)=>'Digit'+(i+1))]);
    listen(window,'keydown',e=>{
      if(this.loading||this.external||!codes.has(e.code)||e.ctrlKey||e.metaKey||e.altKey)return;e.preventDefault();const first=!this.held[e.code];this.held[e.code]=true;if(!first||e.repeat||this.transitioning)return;
      if(this.handheld&&this.handheld.isOpen){
        const hh=this.handheld;
        if(e.code==='Tab')hh.close();
        else if(e.code==='Escape'){if(hh.aiming)hh.home();else hh.close();}
        else if(e.code==='KeyH'){hh.close(false);this.showPause();}
        else if(e.code==='Backspace'){const back=hh.device.current&&hh.device.current.back;if(back)back();else hh.home();}
        else if(/^Digit[1-9]$/.test(e.code))hh.choose(Number(e.code.slice(5))-1);
        return;
      }
      if(this.panel){
        if(e.code==='Escape'){if(this.panel.back)this.panel.back();else this.closePanel();return;}
        if(this.panel.type==='inspect'&&e.code==='Space'){this.handheld.scan();return;}
        if(/^Digit[1-9]$/.test(e.code)){this.choose(Number(e.code.slice(5))-1);return;}
        if(e.code==='ArrowDown'||e.code==='ArrowUp'){this.panel.index=(this.panel.index+(e.code==='ArrowDown'?1:-1)+this.panel.choices.length)%this.panel.choices.length;this.highlight();return;}
        if(e.code==='Enter')this.choose(this.panel.index);return;
      }
      if(e.code==='Escape'||e.code==='KeyH'){this.showPause();return;}if(e.code==='KeyE'||e.code==='Enter'){this.interact();return;}
      if(e.code==='Tab'){this.showScanner();return;}if(e.code==='KeyF'){this.showParcel();return;}
      const m=this.model;if(m&&m.mode==='cab'){
        if(e.code==='Space')m.van.hand=!m.van.hand;if(e.code==='KeyB')m.van.belt=!m.van.belt;
        if(e.code==='KeyR'&&!m.shiftGear())this.message('Stop before selecting drive or reverse.');if(e.code==='KeyM')m.mirror();
        if(e.code==='KeyQ')m.signal=m.signal===-1?0:-1;if(e.code==='KeyC')m.signal=m.signal===1?0:1;if(e.code==='KeyV'){m.van.look=0;m.player.pitch=0;}m.touch();
      }
    });
    listen(window,'keyup',e=>{delete this.held[e.code];});
    const pause=()=>{this.held=Object.create(null);if(this.handheld)this.handheld.close(false);if(this.model)this.model.paused=true;this.hubMotion.paused=true;this.checkpoint();if(!this.panel&&!this.external&&!this.transitioning)this.showPause();};
    listen(window,'blur',pause);listen(document,'visibilitychange',()=>{if(document.hidden)pause();});
    listen(document,'pointerlockchange',()=>{if(document.pointerLockElement!==canvas&&!this.panel&&!this.external&&!this.transitioning&&!(this.handheld&&this.handheld.isOpen&&!this.handheld.aiming))pause();});
    listen(window,'pagehide',()=>this.checkpoint());this.events.once('shutdown',()=>{handlers.forEach(remove=>remove());this.held=Object.create(null);this.releaseMouse();});
  }
  objectiveText(){
    const m=this.model;if(!m)return 'Choose a workday or a focused cargo lesson.';
    if(m.kind==='practice'){if(!m.requested)return 'Scan and place all three parcels in the van. Choose your shelf positions.';
      if(!m.retrievals)return `Retrieve ${m.parcel(m.requested).address} from the shelf where you loaded it.`;return 'Replace the parcel, secure the load, then finish at Dispatch.';}
    if(m.phase==='prepare')return 'Check tires and lights, scan and load three parcels, then secure the load and close cargo.';
    if(m.phase==='return')return 'Return south to the depot. Scan retained parcels at Returns, then finish at Dispatch.';
    if(m.phase==='debrief')return 'Review the shift, then return to the hub.';
    const s=m.stop(m.activeStop),p=m.mode==='cab'?m.van:m.player;return s.address+' · '+Math.round(Math.hypot(p.x-s.x,p.z-s.z))+' m · '+m.serviceLabel(s.id);
  }
  refresh(){
    if(this.loading)return;const m=this.model,mode=m?m.mode:'walk';
    const device=!!(this.handheld&&this.handheld.isOpen),aiming=device&&this.handheld.aiming;
    this.status.setVisible(!device);this.controls.setX(device?414:640);this.help.setX(device?414:640);
    this.hint.setX(device?414:640);this.hintBack.setX(device?414:640).setDisplaySize(device?790:1210,48);
    this.setText('title',this.area==='hub'?'ON THE ROUTE · HUB':m.kind==='practice'?'CARGO PRACTICE':'ON THE ROUTE · WORKDAY',410);this.setText('objective',this.objectiveText(),device?790:1220);
    // pieces joined by ' · ', each a whole phrase or a template, so every language can translate it
    const loaded=m?m.parcels.filter(p=>p.location.startsWith('slot')).length:0;
    const status=!m?'':mode==='cab'?[`${Math.round(Math.abs(m.van.speed)*2.23694)} mph`,m.van.gear>0?'D':'R',m.van.hand?'Brake on':'Brake off',m.van.belt?'Belt on':'Belt off',m.signal<0?'←':m.signal>0?'→':'—'].join(' · '):
      m.heldId?`Carrying: ${m.parcel(m.heldId).address}`:loaded===1?'1 parcel in cargo':`${loaded} parcels in cargo`;this.setText('status',status,790);
    const k=code=>OTR.a11y?OTR.a11y.label(OTR.a11y.physical(code)):code;
    const wasd=k('KeyW')+k('KeyA')+k('KeyS')+k('KeyD'),t=s=>OTR.i18n.t(s),saving=this.saved?'Saved on this device':'Saving unavailable — keep this window open';
    if(!device){this.setText('controls',(mode==='cab'?[`${k('KeyW')}/${k('KeyS')} accelerate / brake`,`${k('KeyA')}/${k('KeyD')} steer`,`${k('Space')} parking brake`,`${k('KeyR')} gear`,`${k('KeyB')} belt`]:[`${wasd} move`,`${k('KeyE')} interact`,`${k('KeyF')} inspect`,`${k('Tab')} handheld`,`${k('KeyH')} menu`]).join(' · '),1230);
    // the two halves are translated before they are joined: "   |   " is not a place the translator splits
    this.setText('help',t((mode==='cab'?[`${k('KeyM')} left mirror`,`${k('KeyQ')} / ${k('KeyC')} signals`,`${k('KeyV')} look forward`,`${k('KeyE')} exit`,`${k('KeyH')} menu`]:['Mouse looks','Click or E interacts','Drag to look without mouse capture','Esc pauses']).join(' · '))+'   |   '+t(saving),1220);
    }else{
      this.setText('controls',aiming?[`${wasd} move`,'Mouse aim',`Hold ${k('Space')} or left click to scan`].join(' · '):'Click or use number keys · Backspace goes back',790);
      this.setText('help',t([`${k('Tab')} put away`,'Esc back',`${k('KeyH')} pause`].join(' · '))+'   |   '+t(saving),790);
    }
    let hint='';const id=this.target;
    if(this.area==='hub')hint=id==='hub-day'?(this.progress.campaign?'E resume workday':'E start workday'):id==='hub-practice'?'E cargo practice':id==='hub-record'?'E last debrief':'H opens the hub menu';
    else if(mode==='cab')hint=m.van.hand?'Set your belt, check the mirror and release the parking brake.':'15 mph limit · Keep right · Stop at the junction line';
    else if(id==='driver')hint='E enter cab';else if(id==='cargo')hint=m.cargoOpen?'E close cargo doors':'E open cargo doors';else if(id==='secure')hint='E secure the load';
    else if(id==='tyres'||id==='lights')hint=id==='tyres'?'E inspect tires':'E inspect lights';else if(id==='dispatch')hint='E check in at Dispatch';else if(id==='returns')hint='E use scanner to return the retained parcel';
    else if(id&&id.startsWith('parcel')){const p=m.parcel(id);hint=p.address+' · E pick up · F inspect · Tab handheld';}
    else if(id&&id.startsWith('slot'))hint=OTR.fpMission.slots.find(s=>s.id===id).name+' · E place the parcel';
    else if(id&&id.startsWith('door'))hint=m.stop(id.slice(4)).address+' · E attempt delivery';else if(m.heldId)hint='Choose an empty cargo shelf, or approach the correct delivery point.';
    if(this.notice&&this.time.now<this.noticeUntil)hint=this.notice;
    if(aiming)hint=this.handheld.focusId?`Barcode in sight · Hold ${k('Space')} or left click to scan`:'Aim at the barcode, or pick up the parcel to bring its label closer.';
    const blocked=!!this.panel||this.external||this.transitioning||(device&&!aiming);this.setText('hint',blocked?'':hint,device?750:1160);this.hintBack.setVisible(!blocked&&!!hint);this.reticle.setVisible(!blocked&&mode==='walk');this.mirrorLabel.setVisible(!!this.view&&this.view.mirror.on&&!blocked);
    this.scanBeam.clear();
    if(aiming){const color=this.handheld.focusId?0x2BC48A:0xF0435A;this.scanBeam.lineStyle(2,color,0.9);this.scanBeam.strokeRect(609,340,62,40);
      if(this.handheld.progress>0){this.scanBeam.fillStyle(0x1B2634,0.9);this.scanBeam.fillRect(570,395,140,8);this.scanBeam.fillStyle(color,1);this.scanBeam.fillRect(570,395,140*Math.min(1,this.handheld.progress/0.45),8);}}
  }
  sync(){if(this.art)this.art.sync(this.model,this.hubMotion.player,this.area);}
  update(time,delta){
    if(this.loading||!this.view)return;const h=this.held,controls={forward:!!(h.KeyW||h.ArrowUp),back:!!(h.KeyS||h.ArrowDown),left:!!(h.KeyA||h.ArrowLeft),right:!!(h.KeyD||h.ArrowRight)};
    if(this.panel&&this.panel.type==='inspect')this.inspectAngle+=(Number(!!h.KeyD)-Number(!!h.KeyA))*Math.min(delta/1000,0.05)*1.8;
    if(!this.panel&&!this.external&&!this.transitioning){if(this.model)this.model.step(controls,delta/1000);else this.hubMotion.step(controls,delta/1000);}this.sync();
    if(this.handheld&&this.handheld.aiming&&!this.panel&&!this.external&&!this.transitioning)this.handheld.tick(delta/1000,!!h.Space||this.handheld.trigger);
    if(time-this.lastAim>90){this.target=(!this.panel&&!this.external&&(!this.model||this.model.mode==='walk'))?this.art.pick():null;this.lastAim=time;const occupied=[];
      this.labels.forEach(({label,object})=>{const p=!this.panel&&!this.external&&!(this.handheld&&this.handheld.isOpen)?this.art.labelPosition(label):null;
        if(!p||occupied.some(q=>Math.abs(q.x-p.x)<230&&Math.abs(q.y-p.y)<35)||(this.view.mirror.on&&p.x<380&&p.y<310)){object.setVisible(false);return;}
        occupied.push(p);object.setPosition(p.x,p.y).setVisible(true);});}
    if(this.model&&!this.model.paused&&time-this.lastSave>3000)this.checkpoint();this.refresh();
  }
}
OTR.registerScene(FirstPersonScene);
