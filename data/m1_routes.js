/*
 * Module 1 · Route Planner
 *
 * The planner runs on the REAL town (data/town.js): stops are actual addresses on actual streets, and
 * driving time is measured along the road network, so a closed block really does mean a detour.
 *
 * Round fields
 *   name      shown on the board
 *   brief     one line of dispatch context
 *   seed      picks which addresses the day's stops land on (same seed = same round every time)
 *   startMin  minutes after midnight that you roll out of the station (default: startMin below)
 *   closures  roads shut for the day, as ['h', row, col] (horizontal street `row`, between vertical
 *             streets `col` and `col+1`) or ['v', col, row] (vertical street `col`, between horizontal
 *             streets `row` and `row+1`). Rows/cols index town.streetsH / town.streetsV.
 *   stops[]   { service }                                for a delivery
 *             { kind: 'pickup', ready, close, service }  for a pickup; ready/close are minutes after midnight
 *             optional: { note } a line shown on the stop card
 *
 * services[id] = { label, short, by (minutes after midnight, null = end of day), color, weight }
 *   `weight` is how much a missed commitment costs in the service score.
 *
 * Travel model: minutesPerBlock is the driving time for one town block (town.cell pixels); service
 * minutes are added at each stop. During the school-zone window the zone costs schoolDelay extra
 * minutes to drive through, so early routes should go around it.
 */
window.OTR_DATA = window.OTR_DATA || {};

OTR_DATA.routes = {
  intro: {
    title: 'Route Planner',
    lines: [
      'Dispatch has handed you the manifest. Click the stops — on the map or on the manifest — in the order you mean to drive them.',
      'Watch the ETA column: EARLY AM is an 8:30 commitment, PRIORITY AM is 10:30, and a pickup can only be worked inside its window.',
      'The route line follows real streets. Closed blocks force a detour, and the school zone costs you time while it is active.',
      'Click a sequenced stop again to pull it back out. DISPATCH when the whole manifest is sequenced.'
    ]
  },

  startMin: 8 * 60,
  minutesPerBlock: 3,
  serviceMinutes: 6,
  pickupMinutes: 9,
  milesPerBlock: 0.4,
  schoolWindow: [8 * 60, 8 * 60 + 45],
  schoolDelay: 4,

  services: {
    first:    { label: 'Early AM',           short: 'EARLY',    by: 8 * 60 + 30,  color: OTR_DATA.theme.primaryLight, weight: 3 },
    priority: { label: 'Priority AM',        short: 'PRIORITY', by: 10 * 60 + 30, color: 0xE8304A, weight: 2 },
    standard: { label: 'Standard',           short: 'STANDARD', by: 15 * 60,      color: OTR_DATA.theme.accent, weight: 1 },
    // (the no-deadline pieces; the id is kept for the data below)
    ground:   { label: 'Economy',            short: 'ECONOMY',  by: null,         color: 0x3DA5FF, weight: 1 },
    pickup:   { label: 'Scheduled Pickup',   short: 'PICKUP',   by: null,         color: 0x2BC48A, weight: 3 }
  },

  rounds: [
    {
      name: 'Round 1 · Morning Block',
      brief: 'Five stops, no surprises. One Early AM sets the shape of the whole loop.',
      seed: 'rp-morning-4',
      closures: [],
      stops: [
        { service: 'ground' },
        { service: 'priority' },
        { service: 'first' },
        { service: 'ground' },
        { service: 'standard' }
      ]
    },
    {
      name: 'Round 2 · The Pickup Window',
      brief: 'A pickup desk that is only staffed from 9:15 to 9:45. Turn up outside that and there is nothing to collect.',
      seed: 'rp-window-9',
      closures: [['h', 1, 2]],
      stops: [
        { service: 'ground' },
        { service: 'priority' },
        { kind: 'pickup', ready: 9 * 60 + 15, close: 9 * 60 + 45, note: 'Shipping desk staffed 9:15 to 9:45 only' },
        { service: 'ground' },
        { service: 'first' },
        { service: 'standard' },
        { service: 'priority' }
      ]
    },
    {
      name: 'Round 3 · Late Sort',
      brief: 'The sort ran late, so you leave at 9:20 with Priority still due at 10:30 — and two blocks are dug up.',
      seed: 'rp-latesort-2',
      startMin: 9 * 60 + 20,
      closures: [['h', 2, 1], ['v', 3, 1]],
      stops: [
        { service: 'ground' },
        { kind: 'pickup', ready: 9 * 60 + 40, close: 10 * 60 + 20, note: 'Dock closes for lunch at 10:20' },
        { service: 'standard' },
        { service: 'priority' },
        { service: 'ground' },
        { service: 'priority' },
        { kind: 'pickup', ready: 10 * 60 + 30, close: 11 * 60 + 30, note: 'Call-in pickup, confirmed for 10:30' },
        { service: 'priority' }
      ]
    }
  ],

  lessons: {
    commit: 'Commitments come first. Sequence the timed stops, then fill the gaps with the flexible ones — never the other way round.',
    early: 'Arriving before a pickup is ready is a wasted trip. Build the window into the order instead of sitting at the dock doing nothing.',
    missed: 'A pickup you reach after the dock closes is a missed pickup — the customer ships with someone else tomorrow.',
    long: 'Plan loops, not zig-zags. Group stops by block and leave the far corner for the way back.',
    closure: 'Check closures before you sequence. A shut block can turn two "next door" stops into a six-block detour.',
    school: 'The school zone is slow while it is active. Early in the day, work around it and come back later.',
    perfect: 'Clean plan: every commitment met on the shortest sensible loop. That is what dispatch is looking for.'
  }
};
