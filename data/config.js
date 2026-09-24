/*
 * Global game configuration: branding, palette, star categories, ranks, shift length.
 * Safe to edit — the engine reads everything from here.
 */
window.OTR_DATA = window.OTR_DATA || {};

OTR_DATA.config = {
  brand: 'FedEx',
  title: 'On The Route',
  subtitle: 'Courier Training Simulator',
  disclaimer: 'Training simulation built on general, publicly available safety and customer-service guidance. ' +
              'It is not a substitute for official procedures, policies, or hands-on training.',

  palette: {
    purple: 0x4D148C,
    purpleDark: 0x250849,
    purpleDeep: 0x16062B,
    purpleLight: 0x7B3FC4,
    lavender: 0xC9B3F0,
    orange: 0xFF6600,
    orangeLight: 0xFF9447,
    gold: 0xFFC83D,
    green: 0x2BC48A,
    red: 0xF0435A,
    blue: 0x3DA5FF,
    ink: 0x1D1030,
    paper: 0xFAF7FF,
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
    { name: 'Courier',        stars: 34,  color: 0x7B3FC4 },
    { name: 'Certified',      stars: 58,  color: 0x2BC48A },
    { name: 'Senior Courier', stars: 82,  color: 0xFFC83D },
    { name: 'Elite Courier',  stars: 100, color: 0xFF6600 }
  ],

  // Academy practice is unlimited; a "day" is just a log of what you played.
  scenariosPerDay: 99,

  // Performance ratio (0-1) needed for 1, 2 and 3 stars. Scenarios may override.
  starThresholds: [0.35, 0.65, 0.9],

  dispatcherTips: [
    'Tip: A 3-second walkaround beats a 3-hour insurance call.',
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

  dayNotes: {
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
