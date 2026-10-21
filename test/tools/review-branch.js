#!/usr/bin/env node
/*
 * B-69: the same first steps for every review of a Codex branch. Merges the branch into the current origin/pilot in a
 * scratch worktree (never touching yours), then runs every Node suite (test/run-all.js), lists the text that still needs
 * translating (in any of the 11 languages, after data/i18n/not-text.json), and plays the workday flows at Low.
 * Prints one summary; the merge commit stays in the worktree for the reviewer to translate, fix and push.
 * B-95: only the flows the branch can affect, two at a time in separate browsers: every workday flow when it touches the
 * 3D world, the workday, scoring, saving or the flows themselves; drive-review when it touches the results, the drive map
 * or the record; none for a branch of 2D scenes, text or documents (their checks are the Node suites and B-94's step).
 *
 *   node test/tools/review-branch.js codex/c34-damage-load        (or: node test/run-all.js --review <branch>)
 *   --no-flows   skip the workday flows
 *   --all-flows  play every workday flow whatever the branch touches
 *   --no-keys    skip the keyboard-only replay of the 2D scenes the branch touches (B-94)
 *   --continue   after resolving a conflicted merge in the worktree and committing it: run the checks there again
 * The worktree is ../otr-review-<branch name> next to the repository, and the missing text goes to
 * test/out/review-<name>/missing.json there (the shape the translation helpers take: { strings, templates }).
 */
'use strict';
const fs = require('fs');
const path = require('path');
const cp = require('child_process');

