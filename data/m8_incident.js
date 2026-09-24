/*
 * Module 8 · After a Fender-Bender — uses the dialogue engine (see data/m3_dialogues.js for the node format).
 *
 * A low-speed backing collision at a residential stop. The teaching points are the ones that decide
 * how the next hour goes: stop and secure the scene, check for injuries first, report it before you
 * do anything else, never admit fault or settle in cash, exchange the right information, document it,
 * and tell the truth on the report — including the part where you were backing.
 * Based on general, publicly available guidance for commercial drivers after a collision.
 */
window.OTR_DATA = window.OTR_DATA || {};
OTR_DATA.dialogues = OTR_DATA.dialogues || {};

OTR_DATA.dialogues.m8_incident = {
  title: 'After a Fender-Bender',
  setting: 'street',
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
    neighbour: {
      name: 'Mrs. Whitfield', color: 0x2E7D5B, moodStart: 1,
      portrait: { kind: 'person', skin: 0xE8C9A8, hair: 0xC9C4CE, hairStyle: 'bun', shirt: 0x7FAF8A, glasses: 0x333333 }
    }
  },
  keyLessons: [
    'Stop, secure the scene and check for injuries before anything else — people first, packages never.',
    'Report every collision to dispatch immediately, however small. A cash settlement on the kerb becomes your problem later.',
    'Never admit fault at the scene. Exchange information, photograph everything and write down exactly what happened.'
  ],
  start: 'n0',
  nodes: {
    n0: {
      speaker: 'narrator', sfx: 'thud', shake: true,
      text: 'You were backing out of a narrow driveway, mirrors only, and the van stops with a crunch you feel in your teeth. A parked sedan. Its front wing is folded, your bumper is scuffed.',
      next: 'n1'
    },
    n1: {
      speaker: 'narrator',
      text: 'The street is quiet. Nobody has come out yet. Your handheld says you are eleven minutes behind.',
      choices: [
        {
          text: 'Park properly: engine off, park brake, hazards on. Then get out and look at what happened.',
          grade: 'good', effects: { safety: 3, efficiency: 1 },
          feedback: 'Secure the vehicle first. A van that rolls while you are inspecting the damage turns a scuff into a disaster.',
          next: 'n2'
        },
        {
          text: 'Pull forward out of the way first so you are not blocking the street.',
          grade: 'bad', effects: { safety: -2 },
          feedback: 'Moving before you have looked destroys the scene and can turn a minor incident into a hit-and-run allegation. Secure where you are unless you are in danger.',
          lesson: 'Do not move the vehicle after a collision until the scene is documented — unless staying put is genuinely unsafe.',
          set: { moved: true },
          next: 'n2'
        },
        {
          text: 'It is barely a scuff. Finish the stop and look at it at the end of the route.',
          grade: 'bad', effects: { safety: -4, service: -2 },
          feedback: 'Leaving the scene of a collision is the one mistake you cannot walk back — it is a criminal matter, not a paperwork matter.',
          lesson: 'Leaving the scene of any collision, however small, is the worst possible choice. Stop every time.',
          set: { left: true },
          next: 'n1_left'
        }
      ]
    },
    n1_left: {
      speaker: 'narrator',
      text: 'You get three houses down before the size of it lands on you. There is a camera doorbell on every porch on this street, and your van has a number on the side a metre high. You stop and walk back.',
      next: 'n2'
    },
    n2: {
      speaker: 'narrator',
      text: 'Hazards ticking. Looking at the sedan properly now: the wing is creased into the tyre and there is somebody in the driver\'s seat, moving.',
      choices: [
        {
          text: 'Check on them first. Ask if they are hurt and whether they need an ambulance.',
          grade: 'good', effects: { safety: 3, service: 2, mood: 2 },
          feedback: 'People before property, every single time. Injuries change what you do next, so you need to know within seconds.',
          next: 'n3'
        },
        {
          text: 'Photograph both vehicles while everything is where it landed.',
          grade: 'ok', effects: { mood: -1 },
          feedback: 'The photographs matter, but not before you know whether anyone is hurt. Check on the person, then take the pictures.',
          next: 'n3'
        },
        {
          text: 'Call dispatch and describe the damage.',
          grade: 'ok', effects: { mood: -1 },
          feedback: 'Reporting is right and it is coming — but dispatch will ask you first whether anybody is injured, and you do not know yet.',
          next: 'n3'
        }
      ]
    },
    n3: {
      speaker: 'ray', show: 'ray', mood: 'annoyed',
      text: 'The door opens and a man climbs out, holding his phone. "I\'m fine. I\'m not fine, actually — look at my car. I was sat in it. You reversed straight into me."',
      next: 'n4'
    },
    n4: {
      speaker: 'narrator',
      text: 'He is standing, walking, talking. No sign of injury. He is angry, and he is right about the reversing.',
      choices: [
        {
          text: '"I\'m sorry this happened. Are you hurt anywhere? Let\'s swap details and I\'ll report it now."',
          grade: 'good', effects: { service: 3, safety: 2, mood: 2 },
          feedback: 'Sympathy without a confession. You can be decent to somebody without signing a statement of liability on the kerb.',
          next: 'n5'
        },
        {
          text: '"That was completely my fault, I wasn\'t looking. I\'ll cover whatever it costs."',
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
          next: 'n5'
        }
      ]
    },
    n5: {
      speaker: 'ray', mood: 'neutral', effects: { mood: 1 },
      text: '"Look — I don\'t want this on my insurance. Two hundred in cash and we both drive away. Nobody needs to know."',
      choices: [
        {
          text: '"I can\'t do that. Every incident gets reported — that protects you as much as me."',
          grade: 'good', effects: { safety: 3, service: 2 },
          feedback: 'Exactly right. A cash deal has no record, no repair guarantee and no protection when he finds a bent suspension arm next week — and for you it is a concealed collision.',
          next: 'n6'
        },
        {
          text: 'Take the deal. Two hundred is cheaper than the paperwork.',
          grade: 'bad', effects: { safety: -4, efficiency: -1 },
          feedback: 'Settling in cash and not reporting it is concealing a collision. It usually ends with a claim anyway, arriving weeks later with your name on it and no evidence.',
          lesson: 'Never settle a collision in cash. An unreported incident is a much bigger problem than a reported one.',
          set: { cash: true },
          next: 'n6'
        },
        {
          text: '"Talk to my company about it," and turn back to the van.',
          grade: 'ok', effects: { safety: 1, service: -2, mood: -2 },
          feedback: 'The answer is right but the delivery leaves him with nothing. Tell him what happens next and give him the details he needs.',
          next: 'n6'
        }
      ]
    },
    n6: {
      speaker: 'narrator',
      text: 'A neighbour has come down her steps and is watching with her arms folded. Your handheld is in your hand and dispatch is one press away.',
      choices: [
        {
          text: 'Report it to dispatch now: location, both vehicles, nobody injured, no police needed yet.',
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
          next: 'n7'
        }
      ]
    },
    n7: {
      speaker: 'dispatch', show: 'dispatch',
      text: '"Understood. Nobody hurt — good. Get me photographs of both vehicles, wide and close, his details and plate, and any witness. Do not move the van until I call you back."',
      next: 'n8_check'
    },
    n8_check: { if: 'moved', then: 'n8_moved', else: 'n8' },
    n8_moved: {
      speaker: 'narrator',
      text: 'You look at the van, sitting three metres from where it made contact, and at the two people who watched you move it. You say so on the call. It goes in the report.',
      next: 'n8'
    },
    n8: {
      speaker: 'narrator',
      text: 'Photographs, then. What do you capture?',
      choices: [
        {
          text: 'Wide shots of both vehicles in place, close-ups of both sets of damage, his plate, the driveway and the street signs.',
          grade: 'good', effects: { efficiency: 3, safety: 2 },
          feedback: 'Wide for position, close for damage, plus plates and landmarks. That set answers almost every question a claim will ask.',
          next: 'n9'
        },
        {
          text: 'A couple of photos of his wing, since that is the actual damage.',
          grade: 'ok', effects: { efficiency: 1 },
          feedback: 'Damage alone does not show position, sightlines or how it happened. Take the wide shots too — they are free.',
          next: 'n9'
        },
        {
          text: 'None — he has photographed it and dispatch has the report.',
          grade: 'bad', effects: { efficiency: -2, safety: -2 },
          feedback: 'His photographs will be taken from his point of view. Take your own; they are the only record that answers your questions.',
          lesson: 'Photograph everything yourself: wide shots, close-ups, plates and the surroundings.',
          next: 'n9'
        }
      ]
    },
    n9: {
      speaker: 'neighbour', show: 'neighbour', mood: 'happy',
      text: '"I saw the whole thing from my window, dear. He\'s been parked across that driveway all week, but you did back into him. Do you want my name?"',
      choices: [
        {
          text: '"Yes please — name and a number, if you don\'t mind. Thank you."',
          grade: 'good', effects: { efficiency: 2, service: 1, mood: 1 },
          feedback: 'Independent witnesses are the most valuable thing at any scene, and they walk away quickly. Take the details while they are offering.',
          next: 'n10'
        },
        {
          text: '"Only if you\'ll say it was his fault for parking there."',
          grade: 'bad', effects: { service: -3, safety: -2, mood: -3 },
          feedback: 'Coaching a witness is misconduct, and she will repeat what you said to the next person who asks. Take the account she actually has.',
          next: 'n10'
        },
        {
          text: '"No need, thanks — it\'s all reported already."',
          grade: 'ok', effects: { efficiency: -1 },
          feedback: 'A free independent account of what happened is worth more than the three minutes it costs you.',
          next: 'n10'
        }
      ]
    },
    n10: {
      speaker: 'dispatch',
      text: '"Claim\'s open. You\'re clear to carry on — but I need your incident report before you clock off tonight. Everything, in order, in your own words."',
      choices: [
        {
          text: 'Write it plainly: backing out of the driveway, mirrors only, no spotter, contact with a parked car.',
          grade: 'good', effects: { safety: 3, service: 1 },
          feedback: 'An honest report is what protects you. It is also the only version that survives being read next to the photographs and the witness.',
          next: 'end_pick'
        },
        {
          text: 'Write that the car was parked illegally across the driveway and the contact was unavoidable.',
          grade: 'bad', effects: { safety: -3, service: -2 },
          feedback: 'It reads as an excuse, and the witness statement does not match it. A shaded report is worse for you than the collision was.',
          lesson: 'Write the incident report honestly, including your own part in it. Inconsistent reports cost far more than the damage.',
          set: { shaded: true },
          next: 'end_pick'
        },
        {
          text: 'Keep it to two lines. The less said, the better.',
          grade: 'ok', effects: { safety: -1 },
          feedback: 'A thin report means somebody else fills in the gaps later, from memory, without you there. Write it properly while it is fresh.',
          next: 'end_pick'
        }
      ]
    },
    end_pick: { if: ['!left', '!cash', '!admitted', '!shaded'], then: 'end_good', else: 'end_mixed_check' },
    end_mixed_check: { if: ['!left', '!cash'], then: 'end_mixed', else: 'end_bad' },
    end_good: {
      type: 'end', outcome: 'good', title: 'Handled By The Book',
      text: 'Secured, checked, reported, documented, witnessed and written up honestly — in twenty-five minutes. The claim closed without a dispute, and the only thing that got hurt was a bumper.'
    },
    end_mixed: {
      type: 'end', outcome: 'mixed', title: 'Reported, With Loose Ends',
      text: 'The incident was reported and the claim went through, but pieces of it — the admission, the thin report, the missing photographs — made somebody\'s job harder later, including yours.'
    },
    end_bad: {
      type: 'end', outcome: 'bad', title: 'The Quiet Version',
      text: 'What began as a bent wing became a concealed collision: a cash deal with no record, or a scene you left. Weeks later a claim arrives with your name on it, and there is nothing on your side of the file.'
    }
  }
};
