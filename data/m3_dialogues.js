/*
 * Module 3 · Customer Interaction — branching dialogues.
 *
 * Node types:
 *   line:   { speaker, text, next, mood?, show?, hide?, sfx?, shake?, setting?, effects?, hold?, walk?, prop?, stage? }
 *   choice: { speaker, text, choices: [ { text, grade: 'good'|'ok'|'bad', effects: {service, safety, efficiency, mood},
 *                                        feedback, lesson?, next } ], timer?, timeout? }
 *   end:    { type: 'end', outcome: 'good'|'mixed'|'bad', title, text, notes? }   (an ending scores nothing itself:
 *           the outcome is the answers that led to it). notes: [{ if, text }] adds a sentence for each mistake that
 *           was actually made, so an ending names those and no others.
 *   branch: { if, then, else } — every ending reachable after a mistake's flag must read it (bitten, exposed,
 *           slipped, guessed, flooded…): a "textbook" ending after one is a bug.
 * speaker: 'narrator' | 'courier' | a key in cast.  mood (number) in effects shifts the mood of the line's speaker
 *          (or of effects.moodTarget).
 * cast:    { name, color, moodStart, portrait, remote?, enter?, spot?, ground? }  remote: true for someone on the
 *          phone or radio — `show` then puts the call on the courier's handheld instead of walking a character on,
 *          and `hide` hangs up. enter: 'left' | 'right' walks them in from that edge; spot: their screen x; ground:
 *          true keeps them on the path or lawn instead of the porch.
 * Staging on a line (and act/arg on an answer): hold: 'box' | null (what the courier carries); walk: { who, x, face };
 *          prop: { id, type, x, art } appears, unprop: id goes; stage: [ { walk }, { hold }, { prop }, { wait: ms },
 *          { hazards: true } ] plays those in turn. props (top level): [{ type, x, porch, setting }] placed with a setting.
 * houseNumber / mailboxName (top level): the address shown on the house and its mailbox (default 214).
 * setting on a node: a setting name, or { name, number, mailbox } to move to another address mid-conversation.
 * Stars are computed from points earned vs. the best possible path — no thresholds to maintain.
 */
window.OTR_DATA = window.OTR_DATA || {};
OTR_DATA.dialogues = OTR_DATA.dialogues || {};

