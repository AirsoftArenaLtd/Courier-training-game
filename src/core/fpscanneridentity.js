/* Readable physical ID beside the handheld, with a real portrait and paged, translatable full-size fields. */
window.OTR=window.OTR||{};
OTR.fpScannerIdentity={
  hide(scene){const view=scene.scannerIdentity;if(!view)return;scene.scannerIdentity=null;view.root.destroy();if(OTR.fpBrand)OTR.fpBrand.releaseUnused(scene,view.portrait);},
  show(scene,card,page=0){
    this.hide(scene);const size=OTR.fpAccess.settings().large?26:22,root=scene.add.container(20,120).setDepth(115),id='scanner_'+OTR.rig.hash(card.spec),portrait=OTR.art.portrait(scene,id,card.spec,'neutral'),key='pt_'+id+'_neutral';
    const fields=[`The name on the ID is ${card.name}.`,`The date of birth is ${card.dob}.`,`The expiry date is ${card.exp||'08/14/2029'}.`,`The ID number is ${card.no||'D1234-5678'}.`],field=fields[page%fields.length],today=`The training date is ${card.today.replace(/^Today:\s*/,'')}.`;
    root.add(scene.add.rectangle(0,0,800,490,0x14232C,.98).setOrigin(0).setStrokeStyle(2,0x83969E,1));
    root.add(OTR.txt(scene,24,24,'Compare the photo ID with the customer.',size,'#ffffff',{ox:0,oy:0,wrap:752}));
    root.add(scene.add.image(100,180,key).setDisplaySize(140,170));
    root.add(OTR.txt(scene,208,120,field,size,'#ffffff',{ox:0,oy:0,wrap:560}));
    root.add(OTR.txt(scene,24,310,today,size,'#ffffff',{ox:0,oy:0,wrap:752}));
    root.add(OTR.txt(scene,24,385,'Read every field before choosing a decision on the handheld.',size,'#ffffff',{ox:0,oy:0,wrap:752}));
    scene.scannerIdentity={root,portrait:key,page:page%fields.length,field,today};if(OTR.a11y)OTR.a11y.say(field+' '+today);
    return portrait;
  }
};
