/*
 * Morning stand-up briefings. One is picked per day (by day number) for the safety topic and its check question.
 * Format is a talk graph (see src/core/talk.js); `dispatch` is the dispatcher.
 */
window.OTR_DATA = window.OTR_DATA || {};

OTR_DATA.briefs = [
  {
    topic: 'Three points of contact',
    talk: {
      start: 'b0',
      nodes: {
        b0: { speaker: 'dispatch', text: 'Morning. Safety topic today is three points of contact. We had two cab falls on the east route last month.', next: 'b1' },
        b1: {
          speaker: 'dispatch', text: 'Quick check before you roll: what counts as three points of contact?',
          check: 'Morning safety check',
          choices: [
            { text: 'Two hands and a foot, or two feet and a hand, in contact with the truck at all times.', grade: 'good', effects: { safety: 2 }, feedback: 'Exactly. Face the cab, use the grab handle, and never jump down.', next: 'b2' },
            { text: 'Holding the door frame while you step down.', grade: 'bad', effects: { safety: -1 }, feedback: 'The door can swing. Use the fixed grab handle and keep three limbs in contact.', lesson: 'Three points of contact: two hands and a foot, or two feet and a hand, on fixed handholds.', next: 'b2' },
            { text: 'Landing on both feet with your knees bent.', grade: 'bad', effects: { safety: -1 }, feedback: 'That is jumping down, which is exactly what causes ankle and knee injuries.', lesson: 'Never jump out of the cab, however quick it seems.', next: 'b2' }
          ]
        },
        b2: { speaker: 'dispatch', text: 'Good. Go do your walkaround.', next: 'end' },
        end: { type: 'end', outcome: 'good' }
      }
    }
  },
  {
    topic: 'Backing',
    talk: {
      start: 'c0',
      nodes: {
        c0: { speaker: 'dispatch', text: 'Morning. Topic today: backing. Most of our preventable collisions happen in reverse, under 5 mph.', next: 'c1' },
        c1: {
          speaker: 'dispatch', text: 'What is the rule when you have to back up?',
          check: 'Morning safety check',
          choices: [
            { text: 'Avoid backing where I can. If I must: get out and look first, then back slowly using the mirrors.', grade: 'good', effects: { safety: 2 }, feedback: 'G.O.A.L. — Get Out And Look. Kids, bikes and bollards live in blind spots.', next: 'c2' },
            { text: 'Use the mirrors and go slowly. That is what they are for.', grade: 'ok', effects: { safety: 1 }, feedback: 'Mirrors do not show the low blind spot right behind the bumper. Get out and look first.', next: 'c2' },
            { text: 'Rely on the reversing camera.', grade: 'bad', effects: { safety: -1 }, feedback: 'Cameras get dirty, fog up and miss the sides. They supplement G.O.A.L., they do not replace it.', lesson: 'Get out and look before backing, every time.', next: 'c2' }
          ]
        },
        c2: { speaker: 'dispatch', text: 'Right. Keep it slow out there.', next: 'end' },
        end: { type: 'end', outcome: 'good' }
      }
    }
  },
  {
    topic: 'Dogs',
    talk: {
      start: 'd0',
      nodes: {
        d0: { speaker: 'dispatch', text: 'Morning. Two dog notes on the route today, so let us talk dogs.', next: 'd1' },
        d1: {
          speaker: 'dispatch', text: 'A dog charges at you in a front yard. What do you do?',
          check: 'Morning safety check',
          choices: [
            { text: 'Stop, stand still, keep the package between us, avoid eye contact, and back away slowly.', grade: 'good', effects: { safety: 2 }, feedback: 'Standing still takes the chase away. The package is your barrier.', next: 'd2' },
            { text: 'Get back to the truck as fast as I can.', grade: 'bad', effects: { safety: -2 }, feedback: 'Running triggers the chase instinct, and the dog is faster than you.', lesson: 'Never run from a dog.', next: 'd2' },
            { text: 'Make myself big and shout to scare it off.', grade: 'bad', effects: { safety: -2 }, feedback: 'Shouting escalates a defensive dog.', lesson: 'Stay calm and still with a dog, and let it lose interest.', next: 'd2' }
          ]
        },
        d2: { speaker: 'dispatch', text: 'And if nobody can secure the dog, exception it. No package is worth a bite.', next: 'end' },
        end: { type: 'end', outcome: 'good' }
      }
    }
  },
  {
    topic: 'Heat',
    talk: {
      start: 'h0',
      nodes: {
        h0: { speaker: 'dispatch', text: 'Morning. Heat advisory today. Coolers are stocked, take extra water.', next: 'h1' },
        h1: {
          speaker: 'dispatch', text: 'What is the first sign you should act on?',
          check: 'Morning safety check',
          choices: [
            { text: 'Headache, dizziness, cramps or feeling sick. Stop, cool down, drink and call in.', grade: 'good', effects: { safety: 2 }, feedback: 'Act at the first symptom. Heat exhaustion turns into heat stroke fast.', next: 'h2' },
            { text: 'When I stop sweating. That is the real warning.', grade: 'bad', effects: { safety: -2 }, feedback: 'Hot dry skin is a late sign of heat stroke, which is a medical emergency. Act long before that.', lesson: 'Act on early heat symptoms: headache, dizziness, cramps, nausea.', next: 'h2' },
            { text: 'When I feel thirsty.', grade: 'ok', effects: { safety: 0 }, feedback: 'Thirst means you are already behind on fluids. Drink on a schedule in this weather.', next: 'h2' }
          ]
        },
        h2: { speaker: 'dispatch', text: 'Drink before you are thirsty and use the AC between stops.', next: 'end' },
        end: { type: 'end', outcome: 'good' }
      }
    }
  },
  {
    topic: 'Winter driving',
    talk: {
      start: 'w0',
      nodes: {
        w0: { speaker: 'dispatch', text: 'Morning. Overnight freeze, so walkways and steps will be sheet ice in the shade.', next: 'w1' },
        w1: {
          speaker: 'dispatch', text: 'How are you handling the ice today?',
          check: 'Morning safety check',
          choices: [
            { text: 'Short steps, feet flat, hold the handrail, slow down, and double my following distance in the truck.', grade: 'good', effects: { safety: 2 }, feedback: 'Slow and flat-footed. Most winter injuries are in the first three steps off the truck.', next: 'w2' },
            { text: 'Normal pace. I will just be careful on the worst bits.', grade: 'bad', effects: { safety: -2 }, feedback: 'Black ice does not announce itself. Treat every surface as slick until proven otherwise.', lesson: 'On ice, slow everything down: walking and driving.', next: 'w2' }
          ]
        },
        w2: { speaker: 'dispatch', text: 'Good. Take the time you need.', next: 'end' },
        end: { type: 'end', outcome: 'good' }
      }
    }
  },
  {
    topic: 'Scanning and exceptions',
    talk: {
      start: 's0',
      nodes: {
        s0: { speaker: 'dispatch', text: 'Morning. Customer service flagged a few stops last week that were marked delivered with no proof.', next: 's1' },
        s1: {
          speaker: 'dispatch', text: 'When does a package get scanned?',
          check: 'Morning safety check',
          choices: [
            { text: 'Before it leaves the truck, so I catch wrong-stop pieces and see signature requirements.', grade: 'good', effects: { efficiency: 2 }, feedback: 'Scan first. It catches misloads before you have walked to the door.', next: 's2' },
            { text: 'At the door, right before I hand it over.', grade: 'ok', effects: { efficiency: 1 }, feedback: 'Better than nothing, but you have already walked. Scan at the truck.', next: 's2' },
            { text: 'At the end of the street, in a batch.', grade: 'bad', effects: { efficiency: -2 }, feedback: 'Batch scanning hides misdeliveries and breaks the tracking customers rely on.', lesson: 'Scan each package before it leaves the truck.', next: 's2' }
          ]
        },
        s2: { speaker: 'dispatch', text: 'And if it cannot be delivered, code it properly and leave a door tag.', next: 'end' },
        end: { type: 'end', outcome: 'good' }
      }
    }
  }
];
