/*
 * The delivery van's handling (src/core/vehicle.js). Real units throughout: metres, kilograms, newtons, seconds.
 * Change these to retune the drive; nothing in the engine has a handling number of its own.
 *
 *   What the defaults produce on a dry road:  0 → 25 mph in about 8 s · 25 mph → 0 in about 2.5 s / 14 m ·
 *   about a 6.5 m turning radius at full lock · mild understeer when you turn in too fast · a long coast.
 *
 * The keyboard turns a steering wheel rather than the road wheels: holding A or D winds the wheel towards full
 * lock at the speed a driver's hands can manage, and the wheel self-centres when you let go, the way a real
 * one does as the van rolls. Tap to correct, hold to turn.
 */
window.OTR_DATA = window.OTR_DATA || {};

OTR_DATA.vehicle = {
  // one world scale for every driving readout: 20 px on screen is 1 m on the road
  pxPerMetre: 20,

  van: {
    name: 'Step van, loaded',
    mass: 5400,               // kg, van plus roughly a tonne of freight
    length: 6.7,              // m, body
    width: 2.6,               // m, body
    wheelbase: 4.0,           // m
    frontOverhang: 0.9,       // m, nose to front axle
    cgToFront: 2.2,           // m, centre of gravity to the front axle (freight sits behind the cab)
    cgHeight: 1.15,           // m, sets how much weight moves forward under braking
    yawInertia: 1.1,          // × mass · a · b

    maxSteer: 34,             // degrees of road-wheel lock (about a 6 m turning radius)
    steerRate: 1.5,           // wheel travel per second (fraction of full lock) at walking pace…
    steerRateAtSpeed: 0.75,   // …and at 30 mph, where a driver turns the wheel more gently
    counterRate: 2.4,         // winding the wheel back the other way is quicker
    centreRate: 2.2,          // self-centring per second once the van is rolling

    cornerFront: 6.0,         // cornering stiffness, per radian of slip × axle load (front softer: understeer)
    cornerRear: 8.0,
    tyreShape: 1.35,          // how far grip falls away once a tyre is sliding (1 = not at all)

    driveForce: 8400,         // N at the rear wheels in first gear
    drivePower: 80000,        // W at the wheels
    governor: 35,             // mph, the fleet speed limiter
    reverseForce: 6000,       // N (at 4200 a loaded van on a lawn could not back off it: grass drag is ~4400 N)
    reverseGovernor: 6,       // mph
    brakeDecel: 4.6,          // m/s² at full pedal
    brakeFront: 0.65,         // share of the braking done by the front axle
    handbrake: 0.85,          // share of the rear tyres' grip the parking brake can use (it locks them)
    creepSpeed: 1.1,          // m/s an automatic creeps at in gear with your feet off the pedals
    creepForce: 2000,         // N
    engineBrake: 800,         // N of drag with the throttle closed
    rolling: 0.013,           // rolling resistance coefficient
    dragArea: 4.4,            // drag coefficient × frontal area, m²
    pedalApply: 3.2,          // pedal travel per second as you press (the keyboard is on/off)
    pedalRelease: 7           // …and as you lift
  },

  // peak tyre grip (friction coefficient) by surface, and how the weather scales it
  surfaces: { road: 0.85, sidewalk: 0.8, grass: 0.5 },
  weatherGrip: { clear: 1, cloudy: 1, fog: 1, heat: 0.97, rain: 0.65, storm: 0.58, snow: 0.34 },
  grassRolling: 0.07,         // lawns drag at the tyres

  // collisions
  impact: {
    scuff: 0.7,               // m/s into the obstacle. Below this: a touch, nothing said
    incident: 1.8,            // below this: a cosmetic scuff you are told about. At or above: a logged collision
    serious: 4.5,             // at or above this: a serious collision
    restitution: 0.12,
    scrape: 0.35              // friction along the obstacle while you are in contact
  }
};