/* ------------------------------------------------------------------------------------------------ */
OTR_DATA.dialogues.m3_missing = {
  title: 'Where\'s My Package?!',
  setting: 'street',
  moodMeter: 'dana',
  cast: {
    dana: {
      name: 'Dana', color: 0xC8243B, moodStart: -2,
      portrait: { kind: 'person', skin: 0xF1C7A5, hair: 0x8A4B2A, hairStyle: 'long', shirt: 0x2F8F83, earrings: 0xFFC83D }
    }
  },
  keyLessons: [
    'Acknowledge the frustration first — empathy lowers the temperature before you solve anything.',
    'Gather facts (delivery details, notes, likely safe spots) before guessing what happened.',
    'If a package truly can\'t be located, point the customer to the official support/claims process.'
  ],
  start: 'n0',
  nodes: {
    n0: {
      speaker: 'narrator', hold: 'box',
      text: 'Maple Avenue, 2:40 PM. You\'re pulling a box from the truck when a resident marches over, phone held up like evidence.',
      next: 'n1'
    },
    n1: {
      speaker: 'dana', show: 'dana',
      text: 'Hey! YOU! Tracking says my package was DELIVERED yesterday. There\'s nothing on my porch. Did you people just throw it in a bush?!',
      choices: [
        {
          text: '"I\'m sorry — that\'s really frustrating. Let\'s figure it out together."',
          grade: 'good', effects: { service: 3, mood: 2 },
          feedback: 'Acknowledging the frustration (without arguing or admitting fault) is the fastest way to lower the temperature. You showed you care and offered to help.',
          next: 'n2_calm'
        },
        {
          text: '"Wasn\'t me — I don\'t even run this route on Mondays. You\'d have to take it up with whoever did."',
          grade: 'bad', effects: { service: -2, mood: -1 },
          feedback: 'Even if it\'s true, deflecting sounds like "not my problem." The customer doesn\'t care whose route it was — they want help.',
          lesson: 'Lead with empathy, not with who\'s to blame.',
          next: 'n2_defensive'
        },
        {
          text: '"Ma\'am, I need you to calm down before we can talk about this."',
          grade: 'bad', effects: { service: -2, mood: -2 },
          feedback: 'Telling an upset person to "calm down" almost always does the opposite. Name the feeling instead: "I can see this is really frustrating."',
          lesson: 'Never tell an upset customer to "calm down" — acknowledge how they feel instead.',
          next: 'n2_escalate'
        }
      ]
    },
    n2_defensive: {
      speaker: 'dana', text: 'Oh, great. So nobody\'s responsible. Fantastic. Very helpful.',
      next: 'n3'
    },
    n2_escalate: {
      speaker: 'dana', shake: true,
      text: 'CALM DOWN?! I paid for that package! It\'s my daughter\'s birthday present and it\'s GONE!',
      choices: [
        {
          text: '"You\'re right, that came out wrong. I\'m sorry — let me help you look into it."',
          grade: 'good', effects: { service: 2, mood: 2 },
          feedback: 'Owning a misstep and resetting is a pro move. It\'s never too late to de-escalate.',
          next: 'n3'
        },
        {
          text: '"I\'m here to help, but I don\'t have to stand here and be yelled at. If this keeps up, I\'m leaving."',
          grade: 'bad', effects: { service: -2, mood: -1 },
          feedback: 'Boundaries matter if someone is threatening or abusive — then it\'s right to disengage and report it. But a frustrated customer venting isn\'t there yet. Try de-escalating first.',
          lesson: 'De-escalate first. Disengage (and report) only if you feel threatened or unsafe.',
          next: 'end_walkaway'
        }
      ]
    },
    n2_calm: {
      speaker: 'dana', mood: 'annoyed',
      text: '…Okay. Sorry for yelling. It\'s a birthday present for my daughter. Tracking says "delivered" at 4:12 yesterday.',
      next: 'n3'
    },
    n3: {
      speaker: 'narrator',
      text: 'What do you do next?',
      choices: [
        {
          text: '"Can I see the tracking details? There\'s often a note saying where it was left."',
          grade: 'good', effects: { service: 2, efficiency: 2, mood: 1 },
          feedback: 'Facts first. Delivery details often show the exact spot — side door, garage, back porch — and that solves a lot of "missing" packages.',
          next: 'n4_check'
        },
        {
          text: '"Honestly? Probably porch pirates. They\'re everywhere around here — I\'d file a police report."',
          grade: 'bad', effects: { service: -2, mood: -2 },
          feedback: 'Speculating about theft alarms the customer and may not even be true. Stick to what you can actually verify.',
          lesson: 'Don\'t speculate (e.g. "it was probably stolen") — stick to what you can verify.',
          next: 'n4_speculate'
        },
        {
          text: '"Here — just take this one I\'m holding. It\'ll even out."',
          grade: 'bad', effects: { service: -1, efficiency: -2 },
          feedback: 'Never hand over a package addressed to someone else. Now TWO customers have a missing package — plus a privacy problem.',
          lesson: 'Never give a customer someone else\'s package to smooth things over.',
          next: 'n4_wrongbox'
        }
      ]
    },
    n4_wrongbox: {
      speaker: 'dana', mood: 'shocked',
      text: 'That\'s… not even my name on it. Who\'s "R. Castellano"? Put that back! Can we just look at MY tracking?',
      next: 'n4_check'
    },
    n4_speculate: {
      speaker: 'dana', mood: 'worried',
      text: 'STOLEN? So it\'s just gone?! What am I supposed to tell my kid?',
      choices: [
        {
          text: '"Sorry, I shouldn\'t have guessed. Let\'s check the delivery details first — it may be close by."',
          grade: 'good', effects: { service: 2, mood: 1 },
          feedback: 'Good recovery. Walking back a guess and returning to the facts rebuilds trust.',
          next: 'n4_check'
        },
        {
          text: '"You\'ll need to contact customer support to file a claim. Here\'s the number."',
          grade: 'ok', effects: {},
          feedback: 'The official support process IS the right path when a package can\'t be found — but you skipped a two-minute check that might have solved it on the spot.',
          next: 'end_claim'
        }
      ]
    },
    n4_check: {
      speaker: 'dana', mood: 'neutral', hold: null,       // the truck's box goes back on the truck
      text: 'It says… "Left at side door." We never use the side door. Nobody uses the side door.',
      choices: [
        {
          text: '"Mind if we take a quick look at the side door together? It\'s right around the corner."',
          grade: 'good', effects: { efficiency: 2, service: 1, mood: 1 },
          feedback: 'A 60-second look beats a week-long claim. You stayed on the problem until it was solved.',
          next: 'n5_found'
        },
        {
          text: '"Well, that\'s where it is, then — it\'ll be right there by the side door. Have a good one!"',
          grade: 'bad', effects: { service: -2, mood: -1 },
          feedback: 'Technically helpful, emotionally a door slam. Staying a moment longer would have closed the loop.',
          next: 'n5_brush'
        }
      ]
    },
    n5_found: {
      speaker: 'narrator',
      // round the side of the house and back with Dana's box
      stage: [{ walk: { who: 'courier', x: 1340, speed: 260 } }, { walk: { who: 'dana', x: 1340, speed: 260 } }, { wait: 500 }, { hold: 'box' },
        { walk: { who: 'courier', x: 300, face: 1, speed: 260 } }, { walk: { who: 'dana', x: 470, face: -1, speed: 260 } }],
      text: 'You walk around the house together. Behind a recycling bin by the side door: a box with Dana\'s name on it.',
      next: 'n6'
    },
    n6: {
      speaker: 'dana', effects: { mood: 3 },
      text: 'Oh my gosh. It\'s HERE. I never check that door! I feel ridiculous.',
      choices: [
        {
          text: '"Glad we found it! You can add delivery instructions to your account so drivers use the front porch."',
          grade: 'good', effects: { service: 2, efficiency: 1 },
          feedback: 'You made the customer feel okay about it AND prevented it happening again. That\'s service.',
          next: 'end_great'
        },
        {
          text: '"See? Told you we didn\'t lose it."',
          grade: 'bad', effects: { service: -2, mood: -2 },
          feedback: 'Being right isn\'t the goal. "Told you so" turns a win into a bad memory for the customer.',
          lesson: 'Customers remember how you made them feel — skip the "told you so."',
          next: 'end_sour'
        }
      ]
    },
    n5_brush: {
      speaker: 'narrator', hide: 'dana',
      text: 'Dana storms off. That evening she finds the box by the side door… and leaves a one-star review about "the rude driver."',
      next: 'end_mixed'
    },
    end_great: {
      type: 'end', outcome: 'good', title: 'Mystery Solved',
      text: 'Package found, customer smiling, and delivery instructions updated. You turned an angry encounter into a thank-you.'
    },
    end_sour: {
      type: 'end', outcome: 'mixed', title: 'Found It… Barely a Win',
      text: 'The package turned up, but the "told you so" stung. Dana will remember that part longer than the birthday gift.'
    },
    end_mixed: {
      type: 'end', outcome: 'mixed', title: 'Resolved Without You',
      text: 'The package was right where the delivery note said — but a rushed goodbye left the customer feeling brushed off.'
    },
    end_claim: {
      type: 'end', outcome: 'mixed', title: 'Handed Off',
      text: 'Dana calls support and opens an inquiry. The package was by the side door the whole time — a quick look could have saved everyone a week.'
    },
    end_walkaway: {
      type: 'end', outcome: 'bad', title: 'Walked Away',
      text: 'Dana files a complaint, and the package is still "missing." Most frustrated customers can be calmed down — de-escalate first, and disengage only if you feel unsafe.'
    }
  }
};

