/*
 * Module 2 · Label Check — the inspection station.
 *
 * A package arrives on the roller. You turn it (all six sides), read what is on it, and put it on the
 * right handling station. Marks are placed on specific faces, so the only way to call it right is to
 * look at every side — which is the whole lesson.
 *
 * items[] = {
 *   tier      1 = marks on the front, 2 = marks on a side you have to turn to, 3 = hidden marks / damage
 *   marks     { face: [markId, ...] } on any of front | right | back | left | top | base
 *   damage    { face, kind: 'leak' | 'crushed' } (optional)
 *   answer    the station id it belongs on
 *   explain   the coaching line shown after the call
 * }
 *
 * Marks the engine can draw: fragile, thisWayUp, keepDry, class2, class3, class5, class8, class9,
 * class9_li, lithium. The front face always carries the shipping label.
 *
 * When a package carries more than one mark, the MOST RESTRICTIVE one decides the station — that order
 * is `precedence` below, and it is spelled out in the in-game guide.
 */
window.OTR_DATA = window.OTR_DATA || {};

OTR_DATA.labels = {
  intro: {
    title: 'Label Check',
    lines: [
      'Turn every package before you move it: A / D turn it round, W shows the top, S shows the base — or click the six face dots.',
      'Marks hide on the sides, the top and underneath. Deciding before you have seen all six sides is a blind call, and it is scored as one.',
      'Drag the package onto the right handling station (or press its number, 1-6). If more than one mark applies, the most restrictive one wins.',
      'G opens the label guide at any time — the clock stops while it is open.'
    ]
  },

  timePerItem: 22,
  itemsPerRun: 9,

  stations: {
    belt:    { label: 'BELT',             sub: 'standard handling',      color: 0x3DA5FF },
    upright: { label: 'UPRIGHT CART',     sub: 'arrows stay up',         color: 0x2F8F83 },
    fragile: { label: 'FRAGILE SHELF',    sub: 'nothing stacked on top', color: 0xE8A33D },
    dry:     { label: 'DRY RACK',         sub: 'out of the wet',         color: OTR_DATA.theme.primaryLight },
    hazmat:  { label: 'HAZMAT CAGE',      sub: 'segregated · DG papers', color: 0xC8243B },
    isolate: { label: 'ISOLATE & REPORT', sub: 'do not move it on',      color: 0x8A1020 }
  },

  /* most restrictive first */
  precedence: ['isolate', 'hazmat', 'fragile', 'upright', 'dry', 'belt'],

  guide: [
    { mark: 'fragile',   name: 'Fragile',             meaning: 'Breakable contents. Handle gently, never stack heavy freight on top.' },
    { mark: 'thisWayUp', name: 'This Way Up',         meaning: 'Orientation arrows, usually on two opposite sides. Keep them pointing up.' },
    { mark: 'keepDry',   name: 'Keep Dry',            meaning: 'Protect from rain and wet surfaces — including the wet floor of a van.' },
    { mark: 'class3',    name: 'Class 3 · Flammable Liquid', meaning: 'Dangerous goods. Cage it, segregate it, and check the paperwork.' },
    { mark: 'class8',    name: 'Class 8 · Corrosive', meaning: 'Damages skin and metal. Dangerous goods handling.' },
    { mark: 'class5',    name: 'Class 5.1 · Oxidizer', meaning: 'Intensifies fire. Never beside flammables. Dangerous goods handling.' },
    { mark: 'class2',    name: 'Class 2 · Gas',       meaning: 'Compressed gas (green = non-flammable). Dangerous goods handling.' },
    { mark: 'class9',    name: 'Class 9 · Misc. DG',  meaning: 'Dry ice, magnetised material, batteries. Looks harmless, still DG.' },
    { mark: 'lithium',   name: 'Lithium Battery Mark', meaning: 'Cells inside. A damaged one can overheat — handle per battery rules.' }
  ],

  /* names for marks that appear on packages but have no guide entry of their own */
  markNames: { class9_li: 'Class 9 · Lithium Batteries' },

  items: [
    { tier: 1, marks: {}, answer: 'belt',
      explain: 'Nothing but a shipping label on any of the six sides — standard handling. You still checked, which is the point.' },
    { tier: 1, marks: { front: ['fragile'] }, answer: 'fragile',
      explain: 'Broken-glass symbol on the front: fragile shelf, and nothing goes on top of it.' },
    { tier: 1, marks: { front: ['thisWayUp'], back: ['thisWayUp'] }, answer: 'upright',     // arrows on two opposite sides
      explain: 'Two arrows over a bar = orientation marks. It rides upright on the cart, never on its side.' },
    { tier: 1, marks: { front: ['keepDry'] }, answer: 'dry',
      explain: 'Umbrella and rain = keep dry. On the rack, off the wet floor and under cover on the doorstep.' },

    { tier: 2, marks: { right: ['class3'] }, answer: 'hazmat',
      explain: 'Red diamond with a flame and a 3 on the RIGHT side — flammable liquid. Only turning it finds that.' },
    { tier: 2, marks: { back: ['class8'] }, answer: 'hazmat',
      explain: 'White-over-black diamond with an 8 on the BACK: corrosive. Cage it and check the DG paperwork.' },
    { tier: 2, marks: { left: ['fragile'], top: ['thisWayUp'] }, answer: 'fragile',
      explain: 'Fragile on the left, arrows on the top. Fragile is the more restrictive of the two — fragile shelf, kept the right way up.' },
    { tier: 2, marks: { back: ['lithium'] }, answer: 'hazmat',
      explain: 'Red-hatched border with a battery: lithium cells. Damaged cells overheat, so they ride caged and away from heat.' },
    { tier: 2, marks: { right: ['keepDry'], base: ['thisWayUp'] }, answer: 'upright',
      explain: 'Arrows UNDER the box are there because someone set it down wrong. Orientation outranks keep-dry: upright cart.' },

    { tier: 3, marks: { front: ['fragile'], back: ['class5'] }, answer: 'hazmat',
      explain: 'Fragile on the front, but a 5.1 oxidizer diamond on the back. Dangerous goods outrank fragile: it goes in the cage, away from flammables.' },
    { tier: 3, marks: { left: ['class9_li'] }, damage: { face: 'base', kind: 'leak' }, answer: 'isolate',
      explain: 'A battery shipment leaking from underneath. Do not carry it, do not stack it: isolate it, keep people back and report it.' },
    { tier: 3, marks: { front: ['keepDry'] }, damage: { face: 'right', kind: 'crushed' }, answer: 'isolate',
      explain: 'Crushed side with the contents shifting inside. Damaged freight never goes onward — set it aside and report the damage.' },
    { tier: 3, marks: {}, damage: { face: 'base', kind: 'leak' }, answer: 'isolate',
      explain: 'Unmarked box, unknown liquid underneath. Never assume it is harmless: do not touch it, isolate the area and report it.' },
    { tier: 3, marks: { back: ['class2'], front: ['thisWayUp'] }, answer: 'hazmat',
      explain: 'Green diamond with a gas cylinder on the back = compressed gas. Arrows or not, dangerous goods decide the station.' }
  ],

  lessons: {
    sixSides: 'Turn every package before you move it. A diamond on the back or a stain underneath is the one that matters.',
    blind: 'You called it without looking at every side. Getting it right by luck still teaches your hands the wrong habit.',
    hazmat: 'A hazard class diamond outranks fragile, arrows and keep-dry. Cage it, segregate it, check the paperwork.',
    damage: 'Leaking or crushed? It stops here. Isolate it, keep people away and report it — never send damaged freight onward.',
    orientation: 'Orientation arrows are a handling instruction, not decoration. On the cart, upright, the whole way.',
    perfect: 'Every package turned, read and placed right. That is exactly how it is done on the dock.'
  }
};
