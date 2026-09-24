/*
 * Module + scenario registry. Shown on the hub's Shift Board.
 *   scene      — Phaser scene key that plays the scenario
 *   dataKey    — path inside OTR_DATA holding the scenario content (dotted paths allowed)
 *   categories — which star categories this scenario awards
 */
window.OTR_DATA = window.OTR_DATA || {};

OTR_DATA.modules = [
  {
    id: 'm1',
    title: 'Route & Driving',
    subtitle: 'Get there safely',
    color: 0x3DA5FF,
    icon: 'ic_van',
    scenarios: [
      {
        id: 'm1-pretrip',
        title: 'Pre-Trip Walkaround',
        icon: 'ic_clipboard',
        scene: 'PreTripScene',
        dataKey: 'pretrip',
        categories: ['safety', 'efficiency'],
        blurb: 'Before the wheels roll, walk around your truck. Inspect each checkpoint, flag real defects, and don\'t cry wolf over parts that are fine.',
        learn: ['Common pre-trip inspection points', 'Spotting tire, light, brake and leak defects', 'Why you never sign off on a defect'],
        controls: 'Mouse — click a checkpoint, then choose Pass or Flag Defect.'
      },
      {
        id: 'm1-route',
        title: 'Route Planner',
        icon: 'ic_map',
        scene: 'RoutePlannerScene',
        dataKey: 'routes',
        categories: ['efficiency', 'service'],
        blurb: 'Sequence the day\'s manifest on the real Maple Grove map. Hit the service commitments, work the pickup windows, and keep the miles down.',
        learn: ['Service commitments and their cut-off times', 'Building the loop around pickup windows', 'Routing around closures and the school zone'],
        controls: 'Click a stop — on the map or the manifest — to add it to the route, click it again to pull it back out. Undo / Clear to fix. Dispatch when the manifest is sequenced.'
      },
      {
        id: 'm1-driving',
        title: 'Road Hazards',
        icon: 'ic_wheel',
        scene: 'DrivingScene',
        dataKey: 'driving',
        categories: ['safety', 'efficiency'],
        blurb: 'Six checkpoints across town with something waiting on every leg: a ball in the road, a door swinging open, standing water, a school bus. You drive, and your speed and clearance are the answer.',
        learn: ['Covering the brake where children play', 'Clearance past parked cars', 'Hydroplaning: ease off, steer straight', 'Stopping for a school bus', 'Crossings, headlights and distraction'],
        controls: 'W accelerate · S brake (to reverse: stop, lift off, then hold S) · A D steer · B belt · L lights · G look before backing · P park'
      }
    ]
  },
  {
    id: 'm2',
    title: 'Package Handling',
    subtitle: 'Sort it, lift it, label it',
    color: 0xFF6600,
    icon: 'ic_box',
    scenarios: [
      {
        id: 'm2-sort',
        title: 'Sort Belt',
        icon: 'ic_belt',
        scene: 'SortingScene',
        dataKey: 'sorting',
        categories: ['efficiency', 'safety'],
        blurb: 'Packages ride the belt face-down. Scan each one to find out where it goes, then send it — routes, priority, damage, dangerous goods, heavy freight, and the jams in between.',
        learn: ['Scan before you sort', 'Sorting by route code', 'Priority and damage override the route', 'Dangerous goods segregation', 'Heavy pieces and team lifts', 'Clearing a jam fast'],
        controls: 'Click a package (or SPACE) to scan · drag into a bin, or press 1-5 · SPACE clears a jam'
      },
      {
        id: 'm2-lift',
        title: 'Lift Right',
        icon: 'ic_lift',
        scene: 'LiftingScene',
        dataKey: 'lifting',
        categories: ['safety', 'efficiency'],
        blurb: 'Five loads, one back. Size up each lift, then do it yourself: your knees and your distance decide how much your spine has to take, and the gauge shows it in real time.',
        learn: ['Sizing up a load before lifting', 'Knees do the work, not the back', 'Keeping the load close', 'Stepping round instead of twisting', 'When to get help or equipment'],
        controls: 'A / D step · S bend knees · W straighten up · SPACE grip and release · 1-3 for decisions'
      },
      {
        id: 'm2-labels',
        title: 'Label Check',
        icon: 'ic_diamond',
        scene: 'LabelScene',
        dataKey: 'labels',
        categories: ['safety', 'efficiency'],
        blurb: 'Turn every package, read every side, then put it on the right handling station. The mark that matters is usually on the side you did not check.',
        learn: ['Checking all six sides before you move a package', 'Handling marks and hazard class diamonds', 'Leaking or crushed: isolate and report'],
        controls: 'A / D turn the package - W top, S base (or click the face dots) - drag it onto a station or press 1-6 - G for the label guide'
      }
    ]
  },
  {
    id: 'm3',
    title: 'Customer Interaction',
    subtitle: 'People skills on the doorstep',
    color: 0xFF5C8A,
    icon: 'ic_chat',
    scenarios: [
      {
        id: 'm3-missing',
        title: 'Where\'s My Package?!',
        icon: 'ic_chat',
        scene: 'DialogueScene',
        dataKey: 'dialogues.m3_missing',
        categories: ['service', 'efficiency'],
        blurb: 'A frustrated customer flags you down about a package that "never arrived". Calm things down and actually help.',
        learn: ['De-escalation and empathy', 'Staying professional under pressure', 'Pointing customers to the right next step'],
        controls: 'Mouse or 1-4 to choose · click / SPACE to advance · ↑ reads earlier lines'
      },
      {
        id: 'm3-signature',
        title: 'Signature Required',
        icon: 'ic_pen',
        scene: 'DialogueScene',
        dataKey: 'dialogues.m3_signature',
        categories: ['service', 'safety'],
        blurb: 'Nobody\'s home, the package needs a signature, and a helpful neighbor has ideas. Follow the rules without losing the customer.',
        learn: ['Why signature requirements matter', 'Handling pressure to bend the rules', 'Leaving clear next steps'],
        controls: 'Mouse or 1-4 to choose · click / SPACE to advance · ↑ reads earlier lines'
      },
      {
        id: 'm3-twostops',
        title: 'Two Stops, Two Styles',
        icon: 'ic_paw',
        scene: 'DialogueScene',
        dataKey: 'dialogues.m3_twostops',
        categories: ['service', 'safety', 'efficiency'],
        blurb: 'First a busy office reception, then a house with a very loud dog. Adjust your approach for business vs. residential stops.',
        learn: ['Business delivery etiquette', 'Residential delivery courtesy', 'Staying safe around dogs'],
        controls: 'Mouse or 1-4 to choose · click / SPACE to advance · ↑ reads earlier lines · some decisions are timed'
      }
    ]
  },
  {
    id: 'm4',
    title: 'Problem Solving',
    subtitle: 'When the route goes sideways',
    color: 0xE59A00,
    icon: 'ic_bulb',
    scenarios: [
      {
        id: 'm4-address',
        title: 'Wrong Address',
        icon: 'ic_pin',
        scene: 'DialogueScene',
        dataKey: 'dialogues.m4_address',
        categories: ['service', 'efficiency'],
        blurb: 'The house number on the label doesn\'t exist on this street. "Close enough" is tempting. Is it right?',
        learn: ['Verifying addresses', 'Using proper channels for exceptions', 'Protecting the customer\'s package'],
        controls: 'Mouse or 1-4 to choose · click / SPACE to advance · ↑ reads earlier lines'
      },
      {
        id: 'm4-damaged',
        title: 'Damaged on Arrival',
        icon: 'ic_broken',
        scene: 'DialogueScene',
        dataKey: 'dialogues.m4_damaged',
        categories: ['safety', 'service'],
        blurb: 'You open the cargo door and a box is crushed — and something is dripping. What now?',
        learn: ['Leaking package safety', 'Documenting damage', 'Being honest with customers'],
        controls: 'Mouse or 1-4 to choose · click / SPACE to advance · ↑ reads earlier lines'
      },
      {
        id: 'm4-storm',
        title: 'Storm Warning',
        icon: 'ic_cloud',
        scene: 'DialogueScene',
        dataKey: 'dialogues.m4_storm',
        categories: ['safety', 'service'],
        blurb: 'Severe weather rolls in mid-route, and the delivery note makes no sense. Keep yourself — and the package — safe.',
        learn: ['Severe weather decisions', 'Never driving through flooded roads', 'Interpreting unclear delivery instructions'],
        controls: 'Mouse or 1-4 to choose · click / SPACE to advance · ↑ reads earlier lines · some decisions are timed'
      }
    ]
  },
  {
    id: 'm5',
    title: 'Scanner & Exceptions',
    subtitle: 'Proof, codes and door tags',
    color: 0x2BC48A,
    icon: 'ic_clipboard',
    scenarios: [
      {
        id: 'm5-pod',
        title: 'Proof of Delivery',
        icon: 'ic_check',
        scene: 'StopScene',
        dataKey: 'stopSets.m5_pod',
        categories: ['service', 'efficiency', 'safety'],
        blurb: 'Three doorsteps, three kinds of proof: a photo that follows the customer\'s note, a signature at the door, and a receptionist signing for a colleague.',
        learn: ['Pulling and scanning the right package', 'Photo proof of delivery that shows the location', 'Signatures and printed names', 'Business deliveries through reception'],
        controls: 'A/D or click to walk · SHIFT walk carefully · E interact · TAB handheld'
      },
      {
        id: 'm5-exceptions',
        title: 'Exception Calls',
        icon: 'ic_flag',
        scene: 'StopScene',
        dataKey: 'stopSets.m5_exceptions',
        categories: ['service', 'efficiency', 'safety'],
        blurb: 'Nobody home, a closed business and a customer who doesn\'t want it. Make a real attempt, then record the right exception and leave a door tag.',
        learn: ['Choosing the correct exception code', 'When a door tag is needed', 'Never leaving a package after a failed attempt'],
        controls: 'A/D or click to walk · E interact · TAB handheld'
      },
      {
        id: 'm5-adult',
        title: 'Adult Signature & ID',
        icon: 'ic_badge',
        scene: 'StopScene',
        dataKey: 'stopSets.m5_adult',
        categories: ['service', 'safety', 'efficiency'],
        blurb: 'Three age-restricted shipments. Check the photo ID properly: age from the date of birth, expiry, and the name on the label.',
        learn: ['What an adult signature requires', 'Reading an ID: age, expiry, name', 'Refusing politely and recording the exception'],
        controls: 'A/D or click to walk · E interact · TAB handheld'
      }
    ]
  },
  {
    id: 'm6',
    title: 'Loading the Truck',
    subtitle: 'Sequence, weight, secure',
    color: 0x7B3FC4,
    icon: 'ic_box',
    scenarios: [
      {
        id: 'm6-load',
        title: 'Load for the Route',
        icon: 'ic_belt',
        scene: 'LoadingScene',
        dataKey: 'loading.m6_load',
        categories: ['safety', 'efficiency'],
        blurb: 'Twelve packages, one truck. Shelve them by stop section, keep the heavy ones low, segregate the dangerous goods and strap the floor load.',
        learn: ['Loading in stop sequence', 'Heavy low, light high', 'Fragile and dangerous goods placement', 'Securing the load before driving'],
        controls: 'Drag packages from the cart onto the shelves'
      },
      {
        id: 'm6-find',
        title: 'Find It Fast',
        icon: 'ic_clock',
        scene: 'LoadingScene',
        dataKey: 'loading.m6_find',
        categories: ['efficiency', 'service'],
        blurb: 'Somebody else loaded this truck, and not well. Find the right package for each stop against the clock, without grabbing the near-match.',
        learn: ['Reading the whole address before pulling', 'Spotting misloads', 'What a bad load costs you at every stop'],
        controls: 'Click the package that matches the address'
      }
    ]
  },
  {
    id: 'm7',
    title: 'Pickups & Paperwork',
    subtitle: 'What you accept, you own',
    color: 0x2F8F83,
    icon: 'ic_pen',
    scenarios: [
      {
        id: 'm7-business',
        title: 'Business Pickup',
        icon: 'ic_clipboard',
        scene: 'PickupScene',
        dataKey: 'pickups.m7_business',
        categories: ['service', 'efficiency'],
        blurb: 'A scheduled pickup with a manifest that does not quite match the counter. Count, inspect, and refuse what cannot ship.',
        learn: ['Counting pieces against the manifest', 'Inspecting packaging and labels', 'Refusing politely with a clear reason'],
        controls: 'Click each piece to count, then click to inspect'
      },
      {
        id: 'm7-intl',
        title: 'International Docs',
        icon: 'ic_book',
        scene: 'PickupScene',
        dataKey: 'pickups.m7_intl',
        categories: ['service', 'efficiency'],
        blurb: 'A shipment heading across the border with a commercial invoice full of the classic mistakes. Find them before customs does.',
        learn: ['What a customs description must say', 'Value, quantity and country of origin', 'Why an unsigned declaration is not a declaration'],
        controls: 'Click the invoice lines that would hold up the shipment'
      },
      {
        id: 'm7-dg',
        title: 'Declare It or Refuse It',
        icon: 'ic_diamond',
        scene: 'PickupScene',
        dataKey: 'pickups.m7_dg',
        categories: ['safety', 'service'],
        blurb: 'A shipper wants "just a litre of solvent" on your truck, and a box of lithium batteries with nothing on the outside to say so.',
        learn: ['Matching contents to marks and declarations', 'Common undeclared dangerous goods', 'Refusing firmly and helpfully'],
        controls: 'Click each piece to inspect · accept or refuse with a reason'
      }
    ]
  },
  {
    id: 'm8',
    title: 'Safety & Wellness',
    subtitle: 'Get home in one piece',
    color: 0xF0435A,
    icon: 'ic_shield',
    scenarios: [
      {
        id: 'm8-steps',
        title: 'Watch Your Step',
        icon: 'ic_flag',
        scene: 'StopScene',
        dataKey: 'stopSets.m8_steps',
        categories: ['safety', 'efficiency', 'service'],
        blurb: 'Ice, wet steps, a garden hose and a heaved sidewalk. Slips and trips are the injuries that end shifts — walk carefully and clear the path.',
        learn: ['Three points of contact on the truck', 'Walking carefully on ice and wet surfaces', 'Clearing trip hazards before carrying'],
        controls: 'A/D or click to walk · HOLD SHIFT to walk carefully · E interact · TAB handheld'
      },
      {
        id: 'm8-dog',
        title: 'Dog Encounter',
        icon: 'ic_paw',
        scene: 'StopScene',
        dataKey: 'stopSets.m8_dog',
        categories: ['safety', 'service', 'efficiency'],
        blurb: 'A dog behind a gate, a dog that charges, and a frightened dog on a porch. Read the body language and get the delivery done without a bite.',
        learn: ['Never entering a yard with a loose dog', 'What to do when a dog charges', 'Reading fear and aggression signals', 'Recording an unsafe-to-deliver exception'],
        controls: 'A/D or click to walk · E interact · TAB handheld · 1-3 for timed decisions'
      },
      {
        id: 'm8-heat',
        title: 'Heat Wave',
        icon: 'ic_bulb',
        scene: 'StopScene',
        dataKey: 'stopSets.m8_heat',
        categories: ['safety', 'efficiency', 'service'],
        blurb: '102°F and three stops to go. Watch your hydration and body heat, use shade and AC, and know the warning signs of heat illness.',
        learn: ['Hydrating through a hot shift', 'Using shade and AC to cool down', 'Recognising heat exhaustion early', 'Why "pushing through" is dangerous'],
        controls: 'A/D or click to walk · E to drink, cool off or rest · TAB handheld'
      },
      {
        id: 'm8-incident',
        title: 'After a Fender-Bender',
        icon: 'ic_broken',
        scene: 'DialogueScene',
        dataKey: 'dialogues.m8_incident',
        categories: ['safety', 'service', 'efficiency'],
        blurb: 'You backed into a parked car. The next twenty minutes decide whether this is a bumper or a career problem — secure the scene, check on people, report it, and write it up straight.',
        learn: ['Securing the scene before anything else', 'People before property', 'Reporting every incident immediately', 'Never admitting fault or settling in cash', 'Photographs, details and witnesses', 'Writing an honest incident report'],
        controls: 'Mouse or 1-4 to choose · click / SPACE to advance · ↑ reads earlier lines'
      }
    ]
  }
];
