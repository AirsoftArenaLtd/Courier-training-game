/*
 * Module 3 · Tricky Doorsteps (StopScene): the people at the door are the hard part.
 *   ds1  an angry customer who waited in all day (and a 68 lb box: how do you move it?)
 *   ds2  a customer who speaks Spanish, and a signature to get
 *   ds3  a "neighbor" who offers to take a signature package for the customer
 * Same stop format as data/m5_stops.js; a stop's `stranger` is someone who isn't the customer (acts strangerAppears
 * and strangerLeaves, speaker 'stranger').
 */
window.OTR_DATA = window.OTR_DATA || {};
OTR_DATA.stopSets = OTR_DATA.stopSets || {};

(function () {
  const P = {
    dana: { skin: 0xF1C7A5, hair: 0x6B3F2A, hairStyle: 'long', shirt: 0x7A4FB5, sleeves: 'long' },
    ana: { skin: 0xC98E6B, hair: 0x1E1410, hairStyle: 'bun', shirt: 0x2E7D5B, glasses: true },
    guy: { skin: 0xE0B08A, hair: 0x3A2418, hairStyle: 'short', shirt: 0x6B7B8C, jacket: 0x2A2A32, beard: true }
  };

  OTR_DATA.stopSets.m3_doorsteps = {
    title: 'Tricky Doorsteps',
    tod: 'midday', weather: 'clear', time: 11 * 60 + 40,
    intro: {
      title: 'Tricky Doorsteps',
      lines: [
        'Three doorsteps where the people are the hard part: someone angry, someone you can\'t easily talk to, and someone who isn\'t who the package is for.',
        'Walk with A/D, SHIFT to walk carefully, E to interact, TAB for the handheld.',
        'Stay calm, stay polite, and keep to the delivery rules however the conversation goes.'
      ]
    },
    keyLessons: [
      'An upset customer calms down faster when you acknowledge the problem first and then say what you can do.',
      'A language barrier is solved with the label, pointing and the handheld\'s screen, not by talking louder.',
      'A signature-required package goes only to the person who can sign for it. A helpful neighbor is still not the customer.',
      'Heavy packages go on the hand truck (or get a second person): don\'t carry what you can wheel.'
    ],
    stops: [
      {
        id: 'ds1',
        brief: '88 Cedar St: SIGNATURE REQUIRED. The package is a day late.',
        par: 150,
        lot: { kind: 'house', spec: { number: '88', steps: 2, wall: 0xDCE6EE, roof: 0x3E4A5C, door: 0x2A3F7A, siding: 'lap', porchW: 440, shutters: 0x2A3F7A } },
        props: [
          { type: 'mailbox', x: -200, art: { number: '88' } },
          { type: 'streetsign', x: -270, art: { text: 'CEDAR ST' } }
        ],
        packages: [{ id: 'p1', to: 'Dana Brooks', number: '88', street: 'Cedar St', service: 'signature', weight: 68, size: 'l', tracking: '7790 0301 8888' }],
        decoys: [{ id: 'd1', to: 'Dana Brooks', number: '86', street: 'Cedar St', service: 'standard', weight: 6, size: 'm', tracking: '7790 0301 8686' }],
        answer: { name: 'Dana Brooks', spec: P.dana, adult: true, atAddress: true, delay: 2, talk: 'dana', id: { dob: '03/02/1979', exp: '03/02/2029' } },
        expected: { outcome: 'deliver', types: ['recipient', 'adult'] },
        talks: {
          dana: {
            start: 'a0',
            nodes: {
              a0: { speaker: 'dana', expr: 'angry', text: 'Finally! This was supposed to be here YESTERDAY. I stayed home all day for it!', next: 'a1' },
              a1: {
                speaker: 'dana', text: 'Do you people even look at the dates?',
                check: 'Calmed an upset customer',
                choices: [
                  { text: '"I\'m sorry you waited in all day, that\'s really frustrating. It\'s here now. If you want it on record, I\'ll give you the number to report the delay."', grade: 'good', effects: { service: 3 }, feedback: 'Acknowledge first, then offer something real. Most anger is about not being heard.', next: 'a2' },
                  { text: '"Sorry about that. Can I get a signature?"', grade: 'ok', effects: { service: 1 }, feedback: 'Polite, but it skips the part the customer needed: hearing that their day was wasted, and what they can do about it.', lesson: 'With an upset customer, acknowledge the problem before you ask for anything.', next: 'a2' },
                  { text: '"I just deliver what they give me. It\'s not my fault."', grade: 'bad', effects: { service: -2 }, feedback: 'It may be true, but it sounds like a brush-off and makes it worse. You are the company at the door.', lesson: 'Don\'t argue about blame at the door: acknowledge, apologize for the experience, and offer the next step.', next: 'a2b' }
                ]
              },
              a2: { speaker: 'dana', expr: 'neutral', text: '…Okay. Thank you. Where do I sign?', next: 'end' },
              a2b: { speaker: 'dana', expr: 'angry', text: 'Unbelievable. Just give it here.', next: 'end' },
              end: { type: 'end' }
            }
          }
        },
        lessons: ['Acknowledge the problem, apologize for the experience, offer the next step. Then the signature.']
      },
      {
        id: 'ds2',
        brief: '14 Alder Ln: SIGNATURE REQUIRED.',
        par: 130,
        lot: { kind: 'house', spec: { number: '14', steps: 2, wall: 0xF1E3C6, roof: 0x6B3F3A, door: 0xB8324A, siding: 'shingle', stories: 1, porchW: 400, porchX: 330, chimney: false } },
        props: [
          { type: 'mailbox', x: -200, art: { number: '14' } },
          { type: 'streetsign', x: -270, art: { text: 'ALDER LN' } }
        ],
        packages: [{ id: 'p1', to: 'Ana Morales', number: '14', street: 'Alder Ln', service: 'signature', weight: 4, size: 's', tracking: '7790 0302 1414' }],
        decoys: [{ id: 'd1', to: 'Ana Morales', number: '41', street: 'Alder Ln', service: 'standard', weight: 4, size: 's', tracking: '7790 0302 4141' }],
        answer: { name: 'Ana Morales', spec: P.ana, adult: true, atAddress: true, delay: 3, talk: 'ana', id: { dob: '11/19/1968', exp: '11/19/2028' } },
        expected: { outcome: 'deliver', types: ['recipient', 'adult'] },
        talks: {
          ana: {
            start: 'b0',
            nodes: {
              b0: { speaker: 'ana', expr: 'happy', text: '¡Hola! ¿Es un paquete para mí?', next: 'b0n' },
              b0n: { speaker: 'narrator', text: 'The customer asks, in Spanish, whether the package is theirs, and doesn\'t seem to speak much English.', next: 'b1' },
              b1: {
                speaker: 'narrator', text: 'You need a signature. What do you do?',
                check: 'Got a signature across a language barrier',
                choices: [
                  { text: 'Smile, show the label and point to the name on it, then turn the handheld round to the signature box: "¿Firma, por favor?"', grade: 'good', effects: { service: 3 }, feedback: 'The label, pointing and the screen do the talking. A couple of words of the customer\'s language are a kindness, not a requirement.', next: 'b2' },
                  { text: 'Say "Sign here" slowly and point at the screen.', grade: 'ok', effects: { service: 2 }, feedback: 'That works. Showing their own name on the label first tells them it really is theirs.', next: 'b2' },
                  { text: 'Say it again, louder, in English.', grade: 'bad', effects: { service: -1 }, feedback: 'Louder isn\'t clearer, and it feels like shouting. Show, don\'t repeat.', lesson: 'Across a language barrier: the label, pointing and the handheld screen. Not volume.', next: 'b1b' },
                  { text: 'Leave the package on the step and go.', grade: 'bad', effects: { service: -3 }, feedback: 'It needs a signature. Leaving it breaks the rule, and the customer is standing right there.', lesson: 'A signature-required package is never left unattended, however awkward the conversation.', next: 'b1b' }
                ]
              },
              b1b: { speaker: 'ana', expr: 'worried', text: '¿Perdón? No entiendo…', next: 'b1c' },
              b1c: { speaker: 'narrator', text: 'You show the label with the customer\'s name on it and turn the screen round. A nod.', next: 'b2' },
              b2: { speaker: 'ana', expr: 'happy', text: '¡Ah, sí! Ana Morales. ¡Gracias!', next: 'end' },
              end: { type: 'end' }
            }
          }
        },
        lessons: ['Show the label and the signature screen. A smile and a few words go further than volume.']
      },
      {
        id: 'ds3',
        brief: '22 Birch Ln: SIGNATURE REQUIRED for Priya Nair.',
        par: 150,
        lot: { kind: 'house', spec: { number: '22', steps: 3, wall: 0xC9D8C4, roof: 0x4A4A58, door: 0x2F6B5A, siding: 'lap', porchW: 420, porchX: 320 } },
        props: [
          { type: 'mailbox', x: -200, art: { number: '22' } },
          { type: 'streetsign', x: -270, art: { text: 'BIRCH LN' } }
        ],
        packages: [{ id: 'p1', to: 'Priya Nair', number: '22', street: 'Birch Ln', service: 'signature', weight: 3, size: 's', tracking: '7790 0303 2222' }],
        decoys: [{ id: 'd1', to: 'Priya Nair', number: '22', street: 'Birch Ct', service: 'standard', weight: 3, size: 's', tracking: '7790 0303 2233' }],
        answer: null,
        stranger: { name: '"Neighbor"', spec: P.guy },
        triggers: [{ x: 'stepsX0-240', w: 44, talk: 'neighbor' }],
        expected: { outcome: 'exception', code: 'NA', doorTag: true },
        talks: {
          neighbor: {
            start: 'c0',
            hint: 'Nobody home and a signature needed: record the exception on your handheld (TAB) and leave a door tag.',
            nodes: {
              c0: { speaker: 'narrator', act: 'strangerAppears', text: 'A man walks up the drive behind you.', next: 'c1' },
              c1: { speaker: 'stranger', text: 'Hey, is that for Priya? I\'m her neighbor, next door. She\'s at work. I can take it for her, save you a trip.', next: 'c2' },
              c2: {
                speaker: 'narrator', text: 'It needs Priya\'s signature. What do you say?',
                check: 'Kept a signature package from someone who isn\'t the customer',
                choices: [
                  { text: '"Thanks, that\'s kind. But this one needs Priya\'s own signature, so I can\'t leave it with anyone else. I\'ll leave her a notice."', grade: 'good', effects: { service: 3 }, feedback: 'Polite and firm. The rule protects Priya, and a friendly stranger is exactly who it protects her from.', next: 'c3' },
                  { text: '"Can you show me some ID first?"', grade: 'ok', effects: { service: 1 }, feedback: 'Checking is good instinct, but even with ID a neighbor can\'t sign for a signature-required package unless Priya arranged it.', lesson: 'A signature-required package goes to the recipient (or someone they arranged), not to whoever offers.', next: 'c_id' },
                  { text: '"Great, sign here and it\'s yours."', grade: 'bad', critical: true, effects: { service: -3 }, feedback: 'Porch pirates rely on exactly this. You have no idea who he is, and the package now has no real signature.', lesson: 'Never hand a signature-required package to someone who isn\'t the recipient, however helpful they seem.', next: 'c_bad' }
                ]
              },
              c_id: { speaker: 'stranger', text: 'Uh… I left my wallet inside. Never mind.', next: 'c3' },
              c_bad: { speaker: 'narrator', text: 'You think better of it before he can sign: the package stays with you. On a real route, that would have been too late.', next: 'c3' },
              c3: { speaker: 'stranger', act: 'strangerLeaves', text: 'Alright, no worries.', next: 'end' },
              end: { type: 'end' }
            }
          }
        },
        lessons: ['Nobody home + signature required = exception, a door tag, and the package stays with you. Whoever offers to take it.']
      }
    ]
  };
})();
