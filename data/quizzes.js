/*
 * Knowledge checks: five questions per module, on what its scenarios teach. Played from the hub (Practice tools →
 * Quizzes), recorded in the trainee record, and asked again as a refresher once a module has gone unvisited for the
 * academy's refresher interval.
 *
 *   quizzes[moduleId] = [{ q, options: [..], answer: index, why }]
 * Keep to general, publicly known safety and service practice; the station's own procedures always win.
 */
window.OTR_DATA = window.OTR_DATA || {};

OTR_DATA.quizzes = {
  passPct: 80,

  m1: [
    { q: 'During the pre-trip, the brake pedal slowly sinks while you hold steady pressure. What do you do?',
      options: ['Pump it a few times, then drive carefully to the first stop', 'Flag it: the van stays put until it is fixed', 'Note it on the report and check it again at lunch', 'Drive on unless the brake warning light comes on'],
      answer: 1, why: 'A pedal that creeps down under steady pressure is a brake fault. It is flagged and fixed before the van moves.' },
    { q: 'What does a full stop at a stop sign mean?',
      options: ['Slowing to walking pace right at the line', 'Wheels stopped behind the line, then look', 'Stopping fully only when cross traffic is coming', 'Stopping anywhere before you enter the junction'],
      answer: 1, why: 'The wheels stop behind the line for a moment, then you look both ways. Rolling stops are the classic delivery-driver citation.' },
    { q: 'Turning right in a step van, the rear wheels…',
      options: ['Follow the exact path the front wheels took', 'Cut inside the front wheels, toward the curb', 'Swing wide, out into the next lane over', 'Only matter when you are reversing'],
      answer: 1, why: 'The rear wheels cut inside the front ones. Swing wider and slower so they stay off the curb and the sidewalk.' },
    { q: 'You have to back up to reach a loading door. What comes first?',
      options: ['Hazard lights on, then back up slowly', 'Get out and look at what is behind you', 'Check both mirrors: getting out wastes time', 'Sound the horn twice, then back up slowly'],
      answer: 1, why: 'Back as little as possible, and when you must: get out and look first, then back slowly using your mirrors.' },
    { q: 'A ball rolls into the street ahead. What should you expect?',
      options: ['Nothing more: the ball itself is the hazard', 'A child may follow it, so slow down and cover the brake', 'The car behind you to brake hard for it', 'To steer around it without slowing down'],
      answer: 1, why: 'A ball in the road often means a child is about to follow it. Slow down and be ready to stop.' }
  ],

  m2: [
    { q: 'Before lifting a heavy box from the floor, you should…',
      options: ['Bend at the waist and lift it in one quick move', 'Step in close, bend your knees, back straight', 'Twist your body to carry it out to the side', 'Lift it at arm\'s length so it stays clean'],
      answer: 1, why: 'Get close to the load, bend the knees, keep your back straight and the load against your body. Let your legs do the work.' },
    { q: 'A package is too heavy or awkward to lift safely alone. What now?',
      options: ['Drag it across the floor to where it goes', 'Use a hand truck or get a second person', 'Lift it in two quick jerks to save your back', 'Leave it on the floor for the next shift'],
      answer: 1, why: 'Use the equipment (hand truck, dolly) or a team lift. Your back has a long career ahead of it.' },
    { q: 'Why turn a package to check every side before you place it?',
      options: ['To find the heaviest end so you can lift it right', 'A handling mark may be on a side you missed', 'To check that the tape is holding on every seam', 'You only need to for international packages'],
      answer: 1, why: 'Handling marks (this way up, fragile, hazard diamonds) can be on any side. Read all six.' },
    { q: 'A box on the belt is leaking an unknown liquid. You should…',
      options: ['Wipe it dry and send it on down the belt', 'Hands off: step back, isolate it and report it', 'Open it carefully to see what is leaking', 'Put it at the bottom so it can\'t drip on others'],
      answer: 1, why: 'Leaking or damaged: don\'t touch the contents. Isolate the package and report it.' },
    { q: 'When sorting, the package label and the bin disagree. What do you trust?',
      options: ['The bin you usually use for that street', 'The label: read it and route it there', 'Whichever is faster at that moment', 'Neither: ask the customer about it later'],
      answer: 1, why: 'Read the label every time. A misroute costs far more time later than the second it takes to read.' }
  ],

  m3: [
    { q: 'An angry customer says their package is late. The best first step is…',
      options: ['Explain that the delay wasn\'t your fault', 'Acknowledge it, then say what you can do', 'Give them the depot number and move on', 'Promise them it will arrive later today'],
      answer: 1, why: 'A calm voice and acknowledging the problem de-escalate. Then offer what you actually can do. Don\'t promise what you can\'t.' },
    { q: 'At a business, a receptionist signs for a package addressed to a colleague. Whose name do you record?',
      options: ['The addressee\'s, since it is their package', 'The receptionist\'s, as they printed it', 'The company\'s name from the label', 'Nobody\'s: the scan alone is enough'],
      answer: 1, why: 'Record the printed name of whoever actually signed, even when it isn\'t the addressee.' },
    { q: 'A signature-required package, and nobody answers the door. You…',
      options: ['Leave it somewhere hidden and take a photo', 'Record an exception and leave a door tag', 'Sign for it yourself so the customer gets it', 'Leave it with the neighbor next door'],
      answer: 1, why: 'A signature-required package is never left unattended. Record the exception, leave a door tag and keep the package.' },
    { q: 'A customer wants to chat and you are behind schedule. You should…',
      options: ['Cut them off and walk back to the van', 'Stay friendly, then close it politely', 'Explain how many stops you still have left', 'Keep working and ignore them until they stop'],
      answer: 1, why: 'Stay friendly and warm but brief. Different customers need different styles; all of them deserve courtesy.' },
    { q: 'A customer is aggressive and you feel unsafe. What do you do?',
      options: ['Stand your ground and argue your side firmly', 'Get to safety, don\'t engage, and report it', 'Finish the delivery quickly, whatever happens', 'Calm them down by giving them the package'],
      answer: 1, why: 'Your safety comes first. Leave, don\'t escalate, and report it to your manager.' }
  ],

  m4: [
    { q: 'The label says Maple Court, but you are on Maple Avenue, where the number doesn\'t exist. You…',
      options: ['Deliver to the closest number on the avenue', 'Check the address, then ask dispatch instead of guessing', 'Leave it at the corner shop for them to collect', 'Mark it delivered and sort it out tomorrow'],
      answer: 1, why: '"Close enough" is not an address. Verify it, and ask dispatch rather than guess.' },
    { q: 'A package arrives crushed with the contents showing. What do you do?',
      options: ['Tape it back up neatly and deliver it', 'Photograph it and follow the damage procedure', 'Remove the broken part and deliver the rest', 'Deliver it as it is and say nothing about it'],
      answer: 1, why: 'Document it and follow the damage procedure, so the customer and the claim are handled properly.' },
    { q: 'A severe storm warning comes in mid-route. The right call is…',
      options: ['Speed up to finish the route before it hits', 'Follow dispatch and shelter if told to', 'Keep driving, since the van will protect you', 'Switch your phone off so you can concentrate'],
      answer: 1, why: 'No package is worth your life. Follow instructions, shelter when told, and resume only when it is safe.' },
    { q: 'The customer\'s note asks you to leave the package somewhere unsafe (in the road view, in the rain). You…',
      options: ['Follow the note exactly: it is their choice', 'Pick a safe spot close to it and record where', 'Take it back to the depot for a redelivery', 'Leave it at the curb where they can see it'],
      answer: 1, why: 'Follow delivery instructions when it is safe to. If not, choose a safe, sensible spot and record it.' },
    { q: 'You find a package for the wrong stop on your shelves. When is the best time to catch this?',
      options: ['At the door, when you read the label', 'Before it leaves the van, when you scan', 'At the end of the day, when you check in', 'When the customer calls to say it is missing'],
      answer: 1, why: 'Scan every package before it leaves the truck. The scan catches wrong-stop packages.' }
  ],

  m5: [
    { q: 'What should a proof-of-delivery photo show?',
      options: ['The package and the house number beside it', 'The package and the spot where it was left', 'The customer holding the package at the door', 'Only the package and its label, close up'],
      answer: 1, why: 'The package and where it was left. Never a house number, and never people or any part of one, yours included.' },
    { q: 'An adult-signature (21+) delivery: the person at the door has an expired ID. You…',
      options: ['Accept it, as long as the photo matches them', 'Keep it and record the ID exception', 'Ask an adult neighbor to sign for them', 'Leave it at the door with a photo'],
      answer: 1, why: 'Adult signature needs a valid, unexpired government photo ID and 21 or older. No exceptions.' },
    { q: 'Nobody is home for a package that needs a signature. Which is right?',
      options: ['A photo delivery at the front door', 'An exception, a door tag, back on the truck', 'Sign for them, since you know it\'s the right house', 'Leave it with the building\'s cleaner or super'],
      answer: 1, why: 'Nobody home + signature required = exception, door tag, and the package stays on the truck.' },
    { q: 'Why knock or ring before leaving a package?',
      options: ['You don\'t need to for a photo delivery', 'Many customers would rather have it handed over', 'Only for heavy packages they can\'t lift', 'Only when the delivery note asks you to'],
      answer: 1, why: 'Always attempt contact first. Many customers would rather receive the package in person.' },
    { q: 'The business is closed at your delivery time. You…',
      options: ['Leave it at the door in the doorway', 'Record "business closed" and bring it back', 'Slide it through the mail slot if it fits', 'Ask the shop next door to hold it for them'],
      answer: 1, why: 'A closed business is an exception: record it and bring the package back.' }
  ],

  m6: [
    { q: 'How should the day\'s packages be loaded on the shelves?',
      options: ['Biggest first, so the small ones fit around them', 'In stop order, with the next stop nearest to hand', 'Alphabetically by street, so they\'re easy to find', 'In any order: the scanner will find them'],
      answer: 1, why: 'Load in stop order. Searching the shelves at every stop costs minutes each time.' },
    { q: 'Where do the heaviest packages go?',
      options: ['On the top shelf, so they don\'t crush others', 'Low down, on the bottom shelves or the floor', 'By the door, so they are easy to unload', 'Anywhere there is room left for them'],
      answer: 1, why: 'Heavy goes low: it is safer to lift and keeps the van stable.' },
    { q: 'Why secure the load before driving?',
      options: ['A tidy van is quicker to inspect at the depot', 'Loose packages shift, break and fall on you', 'It is only needed on long highway routes', 'So the scanner can read every label'],
      answer: 1, why: 'A secured load doesn\'t shift under braking or cornering, and nothing falls on you when you open the door.' },
    { q: 'At a stop, you can\'t find the package quickly. What is the lesson?',
      options: ['Search harder and faster at every stop', 'Load each stop together, labels out', 'Skip the stop and come back to it later', 'Deliver a different package there instead'],
      answer: 1, why: 'A good load is found fast: sequence, group by stop, and keep labels facing out.' },
    { q: 'A fragile package should be…',
      options: ['Under the heavy boxes, where it can\'t slide', 'On top or in its own spot, never under weight', 'On the floor by the door, ready to go', 'Carried in your hands all day long'],
      answer: 1, why: 'Never put weight on fragile packages. Protect them on top or in their own spot.' }
  ],

  m7: [
    { q: 'At a business pickup, a package is badly taped and half open. You…',
      options: ['Take it and fix the packing at the depot', 'Refuse it until it is properly packed', 'Take it, but leave it out of your scans', 'Tape it up yourself and accept it'],
      answer: 1, why: 'What you accept, you own. Refuse packages that aren\'t properly packed.' },
    { q: 'An international shipment\'s commercial invoice is missing the contents\' value. What happens?',
      options: ['It ships anyway: customs works it out', 'Customs can hold it: complete it first', 'You write in your best guess of the value', 'Nothing: customs only checks the weight'],
      answer: 1, why: 'Customs needs a full description, value and currency. Incomplete paperwork means delays or returns.' },
    { q: 'The shipper says a box "just has some batteries and a bit of paint" but it isn\'t declared. You…',
      options: ['Accept it: a small amount doesn\'t count', 'Refuse it unless it is properly declared', 'Accept it, and keep it away from other boxes', 'Take the batteries out, then accept the rest'],
      answer: 1, why: 'Dangerous goods (some batteries, flammable paint) must be declared and packed to the rules. Undeclared: refuse.' },
    { q: 'Before leaving a pickup, you should…',
      options: ['Count the pieces and scan every one', 'Trust the shipper\'s count on the paperwork', 'Scan one piece from each stack to save time', 'Load them now and scan them at the depot'],
      answer: 0, why: 'Count and scan every piece at pickup, so the count matches the paperwork before you drive away.' },
    { q: 'A package has a hazard diamond label you don\'t recognize. What do you do?',
      options: ['Treat it as ordinary freight until told otherwise', 'Check the handling rules, or ask before moving it', 'Peel the label off so it doesn\'t confuse anyone', 'Put it with the fragile packages, to be safe'],
      answer: 1, why: 'Hazard diamonds carry handling rules. If in doubt, check or ask before you move it.' }
  ],

  m8: [
    { q: 'Icy porch steps and a package in your arms. How do you climb them?',
      options: ['Quickly, so you spend less time on the ice', 'Slowly, in short steps, watching your feet', 'Toss the package onto the porch, then climb', 'Two at a time, holding the package tight'],
      answer: 1, why: 'Slow down on ice and wet steps: short, careful steps, a hand free if you can. Most falls happen while carrying something.' },
    { q: 'A dog is barking and growling at the gate. You should…',
      options: ['Go in quickly and calmly so it settles', 'Stay outside the gate and wait for the owner', 'Hold out a hand so it can smell you', 'Run back to the van before it gets out'],
      answer: 1, why: 'Never enter a yard with an aggressive dog. Keep something between you and the dog, make noise, wait or reattempt, and don\'t run.' },
    { q: 'On a hot day, when should you drink water?',
      options: ['Whenever you start to feel thirsty', 'Regularly, before you feel thirsty', 'At lunch, so you don\'t lose time', 'As soon as you start to feel dizzy'],
      answer: 1, why: 'Hydrate before you are thirsty and take shade breaks. Dizziness and confusion mean heat illness: stop and get help.' },
    { q: 'After a minor collision, what should you NOT do?',
      options: ['Check whether anyone has been hurt', 'Admit fault to the other driver', 'Take photographs of both vehicles', 'Call it in to your manager straight away'],
      answer: 1, why: 'Never admit fault at the scene. Check on people, photograph everything, exchange details and call it in.' },
    { q: 'A garden hose lies across the path to the door. What is best?',
      options: ['Step over it carefully with the package', 'Set the package down and move it aside', 'Walk around it across the lawn instead', 'Kick it out of the way as you walk'],
      answer: 1, why: 'Clear trip hazards off the walkway, even with a package in hand: set it down, move them, pick it up.' }
  ]
};
