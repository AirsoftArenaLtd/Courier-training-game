/*
 * Module 5 · Scanner & Exceptions — walkable doorstep stops (StopScene).
 *
 * Stop set:  { title, tod, weather, intro: {title, lines}, keyLessons, stops: [stop, ...] }
 * Stop:
 *   id, brief            one-line dispatcher brief shown before the stop
 *   tod, weather, time   overrides; time = minutes after midnight (e.g. 9*60+40)
 *   par                  seconds for full efficiency marks (default 120)
 *   lot: { kind: 'house' | 'apartment' | 'business', spec: { facade options }, ground: 'path' | 'concrete' }
 *   props: [{ type, x (relative to lot start), art, depth, id, hazard: 'hose'|'toys'|'ice'|'wet'|'crack', label }]
 *   spots: [{ id, label, x (relative to door, px), grade, note }]         where a package can be left for a photo POD
 *   packages: [{ id, to, number, street, unit, service, weight, size: 's'|'m'|'l'|'env', marks, note, pieces, piece }]
 *   decoys: [{ ...package }]                                               near-miss packages on the same shelf
 *   answer: null | { name, spec, adult: true, atAddress: true, delay: sec, talk: graphKey, role: 'resident'|'reception', age, id: {dob, exp} }
 *   expected: { outcome: 'deliver'|'exception', types: ['recipient', ...], spot, code, doorTag }
 *   talks: { key: talk graph }  (see src/core/talk.js)
 *   lessons: []
 */
window.OTR_DATA = window.OTR_DATA || {};
OTR_DATA.stopSets = OTR_DATA.stopSets || {};

