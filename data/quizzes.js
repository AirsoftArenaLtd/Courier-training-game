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
      options: ['Pump it a few times and drive carefully', 'Flag it: the van does not leave until it is fixed', 'Note it and check again at lunch', 'Only report it if the warning light is on'],
      answer: 1, why: 'A pedal that creeps down under steady pressure is a brake fault. It is flagged and fixed before the van moves.' },
    { q: 'What does a full stop at a stop sign mean?',
      options: ['Slowing to walking pace at the line', 'Wheels stopped behind the line, then look both ways', 'Stopping only if there is cross traffic', 'Stopping anywhere before the junction'],
      answer: 1, why: 'The wheels stop behind the line for a moment, then you look both ways. Rolling stops are the classic delivery-driver citation.' },
    { q: 'Turning right in a step van, the rear wheels…',
      options: ['Follow the front wheels exactly', 'Cut inside the front wheels, towards the curb', 'Swing wide into the next lane', 'Only matter when reversing'],
      answer: 1, why: 'The rear wheels cut inside the front ones. Swing wider and slower so they stay off the curb and the sidewalk.' },
    { q: 'You have to back up to reach a loading door. What comes first?',
      options: ['Hazard lights and go slowly', 'Get out and look (G.O.A.L.) at what is behind you', 'Use the mirrors only; getting out wastes time', 'Sound the horn twice'],
      answer: 1, why: 'Back as little as possible, and when you must: get out and look first, then back slowly using your mirrors.' },
    { q: 'A ball rolls into the street ahead. What should you expect?',
      options: ['Nothing: the ball is the hazard', 'A child may follow it: slow down and cover the brake', 'The driver behind will stop for it', 'Only to steer around the ball'],
      answer: 1, why: 'A ball in the road often means a child is about to follow it. Slow down and be ready to stop.' }
  ],

  m2: [
    { q: 'Before lifting a heavy box from the floor, you should…',
      options: ['Bend at the waist and lift quickly', 'Step in close, bend your knees and keep your back straight', 'Twist to carry it to the side', 'Lift it at arm\'s length to keep it clean'],
      answer: 1, why: 'Get close to the load, bend the knees, keep your back straight and the load against your body. Let your legs do the work.' },
    { q: 'A package is too heavy or awkward to lift safely alone. What now?',
      options: ['Drag it across the floor', 'Use a hand truck or get a second person', 'Lift it in two quick jerks', 'Leave it for the next shift'],
      answer: 1, why: 'Use the equipment (hand truck, dolly) or a team lift. Your back has a long career ahead of it.' },
    { q: 'Why turn a package to check every side before you place it?',
      options: ['To find the heaviest end', 'The handling mark that matters is often on a side you didn\'t look at', 'To check the tape', 'It is only needed for international packages'],
      answer: 1, why: 'Handling marks (this way up, fragile, hazard diamonds) can be on any side. Read all six.' },
    { q: 'A box on the belt is leaking an unknown liquid. You should…',
      options: ['Wipe it and send it on', 'Hands off, step back, isolate it and report it', 'Open it to see what is inside', 'Put it at the bottom of the pile'],
      answer: 1, why: 'Leaking or damaged: don\'t touch the contents. Isolate the package and report it.' },
    { q: 'When sorting, the package label and the bin disagree. What do you trust?',
      options: ['The bin you usually use', 'The label: read it and route it to the right place', 'Whatever is fastest', 'Ask the customer later'],
      answer: 1, why: 'Read the label every time. A misroute costs far more time later than the second it takes to read.' }
  ],

  m3: [
    { q: 'An angry customer says their package is late. The best first step is…',
      options: ['Explain it isn\'t your fault', 'Listen, acknowledge the problem, then say what you can do', 'Give them the depot number and leave', 'Promise it will be there today'],
      answer: 1, why: 'A calm voice and acknowledging the problem de-escalate. Then offer what you actually can do. Don\'t promise what you can\'t.' },
    { q: 'At a business, a receptionist signs for a package addressed to a colleague. Whose name do you record?',
      options: ['The addressee\'s', 'The receptionist\'s, as they printed it', 'The company\'s name', 'Nobody\'s: a scan is enough'],
      answer: 1, why: 'Record the printed name of whoever actually signed, even when it isn\'t the addressee.' },
    { q: 'A signature-required package, and nobody answers the door. You…',
      options: ['Leave it in a safe spot with a photo', 'Record an exception, leave a door tag and keep the package', 'Sign for it yourself', 'Leave it with the nearest neighbor'],
      answer: 1, why: 'A signature-required package is never left unattended. Record the exception and leave a door tag.' },
    { q: 'A customer wants to chat and you are behind schedule. You should…',
      options: ['Cut them off and walk away', 'Stay friendly and brief: close the conversation politely', 'Explain your stop count', 'Ignore them'],
      answer: 1, why: 'Stay friendly and warm but brief. Different customers need different styles; all of them deserve courtesy.' },
    { q: 'A customer is aggressive and you feel unsafe. What do you do?',
      options: ['Argue your side firmly', 'Step back to safety, don\'t engage, and report it', 'Finish the delivery whatever happens', 'Take the package back without a word'],
      answer: 1, why: 'Your safety comes first. Leave, don\'t escalate, and report it to your manager.' }
  ],

  m4: [
    { q: 'The label says Maple Court, but you are on Maple Avenue, where the number doesn\'t exist. You…',
      options: ['Deliver to the closest number on the avenue', 'Check the address and contact dispatch instead of guessing', 'Leave it at the corner shop', 'Mark it delivered and move on'],
      answer: 1, why: '"Close enough" is not an address. Verify it, and ask dispatch rather than guess.' },
    { q: 'A package arrives crushed with the contents showing. What do you do?',
      options: ['Tape it up and deliver it', 'Document the damage (photos, notes) and follow the damage procedure', 'Throw away the broken part', 'Deliver it and say nothing'],
      answer: 1, why: 'Document it and follow the damage procedure, so the customer and the claim are handled properly.' },
    { q: 'A severe storm warning comes in mid-route. The right call is…',
      options: ['Rush to finish before it hits', 'Follow dispatch\'s instructions and shelter if told to; safety before the schedule', 'Keep driving; the van is safe', 'Turn your phone off to concentrate'],
      answer: 1, why: 'No package is worth your life. Follow instructions, shelter when told, and resume only when it is safe.' },
    { q: 'The customer\'s note asks you to leave the package somewhere unsafe (in the road view, in the rain). You…',
      options: ['Follow the note exactly', 'Pick the nearest safe spot that respects the note\'s intent, and note where', 'Take it back to the depot', 'Leave it at the curb'],
      answer: 1, why: 'Follow delivery instructions when it is safe to. If not, choose a safe, sensible spot and record it.' },
    { q: 'You find a package for the wrong stop on your shelves. When is the best time to catch this?',
      options: ['At the door', 'Before you leave the van: scan it', 'At the end of the day', 'When the customer calls'],
      answer: 1, why: 'Scan every package before it leaves the truck. The scan catches wrong-stop packages.' }
  ],

  m5: [
    { q: 'What should a proof-of-delivery photo show?',
      options: ['The package and the house number', 'The package and where it was left (the door), with no house numbers or people', 'The customer holding the package', 'Only the package, close up'],
      answer: 1, why: 'The package and where it was left. Never a house number, and never people or any part of one, yours included.' },
    { q: 'An adult-signature (21+) delivery: the person at the door has an expired ID. You…',
      options: ['Accept it if the photo matches', 'Don\'t hand it over: record the ID exception', 'Ask a neighbor to sign', 'Leave it at the door'],
      answer: 1, why: 'Adult signature needs a valid, unexpired government photo ID and 21 or older. No exceptions.' },
    { q: 'Nobody is home for a package that needs a signature. Which is right?',
      options: ['Photo POD at the door', 'Exception "recipient not available", a door tag, and it goes back on the truck', 'Sign for them', 'Leave it with the building\'s cleaner'],
      answer: 1, why: 'Nobody home + signature required = exception, door tag, and the package stays on the truck.' },
    { q: 'Why knock or ring before leaving a package?',
      options: ['It isn\'t needed for a photo delivery', 'Many customers would rather receive it in person: always attempt contact', 'Only for heavy packages', 'Only if the note says so'],
      answer: 1, why: 'Always attempt contact first. Many customers would rather receive the package in person.' },
    { q: 'The business is closed at your delivery time. You…',
      options: ['Leave it at the door', 'Record the "business closed" exception and bring it back', 'Slide it through the mail slot', 'Ask the shop next door to hold it'],
      answer: 1, why: 'A closed business is an exception: record it and bring the package back.' }
  ],

  m6: [
    { q: 'How should the day\'s packages be loaded on the shelves?',
      options: ['Biggest first', 'In stop order, so the next stop\'s packages are nearest to hand', 'Alphabetically by street', 'Any order: the scanner finds them'],
      answer: 1, why: 'Load in stop order. Searching the shelves at every stop costs minutes each time.' },
    { q: 'Where do the heaviest packages go?',
      options: ['On the top shelf', 'Low, on the bottom shelves or the floor', 'By the door', 'Anywhere there is room'],
      answer: 1, why: 'Heavy goes low: it is safer to lift and keeps the van stable.' },
    { q: 'Why secure the load before driving?',
      options: ['It looks tidy', 'Loose packages shift, fall and get damaged, and can hurt you when you open the door', 'It is only for long routes', 'So the scanner reads them'],
      answer: 1, why: 'A secured load doesn\'t shift under braking or cornering, and nothing falls on you.' },
    { q: 'At a stop, you can\'t find the package quickly. What is the lesson?',
      options: ['Search harder', 'Load and label in sequence so each stop is together and easy to find', 'Skip the stop', 'Deliver another package there'],
      answer: 1, why: 'A good load is found fast: sequence, group by stop, and keep labels facing out.' },
    { q: 'A fragile package should be…',
      options: ['Under the heavy boxes', 'On top or in a protected spot, never under weight', 'On the floor by the door', 'Hand-carried all day'],
      answer: 1, why: 'Never put weight on fragile packages. Protect them on top or in their own spot.' }
  ],

  m7: [
    { q: 'At a business pickup, a package is badly taped and half open. You…',
      options: ['Take it and fix it at the depot', 'Don\'t accept it until it is properly packed', 'Take it but don\'t scan it', 'Tape it yourself and accept it'],
      answer: 1, why: 'What you accept, you own. Refuse packages that aren\'t properly packed.' },
    { q: 'An international shipment\'s commercial invoice is missing the contents\' value. What happens?',
      options: ['It ships anyway', 'It can be held at customs: get the paperwork complete before accepting', 'You fill in a guess', 'Only the weight matters'],
      answer: 1, why: 'Customs needs a full description, value and currency. Incomplete paperwork means delays or returns.' },
    { q: 'The shipper says a box "just has some batteries and a bit of paint" but it isn\'t declared. You…',
      options: ['Accept it: it is small', 'Don\'t accept undeclared dangerous goods: it must be declared properly or refused', 'Accept it and keep it away from other boxes', 'Take the batteries out'],
      answer: 1, why: 'Dangerous goods (some batteries, flammable paint) must be declared and packed to the rules. Undeclared: refuse.' },
    { q: 'Before leaving a pickup, you should…',
      options: ['Count pieces and scan every one', 'Trust the shipper\'s count', 'Scan one per stack', 'Scan at the depot'],
      answer: 0, why: 'Count and scan every piece at pickup, so the count matches the paperwork before you drive away.' },
    { q: 'A package has a hazard diamond label you don\'t recognize. What do you do?',
      options: ['Treat it as ordinary freight', 'Check the handling rules or ask before you move it', 'Remove the label', 'Put it with the fragile packages'],
      answer: 1, why: 'Hazard diamonds carry handling rules. If in doubt, check or ask before you move it.' }
  ],

  m8: [
    { q: 'Icy porch steps and a package in your arms. How do you climb them?',
      options: ['Quickly, before you slip', 'Slowly, short steps, eyes on the path, a hand free if you can', 'Throw the package onto the porch first', 'Take them two at a time'],
      answer: 1, why: 'Slow down on ice and wet steps: short, careful steps. Most falls happen while carrying something.' },
    { q: 'A dog is barking and growling at the gate. You should…',
      options: ['Go in quickly and calmly', 'Don\'t enter: keep a barrier between you, make noise, and wait or reattempt', 'Try to pet it', 'Run back to the van'],
      answer: 1, why: 'Never enter a yard with an aggressive dog. Keep something between you and the dog, and don\'t run.' },
    { q: 'On a hot day, when should you drink water?',
      options: ['When you feel thirsty', 'Regularly, before you feel thirsty, and rest in shade', 'Only at lunch', 'Only if you feel dizzy'],
      answer: 1, why: 'Hydrate before you are thirsty and take shade breaks. Dizziness and confusion mean heat illness: stop and get help.' },
    { q: 'After a minor collision, what should you NOT do?',
      options: ['Check whether anyone is hurt', 'Admit fault at the scene', 'Take photographs', 'Call it in to your manager'],
      answer: 1, why: 'Never admit fault at the scene. Check on people, photograph everything, exchange details and call it in.' },
    { q: 'A garden hose lies across the path to the door. What is best?',
      options: ['Step over it', 'Move it aside (set the package down first), then carry on', 'Walk on the lawn', 'Kick it away while walking'],
      answer: 1, why: 'Clear trip hazards off the walkway, even with a package in hand: set it down, move them, pick it up.' }
  ]
};
