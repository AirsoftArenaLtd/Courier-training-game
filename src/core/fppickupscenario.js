/* The three authored M7 pickups use physical parcels, counter paperwork and an isolated local result. */
window.OTR=window.OTR||{};
OTR.fpPickupScenario={
  panel(scene,title,body,choices){const s=scene.model.pickupTask,v=s.version,target=scene.art.pick();scene.showPanel(title,body,choices.map(c=>({...c,action:()=>{if(scene.scenarioSession.phase==='active'&&scene.model.pickupTask===s&&s.version===v)c.action();}})),{accessibleText:true,back:()=>scene.closePanel()});if(scene.panel)scene.panel.pickupTarget=target;},
  notice(scene,body){this.panel(scene,'Read the pickup information.',body,[{label:'Return to the counter.',action:()=>scene.closePanel()}]);},
  facing(scene,id){return scene.art.pick()===id;},
  talk(scene,page=0){
    const s=scene.model.pickupTask,t=s.talk,K=OTR.fpPickup;if(s.stage!=='talk'){this.notice(scene,'Count and inspect the outgoing pieces, then complete the pickup receipt.');return;}
    if(t.phase==='choices'){
      page=page%t.choices.length;const ch=t.choices[page];this.panel(scene,'Speak with the shipper.',t.node.text+'\n\n'+ch.text,[
        {label:'Use this reply.',action:()=>{if(K.chooseTalk(s,page))this.talkNext(scene);}},
        {label:'Read the next reply.',action:()=>this.talk(scene,(page+1)%t.choices.length)},
        {label:'Return to the counter.',action:()=>scene.closePanel()}
      ]);
    }else this.panel(scene,'Speak with the shipper.',t.phase==='feedback'?t.feedback:t.node.text,[{label:'Continue the conversation.',action:()=>{if(K.advanceTalk(s))this.talkNext(scene);}},{label:'Return to the counter.',action:()=>scene.closePanel()}]);
  },
  talkNext(scene){if(scene.model.pickupTask.stage==='talk')this.talk(scene);else this.notice(scene,'Count each outgoing piece yourself, then face the manifest to reconcile the count.');},
  manifest(scene,page=0){
    const s=scene.model.pickupTask,K=OTR.fpPickup,k=Object.keys(s.counted).length;
    if(s.stage==='talk'){this.notice(scene,`The manifest lists ${s.manifest} pieces. Speak with the shipper before counting the outgoing pieces.`);return;}
    if(s.countAnswered){this.notice(scene,`The manifest now lists ${s.manifest} pieces. Your count decision has been recorded.`);return;}
    const choices=K.countChoices(s);if(!choices.length){this.notice(scene,`The manifest lists ${s.manifest} pieces. Face each outgoing package and count it before confirming the count.`);return;}
    const ch=choices[page%choices.length];this.panel(scene,'Reconcile the pickup count.',`The manifest lists ${s.manifest} pieces. You counted ${k}.\n\n${ch.text}`,[
      {label:'Confirm this count decision.',action:()=>{if(!this.facing(scene,'pickup-manifest'))return;const result=K.answerCount(s,ch.id);if(result==='recount')this.notice(scene,'The shipper asks you to count the outgoing pieces again before signing.');else if(result)this.notice(scene,s.content.docs?'Your count decision has been recorded. Read the commercial invoice before inspecting the pieces.':'Your count decision has been recorded. Inspect each outgoing piece before accepting or refusing it.');}},
      {label:'Read the next count decision.',action:()=>this.manifest(scene,(page+1)%choices.length)},
      {label:'Return to the counter.',action:()=>scene.closePanel()}
    ]);
  },
  piece(scene,id,page=0){
    const s=scene.model.pickupTask,K=OTR.fpPickup,p=K.piece(s,id);if(!p)return;
    if(s.stage==='talk'){this.notice(scene,'Speak with the shipper before counting or inspecting the outgoing pieces.');return;}
    if(s.stage==='count'){if(this.facing(scene,'pickup-parcel-'+id))K.count(s,id);scene.sync();this.notice(scene,`You have counted ${Object.keys(s.counted).length} different outgoing pieces. Face the manifest when you are ready to confirm your count.`);return;}
    if(s.stage==='docs'){this.notice(scene,'Read the commercial invoice and submit your findings before deciding what to do with the pieces.');return;}
    if(s.decided[id]){this.notice(scene,s.decided[id].accept?'You accepted this piece. Your decision at the counter is final.':'You refused this piece. Your decision at the counter is final.');return;}
    if(page===0){
      const no=(p.issues||[]).includes('no_label'),lines=no?['There is no shipping label on this piece.',`The scale reads ${p.weight} pounds.`]:[`The recipient is ${p.to}.`,`The address is ${p.number} ${p.street}.`,`The destination is ${p.city}.`,`The service is ${p.service}.`,`The scale reads ${p.weight} pounds.`];
      this.panel(scene,'Read the outgoing package label.',lines.join('\n'),[{label:'Read the packaging and marks.',action:()=>this.piece(scene,id,1)},{label:'Return to the counter.',action:()=>scene.closePanel()}]);return;
    }
    const issues=p.issues||[],box=issues.includes('crushed')?'One edge is caved in and re-taped.':issues.includes('leaking')?'A dark patch is spreading at the bottom corner.':issues.includes('wet')?'The bottom is damp and soft.':issues.includes('poor_packaging')?'The carton has a thin wall and no padding around heavy contents.':p.size==='env'?'The envelope is flat and sealed.':'The corners are square and the tape is intact.';
    const lines=[box,issues.includes('no_label')?'There is no shipping label.':issues.includes('bad_label')?'The label is torn across the address.':'The printed label shows an address and service.',p.marks?.includes('class3')?'The box has a Class 3 flammable liquid mark.':'There are no hazard marks.'];
    if(p.declared)lines.push('A dangerous goods declaration is in the pouch.');else if(issues.includes('docs'))lines.push('A commercial invoice is in the pouch.');
    if(issues.includes('hazmat_undeclared'))lines.push(p.hint?`The contents note reads: ${p.hint}.`:`The shipper describes the contents as ${s.content.dgSaid||'just a liter of solvent'}.`);
    this.panel(scene,'Inspect the outgoing piece.',lines.join('\n'),[
      {label:'Accept this piece.',action:()=>this.decide(scene,id,true)},
      {label:'Choose a refusal reason.',action:()=>this.refuse(scene,id)},
      {label:'Read the package label again.',action:()=>this.piece(scene,id)}
    ]);
  },
  refuse(scene,id,page=0){const all=OTR_DATA.pickups.reasons,r=all[page%all.length],descriptions={PKG:'Use this reason when packaging is crushed, wet, split or too weak for its contents.',LBL:'Use this reason when the shipping label is missing, wrong or unreadable.',WGT:'Use this reason when the piece exceeds the service weight or size limit.',DG:'Use this reason for hazardous contents without the required marks and paperwork.',DOC:'Use this reason when customs or shipping documents are missing or wrong.'};this.panel(scene,'Choose why to refuse this piece.',`The refusal category is "${r.label}".\n\n${descriptions[r.id]}`,[{label:'Refuse for this reason.',action:()=>this.decide(scene,id,false,r.id)},{label:'Read the next refusal reason.',action:()=>this.refuse(scene,id,(page+1)%all.length)},{label:'Return to the inspection.',action:()=>this.piece(scene,id,1)}]);},
  decide(scene,id,accept,reason=null){
    if(!this.facing(scene,'pickup-parcel-'+id))return;const s=scene.model.pickupTask,p=OTR.fpPickup.piece(s,id);if(!OTR.fpPickup.decide(s,id,accept,reason))return;scene.sync();
    if(OTR.fpScenario.coaching(scene.scenarioSession)&&accept!==p.accept)this.notice(scene,p.why);else this.notice(scene,'Your decision has been recorded. Inspect the remaining pieces, then face the pickup receipt.');
  },
  invoice(scene,page=0){
    const s=scene.model.pickupTask,doc=s.content.docs;if(!doc){this.notice(scene,'This pickup has no commercial invoice to review.');return;}if(!s.countAnswered){this.notice(scene,'Confirm the piece count before submitting the paperwork findings.');return;}
    const index=((page%doc.fields.length)+doc.fields.length)%doc.fields.length,f=doc.fields[index];
    this.panel(scene,'Read the commercial invoice.',`This is line ${index+1} of ${doc.fields.length}.\nThe invoice line is "${f.label}". Its value is "${f.value}".\n\n${s.docFlags[index]?'You marked this line for correction.':'You have not marked this line for correction.'}`,[
      ...(s.docDone?[]:[{label:s.docFlags[index]?'Remove this line from your findings.':'Mark this line for correction.',action:()=>{if(OTR.fpPickup.flag(s,index))this.invoice(scene,index);}}]),
      {label:'Read the next invoice line.',action:()=>this.invoice(scene,index+1)},
      {label:s.docDone?'Return to the counter.':'Review and submit your findings.',action:()=>s.docDone?scene.closePanel():this.submitInvoice(scene)}
    ]);
  },
  submitInvoice(scene){const s=scene.model.pickupTask;this.panel(scene,'Submit the paperwork findings.',`You marked ${Object.values(s.docFlags).filter(Boolean).length} invoice lines for correction. You cannot change your findings after submitting them.`,[
    {label:'Submit these findings.',action:()=>{if(!this.facing(scene,'pickup-invoice'))return;if(OTR.fpPickup.submitDocs(s))this.notice(scene,OTR.fpScenario.coaching(scene.scenarioSession)?`You found ${s.findings.hits} of ${s.findings.bad} paperwork problems. Inspect both pieces before accepting or refusing them.`:'Your paperwork findings have been recorded. Inspect both pieces before accepting or refusing them.');}},
    {label:'Read the invoice again.',action:()=>this.invoice(scene)},
    {label:'Return to the counter.',action:()=>scene.closePanel()}
  ]);},
  receipt(scene){
    const s=scene.model.pickupTask,K=OTR.fpPickup;if(s.phase==='active'&&!K.receipt(s)){this.notice(scene,'Confirm the count, check any paperwork and decide on every piece before completing the pickup receipt.');return;}if(s.phase!=='receipt')return;
    const accepted=K.accepted(s).length,refused=s.pieces.length-accepted,ready=!accepted||s.receiptSigned,h=scene.handheld,token={};
    const current=()=>h.signatureToken===token&&h.isOpen&&scene.model.pickupTask===s&&scene.scenarioSession.phase==='active'&&s.phase==='receipt';
    const signed=()=>{if(current()&&K.signed(s)){h.close(false);this.receipt(scene);}};
    scene.closePanel();h.show({title:'Record the pickup receipt.',lines:[`You accepted ${accepted} pieces and refused ${refused}.`,accepted?`${s.content.shipper.name} signs the pickup receipt.`:'The shipper keeps every refused piece. The pickup exception is recorded.'],
      ...(!ready?{widget:{type:'signature',onDone:signed}}:{}),
      options:ready?[{label:'Finish this pickup scenario.',onPick:()=>{if(current()&&K.complete(s)){h.close(false);scene.finishScenario();}}}]:[{label:'Confirm the shipper signed the pickup receipt.',onPick:signed}],
      back:()=>h.close()
    });h.signatureToken=token;
  },
  controls(scene,page=0){const k=c=>OTR.fpAccess.key(c),pages=[`Use ${k('KeyW')}/${k('KeyA')}/${k('KeyS')}/${k('KeyD')} to walk and ${OTR.fpAccess.lookKeys()} or the mouse to look. Press ${k('KeyP')} to face a nearby visible target, then ${k('KeyE')} to interact.`,`Speak with the shipper, count each outgoing piece and reconcile the count at the physical manifest. Read the invoice at the counter when the pickup has one.`,`Face each package to read its label, packaging, scale reading and marks. Accept it or select a refusal reason. Each decision is final.`,`Face the receipt after inspecting every piece. The handheld has a signature pad and a keyboard confirmation. Menus and pauses stop both scenario clocks.`];this.panel(scene,'Use the pickup controls.',pages[page],[{label:'Read the next controls page.',action:()=>this.controls(scene,(page+1)%pages.length)},{label:'Return to the counter.',action:()=>scene.closePanel()}]);},
  handheld(scene){const s=scene.model.pickupTask;if(s.phase==='receipt'){this.receipt(scene);return;}scene.handheld.show({title:'Read the pickup details.',lines:[`The manifest lists ${s.manifest} pieces.`,`You counted ${Object.keys(s.counted).length} different pieces.`,`You inspected ${Object.keys(s.decided).length} pieces.`],options:[{label:'Read the pickup controls.',onPick:()=>{scene.handheld.close(false);this.controls(scene);}},{label:'Return to the counter.',onPick:()=>scene.handheld.close()}],back:()=>scene.handheld.close()});},
  targetName(scene,id){return id==='pickup-shipper'?'the shipper':id==='pickup-manifest'?'the pickup manifest':id==='pickup-invoice'?'the commercial invoice':id==='pickup-receipt'?'the pickup receipt':scene.model.pickupTask.counted[id.slice(14)]?'the counted outgoing piece':'the outgoing piece';}
};
OTR.fpScenario.register('pickup-counter',{
  piece:'street',goal:'Count, inspect and record the pickup with the shipper at the counter.',seconds:900,
  setup(run,m){
    m.pickupTask=OTR.fpPickup.create(run.id,run.content,run.scenario.categories,{coaching:OTR.fpScenario.coaching(run)});m.kind='practice';m.stops=[];m.parcels=[];m.traffic=[];m.crossing.x=m.crossing.z=10000;m.bounds={x0:8.55,x1:15.45,z0:-48.25,z1:-39.5};m.solids=OTR.fpPickupWorld.solids();Object.assign(m.van,{x:1.7,z:-42,yaw:0,speed:0,gear:2,hand:true});Object.assign(m.player,{x:12,z:-40.4,yaw:0,pitch:0});const motor=OTR.fp.create();m.tick=function(input,dt){this.elapsed+=dt;motor.tick.call(this,input,dt);};
  },
  interact(run,scene,id){
    const s=scene.model.pickupTask,A=OTR.fpPickupScenario;if(s.phase==='brief')OTR.fpPickup.begin(s);if(s.phase==='receipt'){A.receipt(scene);return true;}if(s.phase!=='active')return true;
    if(!id||!A.facing(scene,id)){A.notice(scene,'Move close to a counter target and face it before interacting.');return true;}
    if(id==='pickup-shipper')A.talk(scene);else if(id==='pickup-manifest')A.manifest(scene);else if(id==='pickup-invoice')A.invoice(scene);else if(id==='pickup-receipt')A.receipt(scene);else if(id.startsWith('pickup-parcel-'))A.piece(scene,id.slice(14));else A.notice(scene,'Use the shipper, outgoing packages, manifest, invoice or pickup receipt.');return true;
  },
  tick(run,scene,dt,active){const s=scene.model.pickupTask;if(s.phase==='brief')OTR.fpPickup.begin(s);OTR.fpPickup.step(s,dt,active);},
  controls(run,scene){OTR.fpPickupScenario.controls(scene);},handheld(run,scene){OTR.fpPickupScenario.handheld(scene);},targetName(scene,id){return OTR.fpPickupScenario.targetName(scene,id);},
  status(run){const s=run.model.pickupTask;return s.stage==='talk'?'Speak with the shipper at the counter.':s.stage==='count'?'Count each outgoing piece, then face the pickup manifest.':s.stage==='docs'?'Read the commercial invoice before inspecting the pieces.':`You have inspected ${Object.keys(s.decided).length} outgoing pieces.`;},
  timeout(run,scene){run.phase='timed-out';scene.showPanel('The pickup scenario has stopped.','There is no result because the pickup was not completed.',[{label:'Return to the station.',action:()=>scene.toHub()}],{accessibleText:true,back:()=>scene.toHub()});},
  result(run){const result=OTR.fpPickup.result(run.model.pickupTask);if(!result)throw Error('The pickup is incomplete');return result;}
});
