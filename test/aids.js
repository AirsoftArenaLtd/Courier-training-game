/*
 * The trainer's 3D workday aids (board task A-21, src/core/academy.js): defaults, what a saved setting may hold, and what
 * the 3D world gets for each workday number. No browser.
 *   node test/aids.js
 */
'use strict';
const test = require('node:test'), assert = require('node:assert/strict'), fs = require('fs'), path = require('path'), vm = require('vm');
const c = { console }; c.window = c; vm.createContext(c);
vm.runInContext("window.OTR = { scoring: { CATS: ['safety', 'efficiency', 'service'] } }; window.localStorage = { getItem: () => null };", c);
for (const f of ['data/theme.js', 'data/config.js', 'src/core/academy.js']) vm.runInContext(fs.readFileSync(path.join(__dirname, '..', f), 'utf8'), c);
const A = c.OTR.academy;
const plain = (o) => JSON.parse(JSON.stringify(o));

test('the aids start helpful and fade by day', () => {
  A.settings = A.defaults();
  assert.deepEqual(plain(A.get().workday), { assists: 'auto', satnav: 'auto', walkaround: 'optional', night: true, damage: true });
  assert.deepEqual(plain(A.workdayRules(1)), { assists: 'full', satnav: 'full', walkaround: 'optional', night: true, damage: true });
  assert.equal(A.workdayRules(2).assists, 'light'); assert.equal(A.workdayRules(3).assists, 'light');
  assert.equal(A.workdayRules(4).assists, 'off'); assert.equal(A.workdayRules(30).assists, 'off');
  assert.equal(A.workdayRules(3).satnav, 'full'); assert.equal(A.workdayRules(4).satnav, 'line');
  assert.equal(A.workdayRules(undefined).assists, 'full', 'no day number: the first day');
});

test('a trainer\'s choice wins over the fade, and only known values are kept', () => {
  A.settings = A.merge({ workday: { assists: 'off', satnav: 'line', walkaround: 'required', night: false, damage: false } });
  assert.deepEqual(plain(A.workdayRules(1)), { assists: 'off', satnav: 'line', walkaround: 'required', night: false, damage: false });
  A.settings = A.merge({ workday: { assists: 'turbo', satnav: 5, walkaround: 'never', night: 'yes', damage: null } });
  assert.deepEqual(plain(A.get().workday), plain(A.defaults().workday), 'nonsense falls back to the defaults');
});

test('old settings files without aids still load, and the other rules are untouched', () => {
  A.settings = A.merge({ mode: 'practice', passStars: { safety: 3 }, attempts: 2, refresherDays: 60 });
  assert.equal(A.get().mode, 'practice'); assert.equal(A.get().passStars.safety, 3);
  assert.equal(A.get().workday.assists, 'auto');
});
