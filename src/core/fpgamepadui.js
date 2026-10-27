/* Owned 3D controls presentation. Draft bindings belong to this scene until the shared writer contract lands. */
window.OTR=window.OTR||{};
OTR.fpGamepadUI={
 entries:[
  ['axes','steer','Walk or steer left and right',1],['axes','moveY','Walk forward and backward',1],
  ['axes','lookX','Look left and right',1],['axes','lookY','Look up and down',1],
  ['buttons','throttle','Accelerate',1],['buttons','brake','Brake',1],
  ['buttons','interact','Interact or scan',7],['buttons','back','Back',7],
  ['buttons','gear','Change gear',1],['buttons','focus','Select the next nearby target',5],
  ['buttons','signalLeft','Signal left',1],['buttons','signalRight','Signal right',1],
  ['buttons','handheld','Open or close the handheld',7],['buttons','pause','Open the menu',7],
  ['buttons','handbrake','Set the parking brake',1],['buttons','belt','Fasten the seatbelt',1],
  ['buttons','lookForward','Look forward',1],['buttons','careful','Walk carefully',1],
  ['buttons','menuUp','Previous menu choice',2],['buttons','menuDown','Next menu choice',2],
  ['buttons','menuLeft','Previous menu choice',2],['buttons','menuRight','Next menu choice',2]
 ],
 value(scene,group,name){return scene.gamepad.bindings()?.[group]?.[name]??OTR.fpGamepad.defaults[group][name];},
 label(scene,group,name){const n=this.value(scene,group,name);return n<0?'Disabled':group==='axes'?`Axis ${n+1}`:`Button ${n+1}`;},
 open(scene,page=0,back){
  const g=scene.gamepad;if(!g)return;back=back||(()=>OTR.fpAccess.keys(scene,0));
  const lines=[
   ['Move and look with the gamepad.',`Use ${this.label(scene,'axes','steer')} and ${this.label(scene,'axes','moveY')} to walk. Use ${this.label(scene,'axes','lookX')} and ${this.label(scene,'axes','lookY')} to look.`],
   ['Drive with the gamepad.',`Use ${this.label(scene,'axes','steer')} to steer, ${this.label(scene,'buttons','throttle')} to accelerate and ${this.label(scene,'buttons','brake')} to brake. Use ${this.label(scene,'buttons','gear')} to change between drive and reverse while stopped.`],
   ['Use the cab controls.',`Use ${this.label(scene,'buttons','belt')} for the seatbelt and ${this.label(scene,'buttons','handbrake')} for the parking brake. Use ${this.label(scene,'buttons','signalLeft')} and ${this.label(scene,'buttons','signalRight')} for the signals.`],
   ['Use menus and the handheld.',`Use ${this.label(scene,'buttons','interact')} to choose or interact and ${this.label(scene,'buttons','back')} to go back. Use ${this.label(scene,'buttons','handheld')} for the handheld. Hold the interact button to scan while aiming.`],
   ['Connect a standard gamepad.',`Press a gamepad button to connect, then release all controls. Use ${this.label(scene,'buttons','menuUp')} and ${this.label(scene,'buttons','menuDown')} to choose menu options. Keyboard and mouse controls remain available.`]
  ];
  const [title,body]=lines[page],again=()=>this.open(scene,page,back);
  scene.showPanel(title,body,[
   {label:'Next page',action:()=>this.open(scene,(page+1)%lines.length,back)},
   {label:'Change gamepad controls',action:()=>this.bindings(scene,0,again)},
   {label:'Back',action:back}
  ],{back,accessibleText:true});
 },
 bindings(scene,page=0,back){
  back=back||(()=>this.open(scene));const pages=Math.ceil(this.entries.length/3),again=()=>this.bindings(scene,page,back),g=scene.gamepad;
  scene.showPanel('Gamepad controls','Changes apply to this 3D session. Keyboard controls stay the same.',[
   ...this.entries.slice(page*3,page*3+3).map(([group,name,label])=>({label:`${this.label(scene,group,name)}: ${OTR.i18n.t(label)}`,action:()=>this.edit(scene,group,name,label,again)})),
   {label:'Next page',action:()=>this.bindings(scene,(page+1)%pages,back)},
   {label:'Stick sensitivity',action:()=>this.deadzone(scene,again)},
   {label:'Restore default gamepad controls',action:()=>{
    scene.showPanel('Restore default gamepad controls','Reset gamepad controls for this 3D session?',[
     {label:'Restore defaults',action:()=>{g.session={};g.reset();again();}},
     {label:'Cancel',action:again}
    ],{back:again,accessibleText:true});
   }},
   {label:'Back',action:back}
  ],{back,accessibleText:true});
 },
 edit(scene,group,name,label,back){
  scene.showPanel('Change a gamepad control',label,[
   {label:'Choose a new input',action:()=>this.capture(scene,group,name,back)},
   {label:'Disable this input',action:()=>{this.apply(scene,group,name,-1);back();}},
   {label:'Back',action:back}
  ],{back,accessibleText:true});
 },
 apply(scene,group,name,value){
  const current=scene.gamepad.bindings()||{};
  const next={...current,axes:{...current.axes},buttons:{...current.buttons}};
  if(value===OTR.fpGamepad.defaults[group][name])delete next[group][name];else next[group][name]=value;
  scene.gamepad.session=next;scene.gamepad.reset();
 },
 conflict(scene,group,name,value){
  const entry=this.entries.find(e=>e[0]===group&&e[1]===name);
  return this.entries.some(e=>e[0]===group&&e[1]!==name&&(e[3]&entry[3])&&this.value(scene,group,e[1])===value);
 },
 capture(scene,group,name,back){
  const g=scene.gamepad;
  scene.showPanel('Choose a gamepad input',group==='axes'?'Release all controls, move one stick axis, then release it. Escape cancels.':'Release all controls, press one button, then release it. Escape cancels.',[
   {label:'Cancel',action:back}
  ],{back,accessibleText:true});
  g.startCapture(group,value=>{
   if(this.conflict(scene,group,name,value)){
    scene.showPanel('Choose another gamepad input','That input is already assigned to an action used at the same time. Choose another input or disable its other action first.',[
     {label:'Try again',action:()=>this.capture(scene,group,name,back)},
     {label:'Back',action:back}
    ],{back,accessibleText:true});
   }else{this.apply(scene,group,name,value);back();}
  });
 },
 deadzone(scene,back){
  const current=scene.gamepad.bindings()?.deadzone??OTR.fpGamepad.defaults.deadzone;
  scene.showPanel('Stick sensitivity',`Ignore stick movement below ${Math.round(current*100)} percent. Choose a higher value if the view or steering moves while the stick is released.`,[
   ...[.1,.18,.3].map(deadzone=>({label:`Ignore movement below ${Math.round(deadzone*100)} percent.`,action:()=>{
    scene.gamepad.session={...scene.gamepad.bindings(),deadzone};scene.gamepad.reset();this.deadzone(scene,back);
   }})),
   {label:'Back',action:back}
  ],{back,accessibleText:true});
 }
};
