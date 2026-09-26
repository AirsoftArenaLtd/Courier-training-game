/*
 * Module 1 · Spot the Hazard (HazardScene): five short clips of the van driving itself through Maple Grove. In each
 * one a hazard develops; the trainee presses SPACE (or clicks) the moment they see it starting. The earlier inside the
 * window, the more points (5 down to 1); clicking wildly scores nothing for that clip.
 *
 *   clips: [{ id, title, row (street), dir (+1 east / -1 west), mph, kind, at (s: the hazard starts developing),
 *             window (s to score in), why }]
 * kinds (HazardScene stages them): ball · reversing · phone · door · runner
 */
window.OTR_DATA = window.OTR_DATA || {};

OTR_DATA.hazardClips = {
  seed: 7,
  window: 5,               // seconds after the hazard starts developing that still score
  maxFlags: 6,             // more presses than this in one clip scores 0 (no guessing by rhythm)
  intro: {
    title: 'Spot the Hazard',
    lines: [
      'Five short clips. The van drives itself: your job is to watch the road like a courier.',
      'Press SPACE (or click) the moment you see a hazard STARTING to develop, not when it is already in front of you.',
      'The earlier you spot it, the more points: up to 5 a clip. Pressing over and over scores nothing.'
    ]
  },
  clips: [
    { id: 'ball', title: 'Parked cars, a quiet street', row: 1, dir: 1, mph: 20, kind: 'ball', at: 6,
      why: 'A ball rolling out from between parked cars: a child is very likely to follow it. Cover the brake the moment you see the ball.' },
    { id: 'reversing', title: 'Driveways on the right', row: 2, dir: -1, mph: 20, kind: 'reversing', at: 6,
      why: 'Reverse lights on a car in a driveway: it is about to back out, and the driver may not see a van. Ease off and be ready to stop.' },
    { id: 'phone', title: 'Approaching a crossing', row: 1, dir: -1, mph: 18, kind: 'phone', at: 6,
      why: 'A pedestrian heading for the crossing with their eyes on their phone may step out without looking. Slow down before the crossing.' },
    { id: 'door', title: 'A line of parked cars', row: 2, dir: 1, mph: 20, kind: 'door', at: 6,
      why: 'Someone sitting in a parked car with the brake lights on may open the door into the road. Give parked cars a door\'s width.' },
    { id: 'runner', title: 'A junction ahead', row: 1, dir: 1, mph: 22, kind: 'runner', at: 5,
      why: 'A car coming up to the side street\'s stop sign too fast to stop: be ready for it to roll out in front of you.' }
  ],
  lessons: {
    perfect: 'Eyes up and early every time: the earlier you see a hazard developing, the more time you have to deal with it.',
    late: 'Watch for the clue before the hazard: a ball before a child, reverse lights before a reversing car, a phone before a step into the road.'
  }
};
