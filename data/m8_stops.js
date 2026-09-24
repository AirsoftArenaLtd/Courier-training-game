/*
 * Module 8 · Personal Safety & Wellness — walkable stops (StopScene). Format: see data/m5_stops.js, plus:
 *   stepHazard: 'ice' | 'wet'                    the porch steps are slippery (walk carefully with SHIFT)
 *   props[].hazard: 'ice'|'wet'|'hose'|'toys'|'crack'   hose/toys can be moved aside with E
 *   props[].shade: true, shadeW                 shade to rest in (a tree, an umbrella): ±shadeW px (150); a porch roof or a
 *                                               shop awning shades what is under it in any heat stop
 *   fence: { x0, x1, gate, color, locked }      front fence with a gate (x relative to the lot)
 *   dog: { spec, name, mood, x, hidden, patrol: [x0, x1], barks: range, scale }
 *   triggers: [{ x, w, talk, on: 'gate', if }]  start a situation when the courier reaches x (or opens the gate)
 *   set.heat: { hydration, bodyHeat, intensity } and set.talks.heatSigns   heat & hydration system
 * Situation graphs can call scene actions (act): dogCharge, dogLunge, dogChase, dogShow, dogLeave, dogBark, dogMood,
 *   freeze, shield, backAway ('van' | px), approach, ownerAppears ('gate'), ownerTakesDog, openGate, honk,
 *   phoneCall, drink, rest (ms), focus ('dog' | null), expr, anim, wait (ms).
 */
window.OTR_DATA = window.OTR_DATA || {};
OTR_DATA.stopSets = OTR_DATA.stopSets || {};

