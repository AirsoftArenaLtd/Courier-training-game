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

  // ---- end of day
  'return.scanned':       { kind: 'check', cat: 'efficiency', phase: 'end', max: 1,
                            label: 'Scanned the undelivered package back in at the depot',
                            fail: 'Left an undelivered package unscanned',
                            lesson: 'Every package that comes back must be scanned in, or it is lost as far as the system knows.' }
};
