/* B-149: the trainer's quick start names the game's own keys. Every key in bold in docs/QUICK-START.md is one the 3D
   scene handles, does what the page says, and every translation names the same keys in the same order. B-155: every
   button a translation quotes ("**Réglages → Formateur** (Settings → Trainer)") is the game's own word for it today. */
const test=require('node:test'),assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path');
const docs=path.join(__dirname,'..','docs'),scene=fs.readFileSync(path.join(__dirname,'..','src','scenes','FirstPersonScene.js'),'utf8');
const keysOf=f=>[...fs.readFileSync(path.join(docs,f),'utf8').matchAll(/\*\*([A-Z])\*\*/g)].map(m=>m[1]);
const versions=fs.readdirSync(docs).filter(f=>/^QUICK-START\.[a-z]{2}\.md$/.test(f)).sort();
// What the page says each key does, and the handler in FirstPersonScene that does it.
const does={E:/e\.code==='KeyE'\|\|e\.code==='Enter'\)\{this\.interact\(\)/,R:/e\.code==='KeyR'\)this\.cabAction\(m\.van\.gear===1\?'cab-reverse'/,J:/e\.code==='KeyJ'&&OTR\.fpSigns\)\{OTR\.fpSigns\.read\(this\)/,
  H:/e\.code==='KeyH'\)\{this\.showPause\(\)/,P:/e\.code==='KeyP'\)\{OTR\.fpAccess\.focus\(this\)/,L:/e\.code==='KeyL'\)this\.cabAction\('cab-headlights'\)/};
test('every key in the English quick start is handled by the 3D scene and does what the page says',()=>{
  const keys=keysOf('QUICK-START.md'),set=scene.match(/const codes=new Set\(\[([^\]]*)\]/);
  assert.ok(set,'the scene key set was not found');assert.ok(keys.length>=6,'the quick start names too few keys: '+keys.join(' '));
  for(const k of new Set(keys)){
    assert.ok(set[1].includes(`'Key${k}'`),`${k} is in the quick start but the 3D scene does not handle it`);
    assert.ok(does[k],`${k} is new in the quick start: add what it does to test/quickstart.js`);
    assert.match(scene,does[k],`${k} no longer does what the quick start says`);
  }
});
test('each translation names the same keys in the same order',()=>{
  const en=keysOf('QUICK-START.md');assert.ok(versions.length>=2,'the Tamil and Hindi quick starts are missing');
  for(const f of versions)assert.deepEqual(keysOf(f),en,`${f} names other keys than the English page`);
});
test('each translation says it is a machine translation and links back to the English page',()=>{
  for(const f of versions){const s=fs.readFileSync(path.join(docs,f),'utf8');assert.match(s.split('\n')[0],/^> .*docs\/QUICK-START\.md/,`${f} lacks the note at the top`);}
});
test('each button a translation quotes is the game\'s own translation of it (B-155)',()=>{
  const ROOT=path.join(__dirname,'..'),load=l=>{global.window={};eval(fs.readFileSync(path.join(ROOT,'data','i18n',l+'.js'),'utf8'));return window.OTR_I18N[l].strings;};
  const norm=s=>s.replace(/[▶…]/g,'').replace(/[.。।!:]+$/,'').trim().toLowerCase();
  // an Indic word's ending changes with its case ("in the handheld"), as in test/glossary.js
  const stem=s=>{const c=[...s];return c.length>5&&!/[a-z]/.test(s)?c.slice(0,-2).join(''):s;};
  // the game shows some names only in a longer string: ACADEMY RULES, "See Results ▶", "Low graphics"
  const forms=e=>[e,e.toUpperCase(),e[0].toUpperCase()+e.slice(1),e+' ▶','See '+e+' ▶',e+' graphics',e[0].toUpperCase()+e.slice(1)+' graphics'];
  const described=new Set(['the dispatch radio']);   // a description, not a name on screen
  const wrong=[];let quoted=0;
  for(const f of versions){
    const S=load(f.split('.')[1]),md=fs.readFileSync(path.join(docs,f),'utf8');
    for(const m of md.matchAll(/\*\*([^*]+)\*\* \(([^)*]+)\)/g)){
      if(!/^[\x20-\x7e…→]+$/.test(m[2])||described.has(m[2]))continue;
      const words=m[1].split(' → '),en=m[2].split(' → ');
      if(words.length!==en.length){wrong.push(`${f}: ${m[0]} has ${words.length} parts for ${en.length}`);continue;}
      en.forEach((e,i)=>{quoted++;const b=norm(words[i]),game=forms(e).map(c=>S[c]).filter(Boolean).map(norm);
        if(!game.some(g=>g.includes(stem(b))||b.includes(stem(g))))wrong.push(`${f}: "${words[i]}" for "${e}", the game says ${game.join(' / ')||'(no translation)'}`);});
    }
  }
  assert.ok(quoted>=100,`only ${quoted} quoted names were found`);
  assert.deepEqual(wrong,[],'a quick start quotes a name the game does not use:\n'+wrong.join('\n'));
});