(function () {
  const winter = { jacket: 0x4D148C, sleeves: 'long', pants: 0x2C2A3C };
  const summer = { shorts: true, sleeves: 'short' };
  const P = {
    sam: { skin: 0x8D5A3B, hair: 0x1E1410, hairStyle: 'curly', shirt: 0xFFC83D, beard: true, sleeves: 'long' },
    jo: { skin: 0xF1C7A5, hair: 0xC0602A, hairStyle: 'ponytail', shirt: 0x3DA5FF, jacket: 0x2F6B5A },
    chen: { skin: 0xF0D2B4, hair: 0x2A2A30, hairStyle: 'bun', shirt: 0xFF5C8A, glasses: true, sleeves: 'long' },
    alvarez: { skin: 0xC98E6B, hair: 0x3A2418, hairStyle: 'short', shirt: 0x6B7B8C, mustache: true },
    ruiz: { skin: 0xD9A77F, hair: 0x1E1410, hairStyle: 'buzz', shirt: 0xFFFFFF, collar: true },
    dee: { skin: 0x8D5A3B, hair: 0x2A1A14, hairStyle: 'long', shirt: 0xE8A33D, lanyard: 0x2F8F83, sleeves: 'long' }
  };

  /* ------------------------------------------------------------------------------------------ slips, trips, falls */
  OTR_DATA.stopSets.m8_steps = {
    title: 'Watch Your Step',
    tod: 'morning', weather: 'snow', time: 8 * 60 + 40,
    courier: winter,
    intro: {
      title: 'Watch Your Step',
      lines: [
        'Slips, trips and falls are among the most common ways couriers get hurt, and you\'re usually carrying something when they happen.',
        'Hold SHIFT to walk carefully on ice, wet steps and uneven ground. It\'s slower, but you stay upright.',
        'Clear trip hazards (hoses, toys) out of your path with E before you carry a package over them.',
        'Use three points of contact getting in and out of the truck, every time.'
      ]
    },
    keyLessons: [
      'Slow down on ice and wet surfaces: short steps, feet flat, and hold SHIFT to walk carefully.',
      'Clear trip hazards before you walk the path with a package that blocks your view.',
      'Three points of contact in and out of the cab. Most cab falls happen on the way down.'
    ],
    stops: [
      {
        id: 'sf1',
        brief: '120 Frost Ln: standard delivery. Overnight freeze, and the walkway hasn\'t been salted.',
        par: 150,
        lot: { kind: 'house', spec: { number: '120', steps: 3, wall: 0xDCE6EE, roof: 0x3E4A5C, door: 0x2A3F7A, shutters: 0x2A3F7A, porchW: 440 } },
        props: [
          { type: 'mailbox', x: -200, art: { number: '120' } },
          { type: 'streetsign', x: -260, art: { text: 'FROST LN' } },
          { type: 'ice', x: -60, hazard: 'ice', id: 'ice_walk', label: 'the icy sidewalk', art: { w: 180 } },
          { type: 'ice', x: 170, hazard: 'ice', id: 'ice_path', label: 'the frozen path', art: { w: 150 } },
          { type: 'tree', x: 1150, depth: -9, art: { snow: true } }
        ],
        stepHazard: 'ice',
        spots: [
          { id: 'mat', label: 'On the doormat', x: 0, grade: 'good' },
          { id: 'steps', label: 'At the bottom of the icy steps', x: 'steps', grade: 'bad', note: 'Out in the snow and a hazard for anyone using the steps.' }
        ],
        packages: [{ id: 'p1', to: 'Jo Lindqvist', number: '120', street: 'Frost Ln', service: 'standard', weight: 9, size: 'm', tracking: '7760 0100 1201' }],
        decoys: [{ id: 'd1', to: 'J. Lindqvist', number: '102', street: 'Frost Ln', service: 'standard', weight: 4, size: 's', tracking: '7760 0100 1020' }],
        answer: null,
        expected: { outcome: 'deliver', types: ['left'], spot: 'mat' },
        lessons: ['On ice: slow, short steps with SHIFT held, both hands free for balance when you can.']
      },
      {
        id: 'sf2',
        brief: '64 Brook Rd: standard delivery. Steady rain, and the kids have been playing outside.',
        weather: 'rain', tod: 'midday', time: 11 * 60 + 20,
        courier: { jacket: 0x2F3A4A, sleeves: 'long' },
        par: 150,
        lot: { kind: 'house', spec: { number: '64', steps: 3, wall: 0xEAD9C2, roof: 0x5A4A3A, door: 0x2F6B5A, siding: 'shingle', porchW: 440 } },
        props: [
          { type: 'mailbox', x: -200, art: { number: '64' } },
          { type: 'streetsign', x: -260, art: { text: 'BROOK RD' } },
          { type: 'hose', x: 20, hazard: 'hose', id: 'hose', label: 'the garden hose' },
          { type: 'toys', x: 190, hazard: 'toys', id: 'toys', label: 'the toys on the path' },
          { type: 'puddle', x: -40, depth: 4, art: { w: 200 } }
        ],
        stepHazard: 'wet',
        packages: [{ id: 'p1', to: 'Sam Okafor', number: '64', street: 'Brook Rd', service: 'standard', weight: 22, size: 'l', tracking: '7760 0200 6464' }],
        decoys: [{ id: 'd1', to: 'Sam Okafor', number: '46', street: 'Brook Rd', service: 'standard', weight: 7, size: 'm', tracking: '7760 0200 4646' }],
        answer: { name: 'Sam Okafor', spec: P.sam, adult: true, atAddress: true, delay: 2.5, talk: 'sam' },
        expected: { outcome: 'deliver', types: ['recipient', 'adult'] },
        talks: {
          sam: {
            start: 's0',
            hint: 'Record the hand-off on your handheld (TAB).',
            nodes: {
              s0: { speaker: 'sam', text: 'Oh wow, that\'s heavy. Thanks for hauling it up in this weather!', expr: 'happy', next: 's1' },
              s1: {
                speaker: 'sam', text: 'Sorry about the mess on the walk. The kids leave stuff everywhere.',
                check: 'Mentioned the hazard helpfully',
                choices: [
                  { text: '"No worries! Heads-up: the hose and toys are easy to trip on, and the steps are slick in this rain."', grade: 'good', effects: { service: 1, safety: 1 }, feedback: 'A friendly heads-up about a hazard helps the next person who walks up.', next: 's2' },
                  { text: '"Yeah, I nearly broke my neck out there."', grade: 'ok', effects: { service: 0 }, feedback: 'Fair, but a friendlier heads-up works better and still makes the point.', next: 's2' },
                  { text: '"Just sign here."', grade: 'ok', effects: { service: 0 }, feedback: 'Efficient, but a few friendly words help people remember you.', next: 's2' }
                ]
              },
              s2: { speaker: 'sam', text: 'Will do. Where do I sign?', next: 'end' },
              end: { type: 'end', outcome: 'good' }
            }
          }
        },
        lessons: ['Clear trip hazards off the walkway before carrying a big box that blocks your view of your feet.']
      },
      {
        id: 'sf3',
        brief: 'Harbor View Apartments, 5 Harbor View #3B: the sidewalk is heaved and it\'s getting dark.',
        weather: 'clear', tod: 'evening', time: 18 * 60 + 5,
        courier: { sleeves: 'long' },
        par: 130,
        lot: { kind: 'apartment', spec: { number: '5', name: 'HARBOR VIEW', wall: 0x8A6A5A, siding: 'brick', steps: 2 } },
        props: [
          { type: 'streetsign', x: -260, art: { text: 'HARBOR VIEW' } },
          { type: 'lamp', x: -120, art: { lit: false } },
          { type: 'crack', x: -30, hazard: 'crack', id: 'crack', label: 'the heaved sidewalk slab', art: { w: 120 } },
          { type: 'puddle', x: 'porchX0-60', hazard: 'wet', id: 'puddle', label: 'the slick entry tiles', art: { w: 150 } }
        ],
        packages: [{ id: 'p1', to: 'Dee Harper', number: '5', street: 'Harbor View', unit: '3B', service: 'standard', weight: 6, size: 'm', tracking: '7760 0300 0503' }],
        decoys: [{ id: 'd1', to: 'D. Harper', number: '5', street: 'Harbor View', unit: '3D', service: 'standard', weight: 6, size: 'm', tracking: '7760 0300 0504' }],
        answer: { name: 'Dee Harper', spec: P.dee, adult: true, atAddress: true, delay: 4 },
        expected: { outcome: 'deliver', types: ['recipient', 'adult'] },
        lessons: ['In low light, slow down and look for uneven sidewalk, especially when a package blocks your view.']
      }
    ]
  };

  /* ------------------------------------------------------------------------------------------ dogs */
  OTR_DATA.stopSets.m8_dog = {
    title: 'Dog Encounter',
    tod: 'midday', weather: 'clear', time: 12 * 60 + 15,
    intro: {
      title: 'Dog Encounter',
      lines: [
        'Dog bites are a real risk on residential routes, and even "friendly" dogs bite when they\'re excited, scared or protecting their home.',
        'Look for the clues before you go in: a BEWARE OF DOG sign, a dog bowl, a gate, barking.',
        'Read the dog: tail, ears, posture. Some calls are timed, so decide fast.',
        'Never run, never corner a dog, and don\'t be shy about recording an exception. The package isn\'t worth a bite.'
      ]
    },
    keyLessons: [
      'Never enter a yard with a loose dog. Get the owner to secure it first.',
      'If a dog charges: stop, stay calm, keep the package between you and it, avoid eye contact and back away slowly. Never run.',
      'Tucked tail, pinned ears and a low body mean fear, and frightened dogs bite when cornered. Ask the owner to secure the dog.'
    ],
    stops: [
      {
        id: 'dg1',
        brief: '22 Maple Ave: standard delivery. Customer note: "Dog in yard."',
        par: 140,
        lot: { kind: 'house', spec: { number: '22', steps: 2, wall: 0xF3E1D6, roof: 0x4F4458, door: 0xB8324A, siding: 'lap', porchW: 440, porchX: 380 } },
        fence: { x0: -120, x1: 980, gate: 40, color: 0xFFFFFF },
        props: [
          { type: 'mailbox', x: -200, art: { number: '22' } },
          { type: 'streetsign', x: -270, art: { text: 'MAPLE AVE' } },
          { type: 'sign', x: -105, depth: 9, art: { text: 'BEWARE\nOF DOG' } },
          { type: 'doghouse', x: 210, depth: 7 },
          { type: 'bowl', x: 290, depth: 7 }
        ],
        dog: { name: 'Biscuit', spec: { fur: 0xC98B4F, patch: 0xF3E3CC, collar: 0x3DA5FF }, mood: 'playful', x: 300, patrol: [120, 520], barks: 520, facing: -1 },
        triggers: [{ on: 'gate', talk: 'gate' }],
        packages: [{ id: 'p1', to: 'Lin Chen', number: '22', street: 'Maple Ave', service: 'standard', weight: 5, size: 'm', note: 'Dog in yard', tracking: '7770 0100 2222' }],
        decoys: [{ id: 'd1', to: 'Lin Chen', number: '22', street: 'Maple Ct', service: 'standard', weight: 5, size: 'm', tracking: '7770 0100 2233' }],
        answer: { name: 'May Chen', spec: P.chen, adult: true, atAddress: true, delay: 3 },
        expected: { outcome: 'deliver', types: ['recipient', 'adult'] },
        talks: {
          gate: {
            start: 'g0',
            hint: 'Hand the package over the gate: Deliver on your handheld (TAB).',
            nodes: {
              g0: { speaker: 'narrator', act: 'dogShow', arg: 210, text: 'Biscuit bounds along the fence, barking and bouncing. The gate has a BEWARE OF DOG sign.', next: 'g1' },
              g1: {
                speaker: 'narrator', text: 'Your hand is on the latch. What now?',
                check: 'Handled a loose dog behind a gate',
                choices: [
                  { text: 'Leave the gate shut. Tap the horn or ring from outside and wait for the owner to secure the dog.', grade: 'good', effects: { safety: 3 }, feedback: 'Never let yourself into a yard with a loose dog, however friendly it looks. Get the owner to secure it first.', next: 'g2' },
                  { text: 'It\'s wagging its tail. It\'s friendly, so go on in.', grade: 'bad', critical: true, effects: { safety: -3 }, feedback: 'A wagging tail isn\'t a guarantee. Excited, territorial dogs jump, nip and bite, and opening the gate can also let the dog escape into the street.', lesson: 'Never enter a yard with a loose dog. Get the owner to secure it first.', next: 'g_jump' },
                  { text: 'Toss the package over the fence onto the lawn.', grade: 'bad', effects: { service: -3 }, feedback: 'Throwing a package can damage it, leaves no safe proof of delivery, and the dog may chew it.', lesson: 'Don\'t throw packages over fences. Get the dog secured or record an exception.', next: 'g_toss' }
                ]
              },
              g2: { speaker: 'narrator', act: 'wait', text: 'You leave the gate shut, call out "Delivery!" over the barking, and wait by the gate.', next: 'g3' },
              g_jump: { speaker: 'narrator', act: 'openGate', text: 'The latch clicks open…', next: 'g_jump2' },
              g_jump2: { speaker: 'narrator', act: 'dogJump', text: 'Biscuit bolts through the gap and jumps up at you, claws on your chest, nearly knocking the box out of your hands.', shake: true, next: 'g3' },
              g_toss: { speaker: 'narrator', text: 'The box thuds into the flowerbed. Biscuit is already sniffing at it.', sfx: 'thud', next: 'g3' },
              g3: { speaker: 'owner', act: 'ownerAppears', arg: 'gate', text: 'Sorry! Biscuit, come here! Let me put her inside.', next: 'g4' },
              g4: { speaker: 'owner', act: 'ownerTakesDog', text: 'Okay, she\'s in. Is that one for me?', set: { dogSecured: true }, next: 'end' },
              end: { type: 'end', outcome: 'good' }
            }
          }
        },
        lessons: ['A loose dog behind a gate means waiting for the owner, not letting yourself in.']
      },
      {
        id: 'dg2',
        brief: '48 Pine St: standard delivery. No notes on file.',
        par: 150,
        lot: { kind: 'house', spec: { number: '48', steps: 3, wall: 0xC9D8C4, roof: 0x3E4A5C, door: 0x3A4658, siding: 'shingle', porchW: 420, porchX: 420 } },
        props: [
          { type: 'mailbox', x: -200, art: { number: '48' } },
          { type: 'streetsign', x: -270, art: { text: 'PINE ST' } },
          { type: 'bowl', x: 'porchX1+60', depth: 7 },
          { type: 'tree', x: 1120, depth: -9 }
        ],
        dog: { name: 'Rex', spec: { fur: 0x3A3030, patch: 0xB88A55, collar: 0xE8304A }, mood: 'alert', x: 1200, hidden: true, scale: 0.85 },
        triggers: [{ x: 'stepsX0-320', w: 44, talk: 'charge', rearm: true }],
        packages: [{ id: 'p1', to: 'R. Novak', number: '48', street: 'Pine St', service: 'standard', weight: 7, size: 'm', tracking: '7770 0200 4848' }],
        decoys: [{ id: 'd1', to: 'R. Novak', number: '84', street: 'Pine St', service: 'standard', weight: 7, size: 'm', tracking: '7770 0200 8484' }],
        answer: null,
        expected: { outcome: 'exception', code: 'UN', doorTag: false },
        talks: {
          charge: {
            start: 'c0',
            hint: 'Record exception UN (unsafe) on your handheld, then get back in the truck.',
            nodes: {
              c0: { speaker: 'narrator', act: 'dogCharge', arg: 230, text: 'A big dog tears around the side of the house, barking, hackles up, straight at you!', shake: true, next: 'c1' },
              c1: {
                speaker: 'narrator', text: 'It\'s closing fast.',
                check: 'Reacted to a charging dog', timer: 6, timerLabel: 'REACT!',
                timeout: { grade: 'ok', effects: { safety: 1 }, feedback: 'Freezing isn\'t a bad instinct: standing still is safer than running. Next time do it on purpose, and keep the package between you and the dog.', act: 'freeze', next: 'c2a' },
                choices: [
                  { text: 'Stop. Stand still and calm, arms in, with the package between you and the dog.', grade: 'good', effects: { safety: 3 }, act: 'freeze', feedback: 'Standing still takes away the chase, and the package acts as a barrier if the dog closes in.', next: 'c2a' },
                  { text: 'Turn and sprint back to the truck.', grade: 'bad', effects: { safety: -3 }, act: 'dogChase', feedback: 'Running triggers the chase instinct, and a dog is much faster than you are.', lesson: 'Never run from a dog. Stop, stay calm, and put the package between you.', next: 'c_nip' },
                  { text: 'Shout and kick out at it to scare it off.', grade: 'bad', effects: { safety: -3 }, act: 'dogLunge', feedback: 'Aggression escalates a defensive dog. Kicking puts your leg right where it can bite.', lesson: 'Don\'t yell at or kick a charging dog. Stay still and calm.', next: 'c_nip' }
                ]
              },
              c_nip: { speaker: 'narrator', text: 'Teeth catch your trouser leg. Your boot takes most of it, but your heart is pounding and the dog is still right there.', shake: true, next: 'c2' },
              c2a: { speaker: 'narrator', act: 'shield', text: 'The dog skids to a stop a few feet away, still growling.', next: 'c2' },
              c2: {
                speaker: 'narrator', text: 'It\'s not backing off. What\'s your next move?',
                check: 'Got clear of the dog safely',
                choices: [
                  { text: 'Avoid eye contact, speak calmly, and back away slowly toward the truck, keeping the dog in view.', grade: 'good', effects: { safety: 3 }, act: 'backAway', arg: 'van', feedback: 'Calm, slow and side-on gives the dog nothing to react to while you get to safety.', next: 'c3' },
                  { text: 'Stare it down so it knows you\'re not scared.', grade: 'bad', effects: { safety: -2 }, act: 'dogLunge', feedback: 'Direct eye contact reads as a challenge.', lesson: 'Avoid direct eye contact with an aggressive dog.', next: 'c2b' },
                  { text: 'Crouch down and hold out your hand so it can sniff you.', grade: 'bad', critical: true, effects: { safety: -3 }, act: 'dogLunge', feedback: 'Reaching toward a growling dog puts your hand and face right in range.', lesson: 'Never reach toward a growling dog.', next: 'c2b' }
                ]
              },
              c2b: { speaker: 'narrator', text: 'It lunges and snaps at the air. You flinch back. It\'s still between you and the house.', next: 'c2' },
              c3: { speaker: 'narrator', act: 'dogCalm', text: 'You make it back to the truck. The dog paces the lawn, watching you. Nobody comes out.', next: 'c4' },
              c4: {
                speaker: 'narrator', text: 'The package still needs a decision.',
                check: 'Decided what to do about the delivery',
                choices: [
                  { text: 'Don\'t go back. Record an "unsafe to deliver" exception so the dog is on file for this address.', grade: 'good', effects: { safety: 2, service: 1 }, feedback: 'Recording it protects you and the next courier, and the customer can arrange a safe delivery.', next: 'end' },
                  { text: 'Try again. It\'s probably calmed down.', grade: 'bad', effects: { safety: -2 }, act: 'approach', arg: 'stepsX0-320', feedback: 'The dog is still guarding its territory. Walking back in just starts it all again.', lesson: 'Once a dog has shown aggression, don\'t go back in. Record the exception.', next: 'c_again0' },
                  { text: 'Drop the package at the curb and move on.', grade: 'bad', effects: { service: -3 }, feedback: 'An unattended package at the curb isn\'t a delivery. It\'s a lost package waiting to happen.', lesson: 'Unsafe to deliver means an exception, not leaving the package somewhere random.', next: 'end' }
                ]
              },
              c_again0: { speaker: 'narrator', act: 'dogCharge', arg: 200, text: 'It charges the moment you step on the lawn.', shake: true, next: 'c_again' },
              c_again: { speaker: 'narrator', act: 'backAway', arg: 'van', text: 'You back away to the truck again, slowly, keeping it in view.', next: 'c4' },
              end: { type: 'end', outcome: 'mixed' }
            }
          }
        },
        lessons: ['An aggressive loose dog with nobody around = exception "unsafe to deliver". Note it so the next courier knows.']
      },
      {
        id: 'dg3',
        brief: '7 Birch Ln: standard delivery. The customer is out front with their dog.',
        par: 140,
        lot: { kind: 'house', spec: { number: '7', steps: 3, wall: 0xE9DCC3, roof: 0x6B3F3A, door: 0x2F6B5A, siding: 'lap', porchW: 460, shutters: 0x2F6B5A } },
        props: [
          { type: 'mailbox', x: -200, art: { number: '7' } },
          { type: 'streetsign', x: -270, art: { text: 'BIRCH LN' } },
          { type: 'planter', x: 'porchX1-70', onPorch: true }
        ],
        dog: { name: 'Pepper', spec: { fur: 0xE8D8C0, patch: 0xFFFFFF, collar: 0xFF5C8A, spots: 0xB88A55 }, mood: 'fearful', x: 'doorX+60', scale: 0.62, facing: -1 },
        triggers: [{ x: 'stepsX0-170', w: 40, talk: 'porch' }],
        packages: [{ id: 'p1', to: 'Luis Alvarez', number: '7', street: 'Birch Ln', service: 'standard', weight: 4, size: 's', tracking: '7770 0300 0707' }],
        decoys: [{ id: 'd1', to: 'Luis Alvarez', number: '17', street: 'Birch Ln', service: 'standard', weight: 4, size: 's', tracking: '7770 0300 1717' }],
        answer: { name: 'Tomas Alvarez', spec: P.alvarez, adult: true, atAddress: true, delay: 2 },
        expected: { outcome: 'deliver', types: ['recipient', 'adult'] },
        talks: {
          porch: {
            start: 'p0',
            hint: 'Walk up to Tomas Alvarez, then Deliver on your handheld (TAB).',
            nodes: {
              p0: { speaker: 'owner', act: 'ownerAppears', text: 'Hi there! Come on up. Don\'t mind Pepper, she\'s a sweetheart.', next: 'p1' },
              p1: {
                speaker: 'narrator', text: 'Pepper is pressed against the door: tail tucked, ears pinned back, body low, glancing away.',
                check: 'Read the dog\'s body language',
                choices: [
                  { text: 'Stop at the bottom of the steps and ask him to take Pepper inside, or hold her collar, before you come up.', grade: 'good', effects: { safety: 3 }, feedback: 'Pepper is showing fear. Giving her space and asking the owner to secure her keeps everyone safe, including Pepper.', next: 'p2' },
                  { text: 'Walk right up. The owner says she\'s friendly.', grade: 'bad', critical: true, effects: { safety: -3 }, act: 'approach', arg: 'porchX0-20', feedback: 'Owners often misjudge. A scared dog that feels cornered on its own porch may snap.', lesson: '"She\'s friendly" isn\'t a safety plan. Read the dog, and ask for it to be secured.', next: 'p_lunge' },
                  { text: 'Crouch down and hold out a hand so she can get to know you.', grade: 'bad', critical: true, effects: { safety: -3 }, act: 'approach', arg: 'porchX0-20', feedback: 'Reaching toward a frightened dog\'s face is one of the most common ways people get bitten.', lesson: 'Never reach toward a fearful dog.', next: 'p_lunge' }
                ]
              },
              p_lunge: { speaker: 'narrator', act: 'dogLunge', text: 'Pepper lunges from the doormat and snaps at you.', shake: true, next: 'p_snap' },
              p_snap: { speaker: 'owner', text: 'Pepper, no! I\'m so sorry, she\'s never done that!', expr: 'shocked', next: 'p2' },
              p2: { speaker: 'owner', act: 'ownerTakesDog', text: 'There, she\'s inside. Sorry about that.', next: 'p3' },
              p3: {
                speaker: 'narrator', text: 'Quick check: what was Pepper\'s body language telling you?',
                check: 'Understood what the dog was saying',
                choices: [
                  { text: 'She was scared, and a frightened dog can bite when it feels cornered.', grade: 'good', effects: { safety: 2 }, feedback: 'Exactly. Fear signals: tail tucked, ears back, body low, looking away, lip licking.', next: 'end' },
                  { text: 'She was relaxed. The owner knows their own dog.', grade: 'bad', effects: { safety: -1 }, feedback: 'A relaxed dog has a loose, wiggly body and a neutral or gently wagging tail. Pepper showed the opposite.', lesson: 'Learn the fear signals: tucked tail, ears back, low body, looking away.', next: 'end' },
                  { text: 'She was inviting play. Dogs crouch when they want to play.', grade: 'bad', effects: { safety: -1 }, feedback: 'A play bow has the rear end UP, a loose body and a wagging tail. Pepper was low all over with her tail tucked.', lesson: 'A play bow (rear up, loose, wagging) looks very different from a fearful crouch.', next: 'end' }
                ]
              },
              end: { type: 'end', outcome: 'good' }
            }
          }
        },
        lessons: ['Read the dog, not just the owner\'s reassurance. Ask for the dog to be secured.']
      }
    ]
  };

  /* ------------------------------------------------------------------------------------------ heat */
  OTR_DATA.stopSets.m8_heat = {
    title: 'Heat Wave',
    tod: 'afternoon', weather: 'heat', time: 14 * 60 + 30,
    courier: summer,
    heat: { hydration: 62, bodyHeat: 48, intensity: 1.15 },
    intro: {
      title: 'Heat Wave',
      lines: [
        'It\'s 102°F with a heat advisory. Watch your HYDRATION and BODY HEAT meters (top right).',
        'Standing in the sun, walking and carrying loads all heat you up. Shade, the truck\'s AC and water bring you back down.',
        'In the truck, E at the back of the doorway gives you water or the AC; outside, E by the truck is water too. Rest in the shade under trees.',
        'Learn the warning signs of heat illness, and act on them the moment they show up.'
      ]
    },
    keyLessons: [
      'Drink water before you\'re thirsty: small amounts at every stop through a hot shift.',
      'Use shade and AC to cool down between stops, and pace yourself in extreme heat.',
      'Dizziness, headache, nausea, cramps or confusion: stop, cool down, hydrate and tell dispatch. Collapse or confusion means call 911.'
    ],
    talks: {
      heatSigns: {
        start: 'h0',
        nodes: {
          h0: { speaker: 'narrator', text: 'Your head is pounding and the sidewalk feels like it\'s tilting. Your legs are heavy and you feel a little sick.', next: 'h1' },
          h1: {
            speaker: 'narrator', text: 'These are warning signs of heat illness. What do you do?',
            check: 'Responded to heat illness warning signs',
            choices: [
              { text: 'Stop now. Get into the shade or the truck\'s AC, drink water, and tell dispatch if you don\'t feel better quickly.', grade: 'good', effects: { safety: 3 }, act: 'rest', arg: 3500, feedback: 'Acting at the first signs stops heat exhaustion turning into heat stroke, which is a medical emergency.', next: 'h2' },
              { text: 'Push through. Only a couple of stops left, then you\'ll rest.', grade: 'bad', effects: { safety: -3 }, feedback: 'Heat illness gets worse fast. "Pushing through" is how heat exhaustion becomes heat stroke.', lesson: 'Never push through heat illness symptoms. Stop, cool down, hydrate and get help.', next: 'end' },
              { text: 'Grab an energy drink and keep moving.', grade: 'bad', effects: { safety: -2 }, feedback: 'Caffeine and sugar don\'t cool you down or rehydrate you, and can make dehydration worse.', lesson: 'Water (or an electrolyte drink) and cooling down treat heat stress. Energy drinks don\'t.', next: 'end' }
            ]
          },
          h2: { speaker: 'narrator', act: 'drink', text: 'You sip water slowly in the cool air until the pounding eases.', next: 'h3' },
          h3: { speaker: 'dispatch', text: 'Copy that. Take the time you need. Your safety comes first. Call us straight away if it gets worse.', next: 'end' },
          end: { type: 'end', outcome: 'good' }
        }
      }
    },
    stops: [
      {
        id: 'ht1',
        brief: '1400 Sunset Blvd: standard delivery. Long, sunny front walk.',
        par: 170,
        lot: { kind: 'house', w: 1100, spec: { w: 1100, number: '1400', steps: 2, wall: 0xF1E3C6, roof: 0xA65A48, door: 0x2F6B5A, siding: 'stucco', stories: 1, porchW: 420, porchX: 620, chimney: false, bushes: 0x6A8A3A, flowers: false } },
        props: [
          { type: 'mailbox', x: -200, art: { number: '1400' } },
          { type: 'streetsign', x: -270, art: { text: 'SUNSET BLVD' } },
          { type: 'tree', x: 200, depth: 9, shade: true },
          { type: 'umbrella', x: 'porchX1+140', depth: 7, art: { color: 0xFF8A3D }, shade: true, shadeW: 70 }
        ],
        spots: [
          { id: 'mat', label: 'In the shade by the door', x: 0, grade: 'good' },
          { id: 'steps', label: 'On the sunny steps', x: 'steps', grade: 'bad', note: 'Direct sun can cook what\'s inside, and it\'s a trip hazard on the steps.' }
        ],
        packages: [{ id: 'p1', to: 'Marisol Ruiz', number: '1400', street: 'Sunset Blvd', service: 'standard', weight: 11, size: 'm', note: 'Keep out of direct sun', tracking: '7780 0100 1400' }],
        decoys: [{ id: 'd1', to: 'M. Ruiz', number: '1004', street: 'Sunset Blvd', service: 'standard', weight: 3, size: 's', tracking: '7780 0100 1004' }],
        answer: null,
        expected: { outcome: 'deliver', types: ['left'], spot: 'mat' },
        lessons: ['On long sunny walks, drink before you head out and use the shade on the way back.']
      },
      {
        id: 'ht2',
        brief: '88 Canyon Rd: heavy delivery (45 lb) up a long driveway.',
        par: 190,
        lot: { kind: 'house', spec: { w: 1100, number: '88', steps: 3, wall: 0xE6D2B0, roof: 0x5A4A3A, door: 0x6B3F3A, siding: 'stucco', porchW: 400, porchX: 640, bushes: 0x6A8A3A, flowers: false } },
        props: [
          { type: 'mailbox', x: -200, art: { number: '88' } },
          { type: 'streetsign', x: -270, art: { text: 'CANYON RD' } },
          { type: 'tree', x: 380, depth: 9, shade: true }
        ],
        packages: [{ id: 'p1', to: 'Ray Ruiz', number: '88', street: 'Canyon Rd', service: 'standard', weight: 45, size: 'l', tracking: '7780 0200 8888' }],
        decoys: [{ id: 'd1', to: 'Ray Ruiz', number: '38', street: 'Canyon Rd', service: 'standard', weight: 12, size: 'm', tracking: '7780 0200 3838' }],
        answer: { name: 'Ray Ruiz', spec: P.ruiz, adult: true, atAddress: true, delay: 3 },
        expected: { outcome: 'deliver', types: ['recipient', 'adult'] },
        lessons: ['Heavy loads in the heat raise your body temperature fast. Cool down before and after the carry.']
      },
      {
        id: 'ht3',
        brief: 'Sunnyvale Clinic, 300 Plaza Dr: reception delivery. It\'s the hottest part of the day.',
        par: 170,
        lot: { kind: 'business', spec: { number: '300', name: 'SUNNYVALE CLINIC', awning: 0x3DA5FF, wall: 0xE8E0D0, siding: 'stucco', hours: 'MON–SAT\n7AM–7PM', open: true, steps: 1 }, interior: { kind: 'lobby', sign: 'SUNNYVALE', accent: 0x3DA5FF } },
        props: [
          { type: 'streetsign', x: -270, art: { text: 'PLAZA DR' } },
          { type: 'bench', x: 760 }
        ],
        packages: [{ id: 'p1', to: 'Sunnyvale Clinic', number: '300', street: 'Plaza Dr', service: 'signature', weight: 9, size: 'm', tracking: '7780 0300 3000' }],
        decoys: [{ id: 'd1', to: 'Sunnyvale Dental', number: '310', street: 'Plaza Dr', service: 'signature', weight: 9, size: 'm', tracking: '7780 0300 3100' }],
        answer: { name: 'Dee Harper', spec: P.dee, adult: true, atAddress: true, role: 'reception', delay: 0 },
        expected: { outcome: 'deliver', types: ['reception'] },
        lessons: ['Air-conditioned lobbies help, but a few minutes of AC doesn\'t replace water.']
      }
    ]
  };
})();
