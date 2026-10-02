/*
 * Module 8 · After a Fender-Bender — uses the dialogue engine (see data/m3_dialogues.js for the node format).
 *
 * A low-speed backing collision at a residential stop. The teaching points are the ones that decide
 * how the next hour goes: stop and secure the scene, check for injuries first, report it before you
 * do anything else, never admit fault or settle in cash, exchange the right information, document it,
 * and tell the truth on the report — including the part where you were backing.
 * Based on general, publicly available guidance for commercial drivers after a collision.
 *
 * Every mistake that matters sets a flag, and the endings read them all: the good ending only when none is set,
 * and the others name the mistakes that were actually made (notes), no more and no fewer.
 */
window.OTR_DATA = window.OTR_DATA || {};
OTR_DATA.dialogues = OTR_DATA.dialogues || {};

// The report is written the same way whatever happened before it (n10 has two openings).
const M8_REPORT_CHOICES = [
  {
    text: 'Write it plainly: backing out of the driveway, mirrors only, no spotter, and hit a parked car.',
    grade: 'good', effects: { safety: 3, service: 1 },
    feedback: 'An honest report is what protects you. It is also the only version that survives being read next to the photographs and the witness.',
    next: 'end_pick'
  },
  {
    text: 'Write that the car was parked illegally across the driveway and the contact was unavoidable.',
    grade: 'bad', effects: { safety: -3, service: -2 }, critical: true,
    feedback: 'It reads as an excuse, and the witness statement does not match it. A shaded report is worse for you than the collision was.',
    lesson: 'Write the incident report honestly, including your own part in it. Inconsistent reports cost far more than the damage.',
    set: { shaded: true },
    next: 'end_pick'
  },
  {
    text: 'Keep it to two lines. The less said, the better — the photos and the witness can fill in the rest.',
    grade: 'ok', effects: { safety: -1 },
    feedback: 'A thin report means somebody else fills in the gaps later, from memory, without you there. Write it properly while it is fresh.',
    set: { thin: true },
    next: 'end_pick'
  }
];

