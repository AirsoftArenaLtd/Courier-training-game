/*
 * What the 3D workday can report, and what each report is worth (read by src/core/workday.js).
 *
 *   kind      'check'    right or wrong (the world reports ok: false when it was wrong); max points when right
 *             'penalty'  a mistake: pts come off the category
 *             'bonus'    a good call beyond what was asked
 *   cat       safety | efficiency | service
 *   phase     brief | pretrip | load | drive | stop | end: the debrief's heading when the report has no stop
 *   label     the line the trainee reads (a right check, a penalty or a bonus); fail: the line for a wrong check
 *   lesson    the takeaway shown when it went wrong
 *   critical  a mistake that must never be averaged away: it caps its category at one star
 *
 * New types are added here, by a pull request the other agent reviews (docs/TEAM.md). The 3D world only names them.
 * First draft: the points are tuned once a whole day can be played (pilot milestone 2).
 */
window.OTR_DATA = window.OTR_DATA || {};

OTR_DATA.workdayEvents = {
  // ---- morning brief
  'brief.read':           { kind: 'check', cat: 'service', phase: 'brief', max: 1,
                            label: 'Read the morning brief before leaving dispatch',
                            fail: 'Left dispatch without reading the morning brief',
                            lesson: 'The brief has the day\'s weather, hazards and route notes. Read it before you load.' },

  // ---- pre-trip inspection
  'inspect.tires':        { kind: 'check', cat: 'safety', phase: 'pretrip', max: 2,
                            label: 'Assessed the tires correctly',
                            fail: 'Misjudged the condition of the tires',
                            lesson: 'Check tread, sidewalls and pressure on every tire before the van moves.' },
  'inspect.lights':       { kind: 'check', cat: 'safety', phase: 'pretrip', max: 2,
                            label: 'Assessed the lights correctly',
                            fail: 'Misjudged the condition of the lights',
                            lesson: 'Walk round and check every light works, including brake lights and signals.' },
  'depart.uninspected':   { kind: 'penalty', cat: 'safety', phase: 'pretrip', pts: 3, severity: 'major',
                            label: 'Left the depot without finishing the pre-trip inspection',
                            lesson: 'A van with a fault you have not found is a danger to you and everyone on the road.' },

  // ---- load-out
  'scan.load':            { kind: 'check', cat: 'efficiency', phase: 'load', max: 1,
                            label: 'Scanned the package at load-out',
                            fail: 'Loaded a package without scanning it',
                            lesson: 'Scan every package as you load it: a missed scan is a package the system thinks is still at the depot.' },
  'load.shelf':           { kind: 'check', cat: 'efficiency', phase: 'load', max: 2,
                            label: 'Loaded the package on its shelf in stop order',
                            fail: 'Loaded a package on the wrong shelf',
                            lesson: 'Load in stop order so each package is where you expect it. A bad load costs time at every stop.' },
  'load.secured':         { kind: 'check', cat: 'safety', phase: 'load', max: 2,
                            label: 'Secured the load before driving',
                            fail: 'Drove with an unsecured load',
                            lesson: 'An unsecured load shifts under braking: it damages packages and can injure you when you open the doors.' },

  'load.count':           { kind: 'check', cat: 'efficiency', phase: 'load', max: 1,
                            label: 'Counted the load against the manifest before leaving',
                            fail: 'Left the depot without checking the load against the manifest',
                            lesson: 'Count the packages against the manifest before you roll: a short or extra package is cheapest to fix at the depot.' },
  'load.missort-caught':  { kind: 'bonus', cat: 'efficiency', phase: 'load', pts: 1,
                            label: 'Caught a mis-sorted package at load-out' },
  'load.missort-missed':  { kind: 'penalty', cat: 'efficiency', phase: 'load', pts: 2,
                            label: 'Loaded a mis-sorted package without catching it',
                            lesson: 'Read the label against the manifest as you scan. A package for another route costs a second trip.' },
  'load.extra-caught':    { kind: 'bonus', cat: 'efficiency', phase: 'load', pts: 1,
                            label: 'Caught an extra package that was not on the manifest' },
  'load.missing-found':   { kind: 'check', cat: 'service', phase: 'load', max: 2,
                            label: 'Reported a package missing from the load before leaving',
                            fail: 'Left the depot with a package missing and said nothing',
                            lesson: 'If the manifest and the shelf disagree, tell dispatch before you leave. The customer should hear it from you early.' },
  'load.found-later':     { kind: 'penalty', cat: 'efficiency', phase: 'stop', pts: 1,
                            label: 'A package missed at load-out turned up later',
                            lesson: 'A package found at the wrong stop is a detour. A careful count at the depot avoids it.' },

  // ---- driving
  'drive.belt':           { kind: 'penalty', cat: 'safety', phase: 'drive', pts: 3, severity: 'major',
                            label: 'Moved the van without a seatbelt',
                            lesson: 'Belt on before the van moves, every time, even for a few yards between stops.' },
  'drive.speed':          { kind: 'penalty', cat: 'safety', phase: 'drive', pts: 2,
                            label: 'Exceeded the speed limit',
                            lesson: 'Residential limits are low for a reason: children, pets and parked cars.' },
  'drive.sidewalk':       { kind: 'penalty', cat: 'safety', phase: 'drive', pts: 3, severity: 'major',
                            label: 'Drove onto the sidewalk',
                            lesson: 'Stay on the road. Take a corner wider and slower rather than clip the curb.' },
  'drive.wrong-side':     { kind: 'penalty', cat: 'safety', phase: 'drive', pts: 3, severity: 'major',
                            label: 'Drove on the wrong side of the road',
                            lesson: 'Keep to your side, even on a quiet street: the car you cannot see yet is coming.' },
  'drive.stop-line':      { kind: 'check', cat: 'safety', phase: 'drive', max: 2,
                            label: 'Came to a full stop at the stop line',
                            fail: 'Rolled through a stop sign',
                            lesson: 'A full stop behind the line, then look both ways before you go.' },
  'drive.hazard-early':   { kind: 'check', cat: 'safety', phase: 'drive', max: 2,
                            label: 'Slowed early for a developing hazard',
                            fail: 'Reacted late to a developing hazard',
                            lesson: 'Look well ahead. Ease off as soon as a hazard starts to develop, not when it is in front of you.' },
  'drive.pedestrian':     { kind: 'penalty', cat: 'safety', phase: 'drive', pts: 4, severity: 'major', critical: true,
                            label: 'Conflict with a pedestrian',
                            lesson: 'Never assume a pedestrian has seen you. Slow down, cover the brake and give way.' },
  'drive.contact':        { kind: 'penalty', cat: 'safety', phase: 'drive', pts: 4, severity: 'major', critical: true,
                            label: 'The van hit something',
                            lesson: 'Any contact is an incident: stop, check, and report it. Slow down near obstacles and use your mirrors.' },
  'drive.handheld':       { kind: 'penalty', cat: 'safety', phase: 'drive', pts: 3, severity: 'major',
                            label: 'Used the handheld before parking safely',
                            lesson: 'Park, set the brake, then pick up the scanner. Never at the wheel and never at a light.' },

  'drive.following':      { kind: 'check', cat: 'safety', phase: 'drive', max: 2,
                            label: 'Kept a safe following distance',
                            fail: 'Followed the vehicle ahead too closely',
                            lesson: 'Keep at least a three-second gap, more in rain or with a loaded van. Brake early and smoothly.' },
  'drive.mirrors':        { kind: 'check', cat: 'safety', phase: 'drive', max: 2,
                            label: 'Checked the mirrors before pulling out',
                            fail: 'Pulled out without checking the mirrors',
                            lesson: 'Mirror, signal, look over your shoulder, then go. Vans have blind spots a car does not.' },
  'drive.backing':        { kind: 'check', cat: 'safety', phase: 'drive', max: 2,
                            label: 'Backed up safely: got out and looked first',
                            fail: 'Backed up without getting out to look',
                            lesson: 'G.O.A.L.: get out and look. Check behind and around the van before you reverse.' },
  'drive.school-bus':     { kind: 'check', cat: 'safety', phase: 'drive', max: 2,
                            label: 'Stopped for a school bus with its lights flashing',
                            fail: 'Passed a stopped school bus with its lights flashing',
                            lesson: 'Stop for a school bus with its red lights flashing, in both directions, until the lights go off.' },
  'drive.school-bus-pass':{ kind: 'penalty', cat: 'safety', phase: 'drive', pts: 4, severity: 'major', critical: true,
                            label: 'Drove past a school bus while children were boarding',
                            lesson: 'Never pass a school bus that is loading. Children cross the road without looking.' },
  'drive.siren':          { kind: 'check', cat: 'safety', phase: 'drive', max: 2,
                            label: 'Pulled over to the right for an emergency vehicle',
                            fail: 'Did not give way to an emergency vehicle',
                            lesson: 'When you hear a siren, signal, pull over to the right and stop until it has passed.' },
  'drive.weather':        { kind: 'check', cat: 'safety', phase: 'drive', max: 2,
                            label: 'Drove to the conditions: slower, with more space',
                            fail: 'Drove as in dry weather despite the conditions',
                            lesson: 'Rain, snow and ice double your stopping distance. Slow down and leave a bigger gap before you need it.' },

  // ---- at the stop
  'scan.stop':            { kind: 'check', cat: 'service', phase: 'stop', max: 2,
                            label: 'Scanned the package at the stop before delivering',
                            fail: 'Completed a stop without scanning the package',
                            lesson: 'Scan at the door: it confirms the right package, the right address and the delivery time.' },
  'scan.mismatch-caught': { kind: 'bonus', cat: 'service', phase: 'stop', pts: 1,
                            label: 'Caught a package for a different stop' },
  'deliver.wrong-package':{ kind: 'penalty', cat: 'service', phase: 'stop', pts: 3, severity: 'major',
                            label: 'Tried to deliver the wrong package',
                            lesson: 'Check the address on the label against the house number every time.' },
  'deliver.no-recipient': { kind: 'penalty', cat: 'service', phase: 'stop', pts: 2,
                            label: 'Recorded a handover with nobody there',
                            lesson: 'Only record a handover when you hand it to a person. Otherwise follow the safe-place or attempt rules.' },
  'deliver.outcome':      { kind: 'check', cat: 'service', phase: 'stop', max: 2,
                            label: 'Chose the right delivery outcome',
                            fail: 'Chose the wrong delivery outcome',
                            lesson: 'Signature, safe place or attempt: the package\'s service and who is at the door decide which.' },
  'retrieve.checked':     { kind: 'check', cat: 'efficiency', phase: 'stop', max: 1,
                            label: 'Checked the label before taking a package from the shelf',
                            fail: 'Took a package from the shelf without checking it',
                            lesson: 'Check the label as you pick: the wrong package found at the door is a second trip.' },

  'stop.dog':             { kind: 'check', cat: 'safety', phase: 'stop', max: 2,
                            label: 'Handled the dog safely',
                            fail: 'Approached a dog without a plan',
                            lesson: 'Do not go in with a loose dog about. Stay by the gate, speak calmly, and call the customer or leave the package safe.' },
  'stop.wrong-address':   { kind: 'check', cat: 'service', phase: 'stop', max: 2,
                            label: 'Caught a label with the wrong address',
                            fail: 'Delivered to an address that did not match the label',
                            lesson: 'Check the number and street on the label against the door. When they differ, stop and ask dispatch.' },
  'stop.age-check':       { kind: 'check', cat: 'service', phase: 'stop', max: 2, critical: true,
                            label: 'Checked photo ID for an age-restricted delivery',
                            fail: 'Handed over an age-restricted package without checking ID',
                            lesson: 'Check the photo, the name, the date of birth and the expiry date. If you cannot, the package goes back.' },
  'stop.difficult':       { kind: 'check', cat: 'service', phase: 'stop', max: 2,
                            label: 'Stayed calm and professional with a difficult customer',
                            fail: 'Escalated with a difficult customer',
                            lesson: 'Listen, stay calm, offer what you can do, and note it. A calm voice settles a situation faster than a clever answer.' },
  'stop.hazard':          { kind: 'penalty', cat: 'safety', phase: 'stop', pts: 3, severity: 'major',
                            label: 'Slipped or tripped at the door',
                            lesson: 'Look at the path before you step: ice, wet leaves and toys are the usual causes. Short, careful steps.' },

  // ---- dispatch
  'dispatch.update':      { kind: 'check', cat: 'service', phase: 'drive', max: 2,
                            label: 'Acted correctly on a dispatch update',
                            fail: 'Missed or ignored a dispatch update',
                            lesson: 'Read dispatch messages when you are parked, then act: a changed stop or a customer request is a promise to the customer.' },

  // ---- end of day
  'return.scanned':       { kind: 'check', cat: 'efficiency', phase: 'end', max: 1,
                            label: 'Scanned the undelivered package back in at the depot',
                            fail: 'Left an undelivered package unscanned',
                            lesson: 'Every package that comes back must be scanned in, or it is lost as far as the system knows.' }
};
