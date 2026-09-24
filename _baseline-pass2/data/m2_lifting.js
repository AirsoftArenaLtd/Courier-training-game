/*
 * Module 2 · Lift Right
 * Based on general, publicly available safe-lifting guidance (plan the lift, get close, bend the knees,
 * keep the back straight, lift smoothly with the legs, keep the load close, pivot instead of twisting,
 * get help or equipment for heavy/awkward loads, avoid overhead lifting).
 *
 * Assess option "effect":
 *   normal    — lift it yourself (run the lift's steps)
 *   helper    — team lift (run the steps with a coworker)
 *   equipment — use a hand truck (skip steps)
 *   stool     — use a step stool to bring the load to chest height, then run the steps
 *   strain    — a bad idea: lose Back Health, then continue with `then` (another effect)
 * Steps: stance, squat, brace, lift, turn, lower
 */
window.OTR_DATA = window.OTR_DATA || {};

OTR_DATA.lifting = {
  intro: {
    title: 'Lift Right',
    lines: [
      'Five loads, one back. First size up each load and choose how to move it.',
      'Then do the lift yourself: A / D to step, S to bend your knees, W to straighten up, SPACE to grip and to let go.',
      'Your back hinges over whatever your knees and your distance leave it — watch the SPINE LOAD gauge and keep it under the line.',
      'Time spent over that line drains your Back Health. Protect it — it has to last a whole career.'
    ]
  },

  lifts: [
    {
      id: 'light', name: 'Small parts box', weight: 12, w: 72, h: 58, color: 0xC99A62, speed: 0.9,
      prompt: 'A 12 lb box on the floor needs to go on the pallet behind you.',
      options: [
        { text: 'Lift it myself — with good form', grade: 'good', effect: 'normal', feedback: 'Light, compact load: a solo lift with good form is the right call.' },
        { text: 'Radio a coworker to help', grade: 'ok', effect: 'helper', feedback: 'Safe, but overkill for 12 lb. Save team lifts for heavy or awkward loads.' }
      ],
      steps: ['stance', 'squat', 'brace', 'lift', 'turn', 'lower']
    },
    {
      id: 'medium', name: 'Case of copy paper', weight: 40, w: 92, h: 66, color: 0xB88752, speed: 1.15,
      prompt: 'A 40 lb case of paper. Compact, with good hand-holds.',
      options: [
        { text: 'Lift it myself — with good form', grade: 'good', effect: 'normal', feedback: 'A compact 40 lb case is manageable solo for most people — form is everything.' },
        { text: 'Grab a hand truck', grade: 'ok', effect: 'equipment', feedback: 'Never wrong to use equipment! Slightly slower for one compact box, but zero strain.' },
        { text: 'Just bend over and yank it up fast', grade: 'bad', effect: 'strain', then: 'normal', health: -12, mistake: 'yank', feedback: 'Bending at the waist and jerking a load is a classic back injury. Plan the lift and use your legs.' }
      ],
      steps: ['stance', 'squat', 'brace', 'lift', 'turn', 'lower']
    },
    {
      id: 'awkward', name: 'Long flat-pack box', weight: 35, w: 190, h: 40, color: 0xD4A56E, speed: 1.05,
      prompt: 'A 6-foot flat-pack box. Not very heavy, but long and hard to balance.',
      options: [
        { text: 'Team lift — get a coworker on the other end', grade: 'good', effect: 'helper', feedback: 'Awkward loads are as risky as heavy ones. A second person keeps it balanced and close.' },
        { text: 'Grab it in the middle and wing it', grade: 'bad', effect: 'strain', then: 'helper', health: -10, mistake: 'awkward', feedback: 'Long loads swing and twist your spine. Get help for awkward loads — then lift together.' }
      ],
      steps: ['stance', 'squat', 'brace', 'lift', 'turn', 'lower']
    },
    {
      id: 'heavy', name: 'Machine part crate', weight: 95, w: 104, h: 86, color: 0x8C6A48, speed: 1.3,
      prompt: 'A 95 lb crate marked HEAVY. It needs to go across the floor to the pallet.',
      options: [
        { text: 'Use a hand truck', grade: 'good', effect: 'equipment', feedback: 'Exactly. Let equipment carry heavy loads — your back isn\'t a forklift.' },
        { text: 'Team lift with a coworker', grade: 'ok', effect: 'helper', feedback: 'Better than solo, but a hand truck is safer for both of you when one is available.' },
        { text: 'Lift it solo — I\'ve got this', grade: 'bad', effect: 'strain', then: 'equipment', health: -30, mistake: 'heavy', feedback: 'Heavy loads beyond what you can safely handle alone call for equipment or help. No heroics.' }
      ],
      steps: ['stance', 'squat', 'brace', 'lift', 'turn', 'lower']
    },
    {
      id: 'shelf', name: 'Box on the top shelf', weight: 25, w: 80, h: 60, color: 0xC99A62, speed: 1.0, high: true,
      prompt: 'A 25 lb box sits on a shelf above your head.',
      options: [
        { text: 'Use a step stool so the box is at chest height', grade: 'good', effect: 'stool', feedback: 'Bringing yourself up to the load avoids lifting overhead, where you have the least control.' },
        { text: 'Reach up and pull it down over my head', grade: 'bad', effect: 'strain', then: 'stool', health: -18, mistake: 'overhead', feedback: 'Lifting overhead strains shoulders and back — and boxes fall on faces. Use a stool or platform.' },
        { text: 'Climb the shelving', grade: 'bad', effect: 'strain', then: 'stool', health: -20, mistake: 'climb', feedback: 'Shelving isn\'t a ladder. Falls are one of the most common workplace injuries. Use a proper step stool.' }
      ],
      steps: ['brace', 'turn', 'lower']
    }
  ],


  lessons: {
    far: 'Get close to the load before lifting — reaching out multiplies the strain on your back.',
    stoop: 'Bend at the knees, not the waist. Keep your back straight as you go down.',
    brace: 'Get a firm grip and tighten your core before the load leaves the ground.',
    jerk: 'Lift smoothly with your legs. Jerky, fast lifts are how backs get hurt.',
    twist: 'Step your feet round to face where the load is going — reaching and twisting under a load is how discs go.',
    drop: 'Lower the load the same way you lifted it: bend your knees and set it down under control.',
    yank: 'Plan every lift. Even a "quick" lift done bent over can injure your back.',
    awkward: 'Awkward or long loads need a team lift, even if they aren\'t very heavy.',
    heavy: 'Use a hand truck or get help for heavy loads — no heroics.',
    overhead: 'Avoid lifting above shoulder height. Use a step stool or platform.',
    climb: 'Never climb shelving — use a proper step stool or ladder.',
    perfect: 'Textbook lifting! Close, knees bent, back straight, smooth, pivot — every single time.'
  }
};
