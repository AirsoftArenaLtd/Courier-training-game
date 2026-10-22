/* B-149: the trainer's quick start names the game's own keys. Every key in bold in docs/QUICK-START.md is one the 3D
   scene handles, does what the page says, and every translation names the same keys in the same order. */
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
