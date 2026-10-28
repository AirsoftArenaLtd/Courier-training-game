/* A short first-morning card and contextual help. Guidance never changes mission or scoring state. */
window.OTR=window.OTR||{};
OTR.fpGuide={
  state(scene){return scene.progress.guidance||(scene.progress.guidance={intro:false,seen:[]});},
  controls(){
    const k=code=>OTR.fpAccess.key(code);return [
      `Use ${k('KeyW')}/${k('KeyA')}/${k('KeyS')}/${k('KeyD')} to move and ${OTR.fpAccess.lookKeys()} to look.`,
      `Press ${k('KeyP')} to select a visible nearby target. Press ${k('KeyE')} to interact.`,
      `Press ${k('KeyJ')} to read a visible road sign. Press it again to read the next sign.`,
      `Press ${k('Tab')} for the handheld. Use arrows and Enter to choose, then hold ${k('Space')} to scan.`,
      'Start at Dispatch. Read the morning brief before inspecting and loading the van.',
      `Press ${k('KeyH')} to reopen Controls and guidance at any time.`
    ].join('\n');
  },
  opening(scene,resumed){
    const m=scene.model,s=this.state(scene);if(s.intro||m.kind!=='campaign'||m.departed||m.phase!=='prepare')return false;
    const begin=()=>{s.intro=true;scene.checkpoint();scene.closePanel();};
    scene.showPanel('Your first workday',this.controls(),[
      {label:resumed?'Continue':'Begin preparation',action:begin},
      {label:'Workday steps',action:()=>this.steps(scene,0,()=>this.opening(scene,resumed))},
      {label:'Back to hub',action:()=>scene.toHub()}
    ],{preserveGaze:resumed});return true;
  },
  open(scene,back){
    back=back||(()=>scene.showPause());scene.showPanel('Controls and guidance',this.controls(),[
      {label:'Workday steps',action:()=>this.steps(scene,0,()=>this.open(scene,back))},
      {label:'Change the 3D controls',action:()=>OTR.fpAccess.keys(scene,0)},
      ...(scene.gamepad&&OTR.fpGamepadUI?[{label:'Gamepad controls',action:()=>OTR.fpGamepadUI.open(scene,0,()=>this.open(scene,back))}]:[]),
      {label:'Back',action:back}
    ]);
  },
  steps(scene,page,back){
    const k=code=>OTR.fpAccess.key(code),pages=[
      ['Prepare the workday','Read the brief and every manifest page at Dispatch. Inspect the tires and lights, and request a repair when needed. Match each package to the manifest, scan it and load its numbered shelf. Report missing or unlisted packages, confirm the load count and secure the restraints.'],
      ['Drive safely',`Close cargo before entering the cab. Press ${k('KeyB')} for the seatbelt and ${k('Space')} for the parking brake. Look at a physical mirror for a moment before moving or turning. Press ${k('KeyP')} to select it with the keyboard. Use ${k('KeyW')}/${k('KeyS')} to accelerate or brake and ${k('KeyA')}/${k('KeyD')} to steer. Stop and set the parking brake before using the handheld or getting out.`],
      ['Reverse safely.',`Stop, look at the R position on the shifter and press ${k('KeyE')}. The rear camera turns on automatically. Press ${k('KeyP')} to look at its screen with the keyboard. The guidelines bend with the steering, and the distance bands, sensor bars and text show nearby obstacles. Reverse at walking speed. A walk-around is optional unless your trainer requires it in a tight space.`],
      ['Follow the sat nav.',`Follow the map screen on the dash for each turn. A missed turn reroutes; rejoin within 30 seconds. Press ${k('KeyP')} to select the screen, then ${k('KeyE')} to hear its instruction. The screen becomes the rear camera in reverse.`],
      ['Read the road signs.',`Stop fully at stop signs and give way where the sign says. Keep to the speed limit and slow down in school zones. Never enter a one-way street against its direction or pass a no-entry sign. Press ${k('KeyJ')} to hear the sign in view.`],
      ['Watch the lights and people.','Stop behind the line at red, and at amber when you safely can. Before turning right, look at the right mirror and give way to a passing cyclist. Slow early for children at the school crossing and wait until their path is clear.'],
      ['Look after the van.','The van is 10 feet 10 inches tall. Follow the sat nav around low clearances and take another street when warned. Hard turns and braking shift unsecured cargo. Secure the restraints and drive smoothly. Contacts can damage the van where they hit.'],
      ...(scene.model&&scene.model.walkaround?[
        ['Record the pre-trip condition.',`Before departure, walk around the parked van with empty hands. Press ${k('KeyP')} to select each area and ${k('KeyE')} to inspect it. Choose the matching description on the handheld. Check the front, rear, both sides, roof edge, rear left wheel and left mirror. Close cargo before checking the rear.`],
        ['Report damage after the trip.',`After returning to the depot, walk around the van again and record each area's visible condition. Inspect the roof edge from the ground. Existing wear is not your fault. Report every new damaged zone before finishing at Dispatch. Open the workday details on the handheld to review the records.`]
      ]:[]),
      ...(scene.model&&OTR.fpStopFlow&&OTR.fpStopFlow.enabled(scene.model)?[
        ['Use the delivery site controls.','At an intercom, call the correct entry, identify the delivery and wait for the buzz. At reception, record the recipient and required signature. Use a locker only for the parcel authorized in the brief; scan, deposit, close and photograph it. Retain failed deliveries and record the card, reason and reattempt.']
      ]:[]),
      ['Complete each stop','Park near the delivery point. Check the path and stay outside a loose dog’s gate. Retrieve the correct package and scan it at the door. Attempt contact, complete any photo ID and signature checks, then record the required delivery outcome. Keep exception packages for return.'],
      ['Return to Dispatch','After all five stops, return the van to the depot and set the parking brake. Retrieve retained packages, bring each to Returns and scan it back in. Check in at Dispatch and choose Finish workday to see the results.']
    ];
    const [title,body]=pages[page],choices=[];if(page+1<pages.length)choices.push({label:'Next',action:()=>this.steps(scene,page+1,back)});choices.push({label:'Back',action:back});scene.showPanel(title,body,choices,{accessibleText:page>=2});
  },
  hint(scene,id){
    // Module adapters own their guidance; a saved workday must not speak into an assessment.
    if(scene.scenarioSession)return null;
    const m=scene.model;if(!m||!id||m.phase==='debrief'||scene.panel||scene.external||scene.transitioning||scene.handheld&&scene.handheld.isOpen)return null;
    const s=this.state(scene),now=scene.time.now;if(!s.intro)return null;
    if(scene.guideTarget===id&&now<scene.guideUntil)return scene.guideText;
    if(scene.notice&&now<scene.noticeUntil)return null;
    const kind=id.startsWith('parcel')?'parcel':id.startsWith('slot')?'slot':id.startsWith('door')?'door':id.startsWith('gate')?'gate':id.startsWith('hazard')?'hazard':id;
    if(s.seen.includes(kind))return null;
    const tips={
      dispatch:'Read the morning brief and every manifest page here. Return here after completing the route.',
      tyres:'Inspect the tires before departure. Request a repair if you find a defect.',
      lights:'Test the lights before departure. Request a repair if a lamp does not work.',
      parcel:'Match the label to the manifest. Pick up the package, then scan it on the handheld.',
      slot:'Load each package on its numbered shelf. Its recorded shelf helps you find it at the stop.',
      cargo:'Open cargo to load or retrieve packages. Step outside before closing the cargo doors.',
      secure:'Secure the restraints after loading or retrieving a package, before driving again.',
      driver:'Fasten the seatbelt. Check mirrors and signals, then release the parking brake when the path is clear.',
      door:'Scan the correct package here, attempt contact and complete the required checks before recording an outcome.',
      gate:'Stay outside the closed gate. Call the owner to secure the dog, or retain the package and record an unsafe-access exception.',
      hazard:'Look at the path before carrying the package through. Clear movable hazards with empty hands, or avoid the slippery patch.',
      returns:'Bring each retained package here and scan it back in before finishing at Dispatch.'
    };
    if(!tips[kind])return null;s.seen.push(kind);scene.guideTarget=id;scene.guideText=tips[kind];scene.guideUntil=now+6500;scene.write();if(OTR.a11y)OTR.a11y.say(tips[kind]);return tips[kind];
  }
};
