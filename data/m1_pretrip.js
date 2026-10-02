/*
 * Module 1 · Pre-Trip Walkaround (PreTripScene).
 *
 * The trainee walks the truck view by view and inspects each item. The CLOSE-UP shows the condition —
 * the wording below is only used afterwards, in the report, so nothing gives the answer away up front.
 *
 * item: {
 *   id, view: 'front'|'driver'|'rear'|'passenger'|'cab', name,
 *   kind,                 which close-up painter to use (see src/core/truckart.js)
 *   needs: 'lights' | 'press' | 'gauge' | null,   a test you must perform before you can judge it
 *   ok, defect,           what it turns out to be (shown in the report)
 *   consequence,          what happens if a defect rolls out
 *   lesson
 * }
 * Each run makes a random `defects.min`–`defects.max` of them faulty.
 */
window.OTR_DATA = window.OTR_DATA || {};

OTR_DATA.pretrip = {
  parTime: 220,
  defects: { min: 3, max: 5 },
  intro: {
    title: 'Pre-Trip Walkaround',
    lines: [
      'Walk the truck before it rolls: A / D or the arrow keys (or the ◀ ▶ buttons) take you round it, C climbs into the cab.',
      'Click a marked item to get a proper look at it. Decide: pass it (P), or flag the defect (F).',
      'Some checks need a test first (T): switch the lights and hazards on in the cab (L) before judging any lamp, press the horn, hold the brake, pull on the latches, and gauge the tires. Tread minimum: 4/32" on a steer (front) tire, 2/32" on the others.',
      'Flagging good parts costs you too. Look properly, then decide.'
    ]
  },
  items: [
    /* -------------------------------------------------- driver side */
    // tread: what the gauge reads (in 32nds) on a good tire and on this item's defect; edge-worn tires read differently
    // on their two halves, and a sidewall gouge leaves the tread itself fine
    { id: 'tire_front', view: 'driver', name: 'Front tire, driver side', kind: 'tire', needs: 'gauge', tread: { good: 9, variant: 'worn', bad: 3 },
      ok: 'Tread deep and even across the width, no cuts or bulges.',
      defect: 'Tread worn down to the wear bars — well under the legal minimum.',
      consequence: 'A bald steer tire hydroplanes in the first rain and can blow out under load. That is an out-of-service defect.',
      lesson: 'A steer (front) tire needs at least 4/32" of tread; the others at least 2/32". Gauge it, don\'t guess.' },
    { id: 'tire_rear', view: 'driver', name: 'Rear tire, driver side', kind: 'tire', needs: 'gauge', tread: { good: 8, variant: 'gouge', bad: 7 },
      ok: 'Good depth, even wear, valve cap in place.',
      defect: 'A gouge in the sidewall, down into the cords.',
      consequence: 'A sidewall cut can let go without warning at highway speed.',
      lesson: 'Sidewall damage is a defect even when the tread looks fine.' },
    { id: 'leak', view: 'driver', name: 'Under the truck', kind: 'leak',
      ok: 'Dry ground under the engine and driveline.',
      defect: 'Fresh oil dripping from the engine with a puddle forming.',
      consequence: 'An engine that loses its oil seizes, usually in traffic, usually expensively.',
      lesson: 'Look at the ground under the truck before you move it. A wet patch is the cheapest warning you will ever get.' },
    { id: 'mirror_l', view: 'driver', name: 'Driver mirror', kind: 'mirror',
      ok: 'Clean, tight, and showing the side of the truck and the lane behind.',
      defect: 'Knocked out of position — it shows sky and your own door.',
      consequence: 'A mirror pointing at nothing is a blind spot you cannot check while changing lanes.',
      lesson: 'Set your mirrors before you move, and reset them if the truck was parked by someone else.' },
    { id: 'fuel_cap', view: 'driver', name: 'Fuel cap', kind: 'fuel',
      ok: 'Cap fitted and sealed.',
      defect: 'Cap missing, with fuel residue down the side of the tank.',
      consequence: 'Fuel splashes out on corners: a fire risk, a spill, and a fuel bill.',
      lesson: 'Check the cap is on and sealed after every fill.' },

    /* -------------------------------------------------- passenger / curb side */
    { id: 'tire_front_p', view: 'passenger', name: 'Front tire, curb side', kind: 'tire', needs: 'gauge', tread: { good: 10, variant: 'edge', inner: 1, outer: 7 },
      ok: 'Good depth and even wear.',
      defect: 'Badly worn on one edge — the alignment is out.',
      consequence: 'Uneven wear ruins tires fast and reduces grip on the worn edge.',
      lesson: 'Gauge a tire in more than one place: one edge can be bald while the other looks fine.' },
    { id: 'steps', view: 'passenger', name: 'Entry steps', kind: 'steps',
      ok: 'Clean, dry, grip surface intact.',
      defect: 'Greasy film across the bottom step.',
      consequence: 'That is the step you use two hundred times a day. It is the single most common way couriers fall.',
      lesson: 'Keep the steps clean and dry, and use three points of contact every time.' },
    { id: 'door_latch', view: 'passenger', name: 'Curb-side door latch', kind: 'door', needs: 'press',
      ok: 'Latches and holds firmly.',
      defect: 'The latch does not seat — the door can swing open.',
      consequence: 'A door that opens on a turn can strike a cyclist or dump freight into the street.',
      lesson: 'Test every latch by pulling on it, not by looking at it.' },

    /* -------------------------------------------------- front */
    { id: 'headlight_l', view: 'front', name: 'Headlight, driver side', kind: 'light', needs: 'lights',
      ok: 'Bright and clear, lens intact.',
      defect: 'Dead — cracked lens with moisture inside.',
      consequence: 'One headlight at dusk means you are half as visible and it is a citation.',
      lesson: 'Switch the lights and hazards on in the cab, then walk around and check every lamp yourself.' },
    { id: 'signal_r', view: 'front', name: 'Turn signal, curb side', kind: 'light', needs: 'lights',
      ok: 'Amber, bright, flashing evenly.',
      defect: 'Dead lamp.',
      consequence: 'A dead signal means the cars around you do not know where you are going.',
      lesson: 'Signals are the only thing telling traffic your intentions. Check them both.' },
    { id: 'windshield', view: 'front', name: 'Windshield', kind: 'glass',
      ok: 'Clean, no cracks in the swept area.',
      defect: 'A star crack spreading in the driver\'s line of sight.',
      consequence: 'Cracks spread with heat and vibration, and one in your sight line is an out-of-service defect.',
      lesson: 'Damage in the swept area of the windshield is a defect, however small it starts.' },
    { id: 'wipers', view: 'front', name: 'Wiper blades', kind: 'wiper',
      ok: 'Rubber intact, sitting flat on the glass.',
      defect: 'Rubber perished and lifting away from the blade.',
      consequence: 'Discover this in the first downpour and you are driving blind.',
      lesson: 'Check wipers on a dry day. Nobody wants to find out in the rain.' },

    /* -------------------------------------------------- rear */
    { id: 'taillight_l', view: 'rear', name: 'Tail light, driver side', kind: 'light', needs: 'lights',
      ok: 'Bright red, lens intact.',
      defect: 'Dead lamp with a cracked lens.',
      consequence: 'Being rear-ended at a stop is exactly what tail lights prevent.',
      lesson: 'Walk to the back with the lights on. You cannot check a tail light from the cab.' },
    { id: 'rear_door', view: 'rear', name: 'Cargo door', kind: 'door', needs: 'press',
      ok: 'Runs freely, latches and locks.',
      defect: 'The latch does not seat properly.',
      consequence: 'A cargo door that opens on the road scatters freight across a lane.',
      lesson: 'Open and close the cargo door as part of the walkaround, every day.' },
    { id: 'reflector_rear', view: 'rear', name: 'Rear reflector', kind: 'reflector',
      ok: 'Clean and intact.',
      defect: 'Cracked and filthy — no reflection left.',
      consequence: 'At night, reflectors are what stop a driver from hitting a parked truck.',
      lesson: 'Reflectors and reflective tape are required equipment, not decoration.' },

    /* -------------------------------------------------- cab */
    { id: 'horn', view: 'cab', name: 'Horn', kind: 'horn', needs: 'press',
      ok: 'Loud and immediate.',
      defect: 'Nothing — the horn is dead.',
      consequence: 'The horn is how you warn a pedestrian stepping out behind you while backing.',
      lesson: 'Test the horn. It only matters on the day you need it.' },
    { id: 'seatbelt', view: 'cab', name: 'Seat belt', kind: 'belt', needs: 'press',
      ok: 'Webbing sound, latches firmly, retracts.',
      defect: 'Webbing frayed most of the way through.',
      consequence: 'A frayed belt tears in the crash it was supposed to save you from.',
      lesson: 'Pull the belt all the way out and look along the webbing for fraying and cuts.' },
    { id: 'brake_pedal', view: 'cab', name: 'Service brake', kind: 'pedal', needs: 'press',
      ok: 'Firm pedal that holds.',
      defect: 'The pedal sinks slowly under steady pressure.',
      consequence: 'A sinking pedal means the brakes will not be there when you need them hardest.',
      lesson: 'Hold steady pressure on the pedal. It should stay put, not creep toward the floor.' },
    // (a parcel step van has hydraulic brakes: no air gauge, the oil pressure is what the dash shows)
    { id: 'gauges', view: 'cab', name: 'Oil pressure gauge', kind: 'gauge',
      ok: 'Reading in the normal band, warning lamp out.',
      defect: 'Reading low at idle, with the oil warning lamp lit.',
      consequence: 'Low oil pressure can wreck the engine or stall it in traffic.',
      lesson: 'Let the gauges come up to normal before you move, and never drive with a warning lamp lit.' },
    { id: 'extinguisher', view: 'cab', name: 'Fire extinguisher', kind: 'extinguisher',
      ok: 'Charged, tagged, and secured in its bracket.',
      defect: 'Needle in the red and the inspection tag is missing.',
      consequence: 'A discharged extinguisher is the same as no extinguisher.',
      lesson: 'Check the gauge and the inspection tag, not just that it is there.' },
    { id: 'triangles', view: 'cab', name: 'Warning triangles', kind: 'triangles',
      ok: 'Full set of three, stowed and intact.',
      defect: 'Only one triangle in the kit.',
      consequence: 'Broken down on a shoulder with no warning devices is how a stopped truck gets hit.',
      lesson: 'Carry the full set of emergency warning devices, and know where they are.' }
  ],
  lessons: {
    missed: 'Anything you miss on the walkaround rolls out of the yard with you.',
    falseFlag: 'Flagging good parts takes a truck out of service for nothing. Look properly before you flag.',
    perfect: 'Every defect caught and nothing good condemned — that is exactly what the walkaround is for.'
  }
};