/* ------------------------------------------------------------------------------------------------ */
OTR_DATA.dialogues.m3_signature = {
  title: 'Signature Required',
  setting: 'porch',
  props: [{ type: 'planter', x: 560, porch: true }],     // the "big planter" Priya asks about
  moodMeter: 'priya',
  cast: {
    alvarez: {
      name: 'Mr. Alvarez', color: 0x2F6B5A, moodStart: 1, enter: 'left', spot: 110, ground: true,
      portrait: { kind: 'person', skin: 0xC99A77, hair: 0xD9D9D9, hairStyle: 'buzz', shirt: 0xB5563C, glasses: 0x333333, mustache: true, collar: true }
    },
    priya: {
      name: 'Priya (on the phone)', color: OTR_DATA.theme.primaryLight, moodStart: -1, remote: true,
      portrait: { kind: 'person', skin: 0xB07D58, hair: 0x1C1414, hairStyle: 'bun', shirt: 0x3D5A99, earrings: 0xE8E8F0, collar: true }
    }
  },
  keyLessons: [
    'A signature-required package needs a signature from an eligible recipient — never leave it unattended or sign for it yourself.',
    'A phone call can\'t replace a required signature — you can\'t verify who\'s calling.',
    'Always leave a delivery notice with clear next steps (redelivery, pickup options).'
  ],
  start: 'n0',
  nodes: {
    n0: {
      speaker: 'narrator', hold: 'box',
      text: 'Stop 14. A small box with a bright sticker: SIGNATURE REQUIRED — RECIPIENT ONLY. You knock. Silence.',
      next: 'n1'
    },
    n1: {
      speaker: 'narrator',
      text: 'Nobody answers. What now?',
      choices: [
        {
          text: 'Knock again, ring the doorbell, and give it a reasonable moment.',
          grade: 'good', effects: { service: 2 },
          feedback: 'A proper attempt: maybe they\'re in the backyard or on a call. It\'s the minimum a customer expects.',
          next: 'n2'
        },
        {
          text: 'Leave it tucked in against the door, out of sight from the street. They\'ll find it when they get home.',
          grade: 'bad', effects: { safety: -3, service: -1 }, critical: true,
          feedback: 'Signature-required means the shipper needs proof a person received it — often because it\'s valuable or sensitive. Leaving it unattended defeats the whole point.',
          lesson: 'Never leave a signature-required package unattended.',
          next: 'n1b'
        },
        {
          text: 'Scribble the signature yourself to save everyone a trip.',
          grade: 'bad', effects: { safety: -3, service: -2 }, critical: true,
          feedback: 'Signing on a customer\'s behalf falsifies a delivery record. It\'s a serious integrity problem, not a shortcut.',
          lesson: 'Never sign on a customer\'s behalf.',
          next: 'n1c'
        }
      ]
    },
    n1b: {
      speaker: 'narrator', set: { slipped: true },
      text: 'You get as far as setting it down before the bright SIGNATURE REQUIRED sticker catches your eye. Left unattended, it is a failed delivery with your name on it. You pick it back up and ring the bell properly.',
      next: 'n2'
    },
    n1c: {
      speaker: 'narrator', set: { slipped: true, forged: true },
      text: 'The stylus is on the screen before you stop. A signature that isn\'t the customer\'s is a falsified delivery record, and your name would be on it. You clear it and ring the bell properly.',
      next: 'n2'
    },
    n2: {
      speaker: 'alvarez', show: 'alvarez',
      text: 'Hola! They\'re both at work until six. I can sign for it — I take in their stuff all the time!',
      choices: [
        {
          text: '"That\'s kind of you! But this one needs the recipient\'s own signature, so I can\'t leave it with a neighbor."',
          grade: 'good', effects: { safety: 2, service: 2, mood: 1 },
          feedback: 'Right call, delivered warmly. You followed the requirement AND kept a friendly neighbor on your side.',
          next: 'n3_call'
        },
        {
          text: '"That would really help, thanks. You know them, and it saves them a trip to the pickup point. Sign right here."',
          grade: 'bad', effects: { safety: -3 },
          feedback: 'This label requires the recipient\'s signature. Handing it to a neighbor breaks the shipper\'s requirement — good intentions don\'t change that.',
          lesson: 'Follow the signature requirement on the label — "recipient only" means no neighbor signatures.',
          next: 'n3_neighbor'
        },
        {
          text: '"Nope. Can\'t do that."',
          grade: 'ok', effects: { safety: 2, service: -1, mood: -2 },
          feedback: 'Correct decision, rough delivery. A one-sentence explanation keeps neighbors (and future customers) friendly.',
          next: 'n3_call'
        }
      ]
    },
    n3_neighbor: {
      speaker: 'narrator',
      text: 'Two days later the shipper opens an inquiry: the recipient says she never got it. Mr. Alvarez "doesn\'t remember" which box was which.',
      next: 'end_neighbor'
    },
    n3_call: {
      speaker: 'priya', show: 'priya', sfx: 'phone',
      text: 'Hi — I just got an alert that you tried to deliver? I\'m stuck at work. Can you just leave it behind the big planter? It\'s totally fine, I promise.',
      choices: [
        {
          text: '"I can\'t leave it without your signature, but I\'ll leave a notice with your options: redelivery, or pickup near you."',
          grade: 'good', effects: { safety: 2, service: 2, mood: 2 },
          feedback: 'Empathy + a clear "why" + options. The customer hears a path forward instead of just "no."',
          next: 'n4_good'
        },
        {
          text: '"Okay. You\'re the customer and you\'re giving me permission, so I\'ll note that you asked and put it behind the planter."',
          grade: 'bad', effects: { safety: -3 },
          feedback: 'A verbal OK doesn\'t replace a required signature — and you can\'t verify who\'s actually on the phone.',
          lesson: 'A phone call can\'t replace a required signature.',
          next: 'n4_left'
        },
        {
          text: '"Rules are rules. Bye."',
          grade: 'ok', effects: { safety: 1, service: -2, mood: -2 },
          feedback: 'You protected the package, but "rules are rules" with no alternatives feels like a wall.',
          next: 'n4_curt'
        }
      ]
    },
    n4_good: {
      speaker: 'priya',
      text: 'Oh — pickup actually works better. There\'s a location right by my office. Thanks for explaining!',
      choices: [
        {
          text: 'Fill out the delivery notice clearly and leave it where it\'s easy to see from the door.',
          grade: 'good', effects: { service: 2, safety: 1 },
          feedback: 'The notice is the paper trail — it helps Priya and anyone else in the household know what happened.',
          act: 'hide', arg: 'priya', next: 'end_great_pick'
        },
        {
          text: 'Skip the notice: she already knows it\'s coming back, and it saves a minute.',
          grade: 'ok', effects: { service: -1 },
          feedback: 'Always leave the notice. Other household members may not know, and it documents the attempt.',
          act: 'hide', arg: 'priya', next: 'end_ok_pick'
        }
      ]
    },
    n4_curt: {
      speaker: 'priya',
      text: 'Wow. Okay then.',
      next: 'n4_curt2'
    },
    n4_curt2: {
      speaker: 'narrator', hide: true,
      text: 'You leave a notice. The package is safe on your truck — but Priya\'s feedback survey is not going to be kind.',
      next: 'end_curt_pick'
    },
    n4_left: {
      speaker: 'narrator', hide: true, stage: [{ walk: { who: 'courier', x: 520 } }, { hold: null }, { walk: { who: 'courier', x: 300, face: 1 } }],
      text: 'You tuck it behind the planter. At 4:30 PM a passer-by notices the corner of a box poking out…',
      next: 'end_left'
    },
    // starting to leave the package, or to sign for it, is remembered whatever came after (DIALOGUE-23)
    end_great_pick: { if: 'slipped', then: 'end_slipped', else: 'end_great' },
    end_ok_pick: { if: 'slipped', then: 'end_slipped', else: 'end_ok' },
    end_curt_pick: { if: 'slipped', then: 'end_slipped', else: 'end_curt' },
    end_slipped: {
      type: 'end', outcome: 'mixed', title: 'Caught Just in Time',
      text: 'The rest went right, but you started to leave or sign for a recipient-only package before you caught yourself. That is a lost package or a falsified record with your name on it. The signature requirement is never a judgment call.'
    },
    end_great: {
      type: 'end', outcome: 'good', title: 'Secure & Satisfied',
      text: 'The package is safe, the requirement was honored, and the customer picked the option that works for her. Textbook.'
    },
    end_ok: {
      type: 'end', outcome: 'mixed', title: 'Safe, But No Paper Trail',
      text: 'You made the right calls, but skipping the notice leaves the household guessing. Documentation is part of the delivery.'
    },
    end_curt: {
      type: 'end', outcome: 'mixed', title: 'By the Book, Out of Touch',
      text: 'The package is secure — but customers remember tone. Explain the "why" and offer options.'
    },
    end_neighbor: {
      type: 'end', outcome: 'bad', title: 'Signature Dispute',
      text: 'A recipient-only package was signed by someone else, and now nobody can prove where it went. The signature requirement exists for exactly this.'
    },
    end_left: {
      type: 'end', outcome: 'bad', title: 'Gone Missing',
      text: 'The package disappears before Priya gets home. Without a signature there\'s no proof of delivery — and a costly claim.'
    }
  }
};

