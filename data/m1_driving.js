/*
 * Module 1 · Road Hazards
 * A hazard drill driven on the town engine. You drive the van yourself; each checkpoint arms a hazard
 * that is judged on what you actually do with the throttle, the brake and the wheel.
 *
 * hazard kinds:
 *   ball       a ball rolls out, a child follows. Judged on your speed when the child reaches the lane.
 *   door       a parked car's door swings open. Judged on clearance and speed as you pass.
 *   bus        school bus, stop arm out in the oncoming lane. Judged on a full stop until the arm folds.
 *   water      standing water across the road. Judged on easing off rather than braking or steering.
 *   crosswalk  a pedestrian on their phone drifts into the crossing. Judged on yielding.
 *   phone      the handheld buzzes. Judged on leaving it alone until you are parked.
 * Based on general, publicly available defensive-driving guidance.
 */
window.OTR_DATA = window.OTR_DATA || {};

OTR_DATA.driving = {
  intro: {
    title: 'Road Hazards',
    lines: [
      'You drive a loaded van: W accelerate, S brake, A/D turn the wheel (hold it with W to turn). It is heavy: brake early, and pull forward before a right turn so the back wheels clear the kerb.',
      'Mirrors, signal, then move: M checks the mirrors, Q and E are the indicators (left, right), for every turn and every pull-out. In D the van creeps: hold SPACE to wait. R changes gear at a standstill. B belt · L lights · G look before backing.',
      'P parks: inside the marked bay, close to the curb, straight, facing the way the traffic goes.',
      'Six checkpoints across town. Between them, things happen: a ball, a door, a bus, standing water. Everything is judged on what you actually do, and the weather turns halfway.'
    ]
  },
  seed: 7,
  checkpoints: 6,
  rainFrom: 3,
  // Seconds for full efficiency marks. A careful drive of this route — every stop sign and red light waited
  // out, every hazard given its room, no speeding — measures about 330 s, so this leaves a little air.
  par: 360,

  hazards: [
    {
      id: 'phone', kind: 'phone', at: 0,
      title: 'Your handheld buzzes',
      warn: 'The handheld buzzes in its cradle — a customer message.',
      pass: 'You left it alone. Nothing on that screen is worth the road.',
      fail: 'You worked the handheld while rolling.',
      lesson: 'Handle messages parked, not at the wheel and not at red lights — traffic and people move while you read.',
      points: 2
    },
    {
      id: 'ball', kind: 'ball', at: 1,
      title: 'Ball in the street',
      warn: 'A ball bounces out into the road ahead.',
      pass: 'You were down to walking pace before the child came out. That is the whole lesson.',
      fail: 'You were still carrying speed when a child came out after that ball.',
      hit: 'You hit a child chasing a ball.',
      lesson: 'Near homes, schools and parks, cover the brake. A ball in the street means a child is about to follow it.',
      points: 4
    },
    {
      id: 'door', kind: 'door', at: 2,
      title: 'Car door',
      warn: 'Someone is sitting in that parked car.',
      pass: 'You gave that door room. Good lane position.',
      fail: 'You went past that opening door far too close and too fast.',
      hit: 'You took a parked car\'s door off.',
      lesson: 'Give parked cars about three feet and watch for heads, brake lights and doors — assume every one of them is about to open.',
      points: 3
    },
    {
      id: 'water', kind: 'water', at: 3,
      title: 'Standing water',
      warn: 'Standing water across the road ahead.',
      pass: 'Off the gas, wheel straight, no panic braking. The tires found the road again.',
      fail: 'You braked or steered hard with no grip under you — that is how a van ends up sideways.',
      lesson: 'If you hydroplane: ease off the accelerator, hold the wheel straight and do not brake hard until the tires bite again.',
      points: 3
    },
    {
      id: 'crosswalk', kind: 'crosswalk', at: 4,
      title: 'Distracted pedestrian',
      warn: 'Someone on their phone is drifting toward the crossing.',
      pass: 'You slowed and let them go. They never looked up once.',
      fail: 'You kept your speed at a crossing with someone stepping into it.',
      hit: 'You hit a pedestrian in a crosswalk.',
      lesson: 'Never assume a pedestrian has seen you. Slow down, cover the brake and be ready to give up the right of way.',
      points: 4
    },
    {
      id: 'bus', kind: 'bus', at: 5,
      title: 'School bus',
      warn: 'School bus ahead, red lights flashing and the stop arm coming out.',
      pass: 'Stopped and stayed stopped until the arm folded in. Exactly right.',
      fail: 'You passed a stopped school bus with its red lights flashing.',
      lesson: 'Stop for a school bus with flashing red lights. On an undivided road that includes oncoming traffic — kids cross from either side.',
      points: 4
    }
  ],

  backing: {
    title: 'Last stop',
    warn: 'Last leg. If you ever have to back up, stop and get out and look first (G).',
    lesson: 'Avoid backing when you can. When you cannot: G.O.A.L. — get out and look — then back slowly on your mirrors.'
  },

  lessons: {
    perfect: 'Calm, defensive and decisive the whole way. That is what a good route looks like.',
    speed: 'Scan far enough ahead that you are slowing early instead of braking late.'
  }
};