OTR_DATA.dialogues.m8_incident = {
  title: 'After a Fender-Bender',
  setting: 'collision',             // the van by the driveway it backed out of, the parked sedan, its fender folded
  moodMeter: 'ray',
  cast: {
    ray: {
      name: 'Ray Delgado', color: 0xB5563C, moodStart: -1,
      portrait: { kind: 'person', skin: 0xC98D62, hair: 0x3A2A1E, hairStyle: 'short', shirt: 0x37639B, beard: true }
    },
    dispatch: {
      name: 'Dispatch', color: 0x4D148C, moodStart: 0, remote: true,
      portrait: { kind: 'person', skin: 0x9C6B4A, hair: 0x1C1414, hairStyle: 'ponytail', shirt: 0x4D148C, uniform: true }
    },
    neighbor: {
      name: 'Mrs. Whitfield', color: 0x2E7D5B, moodStart: 1,
      portrait: { kind: 'person', skin: 0xE8C9A8, hair: 0xC9C4CE, hairStyle: 'bun', shirt: 0x7FAF8A, glasses: 0x333333 }
    }
  },
  keyLessons: [
    'Stop, secure the scene and check for injuries before anything else — people first, packages never.',
    'Report every collision to dispatch immediately, however small. A cash settlement on the curb becomes your problem later.',
    'Never admit fault at the scene. Exchange information, photograph everything and write down exactly what happened.'
  ],
  start: 'n0',
  nodes: {
    n0: {
      speaker: 'narrator', sfx: 'thud', shake: true,
      text: 'You were backing out of a narrow driveway, mirrors only, and the van stops with a crunch you feel in your teeth. A parked sedan. Its front fender is folded, and your bumper is scuffed.',
      next: 'n1'
    },
    n1: {
      speaker: 'narrator',
      text: 'The street is quiet. Nobody has come out yet. Your handheld says you are eleven minutes behind.',
      choices: [
        {
          text: 'Park properly: engine off, park brake, hazards on. Then get out and look at it.',
          grade: 'good', effects: { safety: 3, efficiency: 1 },
          feedback: 'Secure the vehicle first. A van that rolls while you are inspecting the damage turns a scuff into a disaster.',
          next: 'n2'
        },
        {
          text: 'Pull forward out of the way first, so you are not blocking the street while you look.',
          grade: 'bad', effects: { safety: -2 }, critical: true,
          feedback: 'Moving before you have looked destroys the scene and can turn a minor incident into a hit-and-run allegation. Secure where you are unless you are in danger.',
          lesson: 'Do not move the vehicle after a collision until the scene is documented — unless staying put is genuinely unsafe.',
          set: { moved: true },
          next: 'n2'
        },
        {
          text: 'It is barely a scuff. Finish the stop and look at it at the end of the route.',
          grade: 'bad', effects: { safety: -4, service: -2 }, critical: true,
          feedback: 'Leaving the scene of a collision is the one mistake you cannot walk back — it is a criminal matter, not a paperwork matter.',
          lesson: 'Leaving the scene of any collision, however small, is the worst possible choice. Stop every time.',
          set: { left: true, moved: true },
          next: 'n1_left'
        }
      ]
    },
    n1_left: {
      speaker: 'narrator',
      text: 'You get three houses down before the size of it lands on you. There is a camera doorbell on every porch on this street, and your van has a number on the side three feet high. You stop, park and walk back.',
      next: 'n2'
    },
    n2: {
      speaker: 'narrator', stage: [{ hazards: true }],
      text: 'Hazards ticking. Looking at the sedan properly now: the fender is creased into the tire, and there is somebody in the driver\'s seat, moving.',
      choices: [
        {
          text: 'Check on them first: are they hurt, do they need an ambulance?',
          grade: 'good', effects: { safety: 3, service: 2, mood: 2 },
          feedback: 'People before property, every single time. Injuries change what you do next, so you need to know within seconds.',
          next: 'n3'
        },
        {
          text: 'Photograph both vehicles right away, while everything is exactly where it landed.',
          grade: 'ok', effects: { mood: -1 },
          feedback: 'The photographs matter, but not before you know whether anyone is hurt. Check on the person, then take the pictures.',
          next: 'n3'
        },
        {
          text: 'Call dispatch and describe the damage.',
          grade: 'ok', effects: { mood: -1 },
          feedback: 'Reporting is right and it is coming — but dispatch will ask you first whether anybody is injured, and you do not know yet.',
          next: 'n2_call'
        }
      ]
    },
    // the early call: dispatch sends you to check on the driver first and call back (the report proper comes at n6)
    n2_call: {
      speaker: 'dispatch', show: 'dispatch',
      text: '"Is anybody hurt?" You don\'t know yet. "Then go and find out first, and call me back with the whole picture."',
      next: 'n3'
    },
    n3: {
      speaker: 'narrator', show: 'ray', hide: 'dispatch',      // (after the early call, the phone goes away)
      text: 'The driver\'s door opens and a man climbs out, holding his phone.',
      next: 'n3b'
    },
    n3b: {
      speaker: 'ray', mood: 'annoyed',
      text: '"I\'m fine. I\'m not fine, actually — look at my car. I was sitting in it. You backed straight into me."',
      next: 'n4'
    },
    n4: {
      speaker: 'narrator',
      text: 'He is standing, walking, talking. No sign of injury. He is angry, and he is right about the backing.',
      choices: [
        {
          text: '"I\'m sorry this happened. Are you hurt? Let\'s exchange information, and I\'ll report it."',
          grade: 'good', effects: { service: 3, safety: 2, mood: 2 },
          feedback: 'Sympathy without a confession. You can be decent to somebody without signing a statement of liability on the curb.',
          next: 'n5'
        },
        {
          text: '"That was completely my fault — I wasn\'t looking properly. I\'ll cover whatever it costs to fix."',
          grade: 'bad', effects: { service: 1, safety: -3, mood: 1 },
          feedback: 'Never admit liability at the scene. Fault is decided by people with the photographs, the statements and the policies — and your employer carries the claim, not your wallet.',
          lesson: 'Do not admit fault at the scene. State the facts, exchange details, and let the claim process decide liability.',
          set: { admitted: true },
          next: 'n5'
        },
        {
          text: '"It was parked over the driveway. Honestly, half of this is on you."',
          grade: 'bad', effects: { service: -3, mood: -3 },
          feedback: 'Arguing liability on the street achieves nothing except a witness statement about how you behaved. Stay factual and calm.',
          set: { argued: true },
          next: 'n5'
        }
      ]
    },
    n5: {
      speaker: 'ray', mood: 'neutral', effects: { mood: 1 },
      text: '"Look — I don\'t want this on my insurance. Two hundred in cash and we both drive away. Nobody needs to know."',
      choices: [
        {
          text: '"I can\'t. Every incident gets reported — that protects you too."',
          grade: 'good', effects: { safety: 3, service: 2 },
          feedback: 'Exactly right. A cash deal has no record, no repair guarantee and no protection when he finds a bent suspension arm next week — and for you it is a concealed collision.',
          next: 'n6'
        },
        {
          text: 'Take the deal. Two hundred is cheaper than the paperwork, and he is the one asking.',
          grade: 'bad', effects: { safety: -4, efficiency: -1 }, critical: true,
          feedback: 'Settling in cash and not reporting it is concealing a collision. It usually ends with a claim anyway, arriving weeks later with your name on it and no evidence.',
          lesson: 'Never settle a collision in cash. An unreported incident is a much bigger problem than a reported one.',
          set: { cash: true },
          next: 'n5_cash'
        },
        {
          text: '"Talk to my company about it," and turn back to the van.',
          grade: 'ok', effects: { safety: 1, service: -2, mood: -2 },
          feedback: 'The answer is right but the delivery leaves him with nothing. Tell him what happens next and give him the details he needs.',
          next: 'n6'
        }
      ]
    },
    n5_cash: {
      speaker: 'narrator',
      text: 'He counts the bills twice and folds them into his wallet. The sedan\'s fender is still folded into its tire.',
      next: 'n6'
    },
    n6: {
      speaker: 'narrator',
      text: 'A neighbor has come down her steps and is watching with her arms folded. Your handheld is in your hand and dispatch is one press away.',
      choices: [
        {
          text: 'Report it to dispatch now: where, both vehicles, nobody hurt.',
          grade: 'good', effects: { safety: 3, efficiency: 2 },
          feedback: 'Immediate reporting is the whole job here. Dispatch starts the claim, tells you whether police attendance is required and decides what happens to your route.',
          next: 'n7'
        },
        {
          text: 'Finish gathering details first, then call from the van when the street is quieter.',
          grade: 'ok', effects: { efficiency: 1, safety: -1 },
          feedback: 'Reasonable, but the call comes first — dispatch may want photographs of something you are about to let drive away.',
          next: 'n7'
        },
        {
          text: 'Send a text to your supervisor and carry on with the route.',
          grade: 'bad', effects: { safety: -3, efficiency: -1 },
          feedback: 'A text is not a report. Use the channel your company records, and stay on scene until you are told the scene is clear.',
          lesson: 'Report through the proper channel immediately and stay until dispatch tells you the scene is done.',
          set: { texted: true },
          next: 'n7_text'
        }
      ]
    },
    n7: {
      speaker: 'dispatch', show: 'dispatch',
      text: '"Understood. Nobody hurt — good. Get me photographs of both vehicles, wide and close, his details and plate, and any witness. Do not move the van until I call you back."',
      next: 'n8_check'
    },
    // a text is not a report: dispatch rings you instead of answering it
    n7_text: {
      speaker: 'dispatch', show: 'dispatch',
      text: '"Your supervisor forwarded your text. Collisions get called in, not texted, and you stay on scene. Nobody hurt? Then get me photographs of both vehicles, his details and plate, and any witness. Do not move the van."',
      next: 'n8_check'
    },
    n8_check: { if: 'moved', then: 'n8_moved', else: 'n8', hide: 'dispatch' },      // the call ends: the phone goes away
    n8_moved: {
      speaker: 'narrator',
      text: 'You look at the van, parked well away from where it made contact. You moved it before anyone had looked, and you say so on the call. It goes in the report.',
      next: 'n8'
    },
    n8: {
      speaker: 'narrator',
      text: 'Photographs, then. What do you capture?',
      choices: [
        {
          text: 'Wide shots of both vehicles in place, close-ups of the damage, his plate, the street.',
          grade: 'good', effects: { efficiency: 3, safety: 2 },
          feedback: 'Wide for position, close for damage, plus plates and landmarks. That set answers almost every question a claim will ask.',
          next: 'n9'
        },
        {
          text: 'A few close-ups of his fender, since that is the actual damage and what the claim is about.',
          grade: 'ok', effects: { efficiency: 1 },
          feedback: 'Damage alone does not show position, sightlines or how it happened. Take the wide shots too — they are free.',
          set: { fewphotos: true },
          next: 'n9'
        },
        {
          text: 'None — he has photographed it and dispatch has the report.',
          grade: 'bad', effects: { efficiency: -2, safety: -2 },
          feedback: 'His photographs will be taken from his point of view. Take your own; they are the only record that answers your questions.',
          lesson: 'Photograph everything yourself: wide shots, close-ups, plates and the surroundings.',
          set: { nophotos: true },
          next: 'n9'
        }
      ]
    },
    n9: {
      speaker: 'neighbor', show: 'neighbor', mood: 'happy',
      text: '"I saw the whole thing from my window. He\'s been parked across that driveway all week, but you did back into him. Do you want my name?"',
      choices: [
        {
          text: '"Yes please — name and a number, if you don\'t mind."',
          grade: 'good', effects: { efficiency: 2, service: 1, mood: 1 },
          feedback: 'Independent witnesses are the most valuable thing at any scene, and they walk away quickly. Take the details while they are offering.',
          next: 'n10_check'
        },
        {
          text: '"Only if you\'ll say it was his fault for parking there."',
          grade: 'bad', effects: { service: -3, safety: -2, mood: -3 }, critical: true,
          feedback: 'Coaching a witness is misconduct, and she will repeat what you said to the next person who asks. Take the account she actually has.',
          set: { coached: true },
          next: 'n10_check'
        },
        {
          text: '"No need, thanks — it\'s all reported already."',
          grade: 'ok', effects: { efficiency: -1 },
          feedback: 'A free independent account of what happened is worth more than the three minutes it costs you.',
          set: { nowitness: true },
          next: 'n10_check'
        }
      ]
    },
    // dispatch calls back; after a cash deal his insurer has already been on the phone
    n10_check: { if: 'cash', then: 'n10_cash', else: 'n10' },
    n10: {
      speaker: 'dispatch', show: 'dispatch',
      text: '"Claim\'s open. You\'re clear to carry on — but I need your incident report before you clock out tonight. Everything, in order, in your own words."',
      choices: M8_REPORT_CHOICES
    },
    n10_cash: {
      speaker: 'dispatch', show: 'dispatch',
      text: '"His insurer just called: he\'s claiming anyway, and he says you paid him cash to keep it quiet. We\'ll talk about that. I need your incident report before you clock out tonight. Everything, in order."',
      choices: M8_REPORT_CHOICES
    },
    end_pick: { if: 'left', then: 'end_left', else: 'end_pick2' },
    end_pick2: { if: 'cash', then: 'end_cash', else: 'end_pick3' },
    end_pick3: { if: ['!admitted', '!shaded', '!moved', '!texted', '!coached', '!nophotos', '!fewphotos', '!nowitness', '!thin'], then: 'end_good', else: 'end_mixed' },
    end_good: {
      type: 'end', outcome: 'good', title: 'Handled By The Book',
      text: 'Secured, checked, reported, documented, witnessed and written up honestly — in twenty-five minutes. The claim closed without a dispute, and the only thing that got hurt was a bumper.'
    },
    end_mixed: {
      type: 'end', outcome: 'mixed', title: 'Reported, With Loose Ends',
      text: 'The incident was reported and the claim went through, but parts of it made somebody\'s job harder later, including yours.',
      notes: [
        { if: 'moved', text: 'You moved the van before the scene was recorded.' },
        { if: 'texted', text: 'You texted instead of calling it in.' },
        { if: 'admitted', text: 'You admitted fault at the scene.' },
        { if: 'nophotos', text: 'You took no photographs of your own.' },
        { if: 'fewphotos', text: 'Your photographs showed the damage but not the scene.' },
        { if: 'coached', text: 'You tried to coach the witness.' },
        { if: 'nowitness', text: 'You let an independent witness go.' },
        { if: 'shaded', text: 'Your report blamed his parking instead of saying what happened.' },
        { if: 'thin', text: 'Your report was two lines long.' }
      ]
    },
    end_left: {
      type: 'end', outcome: 'bad', title: 'Left the Scene',
      text: 'You drove away from a collision. Coming back three houses later does not undo it: the camera doorbells recorded a van leaving, and that is what the claim will be about.',
      notes: [
        { if: 'cash', text: 'Paying him cash to keep quiet made it worse.' },
        { if: ['!nophotos', '!shaded'], text: 'Your own photographs and an honest report are the only things on your side of the file.' }
      ]
    },
    end_cash: {
      type: 'end', outcome: 'bad', title: 'The Quiet Version',
      text: 'What began as a bent fender became a concealed collision: a cash deal on the curb. His insurer called anyway, and now the story includes you paying him to keep quiet.',
      notes: [
        { if: ['!nophotos', '!shaded', '!thin'], text: 'Your photographs and an honest report still help — but they cannot undo the deal.' },
        { if: 'shaded', text: 'A report that blames his parking does not help either.' }
      ]
    }
  }
};
