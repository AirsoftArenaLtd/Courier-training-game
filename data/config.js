/*
 * Global game configuration: branding, palette, star categories, ranks, shift length.
 * Safe to edit — the engine reads everything from here.
 */
window.OTR_DATA = window.OTR_DATA || {};

OTR_DATA.config = {
  brand: '',                // a company name for the title, hub, van and depot; empty shows just the title
  title: 'On The Route',
  subtitle: 'Courier Training Simulator',
  disclaimer: 'Training simulation built on general, publicly available safety and customer-service guidance. ' +
              'It is not a substitute for official procedures, policies, or hands-on training.',

  palette: {
    purple: OTR_DATA.theme.primary,
    purpleDark: OTR_DATA.theme.primaryDark,
    purpleDeep: OTR_DATA.theme.primaryDeep,
    purpleLight: OTR_DATA.theme.primaryLight,
    lavender: OTR_DATA.theme.tint,
    orange: OTR_DATA.theme.accent,
    orangeLight: OTR_DATA.theme.accentLight,
    gold: 0xFFC83D,
    green: 0x2BC48A,
    red: 0xF0435A,
    blue: 0x3DA5FF,
    ink: OTR_DATA.theme.ink,
    paper: 0xF7FBFF,
    grey: 0x9AA0B4
  },

  // Star categories. Every scenario awards 0-3 stars in each category it lists.
  categories: {
    safety:     { label: 'Safety',     color: 0x2BC48A, icon: 'ic_shield' },
    efficiency: { label: 'Efficiency', color: 0x3DA5FF, icon: 'ic_bolt' },
    service:    { label: 'Service',    color: 0xFF5C8A, icon: 'ic_heart' }
  },

  // Courier Rank thresholds, based on career stars (best stars per scenario, summed).
  ranks: [
    { name: 'New Hire',       stars: 0,   color: 0x9AA0B4 },
    { name: 'Rookie',         stars: 14,  color: 0x3DA5FF },
    { name: 'Courier',        stars: 34,  color: OTR_DATA.theme.primaryLight },
    { name: 'Certified',      stars: 58,  color: 0x2BC48A },
    { name: 'Senior Courier', stars: 82,  color: 0xFFC83D },
    { name: 'Elite Courier',  stars: 100, color: OTR_DATA.theme.accent }
  ],

  // The 3D workday at the hub (docs/WORKDAY-EVENTS.md): "Start workday" beside the 2D route day. Off until the 3D
  // workday is complete (pilot milestone 3); ?workday3d=1 turns it on for one visit, ?workday3d=0 off.
  workday3d: false,

  // Performance ratio (0-1) needed for 1, 2 and 3 stars. Scenarios may override.
  starThresholds: [0.35, 0.65, 0.9],

  // The academy's rules, as shipped. A trainer changes them in the game (Settings → Trainer, behind the PIN); on a
  // training server they are kept for everyone in server/data/settings.json.
  academy: {
    mode: 'both',                  // 'both': practice and assessment · 'practice' only · 'assessment' only
    passStars: { safety: 2, efficiency: 2, service: 2 },   // stars needed in each category a scenario tests
    attempts: 1,                   // assessment attempts per scenario before a trainer must allow another (0: no limit)
    refresherDays: 30,             // a passed module asks for a refresher quiz after this many days
    trainerPin: ''                 // browser-only installs: the trainer PIN (a server uses OTR_TRAINER_PIN instead)
  },

  dispatcherTips: [
    'Tip: A 3-minute walkaround beats a 3-hour insurance call.',
    'Tip: Lift with your legs. Your back has a long career ahead of it.',
    'Tip: When in doubt, get out and look. (G.O.A.L.)',
    'Tip: A calm voice de-escalates faster than a clever comeback.',
    'Tip: "Close enough" is not an address.',
    'Tip: Leaking package? Hands off, step back, report it.',
    'Tip: Dogs can smell fear. They can also smell the treats you don\'t have.',
    'Tip: Your phone can wait. The road can\'t.',
    'Tip: Priority stops first, then loop — don\'t zig-zag.',
    'Tip: Arrows up means up. Always up. Even when it\'s inconvenient.',
    'Tip: Rain on the windshield? Double your following distance.',
    'Tip: Hydrate. The route is a marathon, not a sprint.'
  ],

  // the debrief's closing line: `safety` whenever safety ended on 0-1 stars or there was a critical mistake, whatever
  // the other stars (a day with a hit pedestrian used to get "Good hustle... you'll be unstoppable")
  dayNotes: {
    safety: [
      'Dispatcher: "Nobody gets hurt on this route. Read the top of that list twice, and we go over it before you roll tomorrow."',
      'Dispatcher: "Deliveries can wait; safety can\'t. That first item is the one to fix before anything else."'
    ],
    great: [
      'Dispatcher: "Textbook shift. I\'m printing this one out for the break room."',
      'Dispatcher: "Zero incidents, happy customers. Who trained you? Oh right — this game."'
    ],
    good: [
      'Dispatcher: "Solid day out there. A few rough edges, nothing a replay can\'t fix."',
      'Dispatcher: "Good hustle. Review those takeaways and you\'ll be unstoppable."'
    ],
    rough: [
      'Dispatcher: "Tough shift. Everybody has one. Tomorrow\'s a new route."',
      'Dispatcher: "We\'ve all been there. Replay a scenario and get those stars back."'
    ]
  }
};