const ROOT = path.resolve(__dirname, '..', '..');
const args = process.argv.slice(2);
const branch = args.find(a => !a.startsWith('--'));
if (!branch) { console.error('usage: node test/tools/review-branch.js <branch> [--no-flows] [--keep]'); process.exit(2); }
const name = branch.replace(/^origin\//, '').replace(/[^\w.-]+/g, '-');
const WT = path.resolve(ROOT, '..', `otr-review-${name}`);
const git = (a, o) => cp.execFileSync('git', a, Object.assign({ cwd: ROOT, encoding: 'utf8', stdio: ['ignore', 'pipe', 'pipe'] }, o || {}));
const steps = [];
const step = (what, ok, detail) => { steps.push({ what, ok, detail }); console.log(`${ok ? 'ok  ' : 'FAIL'} ${what}${detail ? ': ' + detail : ''}`); };

// what test/i18n.js treats as an id rather than text (kept the same as its own rule)
const idlike = (s) => /^#[0-9A-Fa-f]{3,8}$/.test(s) || /^[a-z0-9_]+([.:_-][a-z0-9_]*)*[:.?]?$/.test(s) || /^\[|^\(debug/.test(s) || /^\|otr-[a-z0-9-]+$/.test(s);

/** Text in the catalogue that some language has no translation for (as test/i18n.js counts it). */
function missingText(dir) {
  const cat = JSON.parse(fs.readFileSync(path.join(dir, 'data', 'i18n', 'catalogue.json'), 'utf8'));
  const notText = new Set(JSON.parse(fs.readFileSync(path.join(dir, 'data', 'i18n', 'not-text.json'), 'utf8')));
  const strings = new Set(), templates = new Set();
  for (const lang of ['es', 'fr', 'hi', 'bn', 'mr', 'te', 'ta', 'gu', 'kn', 'ml', 'pa']) {
    const w = {}; new Function('window', fs.readFileSync(path.join(dir, 'data', 'i18n', lang + '.js'), 'utf8'))(w);
    const L = w.OTR_I18N[lang], have = new Set(Object.keys(L.strings)), haveT = new Set((L.templates || []).map(t => t[0].trim())), keep = new Set(L.keep || []);
    cat.strings.forEach(s => { if (!have.has(s) && !have.has(s.trim()) && !keep.has(s) && !notText.has(s) && !idlike(s)) strings.add(s); });
    cat.templates.forEach(t => { if (!haveT.has(t.trim()) && !idlike(t.replace(/\{\d+\}/g, '0'))) templates.add(t); });
  }
  return { strings: [...strings], templates: [...templates] };
}

/** The same as run, without blocking, so two browsers can play at once (B-95). */
const runAsync = (cmd, a, env, log) => new Promise(res => {
  const ch = cp.spawn(cmd, a, { cwd: WT, env: Object.assign({}, process.env, env || {}) });
  let out = '', err = '';
  ch.stdout.on('data', d => { out += d; }); ch.stderr.on('data', d => { err += d; });
  ch.on('close', status => { if (log) fs.writeFileSync(log, out + err); res({ status, stdout: out, stderr: err }); });
});
const FLOWS3D = ['workday-3d', 'workday-3d-b', 'workday-3d-c', 'workday-3d-d', 'workday-3d-e', 'workday-3d-f', 'workday-3d-g', 'workday-3d-h', 'workday-3d-i', 'workday-3d-j', 'workday-aids'];
/** Which workday flows a branch's changed files can affect (B-95). */
const flowsFor = (changed) => {
  const threeD = changed.some(f => /^src\/core\/(fp[a-z0-9]*|workday|save|scoring|scorm|academy|i18n|town)\.js$/.test(f) || /^src\/scenes\/FirstPersonScene\.js$/.test(f) ||
    /^(first-person|index)\.html$/.test(f) || /^data\/(workday_events|town)\.js$/.test(f) || /^(assets|vendor)\//.test(f) || /^test\/(qa\.js|paths\/(workday-3d|lib\/))/.test(f));
  const review = threeD || changed.some(f => /^src\/scenes\/(Results|DriveReview|WorkdayDebrief|Record)Scene\.js$/.test(f) || /^src\/core\/(drive|record)\.js$/.test(f) || /^test\/paths\/drive-review\.js$/.test(f));
  return (threeD ? FLOWS3D : []).concat(review ? ['drive-review'] : []);
};
const run = (cmd, a, env, log) => {
  const r = cp.spawnSync(cmd, a, { cwd: WT, env: Object.assign({}, process.env, env || {}), encoding: 'utf8', maxBuffer: 64 * 1024 * 1024 });
  if (log) fs.writeFileSync(log, (r.stdout || '') + (r.stderr || ''));
  return r;
};

(async () => {
  git(['fetch', '-q', 'origin']);
  const ref = branch.startsWith('origin/') ? branch : 'origin/' + branch;
  const ahead = git(['rev-list', '--count', `origin/pilot..${ref}`]).trim();
  console.log(`${ref}: ${ahead} commit(s) not in pilot; worktree ${WT}\n`);
  const again = args.includes('--continue');
  if (again) {
    const open = cp.spawnSync('git', ['diff', '--name-only', '--diff-filter=U'], { cwd: WT, encoding: 'utf8' }).stdout.trim();
    const merged = cp.spawnSync('git', ['merge-base', '--is-ancestor', ref, 'HEAD'], { cwd: WT }).status === 0;
    if (!fs.existsSync(WT) || open || !merged) { console.error(`--continue needs ${WT} with the merge resolved and committed`); process.exit(2); }
  } else {
    if (fs.existsSync(WT)) { try { git(['worktree', 'remove', '--force', WT]); } catch (e) { fs.rmSync(WT, { recursive: true, force: true }); git(['worktree', 'prune']); } }
    git(['worktree', 'add', '-q', '--detach', WT, 'origin/pilot']);
  }
  const nm = path.join(ROOT, 'test', 'node_modules');
  if (fs.existsSync(nm) && !fs.existsSync(path.join(WT, 'test', 'node_modules'))) fs.symlinkSync(nm, path.join(WT, 'test', 'node_modules'));
  const merge = again ? { status: 0 } : cp.spawnSync('git', ['merge', '--no-edit', '-q', ref], { cwd: WT, encoding: 'utf8' });
  if (merge.status !== 0) {
    const conflicts = cp.spawnSync('git', ['diff', '--name-only', '--diff-filter=U'], { cwd: WT, encoding: 'utf8' }).stdout.trim().split('\n').filter(Boolean);
    step('merge into pilot', false, `${conflicts.length} file(s) in conflict: ${conflicts.join(', ')} (resolve them in the worktree and commit, then run this again with --continue)`);
    process.exit(1);
  }
  step('merge into pilot', true, git(['rev-parse', '--short', 'HEAD'], { cwd: WT }).trim());
  const OUT = path.join(WT, 'test', 'out', `review-${name}`);
  fs.mkdirSync(OUT, { recursive: true });

  run(process.execPath, ['test/tools/i18n-extract.js']);
  const miss = missingText(WT);
  fs.writeFileSync(path.join(OUT, 'missing.json'), JSON.stringify(miss, null, 1));
  step('text to translate', !miss.strings.length && !miss.templates.length, `${miss.strings.length} line(s), ${miss.templates.length} template(s)` +
    (miss.strings.length ? ` → test/out/review-${name}/missing.json (e.g. ${JSON.stringify(miss.strings.slice(0, 3))})` : ''));

  const suites = run(process.execPath, ['test/run-all.js'], {}, path.join(OUT, 'run-all.log'));
  const last = (suites.stdout || '').trim().split('\n').pop();
  step('every Node suite', suites.status === 0, last + (suites.status ? ` (logs: test/out/run-all/ in the worktree)` : ''));

  if (!args.includes('--no-flows')) {
    const touched = (run('git', ['diff', '--name-only', 'origin/pilot...' + ref]).stdout || '').split('\n').filter(Boolean);
    const want = args.includes('--all-flows') ? FLOWS3D.concat('drive-review') : flowsFor(touched);
    if (!want.length) step('the workday flows', true, 'none needed: the branch touches no 3D, workday, scoring or results code (--all-flows plays them anyway)');
    else {
      // two browsers, each with half the flows, on their own ports
      const halves = [want.filter((_, i) => i % 2 === 0), want.filter((_, i) => i % 2 === 1)].filter(h => h.length);
      const base = 8400 + Math.floor(Math.random() * 40);
      const results = await Promise.all(halves.map((h, i) => runAsync(process.execPath, ['test/qa.js', '--only', h.join(',')],
        { QA_GFX: 'low', QA_FPS_FLOOR: '8', QA_PORT: String(base + i * 50),
          QA_BROWSER: process.env.QA_BROWSER || ['/opt/pw-browsers/chromium', '/usr/bin/chromium'].find(p => fs.existsSync(p)) || '' }, path.join(OUT, `flows-${i + 1}.log`))));
      const passed = results.reduce((n, r) => n + Number((/(\d+)\/\d+ scenarios clean/.exec(r.stdout || '') || [0, 0])[1]), 0);
      const failed = results.flatMap(r => (r.stdout || '').split('\n').filter(l => /^FAIL /.test(l)).map(l => l.split(/\s+/)[1]));
      step(`the workday flows at Low (${want.length}, two at a time)`, results.every(r => r.status === 0),
        `${passed}/${want.length} clean${failed.length ? '; failed: ' + failed.join(', ') + ' (flows-1.log, flows-2.log)' : ''}`);
    }
  }

  // B-94: a branch that touches a 2D scene plays that scene's golden path again with the keyboard alone (QA_KEYS_ONLY,
  // B-84), so a change that makes a scenario need the mouse fails here; a change to what every scene shares plays them all
  // (--no-keys skips it)
  if (!args.includes('--no-keys')) {
    const changed = (run('git', ['diff', '--name-only', 'origin/pilot...' + ref]).stdout || '').split('\n').filter(Boolean);
    const qaSrc = fs.readFileSync(path.join(WT, 'test', 'qa.js'), 'utf8');
    const all = [...qaSrc.matchAll(/\{ id: '([a-z0-9-]+)', scene: '([A-Za-z]+)' \}/g)].map(m => ({ id: m[1], scene: m[2] }));
    const shared = changed.some(f => /^src\/(core\/(ui|scanner|theme|talk|stage)\.js|scenes\/BaseScenarioScene\.js)$/.test(f) || /^test\/paths\/lib\//.test(f));
    const scenes = new Set(changed.map(f => (/^src\/scenes\/(?:m\d|stops|shared|shift)\/([A-Za-z]+)\.js$/.exec(f) || [])[1]).filter(Boolean));
    const ids = all.filter(sc => shared || scenes.has(sc.scene)).map(sc => sc.id);
    if (ids.length) {
      const keys = run(process.execPath, ['test/qa.js', '--only', ids.join(','), '--pass', 'golden'],
        { QA_KEYS_ONLY: '1', QA_FPS_FLOOR: '8', QA_PORT: String(8500 + Math.floor(Math.random() * 90)),
          QA_BROWSER: process.env.QA_BROWSER || ['/opt/pw-browsers/chromium', '/usr/bin/chromium'].find(p => fs.existsSync(p)) || '' }, path.join(OUT, 'keys.log'));
      const clean = /(\d+)\/(\d+) scenarios clean/.exec(keys.stdout || '');
      step(`the 2D golden paths it touches, keyboard only (${ids.length})`, keys.status === 0, clean ? clean[0] : 'see keys.log');
    }
    // the scenes whose keyboard play has its own suite (their golden paths still use the mouse on purpose)
    const SUITES = { PreTripScene: 'pretripkeysbrowser.js', RoutePlannerScene: 'routekeysbrowser.js', LoadingScene: 'routekeysbrowser.js',
      PickupScene: 'pickupkeysbrowser.js', HubScene: 'hubkeysbrowser.js', RecordScene: 'hubkeysbrowser.js', TrainerScene: 'trainerkeysbrowser.js' };
    const suites = [...new Set(Object.keys(SUITES).filter(k => shared || scenes.has(k) || changed.includes(`src/scenes/${k}.js`)).map(k => SUITES[k]))];
    suites.forEach(f => {
      const r = run(process.execPath, ['test/' + f], { QA_BROWSER: process.env.QA_BROWSER || ['/opt/pw-browsers/chromium', '/usr/bin/chromium'].find(p => fs.existsSync(p)) || '' }, path.join(OUT, f.replace(/\.js$/, '.log')));
      step(`${f} (keyboard only)`, r.status === 0, ((r.stdout || '').trim().split('\n').pop()) || 'see its log');
    });
  }

  const bad = steps.filter(s => !s.ok);
  console.log(`\n${steps.length - bad.length} of ${steps.length} review steps passed for ${ref}.` +
    (bad.length ? ` Next: ${bad.map(s => s.what).join(', ')}. The merge is in ${WT}.` : ` Translate, update the board, then push from ${WT}.`));
  if (!bad.length) console.log('(the worktree stays for the board and the push: give it a branch with git switch -c, and remove it afterwards with git worktree remove ' + WT + ')');
  process.exit(bad.length ? 1 : 0);
})();
