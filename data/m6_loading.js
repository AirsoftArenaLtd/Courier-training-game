/*
 * Module 6 · Loading the Truck (LoadingScene).
 *
 *   mode: 'load'  — shelve every package from the cart
 *   mode: 'find'  — the truck is pre-loaded (often badly); find the package for each stop against the clock
 *
 * Package: { id, to, number, street, stop (1-9), weight (lb), size: 's'|'m'|'l'|'env', fragile, hazmat, service, tracking }
 * Sections are by stop number: A = stops 1-3, B = 4-6, C = 7-9 (A is nearest the door).
 * Rules scored: right section, heavy low (35 lb+ on the bottom shelf or floor), fragile not on the floor,
 * hazmat in the marked floor zone, nothing heavy overhead, and the bulk floor load strapped before you drive.
 */
window.OTR_DATA = window.OTR_DATA || {};

OTR_DATA.loading = {
  m6_load: {
    mode: 'load',
    title: 'Load for the Route',
    par: 210,
    intro: {
      title: 'Load for the Route',
      lines: [
        'A good load is a fast, safe route. A bad one is an hour of digging and a sore back.',
        'Drag each package from the cart onto the shelves (or arrow keys to choose, ENTER to pick up and put down). Hover a package to read its full label. Sections are by stop: A = stops 1-3 (nearest the door), B = 4-6, C = 7-9.',
        'Heavy (35 lb+) goes low — bottom shelf or floor. Nothing heavy above shoulder height.',
        'Fragile stays off the floor, the floor bays are for heavy or bulky freight, and dangerous goods go in the marked zone. Once everything is in, strap the floor load (T), then roll out (R).'
      ]
    },
    keyLessons: [
      'Load in reverse stop order so the first stops are nearest the door: less digging at every stop.',
      'Heavy low, light high. Weight above shoulder height is how backs and heads get hurt.',
      'Strap or brace the floor load. Loose freight shifts the first time you brake hard.'
    ],
    packages: [
      { id: 'l1', to: 'D. Whitfield', number: '214', street: 'Birch Ln', stop: 1, weight: 6, size: 'm', tracking: '7800 0001' },
      { id: 'l2', to: 'M. Bell', number: '58', street: 'Oak St', stop: 2, weight: 4, size: 's', service: 'signature', tracking: '7800 0002' },
      { id: 'l3', to: 'Brightline', number: '900', street: 'Market St', stop: 3, weight: 41, size: 'l', tracking: '7800 0003' },
      { id: 'l4', to: 'A. Reyes', number: '311', street: 'Cedar Ave', stop: 4, weight: 2, size: 'env', tracking: '7800 0004' },
      { id: 'l5', to: 'Northwind', number: '1200', street: 'Harbor St', stop: 5, weight: 52, size: 'l', tracking: '7800 0005' },
      { id: 'l6', to: 'S. Okafor', number: '64', street: 'Brook Rd', stop: 6, weight: 12, size: 'm', fragile: true, tracking: '7800 0006' },
      { id: 'l7', to: 'L. Alvarez', number: '7', street: 'Birch Ln', stop: 7, weight: 9, size: 'm', tracking: '7800 0007' },
      { id: 'l8', to: 'R. Ruiz', number: '88', street: 'Canyon Rd', stop: 8, weight: 38, size: 'l', tracking: '7800 0008' },
      { id: 'l9', to: 'Maple Lab Supply', number: '22', street: 'Maple Ave', stop: 9, weight: 18, size: 'm', hazmat: true, marks: ['class3'], service: 'hazmat', tracking: '7800 0009' },
      { id: 'l10', to: 'H. Ortiz', number: '18', street: 'Aspen Ct', stop: 2, weight: 11, size: 'm', service: 'adult', tracking: '7800 0010' },
      { id: 'l11', to: 'G. Kim', number: '9', street: 'Linden Pl', stop: 5, weight: 3, size: 's', fragile: true, tracking: '7800 0011' },
      { id: 'l12', to: 'Dee Harper', number: '5', street: 'Harbor View', stop: 8, weight: 7, size: 'm', tracking: '7800 0012' }
    ]
  },

  m6_find: {
    mode: 'find',
    title: 'Find It Fast',
    par: 120,
    intro: {
      title: 'Find It Fast',
      lines: [
        'Somebody loaded this truck in a hurry. Now you have to work it.',
        'Each round names the stop you\'re at. Click the package for that address (or arrow keys and ENTER) as fast as you can. Hover a package to read its full label.',
        'Read the whole address. Near-matches (216 vs 214, Birch Ln vs Birch Ct) are how misdeliveries happen.',
        'Notice how much time the misloads cost. That\'s why loading matters.'
      ]
    },
    keyLessons: [
      'Check number AND street AND unit before you pull a package.',
      'When you find a misload, report it so the load gets fixed, instead of everyone hunting for it twice.',
      'Time lost digging at every stop is time you never get back on the route.'
    ],
    packages: [
      { id: 'f1', to: 'D. Whitfield', number: '214', street: 'Birch Ln', stop: 1, weight: 6, size: 'm', slot: 'C-mid-1', tracking: '7801 0001' },
      { id: 'f2', to: 'K. Osei', number: '216', street: 'Birch Ln', stop: 1, weight: 5, size: 'm', slot: 'A-mid-0', tracking: '7801 0002' },
      { id: 'f3', to: 'D. Whitfield', number: '214', street: 'Birch Ct', stop: 6, weight: 9, size: 's', slot: 'A-top-1', tracking: '7801 0003' },
      { id: 'f4', to: 'M. Bell', number: '58', street: 'Oak St', stop: 2, weight: 4, size: 's', slot: 'B-bottom-0', tracking: '7801 0004' },
      { id: 'f5', to: 'M. Bell', number: '85', street: 'Oak St', stop: 7, weight: 15, size: 'm', slot: 'A-bottom-1', tracking: '7801 0005' },
      { id: 'f6', to: 'Brightline', number: '900', street: 'Market St', stop: 3, weight: 20, size: 'l', slot: 'floor-1', tracking: '7801 0006' },
      { id: 'f7', to: 'Brightline', number: '9000', street: 'Market St', stop: 9, weight: 22, size: 'l', slot: 'floor-0', tracking: '7801 0007' },
      { id: 'f8', to: 'A. Reyes', number: '311', street: 'Cedar Ave', stop: 4, weight: 2, size: 'env', slot: 'C-top-0', tracking: '7801 0008' },
      { id: 'f9', to: 'A. Reyes', number: '311', street: 'Cedar Ct', stop: 8, weight: 3, size: 'env', slot: 'B-top-1', tracking: '7801 0009' },
      { id: 'f10', to: 'Dee Harper', number: '5', street: 'Harbor View', unit: '3B', stop: 5, weight: 7, size: 'm', slot: 'B-mid-1', tracking: '7801 0010' },
      { id: 'f11', to: 'D. Harper', number: '5', street: 'Harbor View', unit: '3D', stop: 5, weight: 7, size: 'm', slot: 'C-bottom-1', tracking: '7801 0011' },
      { id: 'f12', to: 'R. Ruiz', number: '88', street: 'Canyon Rd', stop: 6, weight: 38, size: 'l', slot: 'A-top-0', tracking: '7801 0012' }
    ],
    rounds: [
      { stop: 1, pkg: 'f1' },
      { stop: 2, pkg: 'f4' },
      { stop: 3, pkg: 'f6' },
      { stop: 5, pkg: 'f10' },
      { stop: 6, pkg: 'f12' }
    ]
  }
};
