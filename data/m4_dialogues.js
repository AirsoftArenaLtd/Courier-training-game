/*
 * Module 4 · Problem Solving / Edge Cases — uses the same dialogue engine as Module 3.
 * See data/m3_dialogues.js for the node format.
 */
window.OTR_DATA = window.OTR_DATA || {};
OTR_DATA.dialogues = OTR_DATA.dialogues || {};

/* ------------------------------------------------------------------------------------------------ */
OTR_DATA.dialogues.m4_address = {
  title: 'Wrong Address',
  setting: 'street',
  houseNumber: '412',             // the Maple AVENUE house the navigation stopped at
  moodMeter: null,
  cast: {
    sam: {
      name: 'Sam', color: 0x44546E, moodStart: 0,
      portrait: { kind: 'person', skin: 0xE0B089, hair: 0x6B4A2A, hairStyle: 'short', shirt: 0x6CA86E, beard: true }
    },
    dispatch: {
      name: 'Dispatch', color: 0x4D148C, moodStart: 0, remote: true,
      portrait: { kind: 'person', skin: 0x9C6B4A, hair: 0x1C1414, hairStyle: 'ponytail', shirt: 0x4D148C, uniform: true }
    },
    jo: {
      name: 'Jo Okafor', color: 0xB5563C, moodStart: 1,
      portrait: { kind: 'person', skin: 0x6E4630, hair: 0x1C1414, hairStyle: 'curly', shirt: 0xFFB020, glasses: 0x333333 }
    }
  },
  keyLessons: [
    'Never guess an address. Check the street name, suffix (Ave vs. Ct), unit and ZIP before delivering.',
    'Use your normal channels (dispatch / route tools) to resolve address exceptions — then plan the fix into your route.',
    'Confirm the recipient when something doesn\'t match, and never leave a package with a stranger.'
  ],
  start: 'n0',
  nodes: {
    n0: {
      speaker: 'narrator',
      text: 'Stop 22. The label says 421 MAPLE CT. Your navigation brought you to Maple AVENUE — where the house numbers stop at 418.',
      next: 'n1'
    },
    n1: {
      speaker: 'narrator',
      text: 'Number 412 is right there. It\'s so close. What do you do?',
      choices: [
        {
          text: 'Re-read the whole label and your route info: street name, suffix (Ct vs. Ave), unit and ZIP.',
          grade: 'good', effects: { efficiency: 2, service: 1 },
          feedback: 'Thirty seconds of verification beats a misdelivery. The suffix is the clue: COURT, not AVENUE.',
          next: 'n2_ct'
        },
        {
          text: 'Deliver it to 412 Maple Ave. The digits were probably swapped.',
          grade: 'bad', effects: { service: -3 },
          feedback: 'Guessing puts a customer\'s package on a stranger\'s porch. "Close enough" is not an address.',
          lesson: '"Close enough" is not an address — verify before you deliver.',
          next: 'n2_412'
        },
        {
          text: 'Mark it undeliverable and move on. Not your problem.',
          grade: 'bad', effects: { service: -2, efficiency: -1 },
          feedback: 'Giving up too fast sends the package back through the system for days. A quick check might get it delivered today.',
          next: 'n1_giveup'
        }
      ]
    },
    n1_giveup: {
      speaker: 'narrator',
      text: 'You reach for the handheld to code it undeliverable — and stop. You are standing on the right street name with the wrong suffix, thirty seconds from knowing for certain. Dispatch would ask why you didn\'t look.',
      next: 'n2_ct'
    },
    n2_412: {
      speaker: 'sam', show: 'sam',
      text: 'Oh, this isn\'t mine. There\'s a Maple COURT about a mile east, though. Happens all the time — I got someone\'s mattress once.',
      choices: [
        {
          text: '"Thanks for checking! I\'ll get it where it belongs."',
          grade: 'good', effects: { service: 1 },
          feedback: 'Good recovery. Take the package back and verify properly.',
          next: 'n2_ct'
        },
        {
          text: '"Could you just hang onto it? They can swing by and pick it up."',
          grade: 'bad', effects: { service: -2, efficiency: -1 },
          feedback: 'Leaving a package with an unrelated stranger isn\'t a delivery — it\'s a lost package waiting to happen.',
          lesson: 'Never leave a package with an unrelated person to "fix" an address problem.',
          next: 'end_stranger'
        }
      ]
    },
    n2_ct: {
      speaker: 'narrator', hide: true,
      text: 'The ZIP matches a small cul-de-sac called Maple Court, about a mile east. It\'s near your route, but not in your planned sequence.',
      choices: [
        {
          text: 'Use your normal channel to let dispatch know about the address mix-up, then fit the stop into your route.',
          grade: 'good', effects: { efficiency: 2, service: 1 },
          feedback: 'Communicating early keeps records accurate, and planning it in avoids making other stops late.',
          next: 'n3_dispatch'
        },
        {
          text: 'Drive there right now, skipping your next three stops.',
          grade: 'ok', effects: { efficiency: -2, service: 1 },
          feedback: 'Fixing it matters, but blowing up your sequence makes three other customers late. Plan it in.',
          next: 'n3_ct'
        }
      ]
    },
    n3_dispatch: {
      speaker: 'dispatch', show: 'dispatch',
      text: 'Copy that. Maple Court\'s in your area — slot it in right after the Birch Lane stops. Nice catch.',
      next: 'n3_ct'
    },
    n3_ct: {
      speaker: 'narrator', hide: true, setting: { name: 'street', number: '421', mailbox: 'RIVERA' },
      text: 'Maple Court. Number 421 exists! But the mailbox says RIVERA, and the label says J. OKAFOR.',
      choices: [
        {
          text: 'Knock, and politely confirm the recipient\'s name before handing it over.',
          grade: 'good', effects: { service: 2, efficiency: 1 },
          feedback: 'A mismatch is worth a ten-second check. Maybe they just moved in — maybe it\'s a second error.',
          next: 'n4'
        },
        {
          text: 'Address matches — leave it at the door without checking.',
          grade: 'ok', effects: { efficiency: 1, service: -1 },
          feedback: 'An address match is usually fine for a no-signature package, but when names clearly conflict, a quick knock prevents another problem.',
          next: 'end_ok'
        }
      ]
    },
    n4: {
      speaker: 'jo', show: 'jo',
      text: 'That\'s me! We just moved in last week — haven\'t changed the mailbox yet. I was starting to worry about this one.',
      choices: [
        {
          text: '"Welcome to the neighborhood! Heads up — half the drivers get sent to Maple Ave by their navigation. It might be worth adding \'COURT, not Avenue\' to the delivery notes on your accounts."',
          grade: 'good', effects: { service: 2, mood: 1 },
          feedback: 'You solved today\'s problem AND prevented the next one. That\'s the difference between delivering and serving.',
          next: 'end_great'
        },
        {
          text: 'Hand it over and head out.',
          grade: 'ok', effects: {},
          feedback: 'Delivered! A quick tip about the address mix-up would save this customer future headaches.',
          next: 'end_ok'
        }
      ]
    },
    end_great: {
      type: 'end', outcome: 'good', title: 'Right Package, Right Door',
      text: 'You verified instead of guessing, kept dispatch informed, protected your route, and helped a new neighbor avoid future mix-ups.'
    },
    end_ok: {
      type: 'end', outcome: 'mixed', title: 'Delivered… Probably Right',
      text: 'The package reached the right house, but a couple of skipped checks left room for error.'
    },
    end_stranger: {
      type: 'end', outcome: 'bad', title: 'Lost in the Neighborhood',
      text: 'Sam forgets about the box. The real recipient files a claim a week later. Never hand a package to an unrelated person to fix an address problem.'
    }
  }
};

