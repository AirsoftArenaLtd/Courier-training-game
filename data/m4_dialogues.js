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
          text: 'Re-read the whole label: street, suffix (Ct or Ave), unit and ZIP.',
          grade: 'good', effects: { efficiency: 2, service: 1 },
          feedback: 'Thirty seconds of verification beats a misdelivery. The suffix is the clue: COURT, not AVENUE.',
          next: 'n2_ct'
        },
        {
          text: 'Deliver it to 412 Maple Ave. The digits were probably swapped, and it\'s the only close match.',
          grade: 'bad', effects: { service: -3 }, set: { guessed: true }, critical: true,
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
          text: 'Tell dispatch about the mix-up through your normal channel, then fit the stop in where it makes sense.',
          grade: 'good', effects: { efficiency: 2, service: 1 },
          feedback: 'Communicating early keeps records accurate, and planning it in avoids making other stops late.',
          next: 'n3_dispatch'
        },
        {
          text: 'Drive there right now and skip your next three stops; you can loop back for them later.',
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
          grade: 'good', effects: { service: 2, efficiency: 1 }, act: 'walk', arg: { who: 'courier', x: 340 },   // up to the house
          feedback: 'A mismatch is worth a ten-second check. Maybe they just moved in — maybe it\'s a second error.',
          next: 'n4'
        },
        {
          text: 'The address matches, so leave it at the door. The name on a mailbox is often out of date.',
          grade: 'ok', effects: { efficiency: 1, service: -1 },
          feedback: 'An address match is usually fine for a no-signature package, but when names clearly conflict, a quick knock prevents another problem.',
          next: 'end_ok_pick'
        }
      ]
    },
    n4: {
      speaker: 'jo', show: 'jo',
      text: 'That\'s me! We just moved in last week — haven\'t changed the mailbox yet. I was starting to worry about this one.',
      choices: [
        {
          text: '"Welcome! Navigation sends half of us to Maple Ave — add \'COURT, not Avenue\' to your delivery notes."',
          grade: 'good', effects: { service: 2, mood: 1 },
          feedback: 'You solved today\'s problem AND prevented the next one. That\'s the difference between delivering and serving.',
          next: 'end_great_pick'
        },
        {
          text: '"Here you go — enjoy the new place!" Hand it over and head out to catch up on your route.',
          grade: 'ok', effects: {},
          feedback: 'Delivered! A quick tip about the address mix-up would save this customer future headaches.',
          next: 'end_ok_pick'
        }
      ]
    },
    // a guess that a stranger had to catch is remembered at the end (DIALOGUE-24)
    end_great_pick: { if: 'guessed', then: 'end_caught', else: 'end_great' },
    end_ok_pick: { if: 'guessed', then: 'end_caught', else: 'end_ok' },
    end_caught: {
      type: 'end', outcome: 'mixed', title: 'Caught in Time',
      text: 'The package reached Jo in the end, but only because the stranger at 412 caught your guess. Verify the whole address before a package leaves your hands.'
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
      // The courier has just lifted the box, and it drips (a box on the van floor or the ground would sit under the
      // caption box): the narration says what the stage shows. Set down when the answer says to.
      speaker: 'narrator', shake: true, hold: 'leakbox',
      text: 'At your next stop you lift the box you need off the shelf. It\'s crushed at one corner, and liquid is dripping from underneath it. There\'s a sharp chemical smell.',
      choices: [
        {
          text: 'Set it down, hands off the wet side. Step back, keep it away from other packages, and report it.',
          grade: 'good', effects: { safety: 3 }, act: 'hold', arg: null,
          feedback: 'Exactly. You don\'t know what that liquid is. Distance, separation and reporting keep you — and everyone downstream — safe.',
          next: 'n2'
        },
        {
          text: 'Open it right here, so you can tell dispatch exactly what\'s leaking and how bad it is.',
          grade: 'bad', effects: { safety: -3 }, critical: true,
          feedback: 'Unknown liquids can be hazardous. Never open, sniff, or handle a leaking package with bare hands.',
          lesson: 'Never open, sniff or handle a leaking package — isolate it and report it.',
          next: 'n1_bad'
        },
        {
          text: 'Wipe it dry with a rag, turn the wet side to the back, and deliver it.',
          grade: 'bad', effects: { safety: -3, service: -2 }, critical: true,
          feedback: 'Hiding damage puts the customer at risk and destroys trust. Leaking packages don\'t get delivered.',
          lesson: 'Never hide damage or deliver a leaking package.',
          next: 'n1_bad'
        }
      ]
    },
    n1_bad: {
      speaker: 'narrator', shake: true, set: { exposed: true }, hold: null,
      text: 'The liquid stings your hand. You rinse it off with water from your bottle — lucky it\'s mild. That still goes in an exposure report, and you\'ll be watching that skin all afternoon. You set the box aside.',
      next: 'n2'
    },
    n2: {
      speaker: 'bennett', show: 'bennett',
      text: 'Afternoon! Is that my cleaning supplies order? I\'ve been waiting all week!',
      choices: [
        {
          text: '"I\'m sorry — it was damaged in transit and it\'s leaking, so I can\'t deliver it. It\'s been reported."',
          grade: 'good', effects: { service: 3, safety: 1, mood: -1 },
          feedback: 'Honest, specific and calm. He\'s disappointed — that\'s normal — but he knows what happened and what\'s next.',
          next: 'n3_honest'
        },
        {
          text: '"Nope, not today — it\'s not ready to go out. You\'ll get an update on it."',
          grade: 'bad', effects: { service: -2, mood: -2 },
          feedback: 'Vague answers create suspicion. Customers handle bad news far better than mystery.',
          next: 'n3_vague'
        },
        {
          text: '"It\'s here, but it got a little wet on the truck. Want it anyway? You can check what survived inside."',
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
          text: '"Let me explain properly: it arrived damaged and leaking, so I can\'t deliver it. It\'s reported."',
          grade: 'good', effects: { service: 2, mood: 1 },
          feedback: 'Good recovery. Clear, honest information turns suspicion into understanding.',
          next: 'n3_honest'
        },
        {
          text: '"You\'ll have to call customer service about it — they\'re the ones who can see the whole file and sort it out."',
          grade: 'bad', effects: { service: -2, mood: -1 },
          feedback: 'Support may be part of the answer, but deflecting without explaining leaves the customer angry and confused.',
          next: 'end_deflect_pick'
        }
      ]
    },
    n3_honest: {
      speaker: 'bennett', mood: 'annoyed',
      text: 'Damaged? Ugh. Can\'t I just take the bottles that aren\'t broken?',
      choices: [
        {
          text: '"I can\'t open or split it, but a claim gets you a replacement or refund."',
          grade: 'good', effects: { service: 2, safety: 1, mood: 1 },
          feedback: 'You held the safety line and pointed to a real solution. Empathy plus boundaries.',
          next: 'n4'
        },
        {
          text: '"Sure, let\'s open it up carefully and see what survived — no point sending good bottles back."',
          grade: 'bad', effects: { safety: -3 }, critical: true,
          feedback: 'Opening a leaking package exposes both of you to whatever is inside. Damaged packages stay sealed and go through the exception process.',
          next: 'n3_bad'
        }
      ]
    },
    n3_bad: {
      speaker: 'narrator', shake: true,
      text: 'Liquid drips across Mr. Bennett\'s hands and driveway. He\'s okay after rinsing off — but he\'s upset, and now there\'s an incident report with your name on it.',
      next: 'end_bad'
    },
    n4: {
      speaker: 'bennett', effects: { mood: 1 },
      text: 'Okay. Honestly, thanks for being straight with me instead of making something up.',
      choices: [
        {
          text: 'Photograph the damage, write it up, and record the delivery exception so the claim can start.',
          grade: 'good', effects: { safety: 1, service: 2 },
          feedback: 'Accurate records are how the customer gets a replacement fast — and how the damage gets investigated.',
          next: 'end_pick'
        },
        {
          text: 'Skip the paperwork: it was already reported once, and a second report just duplicates it.',
          grade: 'ok', effects: { service: -1 },
          feedback: 'Incomplete records slow down the customer\'s claim. Documenting the exception is part of the job.',
          next: 'end_ok_pick'
        }
      ]
    },
    end_pick: { if: '!exposed', then: 'end_great', else: 'end_exposed' },
    // skipped paperwork or a vague answer after an exposure is not "handled well" (DIALOGUE-12)
    end_ok_pick: { if: '!exposed', then: 'end_ok', else: 'end_exposed_thin' },
    end_deflect_pick: { if: '!exposed', then: 'end_deflect', else: 'end_exposed_thin' },
    end_exposed_thin: {
      type: 'end', outcome: 'bad', title: 'Exposed, and Half Done',
      text: 'The leaking contents got on your skin, and the stop after it was left half done. An exposure needs its report and the customer needs a plain explanation: hands off, isolate it, report it, and say what happened.'
    },
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
  setting: 'road',                  // the driving decisions are taken on the road, from the cab; the stop comes at n4
  // at the stop: the yard under water and the padlocked back gate the note talks about
  props: [
    { type: 'puddle', x: 760, art: { w: 260 }, depth: -4, setting: 'storm' },
    { type: 'puddle', x: 1010, art: { w: 200 }, depth: -4, setting: 'storm' },
    { type: 'gate', x: 1170, depth: -7, setting: 'storm' }
  ],
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
          text: 'Slow down, lights on, leave more space, and look for a safe place to pull off.',
          grade: 'good', effects: { safety: 3 },
          feedback: 'Speed down, visibility up, space cushion bigger. Pulling off safely is always an option.',
          next: 'n2'
        },
        {
          text: 'Speed up a little to finish the route before the worst of it arrives.',
          grade: 'bad', effects: { safety: -3 },
          feedback: 'Wet roads mean longer stopping distances and a higher chance of hydroplaning. Rushing is exactly backwards.',
          lesson: 'In heavy rain, slow down and increase following distance — never speed up to "beat" the storm.',
          next: 'n2'
        },
        {
          text: 'Stop right where you are in the travel lane, hazards on, until you can see the road again.',
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
          text: 'Turn around and find another route.',
          grade: 'good', effects: { safety: 3 },
          feedback: 'Turn around, don\'t drown. You can\'t see how deep the water is or whether the road underneath has washed away.',
          next: 'n2b'
        },
        {
          text: 'It looks shallow, and the truck sits high. Go for it.',
          grade: 'bad', effects: { safety: -4 },
          feedback: 'Six inches of moving water can stall you, a foot can float many vehicles, and you can\'t see road damage below. No package is worth that.',
          lesson: 'Never drive through flooded roads — turn around, don\'t drown.',
          next: 'n2_flood'
        }
      ]
    },
    n2_flood: {
      speaker: 'narrator', shake: true, sfx: 'splash', set: { flooded: true },
      text: 'Water surges against the doors and the engine sputters and dies. You climb out into thigh-deep water and wade back to high ground. The truck is going nowhere until a tow gets here, and everything on board is soaked.',
      next: 'n3f'
    },
    n3f: {
      speaker: 'dispatch', show: 'dispatch', sfx: 'phone',
      text: 'Dispatch checking in on drivers in the storm zone. Everyone okay out there?',
      choices: [
        {
          text: '"I drove into the Pine Street underpass and stalled. I\'m out, on high ground, and safe. I need a tow."',
          grade: 'good', effects: { safety: 1, service: 1 },
          feedback: 'The whole truth, straight away: where you are, that you are safe, and what you need. Dispatch can send help and warn everyone else off that road.',
          next: 'n3f_reply'
        },
        {
          text: '"All good here — just running a bit behind with the weather. I\'ll call if anything changes."',
          grade: 'bad', effects: { service: -3 }, critical: true,
          feedback: 'That is a false report. Dispatch needs to know a truck is stranded in floodwater — for your safety, the tow, and every driver heading for that underpass.',
          lesson: 'Report incidents honestly and at once, especially when you made the mistake.',
          next: 'n3f_lie'
        }
      ]
    },
    n3f_reply: {
      speaker: 'dispatch',
      text: 'Stay on high ground and out of the water. A tow is on the way, and your stops are going to another driver.',
      next: 'end_towed'
    },
    n3f_lie: {
      speaker: 'narrator',
      text: 'An hour later the tow company calls dispatch about a delivery truck abandoned in the Pine Street underpass, and your phone rings again.',
      next: 'end_towed_lie'
    },
    n2b: {
      speaker: 'narrator', hide: true,
      text: 'You turn around and pull into a gas station on the next block to let the worst of it pass. Engine running, parked. Your phone rings.',
      next: 'n3'
    },
    n3: {
      speaker: 'dispatch', show: 'dispatch', sfx: 'phone',
      text: 'Dispatch checking in on drivers in the storm zone. Everyone okay out there?',
      choices: [
        {
          text: '"I\'m parked and safe. Heads up: the Pine Street underpass is flooded — I turned back from it."',
          grade: 'good', effects: { safety: 1, service: 1 },
          feedback: 'Checking in once you\'re safely stopped lets dispatch warn other drivers. Your report may keep a coworker out of that water.',
          next: 'n4'
        },
        {
          text: 'Let it ring. You\'re parked, but you\'ll catch up with dispatch once the storm has passed.',
          grade: 'ok', effects: { service: -1 },
          feedback: 'You were parked, so this was the moment: checking in lets dispatch warn other drivers off the flooded underpass.',
          next: 'n4'
        }
      ]
    },
    n4: {
      speaker: 'narrator', hide: true, setting: 'storm', sfx: 'thunder',
      text: 'You reach the stop. Delivery note: "If not home, leave at back gate. Watch the step!" The back gate is padlocked, the yard is ankle-deep in water, and lightning is still close.',
      choices: [
        {
          text: 'Wait in the truck until the lightning moves off, then reassess.',
          grade: 'good', effects: { safety: 2 },
          feedback: 'When thunder roars, stay indoors — and your truck is safer than an open, flooded yard. A few minutes costs nothing.',
          next: 'n5'
        },
        {
          text: 'Climb over the gate. The note said "back gate," and the customer knows their own yard.',
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
          text: 'Don\'t guess: contact the customer to clarify, or leave a notice as an attempt.',
          grade: 'good', effects: { service: 2, safety: 1 },
          feedback: 'Unclear instructions + bad weather = clarify, don\'t improvise. The customer gets the outcome they actually want.',
          next: 'n6'
        },
        {
          text: 'Wedge it against the outside of the locked gate, in the water: that\'s as close to "back gate" as it gets.',
          grade: 'ok', effects: { service: -2 },
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
          text: '"Of course. I\'ll leave a notice for tomorrow — and you might add the flooding to your delivery notes."',
          grade: 'good', effects: { service: 2, mood: 1 },
          feedback: 'You solved today safely and improved every future delivery to this address.',
          next: 'end_pick'
        },
        {
          text: '"Okay, tomorrow it is. Bye!" and head back to the truck before the rain picks up again.',
          grade: 'ok', effects: {},
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
      text: 'You reported it honestly, but the truck is in the underpass waiting for a tow, and the freight on board is water damaged. Six inches of moving water can stall you and a foot can float many vehicles: turn around, every time.'
    },
    end_towed_lie: {
      type: 'end', outcome: 'bad', title: 'Stranded, and Not Reported',
      text: 'The truck is in the underpass, the freight is water damaged, and dispatch heard it from the tow company instead of from you. Turn around at flooded roads, and when something goes wrong, report it straight away.'
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
