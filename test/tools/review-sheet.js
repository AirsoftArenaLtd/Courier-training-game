#!/usr/bin/env node
/*
 * Sheets for native-speaker review of the machine translations (data/i18n/<lang>.js): one CSV per language that opens in
 * Excel or Google Sheets, with the English, the current translation, and empty columns for the reviewer's correction
 * and comment. The safety wording comes first (speeds, distances, school buses, sirens, heat, dogs, ID and age checks,
 * seatbelts, backing, hazards, lifting, signatures); `--all` adds every other line. Lines that are new or changed since
 * the sheet it replaces are marked "new" and come first within their priority (B-53), so a reviewer who did the last
 * sheet starts with what changed. The marks stay on later runs until `--reviewed` (run it once the reviewers have sent
 * the sheets back), which starts the next round from the sheets as they are.
 *
 *   node test/tools/review-sheet.js                 safety sheets for all languages  → docs/review/<lang>-safety.csv
 *   node test/tools/review-sheet.js es ta --all     the full sheets for these languages → docs/review/<lang>-all.csv
 *
 * A translation is applied by editing data/i18n/<lang>.js (or sending the corrected sheet back). B-81: the first row under the
 * headings tells the reviewer what to do, in English and in the sheet's language (docs/review/HOW-TO-REVIEW.md says more);
 * its Kind is "how to review", and it is never counted as a line of the sheet. REVIEW_OUT=<dir> writes somewhere else
 * (the test, test/reviewsheet.js).
 *
 *   node test/tools/review-sheet.js --apply ta-safety.csv [--dry-run]     a sheet a reviewer sent back (B-86)
 *
 * --apply puts each "Corrected translation" into data/i18n/<lang>.js, matched by the English (the language comes from the
 * sheet's headings). It refuses a correction that drops a {0} the game fills in, and refuses the whole sheet when it was
 * saved without UTF-8 (the letters turned into ? or �). It lists every comment for the team, and the English it no
 * longer finds in the game. --dry-run says what it would do and changes nothing. I18N_DIR=<dir> writes somewhere else.
 */
'use strict';
const fs = require('fs');
const path = require('path');
const ROOT = path.resolve(__dirname, '..', '..');
const OUT = process.env.REVIEW_OUT ? path.resolve(process.env.REVIEW_OUT) : path.join(ROOT, 'docs', 'review');
const LANGS = { es: 'Spanish', fr: 'French', hi: 'Hindi', bn: 'Bengali', mr: 'Marathi', te: 'Telugu', ta: 'Tamil', gu: 'Gujarati', kn: 'Kannada', ml: 'Malayalam', pa: 'Punjabi' };

const args = process.argv.slice(2);
const all = args.includes('--all'), reviewed = args.includes('--reviewed');
const langs = args.filter(a => !a.startsWith('--'));
const want = langs.length ? langs : Object.keys(LANGS);

const cat = JSON.parse(fs.readFileSync(path.join(ROOT, 'data', 'i18n', 'catalogue.json'), 'utf8'));
const notText = new Set(JSON.parse(fs.readFileSync(path.join(ROOT, 'data', 'i18n', 'not-text.json'), 'utf8')));

// words that make a line safety wording: a wrong translation here could teach the wrong thing
const SAFETY = new RegExp('\\b(' + [
  'mph', 'speed(ing)?', 'speed limit', 'following (distance|gap)', 'tailgat\\w*', 'seconds? (behind|gap)', 'stop sign', 'stop line', 'red light', 'junction',
  'school bus', 'sirens?', 'emergency vehicle', 'ambulance', 'pedestrians?', 'crossing', 'yield', 'mirrors?', 'blind spot', 'seat ?belt',
  'revers(e|ing)', 'backing', 'G\\.O\\.A\\.L\\.?', 'heat', 'water break', 'shade', 'storm', 'snow', 'icy', 'ice', 'slippery', 'visibility',
  'dog', 'gate', 'photo ID', 'age check', 'age-restricted', 'adult', 'hazards?', 'trip', 'lift(ing)?', 'heavy', 'injur\\w*',
  'secure[ds]?', 'restraint', 'straps?', 'strapped', 'unsecured', 'hazmat', 'flammable', 'wrong side', 'sidewalk', 'parking brake', 'wheel chock',
  'critical', 'crash', 'collision', 'contact with traffic', 'unattended', 'handheld while',
  // the cab, signs, night and damage (milestones 7 to 9)
  'damage', 'dent(ed)?', 'scuff(ed)?', 'no-entry', 'one-way', 'give way', 'school zone', 'road works', 'diversion', 'cyclists?',
  'headlights?', 'dusk', 'night', 'fog', 'low bridge', 'clearance', 'overhang', 'rear camera', 'signal(led|ling)?', 'gear', 'load shift(ed)?',
  // traffic and the sat nav (milestone 8)
  'traffic lights?', 'wrong turn', 'sat nav', 'reroute[ds]?', 'children'
].join('|') + ')\\b', 'i');