/* ------------------------------------------------------------------------------------------------ */
OTR_DATA.dialogues.m4_damaged = {
  title: 'Damaged on Arrival',
  setting: 'street',
  moodMeter: 'bennett',
  cast: {
    bennett: {
      name: 'Mr. Bennett', color: 0x44546E, moodStart: 1,
      portrait: { kind: 'person', skin: 0xF3CFB3, hair: 0x9A9A9A, hairStyle: 'bald', shirt: 0x7A8FB5, collar: true, glasses: 0x4D3A2A }
    }
  },
  keyLessons: [
    'Leaking package: don\'t touch, open or sniff it. Step back, keep it away from other freight, and report it using your company\'s procedure.',
    'Never deliver or hand a leaking or unsafe package to a customer.',
    'Be honest about damage, explain next steps, and document the exception accurately.'
  ],
  start: 'n0',
  nodes: {
    n0: {
      speaker: 'narrator', shake: true,
      text: 'You roll up the cargo door at your next stop. The box you need is crushed at one corner… and a wet stain is spreading under it. There\'s a sharp chemical smell.',
      choices: [
        {
          text: 'Don\'t touch the leak. Step back, keep it apart from other packages, and follow your company\'s procedure for reporting a leaking package.',
          grade: 'good', effects: { safety: 3 },
          feedback: 'Exactly. You don\'t know what that liquid is. Distance, separation and reporting keep you — and everyone downstream — safe.',
          next: 'n2'
        },
        {
          text: 'Pick it up and open it to see what\'s leaking.',
          grade: 'bad', effects: { safety: -3 },
          feedback: 'Unknown liquids can be hazardous. Never open, sniff, or handle a leaking package with bare hands.',
          lesson: 'Never open, sniff or handle a leaking package — isolate it and report it.',
          next: 'n1_bad'
        },
        {
          text: 'Wipe it off with a rag, flip it so the stain doesn\'t show, and deliver it.',
          grade: 'bad', effects: { safety: -3, service: -2 },
          feedback: 'Hiding damage puts the customer at risk and destroys trust. Leaking packages don\'t get delivered.',
          lesson: 'Never hide damage or deliver a leaking package.',
          next: 'n1_bad'
        }
      ]
    },
    n1_bad: {
      speaker: 'narrator', shake: true, set: { exposed: true },
      text: 'The liquid stings your hand. You rinse it off with water from your bottle — lucky it\'s mild. That still goes in an exposure report, and you\'ll be watching that skin all afternoon. You set the box aside.',
      next: 'n2'
    },
    n2: {
      speaker: 'bennett', show: 'bennett',
      text: 'Afternoon! Is that my cleaning supplies order? I\'ve been waiting all week!',
      choices: [
        {
          text: '"Good afternoon! I\'m sorry — your package was damaged in transit and it\'s leaking, so for safety I can\'t deliver it as-is. It\'s been reported, and you\'ll get follow-up on next steps."',
          grade: 'good', effects: { service: 3, safety: 1, mood: -1 },
          feedback: 'Honest, specific and calm. He\'s disappointed — that\'s normal — but he knows what happened and what\'s next.',
          next: 'n3_honest'
        },
        {
          text: '"Nope, not today."',
          grade: 'bad', effects: { service: -2, mood: -2 },
          feedback: 'Vague answers create suspicion. Customers handle bad news far better than mystery.',
          next: 'n3_vague'
        },
        {
          text: '"It\'s here, but it\'s a little wet. Want it anyway?"',
          grade: 'bad', effects: { safety: -3, service: -1 },
          feedback: 'Offering a leaking package to a customer puts them at risk — and it\'s not a choice they should have to make.',
          lesson: 'Never offer a leaking or unsafe package to a customer.',
          next: 'n3_bad'
        }
      ]
    },
    n3_vague: {
      speaker: 'bennett', mood: 'angry',
      text: 'What do you mean "not today"? Tracking says OUT FOR DELIVERY! It\'s right there in your truck!',
      choices: [
        {
          text: '"You\'re right, let me explain properly. It arrived damaged and it\'s leaking, so I can\'t deliver it safely. It\'s reported and you\'ll get follow-up on next steps."',
          grade: 'good', effects: { service: 2, mood: 1 },
          feedback: 'Good recovery. Clear, honest information turns suspicion into understanding.',
          next: 'n3_honest'
        },
        {
          text: '"You\'ll have to call customer service."',
          grade: 'bad', effects: { service: -2, mood: -1 },
          feedback: 'Support may be part of the answer, but deflecting without explaining leaves the customer angry and confused.',
          next: 'end_deflect'
        }
      ]
    },
    n3_honest: {
      speaker: 'bennett', mood: 'annoyed',
      text: 'Damaged? Ugh. Can\'t I just take the bottles that aren\'t broken?',
      choices: [
        {
          text: '"I understand the frustration. I can\'t open or split a damaged package, but the shipper\'s claims process can arrange a replacement or refund."',
          grade: 'good', effects: { service: 2, safety: 1, mood: 1 },
          feedback: 'You held the safety line and pointed to a real solution. Empathy plus boundaries.',
          next: 'n4'
        },
        {
          text: '"Sure, let\'s open it up and see what survived."',
          grade: 'bad', effects: { safety: -3 },
          feedback: 'Opening a leaking package exposes both of you to whatever is inside. Damaged packages stay sealed and go through the exception process.',
          next: 'n3_bad'
        }
      ]
    },
    n3_bad: {
      speaker: 'narrator', shake: true, hide: true,
      text: 'Liquid drips across Mr. Bennett\'s hands and driveway. He\'s okay after rinsing off — but he\'s upset, and now there\'s an incident report with your name on it.',
      next: 'end_bad'
    },
    n4: {
      speaker: 'bennett', effects: { mood: 1 },
      text: 'Okay. Honestly, thanks for being straight with me instead of making something up.',
      choices: [
        {
          text: 'Document the damage (photos and notes as your process requires) and record the delivery exception accurately.',
          grade: 'good', effects: { safety: 1, service: 2 },
          feedback: 'Accurate records are how the customer gets a replacement fast — and how the damage gets investigated.',
          next: 'end_pick'
        },
        {
          text: 'Skip the paperwork — it\'s already been reported once.',
          grade: 'ok', effects: { efficiency: 1, service: -1 },
          feedback: 'Incomplete records slow down the customer\'s claim. Documenting the exception is part of the job.',
          next: 'end_ok'
        }
      ]
    },
    end_pick: { if: '!exposed', then: 'end_great', else: 'end_exposed' },
    end_great: {
      type: 'end', outcome: 'good', title: 'Handled Like a Pro',
      text: 'Nobody got hurt, the leak was contained and reported, and the customer trusts you because you told the truth.'
    },
    end_exposed: {
      type: 'end', outcome: 'mixed', title: 'Handled Well — After the Burn',
      text: 'You recovered the stop properly, but you got the contents on your skin first. A leaking package is never opened or rearranged: hands off, isolate it, report it.'
    },
    end_ok: {
      type: 'end', outcome: 'mixed', title: 'Safe, But Sloppy',
      text: 'The dangerous part was handled well, but thin documentation will slow down Mr. Bennett\'s replacement.'
    },
    end_deflect: {
      type: 'end', outcome: 'mixed', title: 'Passed the Buck',
      text: 'The package was kept safely off the doorstep, but the customer walked away confused and angry. Explain what happened in plain words.'
    },
    end_bad: {
      type: 'end', outcome: 'bad', title: 'Incident Report',
      text: 'A leaking package reached a customer\'s hands. Isolate, report and never deliver — no matter how much the customer wants it.'
    }
  }
};

