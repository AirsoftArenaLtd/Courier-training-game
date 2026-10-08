/*
 * Module 2 · Sort Belt
 * Packages ride the belt face-down: you scan a piece to find out where it goes, then send it.
 * Waves add rules progressively. Tune timing, speeds and chances here.
 * Bin precedence is damage > dangerous goods > heavy > priority > route (see SortingScene.correctBin).
 */
window.OTR_DATA = window.OTR_DATA || {};

OTR_DATA.sorting = {
  intro: {
    title: 'Sort Belt',
    lines: [
      'Click a package (or press SPACE for the one at the front) to scan it. The scan tells you the bin.',
      'Then drag it into that bin, or press the bin\'s number: the keys send the package you scanned (the glowing one). A bin keeps its number all shift.',
      'Sorting a piece you never scanned is a guess, and guesses cost you.',
      'New rules arrive each wave, and the belt jams now and then. Read the rule card.'
    ]
  },

  bins: {
    R1:  { label: 'ROUTE 1',    color: 0x3DA5FF },
    R2:  { label: 'ROUTE 2',    color: 0x2BC48A },
    R3:  { label: 'ROUTE 3',    color: 0x72B1F8 },
    PRI: { label: 'PRIORITY',   color: OTR_DATA.theme.priority, sub: 'orange band' },
    EXC: { label: 'EXCEPTIONS', color: 0xF0435A, sub: 'damaged / leaking' },
    DG:  { label: 'DG CAGE',    color: 0xFFC83D, sub: 'hazard diamond' },
    HVY: { label: 'HEAVY',      color: 0x7A7690, sub: '50 lb +' }
  },

  routeColors: { 1: 0x3DA5FF, 2: 0x2BC48A, 3: 0x72B1F8 },

  waves: [
    {
      duration: 30, spawnEvery: 1.9, beltSpeed: 115,
      bins: ['R1', 'R2', 'R3'],
      priorityChance: 0, damageChance: 0, dgChance: 0, heavyChance: 0,
      rule: { title: 'Wave 1 · Scan, then sort', text: 'Scan a package to read its label, then match the route code (R1, R2, R3) to its bin.' }
    },
    {
      duration: 30, spawnEvery: 1.5, beltSpeed: 140,
      bins: ['R1', 'R2', 'R3', 'PRI'],
      priorityChance: 0.3, damageChance: 0, dgChance: 0, heavyChance: 0,
      rule: { title: 'New Rule · Priority', text: 'An orange PRIORITY band goes to the Priority bin — no matter what route it says.' }
    },
    {
      duration: 30, spawnEvery: 1.3, beltSpeed: 160,
      bins: ['R1', 'R2', 'R3', 'PRI', 'EXC'],
      priorityChance: 0.22, damageChance: 0.24, dgChance: 0, heavyChance: 0,
      rule: { title: 'New Rule · Exceptions', text: 'Crushed or leaking? Pull it to Exceptions — even if it is priority. Damaged freight never goes down the line.' },
      jamEvery: [22, 30]
    },
    {
      duration: 32, spawnEvery: 1.25, beltSpeed: 170,
      bins: ['R1', 'R2', 'R3', 'EXC', 'DG'],
      priorityChance: 0, damageChance: 0.16, dgChance: 0.3, heavyChance: 0,
      rule: { title: 'New Rule · Dangerous goods', text: 'A hazard diamond means the DG cage, segregated from everything else. A damaged DG piece is worse, not better: that one goes to Exceptions and gets reported.' },
      jamEvery: [16, 26]
    },
    {
      duration: 32, spawnEvery: 1.15, beltSpeed: 185,
      bins: ['R1', 'R2', 'R3', 'EXC', 'HVY'],
      priorityChance: 0, damageChance: 0.14, dgChance: 0, heavyChance: 0.3,
      rule: { title: 'New Rule · Heavy pieces', text: '50 lb and over goes down the heavy chute for a team lift. Swinging one into a route bin on your own is how backs get hurt.' },
      jamEvery: [14, 24]
    }
  ],

  jam: { window: 5, penalty: 40 },

  points: { correct: 100, wrong: -50, missed: -30, blind: -25, comboStep: 5, maxMultiplier: 5 },

  lessons: {
    scan: 'Scan before you sort. The label is the only thing that knows where a piece is going — your memory of the last one does not.',
    damage: 'Damaged or leaking packages go to Exceptions — never down the line, even when they are marked priority.',
    dg: 'Dangerous goods ride in the DG cage, segregated. A damaged DG piece is an exception and a report, not a repack.',
    heavy: 'Anything 50 lb or over goes down the heavy chute for a team lift. No single-person hero lifts on a belt.',
    priority: 'Priority overrides the route code. Check for priority markings before you read the route.',
    route: 'Read the label before you let go — one mis-sort puts a package on the wrong truck and makes it late.',
    missed: 'Keep a steady rhythm. A package that rides off the end becomes a late delivery.',
    jam: 'Clear a jam the moment it happens. Everything behind it backs up while you stand there.',
    perfect: 'Clean sort. Scan, read, send — that is how the pros keep a belt moving.'
  }
};
