/*
 * Module 7 · Pickups & Paperwork (PickupScene).
 *
 * Set: { title, intro, keyLessons, shipper: { name, spec }, place: { sign, accent, kind }, talk, par, manifest,
 *        recount: { text, corrected }, pieces: [...], docs: {...} }
 *   manifest   how many pieces the paperwork claims. When it differs from the pieces waiting, the count is the
 *              exercise: `recount` is what the shipper says when the courier raises it, and the corrected number.
 * Piece: {
 *   id, to, number, street, city, service, weight, size, marks: [],
 *   issues: ['crushed'|'leaking'|'wet'|'poor_packaging'|'no_label'|'bad_label'|'over_weight'|'hazmat_undeclared'|'docs'],
 *   accept: true|false,           what a trained courier should do
 *   reason: '<exception id>',     if refusing, which reason is right
 *   why: 'explanation shown in the report'
 * }
 * docs (optional): { type: 'invoice', title, instructions, fields: [{ label, value, bad, why }] }
 *
 * The refusal reasons are illustrative training categories, not any carrier's official list.
 */
window.OTR_DATA = window.OTR_DATA || {};

OTR_DATA.pickups = {
  reasons: [
    { id: 'PKG', label: 'Packaging not fit to ship', desc: 'Crushed, wet, split, or too weak for the contents.' },
    { id: 'LBL', label: 'Label missing or unreadable', desc: 'No label, wrong label, or an address that can\'t be read.' },
    { id: 'WGT', label: 'Over weight / size limit', desc: 'Heavier or bigger than the service allows.' },
    { id: 'DG', label: 'Undeclared dangerous goods', desc: 'Hazardous contents without the right marks and paperwork.' },
    { id: 'DOC', label: 'Paperwork incomplete', desc: 'Customs or shipping documents missing or wrong.' }
  ],

  m7_business: {
    title: 'Business Pickup',
    par: 200,
    place: { sign: 'BRIGHTLINE', accent: 0x3DA5FF, kind: 'counter' },
    shipper: { name: 'Priya Nair', spec: { skin: 0xC98E6B, hair: 0x1E1410, hairStyle: 'ponytail', shirt: 0xFFFFFF, collar: true, lanyard: 0x3DA5FF, sleeves: 'long' } },
    intro: {
      title: 'Business Pickup',
      lines: [
        'A scheduled pickup at a regular account. The manifest says SEVEN pieces.',
        'Count what\'s actually waiting for you, then inspect each piece before you accept it.',
        'Check the label, the packaging and the weight. Anything you accept becomes your problem down the line.',
        'Refuse politely and explain why, so the shipper can fix it for next time.'
      ]
    },
    keyLessons: [
      'Count the pieces against the manifest before you sign anything.',
      'Inspect packaging and labels at pickup: damage found later is much harder to sort out.',
      'Refusing badly packed freight protects the customer\'s shipment, not just you.'
    ],
    manifest: 7,
    // what happens when the courier raises a count that doesn't match
    recount: { text: 'Priya checks her list. "Oh — the seventh was canceled this morning. Sorry! I\'ll correct the manifest to six."', corrected: 6 },
    talk: {
      start: 'p0',
      nodes: {
        p0: { speaker: 'shipper', text: 'Hi! Seven today, all ready to go. Manifest is on the counter.', expr: 'happy', next: 'p1' },
        p1: {
          speaker: 'shipper', text: 'I\'m in a bit of a rush — can you just take them and check later?',
          check: 'Held the inspection standard',
          choices: [
            { text: '"I\'ll be quick, but I do need to count and check them with you here. It saves us both a claim later."', grade: 'good', effects: { service: 2, efficiency: 1 }, feedback: 'Checking at the counter, with the shipper present, is the only time problems are easy to fix.', next: 'p2' },
            { text: '"Sure, no problem."', grade: 'bad', effects: { service: -2 }, feedback: 'If a piece is damaged or unlabeled, you now own the problem with nobody to fix it.', lesson: 'Count and inspect at the counter, while the shipper is still standing there.', next: 'p2_bad' },
            { text: '"Rules are rules. I have to check everything."', grade: 'ok', effects: { service: 0 }, feedback: 'Right call, blunt delivery. Explaining the "why" keeps a good account happy.', next: 'p2' }
          ]
        },
        p2: { speaker: 'shipper', text: 'Fair enough. Shout if anything\'s wrong.', next: 'end' },
        p2_bad: { speaker: 'shipper', text: 'Great, thanks!', expr: 'happy', next: 'p2_bad2' },
        p2_bad2: { speaker: 'narrator', text: 'Your handheld will not close a pickup without a piece count, so you count them after all, and you look them over while you are at it.', next: 'end' },
        end: { type: 'end', outcome: 'good' }
      }
    },
    pieces: [
      { id: 'b1', to: 'Havill Group', number: '77', street: 'Queen St', city: 'RIVERTON', service: 'priority', weight: 8, size: 'm', accept: true, why: 'Clean box, clear label, reasonable weight.' },
      { id: 'b2', to: 'Havill Group', number: '77', street: 'Queen St', city: 'RIVERTON', service: 'standard', weight: 12, size: 'm', issues: ['crushed'], accept: false, reason: 'PKG', why: 'A crushed, re-taped box will not survive the network. Ask for it to be repacked.' },
      { id: 'b3', to: 'Delta Print', number: '41', street: 'Union Ave', city: 'RIVERTON', service: 'standard', weight: 4, size: 's', accept: true, why: 'Good condition and a complete label.' },
      { id: 'b4', to: '', number: '', street: '', city: '', service: 'standard', weight: 6, size: 'm', issues: ['no_label'], accept: false, reason: 'LBL', why: 'No label, no delivery. It needs a label printed before it can be picked up.' },
      { id: 'b5', to: 'Orchard Foods', number: '9', street: 'Mill Rd', city: 'RIVERTON', service: 'standard', weight: 164, size: 'l', issues: ['over_weight'], accept: false, reason: 'WGT', why: '164 lb is over the limit for this service. It needs freight handling, not a package pickup.' },
      { id: 'b6', to: 'Kestrel Media', number: '250', street: 'Harbor St', city: 'RIVERTON', service: 'signature', weight: 3, size: 'env', accept: true, why: 'Envelope in good shape with a clear label.' }
    ]
  },

  m7_intl: {
    title: 'International Docs',
    par: 210,
    place: { sign: 'NORTHWIND', accent: 0x2F8F83, kind: 'counter' },
    shipper: { name: 'Tomas Vela', spec: { skin: 0xE0B08A, hair: 0x5A3A2A, hairStyle: 'short', shirt: 0x2F8F83, beard: true, sleeves: 'long' } },
    intro: {
      title: 'International Docs',
      lines: [
        'One international shipment, with a commercial invoice attached.',
        'Customs paperwork has to describe what\'s actually in the box: a real description, a real value, quantities, country of origin and a signature.',
        'Vague descriptions like "samples" or "gift" are the classic reason shipments get stuck at the border.',
        'Find every problem on the invoice before you accept the piece.'
      ]
    },
    keyLessons: [
      'A customs description has to say what the item actually is, not "samples", "parts" or "gift".',
      'Value, quantity, country of origin and the shipper\'s signature all have to be there.',
      'Catching document problems at pickup saves the customer days of customs delay.'
    ],
    manifest: 2,
    talk: {
      start: 'i0',
      nodes: {
        i0: { speaker: 'shipper', text: 'Two going to Canada. The paperwork\'s in the pouch, I filled it out this morning.', next: 'i1' },
        i1: {
          speaker: 'shipper', text: 'It\'s the same as always, should be fine.',
          check: 'Checked the customs paperwork',
          choices: [
            { text: '"Let me read through the invoice with you. If customs bounces it, it sits for days."', grade: 'good', effects: { service: 2 }, feedback: 'Checking together means the shipper can correct it on the spot.', next: 'i2' },
            { text: '"If you\'ve done it before, I\'ll take your word for it."', grade: 'bad', effects: { service: -2 }, feedback: 'Repeat shippers make repeat mistakes, and the customer pays for the delay.', lesson: 'Always read customs documents at pickup, even for regular shippers.', next: 'i2' }
          ]
        },
        i2: { speaker: 'shipper', text: 'Go ahead, take a look.', next: 'end' },
        end: { type: 'end', outcome: 'good' }
      }
    },
    docs: {
      type: 'invoice',
      title: 'COMMERCIAL INVOICE',
      instructions: 'Click every line that would hold this shipment up at customs.',
      fields: [
        { label: 'Shipper', value: 'Northwind Dental, 1200 Harbor St, Riverton', bad: false, okWhy: 'a full name and address.' },
        { label: 'Consignee', value: 'Clinique Beaulieu, 42 Rue Laval, Montréal QC', bad: false, okWhy: 'a full name and address.' },
        { label: 'Description of goods', value: 'Samples', bad: true, why: '"Samples" says nothing. Customs needs what the item actually is, e.g. "dental impression trays, plastic".' },
        { label: 'Quantity', value: '12', bad: false, okWhy: 'a number of units is all this line needs.' },
        { label: 'HS tariff code', value: '9018.49', bad: false, okWhy: 'a tariff code for dental instruments; customs uses it to set the duty.' },
        { label: 'Unit value', value: '(blank)', bad: true, why: 'Every line needs a declared value, even for samples or no-charge goods.' },
        { label: 'Currency', value: 'USD', bad: false, okWhy: 'the currency the values are in.' },
        { label: 'Total gross weight', value: '20 lb (2 pieces)', bad: false, okWhy: 'it matches the two pieces on the counter (14 lb and 6 lb).' },
        { label: 'Country of manufacture', value: '(blank)', bad: true, why: 'Country of origin decides the duty rate. It has to be declared.' },
        // (it contradicts "Samples" above: a careful reader flags it, so it is one of the problems)
        { label: 'Reason for export', value: 'Sale', bad: true, why: 'It says Sale while the description says samples: the two have to agree. Sold goods need a real description; samples say "Sample, not for resale".' },
        { label: 'Shipper signature & date', value: '(unsigned)', bad: true, why: 'An unsigned customs declaration is not a declaration. The shipper has to sign and date it.' }
      ]
    },
    pieces: [
      { id: 'i1', to: 'Clinique Beaulieu', number: '42', street: 'Rue Laval', city: 'MONTREAL QC', service: 'priority', weight: 14, size: 'm', intl: true, issues: ['docs'], accept: false, reason: 'DOC', why: 'The commercial invoice is incomplete. Fix it before the shipment leaves, or it stalls at the border.' },
      { id: 'i2', to: 'Clinique Beaulieu', number: '42', street: 'Rue Laval', city: 'MONTREAL QC', service: 'priority', weight: 6, size: 'm', intl: true, issues: ['docs'], accept: false, reason: 'DOC', why: 'Same shipment, same invoice: both pieces wait until the paperwork is right.' }
    ]
  },

  m7_dg: {
    title: 'Declare It or Refuse It',
    par: 220,
    place: { sign: 'MAPLE LAB SUPPLY', accent: 0xE8A33D, kind: 'counter' },
    shipper: { name: 'Gail Brenner', spec: { skin: 0xF1C7A5, hair: 0xB8B8C0, hairStyle: 'bun', shirt: 0x7B3FC4, glasses: true, sleeves: 'long' } },
    intro: {
      title: 'Declare It or Refuse It',
      lines: [
        'Dangerous goods are only safe when they\'re declared, marked and packed properly.',
        'Undeclared hazardous material is how trucks and planes catch fire.',
        'Check what the shipper tells you against what\'s marked on the box.',
        'If it isn\'t declared and marked, it doesn\'t go on your truck. Refuse it and explain what\'s needed.'
      ]
    },
    keyLessons: [
      'What the shipper says the contents are has to match the marks and paperwork on the box.',
      'Batteries, flammables, aerosols and pressurised items all have declaration and marking rules.',
      'Never accept "it\'s only a small amount". Undeclared dangerous goods get refused, every time.'
    ],
    manifest: 4,
    talk: {
      start: 'd0',
      nodes: {
        d0: { speaker: 'shipper', text: 'Four today. One\'s the usual lab order, and there\'s a couple of extras.', next: 'd1' },
        d1: {
          speaker: 'shipper', text: 'Oh, and the gray one for Foundry Road is just a liter of solvent for our sister lab. It\'s sealed, it\'ll be fine.',
          check: 'Responded to an undeclared hazard',
          choices: [
            { text: '"Solvent is a dangerous good. Without the right marks and declaration I can\'t take it. Let me show you what it needs."', grade: 'good', effects: { safety: 3, service: 1 }, feedback: 'Firm, specific and helpful. The shipper learns how to ship it properly next time.', next: 'd2' },
            { text: '"A liter is nothing. I\'ll put it at the back."', grade: 'bad', effects: { safety: -3 }, feedback: 'Undeclared flammable liquid in a hot truck is exactly how vehicle fires start, and it\'s illegal.', lesson: 'Never carry undeclared dangerous goods, however small the quantity.', critical: true, next: 'd2_bad' },
            { text: '"I don\'t think that\'s allowed. Let me call someone."', grade: 'ok', effects: { safety: 1 }, feedback: 'Checking is better than guessing, but this one is clear: undeclared, so it stays.', next: 'd2' }
          ]
        },
        d2: { speaker: 'shipper', text: 'All right, all right. Take a look at the rest.', expr: 'annoyed', next: 'end' },
        d2_bad: { speaker: 'shipper', text: 'Great, thanks! Saves me the paperwork.', expr: 'happy', next: 'd2_bad2' },
        d2_bad2: { speaker: 'narrator', text: 'What you said does not change the rules: an undeclared flammable liquid does not go on your truck. You will have to refuse it at the counter, and explain why.', next: 'end' },
        end: { type: 'end', outcome: 'mixed' }
      }
    },
    pieces: [
      { id: 'g1', to: 'Riverton Labs', number: '4', street: 'Science Park', city: 'RIVERTON', service: 'standard', weight: 10, size: 'm', accept: true, why: 'Plain lab consumables, properly labeled.' },
      { id: 'g2', to: 'Sister Lab', number: '19', street: 'Foundry Rd', city: 'RIVERTON', service: 'standard', weight: 7, size: 'm', color: 0x9FA6B2, issues: ['hazmat_undeclared'], accept: false, reason: 'DG', why: 'The shipper described flammable solvent. With no hazard marks or declaration it cannot be accepted.' },
      { id: 'g3', to: 'Riverton Labs', number: '4', street: 'Science Park', city: 'RIVERTON', service: 'hazmat', weight: 16, size: 'm', color: 0xE8DDB8, marks: ['class3'], declared: true, accept: true, why: 'Properly marked and declared dangerous goods, packed for transport.' },
      { id: 'g4', to: 'Beacon Instruments', number: '66', street: 'Kiln St', city: 'RIVERTON', service: 'standard', weight: 5, size: 's', issues: ['hazmat_undeclared'], hint: 'Contents list on the box: "lithium battery packs ×20"', accept: false, reason: 'DG', why: 'Lithium batteries have their own marking and handling rules. Undeclared and unmarked means refused.' }
    ]
  }
};