/* ------------------------------------------------------------------------------------------------ */
OTR_DATA.dialogues.m4_storm = {
  title: 'Storm Warning',
  setting: 'storm',
  moodMeter: null,
  cast: {
    dispatch: {
      name: 'Dispatch', color: 0x4D148C, moodStart: 0, remote: true,
      portrait: { kind: 'person', skin: 0x9C6B4A, hair: 0x1C1414, hairStyle: 'ponytail', shirt: 0x4D148C, uniform: true }
    },
    okoye: {
      name: 'Ms. Okoye (on the phone)', color: 0x2F6B5A, moodStart: 0, remote: true,
      portrait: { kind: 'person', skin: 0x5E3B28, hair: 0x2A1A14, hairStyle: 'bun', shirt: 0x2F8F83, earrings: 0xFFC83D }
    }
  },
  keyLessons: [
    'Severe weather: slow down, headlights on, increase following distance, and pull off somewhere safe (not in a travel lane) if visibility is poor.',
    'Never drive through flooded roads — turn around, don\'t drown.',
    'Delivery instructions never override your safety. When a note is unclear, don\'t guess — clarify through your normal process.'
  ],
  start: 'n0',
  nodes: {
    n0: {
      speaker: 'narrator', sfx: 'thunder', shake: true,
      text: '3:15 PM. The sky goes black in minutes. Rain hammers the windshield and your phone lights up with a severe thunderstorm and flash-flood warning.',
      timer: 9,
      timeout: {
        grade: 'bad', effects: { safety: -1 },
        feedback: 'Indecision at speed is its own hazard. Slow down first — then look for a safe place to pull over.',
        next: 'n2'
      },
      choices: [
        {
          text: 'Slow down, turn on your headlights, increase your following distance, and look for a safe spot to pull off until the worst passes.',
          grade: 'good', effects: { safety: 3 },
          feedback: 'Speed down, visibility up, space cushion bigger. Pulling off safely is always an option.',
          next: 'n2'
        },
        {
          text: 'Speed up to finish the route before it gets worse.',
          grade: 'bad', effects: { safety: -3 },
          feedback: 'Wet roads mean longer stopping distances and a higher chance of hydroplaning. Rushing is exactly backwards.',
          lesson: 'In heavy rain, slow down and increase following distance — never speed up to "beat" the storm.',
          next: 'n2'
        },
        {
          text: 'Stop right where you are in the travel lane with your hazards on.',
          grade: 'bad', effects: { safety: -2 },
          feedback: 'Stopping in a travel lane in low visibility invites a rear-end crash. Pull fully off the road in a safe spot.',
          next: 'n2'
        }
      ]
    },
    n2: {
      speaker: 'narrator',
      text: 'The rain eases a little. Ahead, the underpass on your route is covered with brown, moving water. Your stop is on the other side.',
      choices: [
        {
          text: 'Turn around and find another route. Never drive through flooded roads.',
          grade: 'good', effects: { safety: 3 },
          feedback: 'Turn around, don\'t drown. You can\'t see how deep the water is or whether the road underneath has washed away.',
          next: 'n3'
        },
        {
          text: 'It looks shallow, and the truck sits high. Go for it.',
          grade: 'bad', effects: { safety: -4 },
          feedback: 'Moving water just a foot or so deep can float many vehicles, and you can\'t see road damage below. No package is worth that.',
          lesson: 'Never drive through flooded roads — turn around, don\'t drown.',
          next: 'n2_flood'
        }
      ]
    },
    n2_flood: {
      speaker: 'narrator', shake: true, sfx: 'splash', set: { flooded: true },
      text: 'Water surges against the doors and the engine sputters and dies. You climb out into thigh-deep water and wade back to high ground. The truck is going nowhere until a tow gets here, and everything on board is soaked.',
      next: 'n3'
    },
    n3: {
      speaker: 'dispatch', show: 'dispatch', sfx: 'phone',
      text: 'Dispatch checking in on drivers in the storm zone. Everyone okay out there?',
      choices: [
        {
          text: '"I\'m safe. Heads up: the Pine Street underpass is flooded — I rerouted."',
          grade: 'good', effects: { safety: 1, service: 1 },
          feedback: 'Checking in once you\'re safely stopped lets dispatch warn other drivers. Your report may keep a coworker out of that water.',
          next: 'n4'
        },
        {
          text: 'Ignore the call. You\'ll catch up later.',
          grade: 'ok', effects: { service: -1 },
          feedback: 'Never handle the phone while moving — but once you\'re safely parked, checking in helps dispatch keep everyone safe.',
          next: 'n4'
        }
      ]
    },
    n4: {
      speaker: 'narrator', hide: true, sfx: 'thunder',
      text: 'You reach the stop. Delivery note: "If not home, leave at back gate. Watch the step!" The back gate is padlocked, the yard is ankle-deep in water, and lightning is still close.',
      choices: [
        {
          text: 'Wait in the truck until the lightning moves off, then reassess.',
          grade: 'good', effects: { safety: 2 },
          feedback: 'When thunder roars, stay indoors — and your truck is safer than an open, flooded yard. A few minutes costs nothing.',
          next: 'n5'
        },
        {
          text: 'Climb over the gate. The note said "back gate."',
          grade: 'bad', effects: { safety: -3 },
          feedback: 'Instructions never override safety. Climbing a locked gate into a flooded yard during lightning is how people get hurt.',
          lesson: 'Delivery instructions never override your safety.',
          next: 'n5_hurt'
        },
        {
          text: 'Leave it on the front step in the rain and go.',
          grade: 'bad', effects: { service: -2 },
          feedback: 'The note didn\'t say front step, and an unprotected box in a downpour will be soaked through.',
          next: 'end_soaked'
        }
      ]
    },
    n5_hurt: {
      speaker: 'narrator', shake: true,
      text: 'You slip on the flooded step — the one the note warned about — and twist your ankle. The package lands in a puddle.',
      next: 'end_hurt'
    },
    n5: {
      speaker: 'narrator',
      text: 'The lightning moves off. It\'s still raining. The gate is still locked, and the note is ambiguous — inside the gate? Outside it? Under something?',
      choices: [
        {
          text: 'Don\'t guess. Contact the customer through your normal process to clarify, or treat it as an attempted delivery and leave a notice.',
          grade: 'good', effects: { service: 2, safety: 1 },
          feedback: 'Unclear instructions + bad weather = clarify, don\'t improvise. The customer gets the outcome they actually want.',
          next: 'n6'
        },
        {
          text: 'Wedge it against the outside of the locked gate, in the water.',
          grade: 'ok', effects: { efficiency: 1, service: -2 },
          feedback: 'Technically "at the back gate," but a box sitting in floodwater isn\'t a successful delivery.',
          next: 'end_soaked'
        }
      ]
    },
    n6: {
      speaker: 'okoye', show: 'okoye',
      text: 'Oh, thank you for checking! Please don\'t go back there — that yard floods every time. Could you bring it tomorrow instead?',
      choices: [
        {
          text: '"Absolutely. I\'ll leave a notice for redelivery tomorrow — and you might update your delivery instructions so drivers know about the flooding."',
          grade: 'good', effects: { service: 2, mood: 1 },
          feedback: 'You solved today safely and improved every future delivery to this address.',
          next: 'end_pick'
        },
        {
          text: '"Okay. Bye."',
          grade: 'ok', effects: { efficiency: 1 },
          feedback: 'Fine outcome, but suggesting clearer delivery instructions would prevent the same confusion next storm.',
          next: 'end_ok'
        }
      ]
    },
    end_pick: { if: '!flooded', then: 'end_great', else: 'end_towed' },
    end_great: {
      type: 'end', outcome: 'good', title: 'Weathered the Storm',
      text: 'You drove for the conditions, avoided floodwater, waited out the lightning, and clarified instead of guessing. The package — and you — are dry.'
    },
    end_towed: {
      type: 'end', outcome: 'bad', title: 'Turn Around, Don\'t Drown',
      text: 'You handled the rest of the stop well, but the truck is still in the underpass waiting for a tow, and the freight on board is water damaged. Six inches of moving water is enough to float a vehicle: turn around, every time.'
    },
    end_ok: {
      type: 'end', outcome: 'mixed', title: 'Safe and Sound',
      text: 'Everyone stayed safe and the package is protected. A quick tip about the delivery note would make next time easier.'
    },
    end_soaked: {
      type: 'end', outcome: 'mixed', title: 'Soggy Delivery',
      text: 'You stayed safe, but the package sat in the rain. Unclear instructions in bad weather call for a quick clarification.'
    },
    end_hurt: {
      type: 'end', outcome: 'bad', title: 'Injured on the Job',
      text: 'A twisted ankle, a soaked package, and a day off the route. No delivery note is worth risking your safety.'
    }
  }
};