// B-81: the first row of every sheet, so a reviewer who opens only the file knows what to do
const HOWTO_KIND = 'how to review';
const HOWTO_EN = 'How to review: read the English and the translation beside it. If the translation is wrong, unclear or could mislead a driver, write a better one in "Corrected translation". Leave it blank if it is right. Lines marked "new" come first. Save the file as it is (CSV UTF-8) and send it back. More help: HOW-TO-REVIEW.md';
const HOWTO = {
  es: 'Cómo revisar: lea el inglés y la traducción de al lado. Si la traducción es incorrecta, poco clara o puede confundir a un conductor, escriba una mejor en "Corrected translation". Déjela en blanco si está bien. Las líneas marcadas "new" van primero. Guarde el archivo tal cual (CSV UTF-8) y envíelo de vuelta. Más ayuda: HOW-TO-REVIEW.md',
  fr: 'Comment relire : lisez l\'anglais et la traduction à côté. Si la traduction est fausse, peu claire ou peut induire un chauffeur en erreur, écrivez-en une meilleure dans « Corrected translation ». Laissez vide si elle est juste. Les lignes marquées « new » viennent en premier. Enregistrez le fichier tel quel (CSV UTF-8) et renvoyez-le. Plus d\'aide : HOW-TO-REVIEW.md',
  hi: 'समीक्षा कैसे करें: अंग्रेज़ी और उसके बगल का अनुवाद पढ़ें। अगर अनुवाद गलत है, साफ़ नहीं है या ड्राइवर को गुमराह कर सकता है, तो "Corrected translation" में बेहतर अनुवाद लिखें। सही हो तो खाली छोड़ दें। "new" वाली पंक्तियाँ पहले आती हैं। फ़ाइल को वैसे ही (CSV UTF-8) सहेजें और वापस भेजें। और मदद: HOW-TO-REVIEW.md',
  bn: 'কীভাবে পর্যালোচনা করবেন: ইংরেজি ও তার পাশের অনুবাদ পড়ুন। অনুবাদ ভুল, অস্পষ্ট বা চালককে বিভ্রান্ত করতে পারে এমন হলে "Corrected translation"-এ ভালো অনুবাদ লিখুন। ঠিক থাকলে ফাঁকা রাখুন। "new" চিহ্নিত লাইনগুলো আগে আসে। ফাইলটি যেমন আছে (CSV UTF-8) তেমনই সংরক্ষণ করে ফেরত পাঠান। আরও সাহায্য: HOW-TO-REVIEW.md',
  mr: 'पुनरावलोकन कसे करावे: इंग्रजी आणि शेजारचे भाषांतर वाचा. भाषांतर चुकीचे, अस्पष्ट किंवा चालकाची दिशाभूल करणारे असेल तर "Corrected translation" मध्ये चांगले भाषांतर लिहा. बरोबर असेल तर रिकामे ठेवा. "new" खूण असलेल्या ओळी आधी येतात. फाइल आहे तशीच (CSV UTF-8) जतन करून परत पाठवा. अधिक मदत: HOW-TO-REVIEW.md',
  te: 'సమీక్ష ఎలా చేయాలి: ఇంగ్లీష్‌ను, దాని పక్కన ఉన్న అనువాదాన్ని చదవండి. అనువాదం తప్పుగా, అస్పష్టంగా ఉంటే లేదా డ్రైవర్‌ను తప్పుదారి పట్టించగలిగితే, "Corrected translation"లో మెరుగైనది రాయండి. సరిగ్గా ఉంటే ఖాళీగా వదలండి. "new" అని గుర్తించిన పంక్తులు ముందు వస్తాయి. ఫైల్‌ను అలాగే (CSV UTF-8) సేవ్ చేసి తిరిగి పంపండి. మరింత సహాయం: HOW-TO-REVIEW.md',
  ta: 'சரிபார்ப்பது எப்படி: ஆங்கிலத்தையும் அருகிலுள்ள மொழிபெயர்ப்பையும் படியுங்கள். மொழிபெயர்ப்பு தவறாகவோ, தெளிவில்லாமலோ, ஓட்டுநரைத் தவறாக வழிநடத்தக்கூடியதாகவோ இருந்தால், "Corrected translation" பகுதியில் சிறந்ததை எழுதுங்கள். சரியாக இருந்தால் காலியாக விடுங்கள். "new" எனக் குறிக்கப்பட்ட வரிகள் முதலில் வரும். கோப்பை அப்படியே (CSV UTF-8) சேமித்துத் திருப்பி அனுப்புங்கள். மேலும் உதவி: HOW-TO-REVIEW.md',
  gu: 'સમીક્ષા કેવી રીતે કરવી: અંગ્રેજી અને તેની બાજુનો અનુવાદ વાંચો. અનુવાદ ખોટો, અસ્પષ્ટ હોય અથવા ડ્રાઇવરને ગેરમાર્ગે દોરી શકે, તો "Corrected translation" માં વધુ સારો લખો. સાચો હોય તો ખાલી રાખો. "new" ચિહ્નિત લીટીઓ પહેલાં આવે છે. ફાઇલ જેમ છે તેમ (CSV UTF-8) સાચવીને પાછી મોકલો. વધુ મદદ: HOW-TO-REVIEW.md',
  kn: 'ಪರಿಶೀಲಿಸುವುದು ಹೇಗೆ: ಇಂಗ್ಲಿಷ್ ಮತ್ತು ಅದರ ಪಕ್ಕದ ಅನುವಾದವನ್ನು ಓದಿ. ಅನುವಾದ ತಪ್ಪಾಗಿದ್ದರೆ, ಅಸ್ಪಷ್ಟವಾಗಿದ್ದರೆ ಅಥವಾ ಚಾಲಕನನ್ನು ದಾರಿ ತಪ್ಪಿಸಬಹುದಾದರೆ, "Corrected translation" ನಲ್ಲಿ ಉತ್ತಮವಾದುದನ್ನು ಬರೆಯಿರಿ. ಸರಿಯಾಗಿದ್ದರೆ ಖಾಲಿ ಬಿಡಿ. "new" ಎಂದು ಗುರುತಿಸಿದ ಸಾಲುಗಳು ಮೊದಲು ಬರುತ್ತವೆ. ಫೈಲ್ ಅನ್ನು ಹಾಗೆಯೇ (CSV UTF-8) ಉಳಿಸಿ ಮರಳಿ ಕಳುಹಿಸಿ. ಹೆಚ್ಚಿನ ಸಹಾಯ: HOW-TO-REVIEW.md',
  ml: 'എങ്ങനെ പരിശോധിക്കാം: ഇംഗ്ലീഷും അതിനടുത്തുള്ള വിവർത്തനവും വായിക്കുക. വിവർത്തനം തെറ്റോ അവ്യക്തമോ ഡ്രൈവറെ തെറ്റിദ്ധരിപ്പിക്കുന്നതോ ആണെങ്കിൽ, "Corrected translation" എന്നതിൽ മികച്ചത് എഴുതുക. ശരിയാണെങ്കിൽ ശൂന്യമായി വിടുക. "new" എന്ന് അടയാളപ്പെടുത്തിയ വരികൾ ആദ്യം വരും. ഫയൽ അതുപോലെ (CSV UTF-8) സേവ് ചെയ്ത് തിരികെ അയയ്ക്കുക. കൂടുതൽ സഹായം: HOW-TO-REVIEW.md',
  pa: 'ਸਮੀਖਿਆ ਕਿਵੇਂ ਕਰੀਏ: ਅੰਗਰੇਜ਼ੀ ਅਤੇ ਉਸਦੇ ਨਾਲ ਦਾ ਅਨੁਵਾਦ ਪੜ੍ਹੋ। ਜੇ ਅਨੁਵਾਦ ਗਲਤ, ਅਸਪਸ਼ਟ ਹੈ ਜਾਂ ਡਰਾਈਵਰ ਨੂੰ ਗੁਮਰਾਹ ਕਰ ਸਕਦਾ ਹੈ, ਤਾਂ "Corrected translation" ਵਿੱਚ ਬਿਹਤਰ ਲਿਖੋ। ਸਹੀ ਹੋਵੇ ਤਾਂ ਖਾਲੀ ਛੱਡੋ। "new" ਵਾਲੀਆਂ ਲਾਈਨਾਂ ਪਹਿਲਾਂ ਆਉਂਦੀਆਂ ਹਨ। ਫਾਈਲ ਨੂੰ ਜਿਵੇਂ ਹੈ (CSV UTF-8) ਸੇਵ ਕਰਕੇ ਵਾਪਸ ਭੇਜੋ। ਹੋਰ ਮਦਦ: HOW-TO-REVIEW.md'
};

