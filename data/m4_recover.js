/*
 * Module 4 · Put It Right: recovering a misdelivery (DialogueScene; node format as data/m3_dialogues.js).
 * Yesterday a package for 214 Birch LANE was left at 214 Birch COURT. The wrong household calls it in; the courier
 * owns it: gets the package back, apologizes, delivers it properly, updates the record and tells dispatch.
 */
window.OTR_DATA = window.OTR_DATA || {};
OTR_DATA.dialogues = OTR_DATA.dialogues || {};

OTR_DATA.dialogues.m4_recover = {
  title: 'Put It Right',
  setting: 'street',
  houseNumber: '214',
  moodMeter: null,
  cast: {
    dispatch: {
      name: 'Dispatch', color: 0x4D148C, moodStart: 0, remote: true,
      portrait: { kind: 'person', skin: 0x9C6B4A, hair: 0x1C1414, hairStyle: 'ponytail', shirt: 0x4D148C, uniform: true }
    },
    pat: {
      name: 'Pat Kowalski', color: 0x3E6FB0, moodStart: 0,
      portrait: { kind: 'person', skin: 0xF0D2B4, hair: 0x9A9A9A, hairStyle: 'short', shirt: 0x3E6FB0, glasses: 0x333333 }
    },
    lena: {
      name: 'Lena Brooks', color: 0xB5563C, moodStart: -1,
      portrait: { kind: 'person', skin: 0x8D5A3B, hair: 0x1E1410, hairStyle: 'long', shirt: 0xE8A33D }
    }
  },
  keyLessons: [
    'A misdelivery is fixed by the courier who made it: get it back the same day, apologize, deliver it properly.',
    'Update the record: the scan and the proof of delivery must show where the package really went.',
    'Tell dispatch what happened. An honest report is what stops the same mistake twice.'
  ],
  start: 'n0',
  nodes: {
    n0: {
      speaker: 'dispatch', show: 'dispatch',
      text: 'Customer at 214 Birch COURT called: they got a package for Lena Brooks at 214 Birch LANE. Yesterday\'s scan says you delivered it. Can you sort it out today?',
      choices: [
        { text: '"That was me. I\'ll go and get it back now and take it to the right address, then call you."', grade: 'good', effects: { service: 2, efficiency: 1 }, feedback: 'Owning it straight away is what makes a misdelivery a small thing.', next: 'n1' },
        { text: '"Can\'t they just walk it over? It\'s the same street name."', grade: 'bad', effects: { service: -2 }, feedback: 'The customer who got it by mistake isn\'t a courier, and the package is still your responsibility until it\'s with the right person.', lesson: 'Never leave a misdelivered package for the public to sort out: the courier recovers it.', next: 'n0b' },
        { text: '"The scanner must be wrong. I always check the street."', grade: 'bad', effects: { service: -2 }, feedback: 'The scan shows where it went. Arguing wastes the time you could spend fixing it.', lesson: 'Don\'t argue with the record: fix the problem, then work out how it happened.', next: 'n0b' }
      ]
    },
    n0b: { speaker: 'dispatch', text: 'It\'s your delivery, so it\'s your fix. Get it back today, please.', next: 'n1' },
    n1: {
      speaker: 'narrator', hide: true, setting: { name: 'street', number: '214', mailbox: 'KOWALSKI' },
      text: '214 Birch Court. The mailbox says KOWALSKI. An older man opens the door with the box in his hands.',
      next: 'n2'
    },
    n2: {
      speaker: 'pat', show: 'pat',
      text: 'Ah, the courier! This came yesterday. It isn\'t ours: Lena, over on Birch Lane.',
      choices: [
        { text: '"Thank you so much for calling it in, and I\'m sorry for the trouble. I\'ll get it to Lena now."', grade: 'good', effects: { service: 2 }, feedback: 'Thank them, apologize, and take it back. They did you a favor.', next: 'n3' },
        { text: 'Take the box without a word and head back to the van.', grade: 'bad', effects: { service: -1 }, feedback: 'He went out of his way for you. A thank-you and an apology cost nothing.', lesson: 'Thank the person who returns a misdelivery, and apologize for the trouble.', next: 'n3' }
      ]
    },
    n3: {
      speaker: 'narrator', hide: true,
      text: 'Back in the van with the package. Before you drive: what about the record?',
      choices: [
        { text: 'Scan it back into your possession, so tracking stops saying "delivered" at the wrong address.', grade: 'good', effects: { service: 2, efficiency: 1 }, feedback: 'The record has to follow the package. Lena\'s tracking is wrong until you fix it.', next: 'n4' },
        { text: 'Leave the scan as it is. You\'re delivering it in ten minutes anyway.', grade: 'bad', effects: { service: -2 }, feedback: 'Until you rescan it, the system says it\'s delivered, somewhere else. If anything goes wrong in those ten minutes, nobody can trace it.', lesson: 'Rescan a recovered package so the record matches where it really is.', next: 'n4' }
      ]
    },
    n4: {
      speaker: 'narrator', hide: true, setting: { name: 'street', number: '214', mailbox: 'BROOKS' },
      text: '214 Birch LANE. The mailbox says BROOKS: the right house this time. Lena answers, arms folded.',
      next: 'n5'
    },
    n5: {
      speaker: 'lena', show: 'lena',
      text: 'Tracking said this came yesterday. I thought someone had stolen it off my porch.',
      choices: [
        { text: '"I\'m sorry: I left it at Birch Court by mistake yesterday. The neighbor called it in and I\'ve brought it straight over."', grade: 'good', effects: { service: 3 }, feedback: 'Honest and short. People forgive a mistake that is owned and fixed; they don\'t forgive being brushed off.', next: 'n6' },
        { text: '"The system glitched. Here you go."', grade: 'bad', effects: { service: -2 }, feedback: 'Blaming "the system" for your own mistake is the fastest way to lose a customer\'s trust.', lesson: 'Own a mistake plainly when you put it right. Don\'t blame the system.', next: 'n6b' }
      ]
    },
    n6: { speaker: 'lena', text: 'Oh. Well, thank you for bringing it yourself. That\'s decent of you.', next: 'n7' },
    n6b: { speaker: 'lena', text: 'Right. Well, it\'s here now, I suppose.', next: 'n7' },
    n7: {
      speaker: 'narrator', hide: true,
      text: 'Delivered, with the proper proof. Last step?',
      choices: [
        { text: 'Tell dispatch it\'s delivered, and what went wrong: Birch Court and Birch Lane, same number, and you didn\'t check the suffix.', grade: 'good', effects: { service: 2, efficiency: 1 }, feedback: 'An honest report means the address gets flagged for the next driver, and you remember to check the suffix.', next: 'end_good' },
        { text: 'Nothing more: it\'s delivered now.', grade: 'bad', effects: { service: -1 }, feedback: 'Dispatch still has an open complaint, and the next driver has no warning about the two Birch 214s.', lesson: 'Close the loop with dispatch, including what caused the mistake.', next: 'end_mixed' }
      ]
    },
    end_good: {
      type: 'end', outcome: 'good', title: 'Put Right',
      text: 'Recovered the same day, the record fixed, the customer told the truth, and dispatch knows what to watch for. That\'s how a mistake stays small.'
    },
    end_mixed: {
      type: 'end', outcome: 'mixed', title: 'Delivered, Loop Still Open',
      text: 'The package is with Lena, but dispatch never heard how it happened, so the next driver can make the same mistake.'
    }
  }
};
