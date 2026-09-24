/*
 * The town the route runs through. Streets form a grid; buildings and addresses are generated from this spec
 * by src/core/town.js, so adding a street or moving the depot only means editing here.
 */
window.OTR_DATA = window.OTR_DATA || {};

OTR_DATA.town = {
  name: 'Maple Grove',
  margin: 420,
  cell: 900,
  streetsV: ['1st St', '2nd St', '3rd St', '4th St', '5th St'],
  streetsH: ['Harbor St', 'Maple Ave', 'Birch Ln', 'Oak St'],
  speedLimit: 25,
  schoolLimit: 15,
  // intersections (col,row) with traffic lights; the rest get stop signs
  lights: [[1, 1], [3, 1], [2, 2]],
  // school zone runs along this street row between these columns
  schoolZone: { row: 2, from: 0, to: 1 },
  depot: { col: 0, row: 0 },
  // how many houses per block edge, and the address numbering step
  housesPerEdge: 3,
  numberStep: 4,

  /* Named residents used for generated stops (cycled through with the day seed). */
  people: [
    { name: 'Dana Whitfield', spec: { skin: 0xF1C7A5, hair: 0x8A4B2A, hairStyle: 'long', shirt: 0x2F8F83 } },
    { name: 'Marcus Bell', spec: { skin: 0x8D5A3B, hair: 0x1E1410, hairStyle: 'buzz', shirt: 0x3E6FB0, beard: true } },
    { name: 'Helen Ortiz', spec: { skin: 0xD9A77F, hair: 0x5A3A2A, hairStyle: 'bun', shirt: 0xE8A33D, earrings: 0xFFC83D } },
    { name: 'Sam Okafor', spec: { skin: 0x8D5A3B, hair: 0x1E1410, hairStyle: 'curly', shirt: 0xFFC83D } },
    { name: 'Priya Nair', spec: { skin: 0xC98E6B, hair: 0x1E1410, hairStyle: 'ponytail', shirt: 0xFFFFFF, collar: true, lanyard: 0x3DA5FF } },
    { name: 'Tomas Vela', spec: { skin: 0xE0B08A, hair: 0x5A3A2A, hairStyle: 'short', shirt: 0x2F8F83, mustache: true } },
    { name: 'Grace Kim', spec: { skin: 0xE8C09A, hair: 0x1E1410, hairStyle: 'long', shirt: 0x3E6FB0, glasses: true } },
    { name: 'Ray Ruiz', spec: { skin: 0xD9A77F, hair: 0x1E1410, hairStyle: 'short', shirt: 0xC8243B } },
    { name: 'Alma Kowalski', spec: { skin: 0xF1C7A5, hair: 0xB8B8C0, hairStyle: 'short', shirt: 0x7B3FC4, glasses: true } },
    { name: 'Dee Harper', spec: { skin: 0x8D5A3B, hair: 0x2A1A14, hairStyle: 'long', shirt: 0xE8A33D } }
  ],

  businesses: [
    { name: 'BRIGHTLINE', accent: 0x3DA5FF },
    { name: 'NORTHWIND DENTAL', accent: 0x2F8F83 },
    { name: 'HARBOR CAFE', accent: 0xE8A33D },
    { name: 'KESTREL MEDIA', accent: 0xC86BE0 },
    { name: 'ORCHARD FOODS', accent: 0x2BC48A }
  ]
};
