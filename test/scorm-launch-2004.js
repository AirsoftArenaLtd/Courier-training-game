#!/usr/bin/env node
/*
 * B-101: the SCORM 2004 package, the pilot's default, launched in its own LMS frame on every run: test/scorm-launch.js
 * with --2004 (the 1.2 package is test/scorm-launch.js itself).
 */
'use strict';
process.argv.push('--2004');
require('./scorm-launch.js');
