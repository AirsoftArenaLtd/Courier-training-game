/* Pickup action state. Source conversation effects and PickupScene's final evaluator keep the original score scale. */
window.OTR=window.OTR||{};
OTR.fpPickup={
  create(id,content,categories,{coaching=true}={}){
    const scenario=OTR_DATA.modules.find(m=>m.id==='m7').scenarios.find(s=>s.id===id);
    if(!scenario||!content?.pieces?.length||content.pieces.length>12||new Set(content.pieces.map(p=>p.id)).size!==content.pieces.length||!content.talk?.nodes||!categories||categories.join()!==scenario.categories.join()||(content.docs?.fields.length||0)>16)throw Error('Invalid pickup scenario');
    const s={id,content,cats:categories.slice(),coaching,pieces:content.pieces.map(p=>({...p})),manifest:content.manifest,counted:{},decided:{},docFlags:{},docDone:false,countAnswered:false,shortRaised:0,phase:'brief',stage:'talk',elapsed:0,finished:false,finishing:false,log:new OTR.ScoreLog(),result:null,version:0,receiptSigned:false,findings:null};
    s.talk=OTR.fpCustomerTalk.create({...content.talk,cast:{shipper:{name:content.shipper.name,portrait:content.shipper.spec}}},categories,{coaching,log:s.log});
    s.finish=result=>{if(s.finished)return;s.result=result;s.finished=true;s.phase='done';};return s;
  },
  begin(s){if(s.phase!=='brief')return false;s.phase='active';OTR.fpCustomerTalk.begin(s.talk);s.version++;return true;},
  active(s){return s.phase==='active'&&!s.finished;},
  step(s,seconds,active=true){if(!active||!this.active(s))return false;s.elapsed+=Math.max(0,Math.min(.05,Number(seconds)||0));return true;},
  syncTalk(s){if(s.talk.phase==='done'){s.stage='count';s.version++;}},
  advanceTalk(s){if(!this.active(s)||s.stage!=='talk'||!OTR.fpCustomerTalk.advance(s.talk))return false;this.syncTalk(s);s.version++;return true;},
  chooseTalk(s,index){if(!this.active(s)||s.stage!=='talk'||!OTR.fpCustomerTalk.choose(s.talk,index))return false;this.syncTalk(s);s.version++;return true;},
  piece(s,id){return s.pieces.find(p=>p.id===id);},
  count(s,id){if(!this.active(s)||s.stage!=='count'||s.counted[id]||!this.piece(s,id))return false;s.counted[id]=true;s.version++;return true;},
  countChoices(s){
    if(!this.active(s)||s.stage!=='count'||!Object.keys(s.counted).length)return [];
    const k=Object.keys(s.counted).length,M=s.manifest,who=s.content.shipper.name.split(' ')[0];
    return k===M?[
      {id:'match',text:`Sign for ${k}. The count matches the manifest.`,got:2},
      {id:'recount',text:`Ask ${who} to recount anyway, just in case.`,got:1,note:'Your count matched. A recount costs the shipper time for nothing.'},
      {id:'later',text:"Take what's here and sort the paperwork out at the station.",got:0}
    ]:[
      {id:'raise',text:`Tell ${who} you count ${k}, not ${M}, and ask them to check before you sign.`,got:2,raise:true},
      {id:'manifest',text:`Sign for the manifest number (${M}) — close enough.`,got:0},
      {id:'later',text:"Take what's here and sort the paperwork out at the station.",got:0}
    ];
  },
  // These action checks retain PickupScene's authored labels, points and critical rules;
  // parity tests execute its real UI callbacks independently, including all invoice flag sets.
  answerCount(s,id){
    const choice=this.countChoices(s).find(c=>c.id===id);if(!choice)return false;
    const C=s.content,n=s.pieces.length,k=Object.keys(s.counted).length;
    if(choice.raise&&k<n){s.shortRaised++;s.version++;return 'recount';}
    s.log.check('service',k===n&&!s.shortRaised?1:0,1,`Counted every piece waiting${s.shortRaised?' (on the second try)':` (${k} of ${n})`}`,{lesson:'Count every piece yourself. Your signature on the manifest says you did.'});
    const got=k<n?0:choice.got;s.log.check('service',got,2,'Reconciled the piece count with the manifest',{lesson:got<2?(choice.note||'Never sign for a number you did not count. Raise any difference with the shipper there and then.'):null});
    s.countAnswered=true;if(choice.raise&&C.recount)s.manifest=C.recount.corrected;s.stage=C.docs?'docs':'inspect';s.version++;return true;
  },
  flag(s,index){if(!this.active(s)||s.stage!=='docs'||s.docDone||!Number.isInteger(index)||!s.content.docs.fields[index])return false;s.docFlags[index]=!s.docFlags[index];s.version++;return true;},
  submitDocs(s){
    if(!this.active(s)||s.stage!=='docs'||s.docDone)return false;
    const fields=s.content.docs.fields,flags=s.docFlags,missed=fields.filter((f,i)=>f.bad&&!flags[i]),wrong=fields.filter((f,i)=>!f.bad&&flags[i]),bad=fields.filter(f=>f.bad).length,hits=bad-missed.length;
    s.log.check('service',Math.max(0,hits-wrong.length),bad,`Found the customs paperwork problems (${hits}/${bad})`,{lesson:missed.length?missed[0].why:wrong.length?'Flagging correct lines slows the shipper down: check carefully before you reject something.':null});
    s.findings={hits,bad,missed,wrong};s.docDone=true;s.stage='inspect';s.version++;return true;
  },
  decide(s,id,accept,reason=null){
    const p=this.piece(s,id);if(!this.active(s)||s.stage!=='inspect'||!p||s.decided[id]||typeof accept!=='boolean'||(!accept&&!OTR_DATA.pickups.reasons.some(r=>r.id===reason)))return false;
    s.decided[id]={accept,reason:accept?null:reason};const right=accept===p.accept,cat=(p.issues||[]).includes('hazmat_undeclared')?'safety':'service',name=p.number?`${p.number} ${p.street}`:'the unlabeled piece';
    const lesson=right?null:p.accept?`This one was fine to ship (${p.why.replace(/\.$/,'')}). Refusing a good piece fails the customer.`:p.why;
    const critical=!right&&(accept?(p.reason==='DG'||p.reason==='DOC'):p.service==='hazmat');
    s.log.check(cat,right?2:0,2,`${accept?'Accepted':'Refused'} ${name}`,{lesson,feedback:p.why,critical});
    if(!accept&&p.accept===false){const ok=reason===p.reason;s.log.check('service',ok?1:0,1,'Gave the right refusal reason',{lesson:ok?null:`The right reason here was "${(OTR_DATA.pickups.reasons.find(r=>r.id===p.reason)||{}).label}".`});}
    s.version++;return true;
  },
  receipt(s){if(!this.active(s)||s.stage!=='inspect'||!s.countAnswered||(s.content.docs&&!s.docDone)||s.pieces.some(p=>!s.decided[p.id]))return false;s.phase='receipt';s.finishing=true;s.version++;return true;},
  accepted(s){return s.pieces.filter(p=>s.decided[p.id]?.accept);},
  signed(s){if(s.phase!=='receipt'||s.receiptSigned||!this.accepted(s).length)return false;s.receiptSigned=true;s.version++;return true;},
  complete(s){
    if(s.phase!=='receipt'||s.finished||(this.accepted(s).length&&!s.receiptSigned))return false;
    PickupScene.prototype.endScenario.call(s);s.version++;return true;
  },
  result(s){return s.phase==='done'?s.result:null;}
};
