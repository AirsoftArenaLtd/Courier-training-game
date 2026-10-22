/* B-176: the trainer's quick start fits one A4 page in every language, and docs/print/ has the current sheets
   (test/tools/onepage.js --check). */
const r = require('child_process').spawnSync(process.execPath, [require('path').join(__dirname, 'tools', 'onepage.js'), '--check'], { stdio: 'inherit' });
process.exit(r.status === null ? 1 : r.status);
