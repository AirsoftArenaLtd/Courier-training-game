/* B-159: no browser check compares on-screen text with English. A Phaser Text holds the translation once a language is
   chosen, so `.text === 'Replay the last mistake.'` passes in English and fails in Tamil (fpreplaybrowser and
   fpradiobrowser did, 22 October). Compare with OTR.i18n.t('…') or the text's English source, OTR.i18n.src(text). Model
   data (a choice's label, a handheld page's title) stays English and is not checked here. */
const test=require('node:test'),assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path');
const cat=JSON.parse(fs.readFileSync(path.join(__dirname,'..','data','i18n','catalogue.json'),'utf8')).strings;
// known and English-only at that point: the hint before any language is chosen, a clearance read in English
const KNOWN=new Set(['fpguidebrowser.js Read the morning brief','fpdamagereversebrowser.js 8 feet 10 inches']);
test('no browser suite compares a text object with an English game string',()=>{
  const found=[];
  for(const f of fs.readdirSync(__dirname).filter(f=>/browser\.js$/.test(f))){
    const s=fs.readFileSync(path.join(__dirname,f),'utf8');
    for(const m of s.matchAll(/\.text\s*(?:===|!==|==)\s*(['`"])([^'`"]{3,120})\1|\.text\.(?:includes|startsWith|endsWith|indexOf)\((['`"])([^'`"]{3,120})\3\)|\.text\.match\(\/([^/]{3,80})\//g)){
      const lit=m[2]||m[4]||m[5];
      if(cat.some(c=>c===lit||(lit.length>6&&c.includes(lit)))&&!KNOWN.has(f+' '+lit))found.push(`${f}: ${m[0].slice(0,80)}`);
    }
  }
  assert.deepEqual(found,[],'compare with OTR.i18n.t(...) or OTR.i18n.src(text) instead:\n'+found.join('\n'));
});
