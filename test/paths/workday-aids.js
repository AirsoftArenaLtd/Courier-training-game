// The trainer's 3D workday aids reach the 3D world (Backlog B-11): with driving assists off, a first workday starts with
// no assist (by default it would have full assists); the rest of the day is played by workday-3d.
module.exports = require('./workday-3d').variant({ aids: { assists: 'off' }, expectAssist: 0, stopAfterStart: true });