const q = (s) => '"' + String(s == null ? '' : s).replace(/"/g, '""') + '"';
/** The rows of a sheet this tool wrote (quoted CSV), or [] when there is none. */
const readSheet = (file) => {
  if (!fs.existsSync(file)) return [];
  const src = fs.readFileSync(file, 'utf8').replace(/^\uFEFF/, ''), rows = [];
  // Excel in some countries saves CSV with semicolons; the headings line says which
  const first = src.slice(0, src.indexOf('\n') >>> 0), sep = (first.match(/;/g) || []).length > (first.match(/,/g) || []).length ? ';' : ',';
  let row = [], cell = '', quoted = false;
  for (let i = 0; i < src.length; i++) {
    const c = src[i];
    if (quoted) { if (c === '"' && src[i + 1] === '"') { cell += '"'; i++; } else if (c === '"') quoted = false; else cell += c; }
    else if (c === '"') quoted = true;
    else if (c === sep) { row.push(cell); cell = ''; }
    else if (c === '\n') { row.push(cell); rows.push(row); row = []; cell = ''; }
    else if (c !== '\r') cell += c;
  }
  if (cell || row.length) { row.push(cell); rows.push(row); }          // a sheet saved without a last line break
  return rows;
};
const clean = (s) => String(s).replace(/^\s+|\s+$/g, '');

if (args.includes('--apply')) { apply(args[args.indexOf('--apply') + 1], args.includes('--dry-run')); process.exit(process.exitCode || 0); }

/** B-86: a returned sheet's corrections into data/i18n/<lang>.js. */
function apply(file, dry) {
  if (!file || !fs.existsSync(file)) { console.error('usage: node test/tools/review-sheet.js --apply <sheet.csv> [--dry-run]'); process.exitCode = 2; return; }
  const rows = readSheet(file), head = rows[0] || [];
  const col = (re) => head.findIndex(h => re.test(h));
  const cEn = col(/^English$/), cMt = col(/\(machine translation\)$/), cFix = col(/^Corrected translation/), cNote = col(/^Comment$/), cKind = col(/^Kind$/);
  const name = cMt >= 0 ? head[cMt].replace(/ \(machine translation\)$/, '') : '';
  const lang = Object.keys(LANGS).find(k => LANGS[k] === name);
  if (!lang || [cEn, cFix, cNote, cKind].some(c => c < 0)) { console.error(`${file}: not a review sheet (its headings are ${JSON.stringify(head)})`); process.exitCode = 2; return; }
  const dir = process.env.I18N_DIR ? path.resolve(process.env.I18N_DIR) : path.join(ROOT, 'data', 'i18n'), target = path.join(dir, lang + '.js');
  const src = fs.readFileSync(target, 'utf8');
  global.window = {}; eval(src);
  const L = window.OTR_I18N[lang], tmpl = new Map(L.templates.map((t, i) => [t[0], i]));
  const body = rows.slice(1).filter(r => r[cKind] !== 'how to review' && clean(r[cEn] || ''));
  // saved without UTF-8: the translations come back with ? or the replacement character where the letters were
  const broken = (t) => /\uFFFD/.test(t) || (lang !== 'es' && lang !== 'fr' && /\?{2,}/.test(t));
  const lost = body.filter(r => broken(r[cMt] || '') || broken(r[cFix] || '')).length;
  if (lost) { console.error(`${file}: ${lost} line(s) lost their letters (? or \uFFFD): the sheet was not saved as CSV UTF-8. Nothing applied; ask the reviewer to save it again as "CSV UTF-8" (HOW-TO-REVIEW.md).`); process.exitCode = 1; return; }
  const done = [], refused = [], missing = [], notes = [];
  body.forEach(r => {
    const en = clean(r[cEn]), fix = clean(r[cFix] || ''), note = clean(r[cNote] || '');
    if (note) notes.push([en, note]);
    if (!fix) return;
    const isT = tmpl.has(en), isS = Object.prototype.hasOwnProperty.call(L.strings, en);
    if (!isT && !isS) { missing.push(en); return; }
    const holes = (t) => (t.match(/\{\d+\}/g) || []).sort().join();
    if (holes(en) !== holes(fix)) { refused.push([en, `keeps ${holes(fix) || 'no {0}'} where the English has ${holes(en) || 'none'}`]); return; }
    const was = isT ? L.templates[tmpl.get(en)][1] : L.strings[en];
    if (was === fix) return;
    if (isT) L.templates[tmpl.get(en)][1] = fix; else L.strings[en] = fix;
    done.push([en, was, fix]);
  });
  if (!dry && done.length) {
    const at = src.indexOf('window.OTR_I18N.' + lang + ' = ');
    fs.writeFileSync(target, src.slice(0, at) + 'window.OTR_I18N.' + lang + ' = ' + JSON.stringify(L, null, 1).replace(/^ +/gm, '') + ';\n');
  }
  console.log(`${path.basename(file)} (${LANGS[lang]}): ${done.length} correction(s) ${dry ? 'would be applied' : 'applied'} to ${path.relative(ROOT, target)}`);
  done.forEach(([en, was, fix]) => console.log(`  ✓ ${en}\n      was: ${was}\n      now: ${fix}`));
  refused.forEach(([en, why]) => console.log(`  ✗ refused: ${en} — the correction ${why}`));
  missing.forEach(en => console.log(`  ? no longer in the game (skipped): ${en}`));
  if (notes.length) { console.log(`Comments for the team (${notes.length}):`); notes.forEach(([en, n]) => console.log(`  • ${en}\n      ${n}`)); }
  if (refused.length) process.exitCode = 1;
}

fs.mkdirSync(OUT, { recursive: true });

for (const lang of want) {
  if (!LANGS[lang]) { console.error('unknown language ' + lang); process.exit(2); }
  global.window = {}; eval(fs.readFileSync(path.join(ROOT, 'data', 'i18n', lang + '.js'), 'utf8'));
  const L = window.OTR_I18N[lang];
  const rows = [];
  cat.strings.forEach(s => {
    const tr = L.strings[s] || L.strings[s.trim()];
    if (!tr || notText.has(s) || tr === s) return;
    const safety = SAFETY.test(s);
    if (safety || all) rows.push([safety ? 1 : 2, clean(s), clean(tr), 'text']);
  });
  L.templates.forEach(([s, tr]) => { const safety = SAFETY.test(s); if (tr !== s && (safety || all)) rows.push([safety ? 1 : 2, clean(s), clean(tr), 'sentence with {0} {1} filled in by the game']); });
  // what the sheet being replaced already showed (English → translation): anything else is new to the reviewer
  const file = path.join(OUT, `${lang}-${all ? 'all' : 'safety'}.csv`);
  const old = readSheet(file), at = old.length && /^New/.test(old[0][1]) ? 2 : 1;      // sheets before B-53 had no "New" column
  const before = new Map(old.slice(1).filter(r => r[r.length - 1] !== HOWTO_KIND).map(r => [r[at], { tr: r[at + 1], mark: at === 2 && !reviewed ? r[1] : '' }]));
  // new: not on the old sheet, or translated differently; a mark stays until a --reviewed run (the sheets came back)
  const fresh = (r) => { const b = before.get(r[1]); return before.size > 0 && (!b || b.tr !== r[2] || b.mark === 'new'); };
  rows.sort((a, b) => a[0] - b[0] || fresh(b) - fresh(a) || (a[1] < b[1] ? -1 : 1));
  const head = ['Priority (1 = safety)', 'New since the last sheet', 'English', `${LANGS[lang]} (machine translation)`, 'Corrected translation (leave blank if correct)', 'Comment', 'Kind'];
  const body = rows.map(r => [r[0], fresh(r) ? 'new' : '', r[1], r[2], '', '', r[3]].map(q).join(','));
  const howto = ['', '', HOWTO_EN, HOWTO[lang], '', '', HOWTO_KIND].map(q).join(',');
  fs.writeFileSync(file, '﻿' + [head.map(q).join(','), howto, ...body].join('\r\n') + '\r\n');
  console.log(`${lang}: ${rows.filter(r => r[0] === 1).length} safety lines${all ? `, ${rows.length} in all` : ''}, ${rows.filter(fresh).length} new → ${path.relative(ROOT, file)}`);
}