(function () {
  const people = {
    rosa: { skin: 0xE0B08A, hair: 0x3A2418, hairStyle: 'bun', shirt: 0xE8A33D, glasses: true },
    marcus: { skin: 0x8D5A3B, hair: 0x1E1410, hairStyle: 'buzz', shirt: 0x3E6FB0, beard: true },
    priya: { skin: 0xC98E6B, hair: 0x1E1410, hairStyle: 'ponytail', shirt: 0xFFFFFF, collar: true, lanyard: 0x3DA5FF, sleeves: 'long', pants: 0x2B3550 }
  };

  OTR_DATA.stopSets.m5_pod = {
    title: 'Proof of Delivery',
    tod: 'morning', weather: 'clear', time: 9 * 60 + 20,
    intro: {
      title: 'Proof of Delivery',
      lines: [
        'Three stops. Each one needs the right proof that the package got where it belongs.',
        'Walk with A/D or the arrow keys (or click the ground). Hold SHIFT to walk carefully. Press E to interact.',
        'Open your handheld with TAB to scan, deliver or record an exception.',
        'Pull the right package BEFORE you climb out. Read the label, scan it, and follow any delivery notes.'
      ]
    },
    keyLessons: [
      'Scan every package before it leaves the truck: it catches wrong-stop packages and shows signature and delivery requirements.',
      'Follow the customer\'s delivery instructions when it\'s safe to, and take a clear photo of the package and where it was left: no house numbers, no people.',
      'At businesses a receptionist or mailroom can sign. Record THEIR printed name, not the addressee\'s.'
    ],
    stops: [
      {
        id: 'pod1',
        brief: '214 Birch Ln — residential, standard delivery. The customer left a delivery note.',
        par: 110,
        lot: { kind: 'house', spec: { number: '214', steps: 3, wall: 0xDCE6EE, roof: 0x3E4A5C, door: 0xB8324A, shutters: 0x2F4F6F, porchW: 460 } },
        props: [
          { type: 'mailbox', x: -200, art: { number: '214' } },
          { type: 'streetsign', x: -260, art: { text: 'BIRCH LN' } },
          { type: 'planter', x: 'porchX1-80', onPorch: true, id: 'planter' },
          { type: 'tree', x: 1250, depth: -9 }
        ],
        spots: [
          { id: 'planter', label: 'Behind the planter', report: 'behind the planter, as the note asks', x: 'planter', grade: 'good' },
          { id: 'mat', label: 'On the doormat', x: 0, grade: 'ok', note: 'Fine in a pinch, but the customer asked for the planter, where it\'s out of view of the street.' },
          { id: 'steps', label: 'At the bottom of the steps', x: 'steps', grade: 'bad', note: 'Visible from the street, in the rain path and a trip hazard.' }
        ],
        packages: [{ id: 'p1', to: 'Dana Whitfield', number: '214', street: 'Birch Ln', service: 'standard', weight: 6, size: 'm', note: 'Please leave behind the planter', tracking: '7749 2210 4431' }],
        decoys: [
          { id: 'd1', to: 'K. Osei', number: '216', street: 'Birch Ln', service: 'standard', weight: 3, size: 's', tracking: '7749 2210 5570' },
          { id: 'd2', to: 'Dana Whitfield', number: '214', street: 'Birch Ct', service: 'priority', weight: 9, size: 'm', tracking: '7749 2210 9918' },
          { id: 'd3', to: 'L. Park', number: '41', street: 'Birch Ln', service: 'signature', weight: 2, size: 'env', tracking: '7749 2211 0042' }
        ],
        answer: null,
        expected: { outcome: 'deliver', types: ['left'], spot: 'planter' },
        lessons: ['Knock first: a hand-off beats leaving a package. If nobody answers and no signature is required, follow the delivery note.']
      },
      {
        id: 'pod2',
        brief: '58 Oak St — SIGNATURE REQUIRED. Somebody should be home.',
        par: 120,
        lot: { kind: 'house', spec: { number: '58', steps: 2, wall: 0xF1E3C6, roof: 0x6B3F3A, door: 0x2F6B5A, siding: 'shingle', stories: 1, porchW: 400, porchX: 330, chimney: false, wreath: true } },
        props: [
          { type: 'mailbox', x: -200, art: { number: '58', color: 0x6B3F3A } },
          { type: 'streetsign', x: -260, art: { text: 'OAK ST' } },
          { type: 'bin', x: 60, art: { color: 0x2E8A4A } },
          { type: 'tree', x: 1150, depth: -9, art: { autumn: true } }
        ],
        packages: [{ id: 'p1', to: 'Marcus Bell', number: '58', street: 'Oak St', service: 'signature', weight: 4, size: 's', tracking: '7749 3302 1180' }],
        decoys: [
          { id: 'd1', to: 'Marcus Bell', number: '85', street: 'Oak St', service: 'standard', weight: 12, size: 'l', tracking: '7749 3302 7765' },
          { id: 'd2', to: 'T. Nguyen', number: '58', street: 'Elm St', service: 'signature', weight: 4, size: 's', tracking: '7749 3302 6621' }
        ],
        answer: { name: 'Marcus Bell', spec: people.marcus, adult: true, atAddress: true, delay: 2.5, talk: 'marcus' },
        expected: { outcome: 'deliver', types: ['recipient', 'adult'] },
        talks: {
          marcus: {
            start: 'a0',
            nodes: {
              a0: { speaker: 'marcus', text: 'Morning! Oh nice, that\'s the part for my bike. Do you need me for anything?', next: 'a1', expr: 'happy' },
              a1: {
                speaker: 'marcus', text: 'Honestly, can you just leave these next time? I\'m not always home to sign.',
                check: 'Explained the signature requirement',
                choices: [
                  { text: '"This one needs a signature because the shipper required it. You can check your delivery options through tracking or customer support."', grade: 'good', effects: { service: 2 }, feedback: 'Clear and honest. The requirement comes from the shipper, and you pointed him to the official way to manage future deliveries.', next: 'a2' },
                  { text: '"Sure, I\'ll just leave them on the porch from now on."', grade: 'bad', effects: { service: -1 }, feedback: 'You can\'t promise to skip a signature requirement. It\'s set by the shipper, and leaving it unattended would break the delivery rules.', lesson: 'Never promise to bypass a signature requirement: explain it and point to the official delivery options.', next: 'a2' },
                  { text: '"Not my rules, man."', grade: 'bad', effects: { service: -2, mood: -1 }, feedback: 'Technically true, but it sounds dismissive. Explain why and offer the next step.', lesson: 'Explain requirements in a helpful way, not a dismissive one.', next: 'a2' }
                ]
              },
              a2: { speaker: 'marcus', text: 'Got it. Where do I sign?', next: 'end' },
              end: { type: 'end', outcome: 'good' }
            }
          }
        },
        lessons: ['Signature-required packages are never left unattended. Capture the signature and the signer\'s printed name.']
      },
      {
        id: 'pod3',
        brief: 'Brightline Logistics, 900 Market St — business delivery for a staff member.',
        par: 130,
        lot: { kind: 'business', spec: { number: '900', name: 'BRIGHTLINE', awning: 0x3DA5FF, wall: 0xB9B3C4, siding: 'stucco', hours: 'MON–FRI\n8AM–6PM', open: true, steps: 1 }, interior: { kind: 'lobby', sign: 'BRIGHTLINE', accent: 0x3DA5FF } },
        props: [
          { type: 'streetsign', x: -260, art: { text: 'MARKET ST' } },
          { type: 'hydrant', x: -120 },
          { type: 'bench', x: 700 }
        ],
        packages: [{ id: 'p1', to: 'Jordan Reyes, Brightline', number: '900', street: 'Market St', unit: '4F', service: 'signature', weight: 3, size: 'env', tracking: '7749 5540 0201' }],
        decoys: [
          { id: 'd1', to: 'Jordan Reyes', number: '9000', street: 'Market St', service: 'standard', weight: 5, size: 'm', tracking: '7749 5540 7732' },
          { id: 'd2', to: 'Northwind Dental', number: '900', street: 'Market St', unit: '2A', service: 'standard', weight: 18, size: 'l', tracking: '7749 5540 3310' }
        ],
        answer: { name: 'Priya Nair', spec: people.priya, adult: true, atAddress: true, role: 'reception', delay: 0, talk: 'priya' },
        expected: { outcome: 'deliver', types: ['reception'] },
        talks: {
          priya: {
            start: 'b0',
            nodes: {
              b0: { speaker: 'priya', text: 'Hi there! Delivery for us?', next: 'b1', expr: 'happy' },
              b1: {
                speaker: 'priya', text: 'Jordan\'s in a meeting on four. I can sign for it. I handle all our packages.',
                check: 'Handled a business hand-off',
                choices: [
                  { text: '"Perfect, thanks. I\'ll have you sign and I\'ll record your name as the receiver."', grade: 'good', effects: { service: 2, efficiency: 1 }, feedback: 'Business deliveries can be signed for by reception or the mailroom. Just record who actually signed.', next: 'b2' },
                  { text: '"I need Jordan to come down and sign personally."', grade: 'ok', effects: { service: 0, efficiency: -1 }, feedback: 'Unless the service specifically requires the named person, reception signing is normal for a business and saves everyone time.', next: 'b2' },
                  { text: '"No problem. I\'ll just sign Jordan\'s name for you."', grade: 'bad', effects: { service: -3 }, feedback: 'Never sign on anyone\'s behalf. The signature has to come from the real person receiving the package.', lesson: 'Never sign for a customer. The person receiving the package signs, and you record their name.', next: 'b2' }
                ]
              },
              b2: { speaker: 'priya', text: 'Hand me your scanner when you\'re ready.', next: 'end' },
              end: { type: 'end', outcome: 'good' }
            }
          }
        },
        lessons: ['At business stops, go to reception and record the actual signer\'s printed name.']
      }
    ]
  };

  /* ------------------------------------------------------------------------------------------ exceptions */
  const more = {
    alma: { skin: 0xF1C7A5, hair: 0xB8B8C0, hairStyle: 'short', shirt: 0x7B3FC4, glasses: true, sleeves: 'long' },
    helen: { skin: 0xD9A77F, hair: 0x5A3A2A, hairStyle: 'bun', shirt: 0x2F8F83, earrings: 0xFFC83D },
    tyler: { skin: 0xF4D2B0, hair: 0xC8A060, hairStyle: 'short', shirt: 0xE8504A, shorts: true },
    grace: { skin: 0xE8C09A, hair: 0x1E1410, hairStyle: 'long', shirt: 0x3E6FB0, glasses: 0x8A4B2A }
  };

  OTR_DATA.stopSets.m5_exceptions = {
    title: 'Exception Calls',
    tod: 'midday', weather: 'cloudy', time: 11 * 60 + 10,
    intro: {
      title: 'Exception Calls',
      lines: [
        'Not every stop ends in a delivery. When it can\'t be delivered, the exception record is how the customer finds out what happened.',
        'Attempt the delivery properly first: knock or ring, and check the hours.',
        'Then use your handheld to record the RIGHT exception code, leave a door tag when the customer needs one, and put the package back in the truck.',
        'Codes in this game are illustrative. Use your station\'s official list on the job.'
      ]
    },
    keyLessons: [
      'Attempt first, then record the exception that matches what actually happened.',
      'Door tags tell the customer you came and what happens next. Leave one whenever they need to act.',
      'After an exception the package goes back on the truck. It never stays on a step "just in case".'
    ],
    stops: [
      {
        id: 'ex1',
        brief: '311 Cedar Ave: signature required.',
        par: 110,
        lot: { kind: 'house', spec: { number: '311', steps: 2, wall: 0xC9D8C4, roof: 0x4A4A58, door: 0x2A3F7A, siding: 'lap', stories: 1, porchW: 420, porchX: 320 } },
        props: [
          { type: 'mailbox', x: -200, art: { number: '311', color: 0x2A3F7A } },
          { type: 'streetsign', x: -260, art: { text: 'CEDAR AVE' } },
          { type: 'bin', x: 40, art: { color: 0x2E6BC4 } },
          { type: 'tree', x: 1120, depth: -9 }
        ],
        packages: [{ id: 'p1', to: 'Alma Reyes', number: '311', street: 'Cedar Ave', service: 'signature', weight: 2, size: 's', tracking: '7750 1100 3321' }],
        decoys: [
          { id: 'd1', to: 'Alma Reyes', number: '113', street: 'Cedar Ave', service: 'standard', weight: 6, size: 'm', tracking: '7750 1100 8872' },
          { id: 'd2', to: 'B. Fontaine', number: '311', street: 'Cedar Ct', service: 'signature', weight: 3, size: 's', tracking: '7750 1100 4410' }
        ],
        spots: [{ id: 'mat', label: 'On the doormat', x: 0, grade: 'ok' }],
        answer: null,
        expected: { outcome: 'exception', code: 'NA', doorTag: true },
        lessons: ['Nobody home + signature required = exception "recipient not available", a door tag, and the package stays on the truck.']
      },
      {
        id: 'ex2',
        brief: 'Northwind Dental, 1200 Harbor St. Running late this afternoon.',
        tod: 'evening', time: 17 * 60 + 40,
        par: 90,
        lot: { kind: 'business', spec: { number: '1200', name: 'NORTHWIND DENTAL', awning: 0x2F8F83, wall: 0xD8CFC0, siding: 'brick', hours: 'MON–FRI\n8AM–5PM', open: false, steps: 1 }, interior: { kind: 'lobby', sign: 'NORTHWIND', accent: 0x2F8F83 } },
        props: [
          { type: 'streetsign', x: -260, art: { text: 'HARBOR ST' } },
          { type: 'lamp', x: -120, art: { lit: true } },
          { type: 'bench', x: 760 }
        ],
        packages: [{ id: 'p1', to: 'Northwind Dental', number: '1200', street: 'Harbor St', service: 'standard', weight: 14, size: 'l', tracking: '7750 2200 1043' }],
        decoys: [
          { id: 'd1', to: 'Harbor Cafe', number: '1220', street: 'Harbor St', service: 'standard', weight: 20, size: 'l', tracking: '7750 2200 5521' }
        ],
        answer: null,
        expected: { outcome: 'exception', code: 'BC', doorTag: true },
        lessons: ['Check the posted hours. A closed business gets a "business closed" exception and a door tag, not a package left outside.']
      },
      {
        id: 'ex3',
        brief: '77 Willow Way: standard delivery.',
        par: 120,
        lot: { kind: 'house', spec: { number: '77', steps: 3, wall: 0xF3E1D6, roof: 0x5A4A6A, door: 0x6B3F3A, siding: 'shingle', porchW: 440, shutters: 0x6B3F3A } },
        props: [
          { type: 'mailbox', x: -200, art: { number: '77' } },
          { type: 'streetsign', x: -260, art: { text: 'WILLOW WAY' } },
          { type: 'planter', x: 'porchX0+40', onPorch: true }
        ],
        packages: [{ id: 'p1', to: 'Alma Kowalski', number: '77', street: 'Willow Way', service: 'standard', weight: 8, size: 'm', tracking: '7750 3300 7719' }],
        decoys: [
          { id: 'd1', to: 'Alma Kowalski', number: '77', street: 'Willow Ln', service: 'standard', weight: 8, size: 'm', tracking: '7750 3300 2206' }
        ],
        answer: { name: 'Alma Kowalski', spec: more.alma, adult: true, atAddress: true, delay: 3, talk: 'alma', moodStart: -1 },
        expected: { outcome: 'exception', code: 'RF', doorTag: false },
        talks: {
          alma: {
            start: 'r0',
            hint: 'Record the refusal on your handheld (TAB), then take the package back to the truck.',
            nodes: {
              r0: { speaker: 'alma', text: 'I didn\'t order anything from these people, and it looks like it\'s been dropped off a roof. I don\'t want it.', expr: 'annoyed', next: 'r1' },
              r1: {
                speaker: 'alma', text: 'Just take it away, please.',
                check: 'Handled a refused package',
                choices: [
                  { text: '"No problem. I\'ll record that you\'ve refused it and it\'ll go back to the shipper. You don\'t need to do anything else."', grade: 'good', effects: { service: 2, mood: 2 }, feedback: 'A customer can refuse a package. Record the refusal, reassure them, and take it back.', next: 'r2' },
                  { text: '"It\'s got your name on it, so I have to leave it with you."', grade: 'bad', effects: { service: -2, mood: -1 }, feedback: 'Refusal is the customer\'s right. Forcing it on them creates a complaint and a package nobody wants.', lesson: 'If a customer refuses a package, record the refusal and take it back.', next: 'r2' },
                  { text: '"I\'ll just leave it on the step and you can sort it out."', grade: 'bad', effects: { service: -3, mood: -2 }, feedback: 'Leaving a refused package means it still shows as delivered and ends up nobody\'s responsibility.', lesson: 'A refused package never gets left behind. It goes back on the truck with a refusal record.', next: 'r2' }
                ]
              },
              r2: { speaker: 'alma', text: 'Thank you. Sorry, it\'s not your fault.', next: 'end' },
              end: { type: 'end', outcome: 'good' }
            }
          }
        },
        lessons: ['Refused packages get the "refused" exception and go back on the truck. No door tag needed when you\'ve spoken to the customer.']
      }
    ]
  };

  /* ------------------------------------------------------------------------------------------ adult signature */
  OTR_DATA.stopSets.m5_adult = {
    title: 'Adult Signature & ID',
    tod: 'afternoon', weather: 'clear', time: 14 * 60 + 5,
    today: 'Today: 09/17/2026',
    intro: {
      title: 'Adult Signature & ID',
      lines: [
        'Some shipments (wine, certain medications, age-restricted goods) need an ADULT signature: 21 or older with a valid photo ID.',
        'Scan first. The handheld flags ADULT SIG 21+.',
        'At the door, hand the package over through Deliver → "Handed to recipient", then check the ID card: photo, name, date of birth and expiry.',
        'Today\'s date is September 17, 2026. If the ID doesn\'t check out, record exception "ID" and leave a door tag.'
      ]
    },
    keyLessons: [
      'Adult signature = 21+ with a valid, unexpired government photo ID. No exceptions for "almost" or "my parents said it\'s fine".',
      'Work out the age from the date of birth and today\'s date. Don\'t guess from how someone looks.',
      'If ID fails, don\'t release it: record the exception and leave a door tag so the right person can arrange delivery.'
    ],
    stops: [
      {
        id: 'ad1',
        brief: '18 Aspen Ct: adult signature (wine club shipment).',
        par: 130,
        lot: { kind: 'house', spec: { number: '18', steps: 2, wall: 0xE6D9F2, roof: 0x3E4A5C, door: 0x7B3FC4, siding: 'lap', stories: 2, porchW: 420, wreath: true } },
        props: [
          { type: 'mailbox', x: -200, art: { number: '18' } },
          { type: 'streetsign', x: -260, art: { text: 'ASPEN CT' } },
          { type: 'tree', x: 1150, depth: -9 }
        ],
        packages: [{ id: 'p1', to: 'Helen Ortiz', number: '18', street: 'Aspen Ct', service: 'adult', weight: 12, size: 'm', tracking: '7751 0100 1818' }],
        decoys: [{ id: 'd1', to: 'H. Ortiz', number: '81', street: 'Aspen Ct', service: 'standard', weight: 3, size: 's', tracking: '7751 0100 8181' }],
        answer: { name: 'Helen Ortiz', spec: more.helen, adult: true, atAddress: true, delay: 2.5, talk: 'helen', id: { dob: '04/22/1968', exp: '04/22/2029', no: 'D4471-2201' } },
        expected: { outcome: 'deliver', types: ['recipient', 'adult'], id: 'ok' },
        talks: {
          helen: {
            start: 'h0',
            hint: 'Deliver → Handed to recipient, then check her ID on your handheld.',
            nodes: {
              h0: { speaker: 'helen', text: 'Oh good, my wine club box! Perfect timing.', expr: 'happy', next: 'h1' },
              h1: {
                speaker: 'helen', text: 'Do you need anything from me?',
                check: 'Asked for ID politely',
                choices: [
                  { text: '"This one needs an adult signature, so I\'ll just need to see a photo ID. It\'s the same for everyone."', grade: 'good', effects: { service: 2 }, feedback: 'Explaining that it\'s required for everyone keeps it from feeling personal.', next: 'h2' },
                  { text: '"ID."', grade: 'ok', effects: { service: 1 }, feedback: 'Correct, but blunt. A quick "it\'s required for everyone" makes the ID check feel routine rather than suspicious.', next: 'h2' },
                  { text: '"You\'re clearly over 21, so I\'ll skip the ID."', grade: 'bad', effects: { service: -2 }, feedback: 'You can\'t judge age by appearance, and skipping the check breaks the adult-signature requirement.', lesson: 'Always check ID for an adult signature, whatever the person looks like.', next: 'h2' }
                ]
              },
              h2: { speaker: 'helen', text: 'Sure, here you go.', next: 'end' },
              end: { type: 'end', outcome: 'good' }
            }
          }
        },
        lessons: ['A valid ID showing 21+ means you can release it. Capture the signature and printed name.']
      },
      {
        id: 'ad2',
        brief: '402 Spruce St: adult signature.',
        par: 140,
        lot: { kind: 'house', spec: { number: '402', steps: 3, wall: 0xDCE6EE, roof: 0x4F4458, door: 0x2F6B5A, siding: 'lap', porchW: 460, shutters: 0x2F6B5A } },
        props: [
          { type: 'mailbox', x: -200, art: { number: '402' } },
          { type: 'streetsign', x: -260, art: { text: 'SPRUCE ST' } },
          { type: 'skateboard', x: 'porchX1-120', onPorch: true }
        ],
        packages: [{ id: 'p1', to: 'Daniel Brooks', number: '402', street: 'Spruce St', service: 'adult', weight: 10, size: 'm', tracking: '7751 0200 4020' }],
        decoys: [{ id: 'd1', to: 'Daniel Brooks', number: '420', street: 'Spruce St', service: 'adult', weight: 10, size: 'm', tracking: '7751 0200 4200' }],
        answer: { name: 'Tyler Brooks', spec: more.tyler, adult: true, atAddress: true, delay: 3, talk: 'tyler', id: { dob: '11/03/2005', exp: '11/03/2029', no: 'D9902-3310' } },
        expected: { outcome: 'exception', code: 'ID', doorTag: true, id: 'under' },
        talks: {
          tyler: {
            start: 't0',
            hint: 'Check his ID on your handheld (Deliver → Handed to recipient).',
            nodes: {
              t0: { speaker: 'tyler', text: 'Hey. That\'s my dad\'s. He\'s at work, but I can sign for it.', next: 't1' },
              t1: {
                speaker: 'tyler', text: 'I\'m basically twenty-one anyway. It\'s fine, he knows it\'s coming.',
                check: 'Held the line on the ID requirement',
                choices: [
                  { text: '"No worries, anyone 21 or older at the address can sign. Can I see your ID?"', grade: 'good', effects: { service: 2 }, feedback: 'Stay friendly and let the ID decide, not the story.', next: 't2' },
                  { text: '"If your dad\'s expecting it, that\'s good enough for me."', grade: 'bad', effects: { service: -3 }, feedback: 'The requirement is age with valid ID, not permission from someone who isn\'t there.', lesson: '"Basically 21" and "my parents said it\'s fine" don\'t count. Check the ID.', next: 't2' }
                ]
              },
              t2: { speaker: 'tyler', text: 'Fine. Here.', expr: 'annoyed', next: 'end' },
              end: { type: 'end', outcome: 'mixed' }
            }
          }
        },
        lessons: ['Born 11/03/2005 means he\'s still 20 today. Don\'t release it: record exception ID and leave a door tag for the adult recipient.']
      },
      {
        id: 'ad3',
        brief: '9 Linden Pl: adult signature (pharmacy shipment).',
        par: 140,
        lot: { kind: 'house', spec: { number: '9', steps: 2, wall: 0xF1E3C6, roof: 0x6B3F3A, door: 0x3A4658, siding: 'shingle', stories: 1, porchW: 400, porchX: 340, chimney: false } },
        props: [
          { type: 'mailbox', x: -200, art: { number: '9' } },
          { type: 'streetsign', x: -260, art: { text: 'LINDEN PL' } },
          { type: 'planter', x: 'porchX0+50', onPorch: true }
        ],
        packages: [{ id: 'p1', to: 'Grace Kim', number: '9', street: 'Linden Pl', service: 'adult', weight: 2, size: 's', tracking: '7751 0300 0909' }],
        decoys: [{ id: 'd1', to: 'Grace Kim', number: '9', street: 'Linden Ave', service: 'standard', weight: 5, size: 'm', tracking: '7751 0300 9990' }],
        answer: { name: 'Grace Kim', spec: more.grace, adult: true, atAddress: true, delay: 2.5, talk: 'grace', id: { dob: '06/30/1984', exp: '03/01/2025', no: 'D7710-4412' } },
        expected: { outcome: 'exception', code: 'ID', doorTag: true, id: 'invalid' },
        talks: {
          grace: {
            start: 'k0',
            hint: 'Check her ID carefully on your handheld.',
            nodes: {
              k0: { speaker: 'grace', text: 'Hi! That\'s my prescription. I really need it today.', expr: 'worried', next: 'k1' },
              k1: { speaker: 'grace', text: 'You\'ll want my ID, right? Hang on, let me grab it.', next: 'end' },
              end: { type: 'end', outcome: 'good' }
            }
          }
        },
        lessons: ['Her license expired 03/01/2025. An expired ID isn\'t valid ID, even when it\'s clearly her. Record exception ID and leave a door tag with the next steps.']
      }
    ]
  };
})();