/* ------------------------------------------------------------------------------------------------ */
OTR_DATA.dialogues.m3_twostops = {
  title: 'Two Stops, Two Styles',
  setting: 'office',
  moodMeter: null,
  cast: {
    morgan: {
      name: 'Morgan (Reception)', color: 0x2B3A55, moodStart: 0,
      portrait: { kind: 'person', skin: 0x8D5B3E, hair: 0x241A14, hairStyle: 'curly', shirt: 0x5A6B8C, lanyard: OTR_DATA.theme.accent, collar: true }
    },
    biscuit: {
      name: 'Biscuit', color: 0xB5563C, moodStart: -2, spot: 720,     // on the lawn, clear of the porch railing
      portrait: { kind: 'dog', fur: 0xB8844E, patch: 0xF3E3CC, collar: 0x3DA5FF }
    },
    chen: {
      name: 'Mrs. Chen', color: 0x2F6B5A, moodStart: -1,
      portrait: { kind: 'person', skin: 0xEFCFAE, hair: 0x2A2A2A, hairStyle: 'short', shirt: 0xD96C8A, glasses: 0x467EBD }
    }
  },
  keyLessons: [
    'Business stops: be patient with busy staff, deliver to the designated receiving point, and follow building rules.',
    'Aggressive dog: don\'t run, stay calm, keep an object between you and the dog, and back away slowly.',
    'Never re-enter a yard with a loose dog — ask the owner to secure it, and note the hazard for future deliveries.'
  ],
  start: 'n0',
  nodes: {
    n0: {
      speaker: 'narrator', hold: 'stack',
      text: 'Stop 1 of 2: Brightline Design Studio, 11:50 AM. Three boxes for them, stacked in your arms. The lobby is buzzing and the receptionist is on a call.',
      next: 'n1'
    },
    n1: {
      speaker: 'morgan', show: 'morgan',
      text: '"— yes, I\'ll transfer you now, one moment please…" (Morgan holds up one finger at you.)',
      choices: [
        {
          text: 'Wait a few steps back with your scanner ready.',
          grade: 'good', effects: { service: 2, mood: 1 },
          feedback: 'Business customers are working. A few seconds of patience keeps you welcome at this stop every day.',
          next: 'n2'
        },
        {
          text: 'Stack the boxes on the desk and start scanning while Morgan is still talking.',
          grade: 'bad', effects: { service: -2, mood: -1 }, act: 'hold', arg: null,
          feedback: 'Dropping freight on someone\'s desk mid-call is disruptive. Wait for a pause, then ask where they want it.',
          lesson: 'At business stops, wait for staff to be ready — don\'t interrupt calls or pile freight on desks.',
          next: 'n2'
        },
        {
          text: 'Announce "DELIVERY!" loud enough for the whole lobby.',
          grade: 'bad', effects: { service: -2, mood: -2 },
          feedback: 'Volume isn\'t urgency. Loud announcements in a professional space reflect poorly on you and the company.',
          next: 'n2'
        }
      ]
    },
    n2: {
      speaker: 'morgan',
      text: 'Sorry about that! Mondays, right? What have you got for us?',
      choices: [
        {
          text: '"Three boxes for Brightline! Where would you like them?"',
          grade: 'good', effects: { service: 2, efficiency: 1, mood: 1 },
          feedback: 'Asking where they want freight respects their space and gets it to the right place first time.',
          next: 'n3'
        },
        {
          text: '"Sign here, please — I\'ve got three for Brightline and I\'m running a bit behind today."',
          grade: 'ok', effects: { efficiency: 1 },
          feedback: 'Efficient, but a little cold. A friendly line costs two seconds and builds a relationship with a daily stop.',
          next: 'n3'
        }
      ]
    },
    n3: {
      speaker: 'morgan',
      text: 'Mail room\'s just down the hall. Oh — one of these is for our CEO. Could you just walk it up to the fourth floor?',
      choices: [
        {
          text: '"I\'ll leave it at your receiving point, so it goes upstairs through your building\'s own process."',
          grade: 'good', effects: { service: 1, efficiency: 2, safety: 1 },
          feedback: 'Business deliveries go to the designated receiving point. It keeps you on schedule and respects building security rules.',
          next: 'n4'
        },
        {
          text: '"Sure! I\'ll take it up myself — the CEO\'s office is on my way, and it saves someone a trip."',
          grade: 'ok', effects: { service: 1, efficiency: -2 },
          feedback: 'Friendly, but roaming a secure building eats route time and may break visitor rules. Use the receiving point unless the building\'s process says otherwise.',
          lesson: 'Deliver to a business\'s designated receiving point and follow its building rules.',
          next: 'n4'
        }
      ]
    },
    n4: {
      speaker: 'narrator', setting: 'porch_dog', hide: true, hold: 'box',
      text: 'Stop 2 of 2: a house on Birch Lane. The front gate is open. You\'re halfway up the path when…',
      next: 'n5'
    },
    n5: {
      speaker: 'biscuit', show: 'biscuit', sfx: 'bark', shake: true,
      text: 'WOOF! WOOF WOOF WOOF! (A big dog charges around the corner, barking hard, hackles up.)',
      timer: 7,
      timeout: {
        grade: 'bad', effects: { safety: -1 },
        feedback: 'Freezing up happens! The plan: calm voice, don\'t run, keep the package between you and the dog, and back away slowly.',
        next: 'n5b'
      },
      choices: [
        {
          text: 'Stop. Stay calm, box between you and the dog, and back away slowly to the gate.',
          grade: 'good', effects: { safety: 3 },
          feedback: 'Exactly right. Running can trigger a chase. A calm posture and a barrier (package, scanner, clipboard) protect you while you retreat.',
          next: 'n6_calm'
        },
        {
          text: 'Turn and sprint for the truck!',
          grade: 'bad', effects: { safety: -3 },
          feedback: 'Running can trigger a dog\'s chase instinct. Stay calm, keep a barrier between you, and back away slowly.',
          lesson: 'Never run from an aggressive dog — stay calm, use a barrier, and back away slowly.',
          next: 'n6_chase'
        },
        {
          text: 'Crouch down low so you look smaller and less threatening, and let it sniff your hand.',
          grade: 'bad', effects: { safety: -2 },
          feedback: 'Never reach toward an unfamiliar barking dog — especially on its own turf. Crouching puts your face and hands in range.',
          next: 'n5b'
        }
      ]
    },
    n5b: {
      speaker: 'narrator', stage: [{ walk: { who: 'courier', x: 48, face: 1 } }],
      text: 'Biscuit stops a few feet short of you, still barking. Slowly, box in front, you ease back down the path and out through the gate.',
      next: 'n6_calm'
    },
    n6_chase: {
      speaker: 'narrator', shake: true, set: { dented: true }, stage: [{ walk: { who: 'courier', x: 48, speed: 380 } }, { walk: { who: 'biscuit', x: 200, speed: 380 } }, { walk: { who: 'biscuit', x: 720 } }],
      text: 'The dog chases you all the way back down the path. You get out of the gate and pull it shut, heart pounding — and the box took a corner hit when you stumbled.',
      next: 'n6_calm'
    },
    n6_calm: {
      // out through the gate; the dog stays on the lawn (a narration line: the dog's mood still goes to the dog)
      speaker: 'narrator', effects: { mood: 1, moodTarget: 'biscuit' }, stage: [{ walk: { who: 'courier', x: 48, face: 1 } }],
      text: '(You\'re back outside the gate with it shut behind you. The dog paces along the fence, still barking — but not charging any more.)',
      choices: [
        {
          text: 'Stay outside the gate at a safe distance and call out for the owner.',
          grade: 'good', effects: { safety: 1, service: 1 },
          feedback: 'You kept yourself safe and gave the owner a chance to help. Patience beats a bite.',
          next: 'n7_owner'
        },
        {
          text: 'Toss the package gently over the fence onto the porch, where it\'s out of the dog\'s reach.',
          grade: 'bad', effects: { service: -2 }, set: { tossed: true }, act: 'hold', arg: null,
          feedback: 'Throwing packages can damage the contents, and a box in the yard with a dog isn\'t a delivery. Wait for the owner or follow your process for an attempted delivery.',
          next: 'n7_owner'
        },
        {
          text: 'Try again. Dogs usually calm down once they see you\'re friendly.',
          grade: 'bad', effects: { safety: -3 }, set: { bitten: true }, critical: true,
          feedback: 'Don\'t re-enter a yard with an aggressive loose dog. Wait, or treat it as an attempted delivery and report the hazard.',
          lesson: 'Never re-enter a yard with a loose, aggressive dog.',
          next: 'n6_bite'
        }
      ]
    },
    n6_bite: {
      speaker: 'narrator', shake: true, sfx: 'bark', stage: [{ walk: { who: 'courier', x: 230 } }, { walk: { who: 'biscuit', x: 320, speed: 380 } }],
      text: 'Biscuit meets you inside the gate. Teeth catch your leg before the owner gets there. It isn\'t deep, but it needs cleaning, a report, and a call to your supervisor.',
      next: 'n7_owner'
    },
    n7_owner: {
      speaker: 'chen', show: 'chen',
      text: 'Biscuit! BISCUIT, come! Oh no, I\'m so sorry — are you okay? He must have gotten out of the backyard.',
      choices: [
        {
          text: '"I\'m okay. Could you bring him inside first?"',
          grade: 'good', effects: { safety: 2, service: 2, mood: 2 }, if: ['!tossed', '!bitten'],
          feedback: 'Polite and clear. Ask the owner to secure the dog before you approach — even friendly-looking dogs protect their home.',
          next: 'n8_check'
        },
        {
          text: '"I\'m okay. Could you put him inside? Your box is in the yard — I\'ll wait."',
          grade: 'good', effects: { safety: 2, service: 1, mood: 1 }, if: 'tossed',
          feedback: 'Owning the throw is better than pretending it didn\'t happen — but the package should never have gone over the fence.',
          next: 'n8_check'
        },
        {
          // after a bite the right answer is first aid and a report, not the delivery (DIALOGUE-9)
          text: '"He bit me. Please put him inside — I need to clean this and call my manager."',
          grade: 'good', effects: { safety: 2, service: 1, mood: 1 }, if: 'bitten',
          feedback: 'Right order: get the dog secured, clean the wound, and report it to your manager now, even a small one.',
          next: 'n7_bitten'
        },
        {
          text: '"No problem!" — and head up the path to the door while she gets hold of the dog.',
          grade: 'bad', effects: { safety: -2, service: 1 },
          feedback: 'Even with the owner present, ask them to secure the dog first. Owners can\'t always control a dog in protective mode.',
          next: 'n7_loose'
        },
        {
          text: '"Your dog is a menace! Keep it locked up!"',
          grade: 'bad', effects: { service: -3, mood: -2 },
          feedback: 'Your adrenaline is valid — but yelling at the customer won\'t help. Stay professional and report the hazard through the proper process.',
          next: 'n8_sour'
        }
      ]
    },
    n7_bitten: {
      speaker: 'chen', mood: 'sad',
      text: 'Oh no. Of course — I\'ll shut him in right now. There\'s a hose by the steps to rinse it, and I\'ll write down everything for your report.',
      next: 'end_bitten'
    },
    n7_loose: {
      speaker: 'narrator', shake: true, stage: [{ walk: { who: 'courier', x: 230 } }, { walk: { who: 'biscuit', x: 320, speed: 380 } }],
      text: 'You start up the path anyway. Biscuit barrels past her and plants himself between you and the door, barking into your shins.',
      next: 'n7_grab'
    },
    n7_grab: {
      speaker: 'chen',
      text: 'Biscuit! BISCUIT. Hold on — I\'ve got his collar. Sorry, sorry.',
      next: 'n8_check'
    },
    n8_check: { if: 'tossed', then: 'n8_tossed', else: 'n8' },
    n8: {
      speaker: 'chen', effects: { mood: 1 }, hide: 'biscuit',
      text: 'He\'s inside now. Thank you for being so patient — he\'s all bark. Mostly. Probably.',
      choices: [
        {
          text: '"Have a great day!" Then log the dog at this address through your normal process.',
          grade: 'good', effects: { safety: 1, service: 1 }, if: '!dented',
          feedback: 'The note protects the next courier who comes to this door. Safety is a team sport.',
          next: 'end_pick'
        },
        {
          text: '"The box took a knock when he chased me — could you check it now?" Then log the dog here.',
          grade: 'good', effects: { safety: 1, service: 1 }, if: 'dented',
          feedback: 'Say so when a box was damaged on your watch, and log the dog so the next courier is warned.',
          next: 'end_pick'
        },
        {
          text: 'Hand over the package and hurry on: you\'re behind, and she knows about her own dog.',
          grade: 'ok', effects: {},
          feedback: 'Delivery done — but noting the dog hazard would warn the next driver.',
          next: 'end_ok_pick'
        }
      ]
    },
    n8_tossed: {
      speaker: 'chen', hide: 'biscuit',
      text: 'He\'s inside. I found the box in the flowerbed — corner\'s split, but I think it\'s okay.',
      choices: [
        {
          text: '"Sorry about that. Open it while I\'m here, and I\'ll report any damage."',
          grade: 'good', effects: { service: 2, safety: 1 },
          feedback: 'Honest, and it gives the customer a route to a claim. The dog note protects the next courier.',
          next: 'end_honest'
        },
        {
          text: '"Should be fine — they\'re built for worse than that!" and head back to the truck.',
          grade: 'bad', effects: { service: -2 },
          feedback: 'You damaged it. Walking away leaves the customer to discover the problem alone.',
          lesson: 'If a package is damaged in your hands, say so and record it.',
          next: 'end_brushed'
        }
      ]
    },
    // a bite or a box dented in the chase decides the ending, whatever was said afterwards (DIALOGUE-9)
    end_pick: { if: 'bitten', then: 'end_bitten', else: 'end_pick_d' },
    end_pick_d: { if: 'dented', then: 'end_rough', else: 'end_great' },
    end_ok_pick: { if: 'bitten', then: 'end_bitten', else: 'end_ok_pick_d' },
    end_ok_pick_d: { if: 'dented', then: 'end_rough', else: 'end_ok' },
    end_sour_pick: { if: 'bitten', then: 'end_bitten', else: 'end_sour_pick_d' },
    end_sour_pick_d: { if: 'dented', then: 'end_rough', else: 'end_sour' },
    n8_sour: {
      speaker: 'chen', mood: 'angry',
      text: 'Excuse me?! I apologized! Just give me the box.',
      next: 'end_sour_pick'
    },
    end_great: {
      type: 'end', outcome: 'good', title: 'Two Stops, Nailed',
      text: 'Professional at the office, calm at the fence, courteous at the door — and the next driver knows about Biscuit.'
    },
    end_rough: {
      type: 'end', outcome: 'mixed', title: 'Chased Off the Porch',
      text: 'The package got delivered, but running turned a barking dog into a chase, and the box paid for it. Stop, stay calm, box in front, and back away slowly.'
    },
    end_bitten: {
      type: 'end', outcome: 'bad', title: 'Bitten',
      text: 'Going back into the yard with a loose dog got you bitten. First aid and a report to your manager were the right next steps, but the lesson is the one before them: stay outside the gate until the owner has the dog.'
    },
    end_honest: {
      type: 'end', outcome: 'mixed', title: 'Honest Recovery',
      text: 'You owned the throw and had the box checked in front of the customer. Good recovery, but a package never goes over a fence: wait outside the gate for the owner.'
    },
    end_brushed: {
      type: 'end', outcome: 'bad', title: 'Left to Chance',
      text: 'The box went over the fence, landed in the flowerbed, and you left without checking it. A thrown package is a damage claim waiting to happen.'
    },
    end_ok: {
      type: 'end', outcome: 'mixed', title: 'Delivered, Not Documented',
      text: 'Both deliveries done safely. Noting the dog hazard would have protected the next driver on this route.'
    },
    end_sour: {
      type: 'end', outcome: 'mixed', title: 'Rattled',
      text: 'You stayed safe, but the confrontation soured a customer who was trying to help. Take a breath, stay professional, and report hazards the right way.'
    }
  }
};
