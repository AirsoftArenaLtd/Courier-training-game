# Trainee data

What On The Route stores about a trainee, where, for how long, and how a trainer exports or erases it. Written for
the pilot company's IT and data-protection people, and checked by `node test/data.js` (export and erase),
`node test/xapi.js` (what is sent to a learning record store) and `node test/offline.js` (nothing leaves the network).
A company's own data rules (board Question 1) come on top; this is what the software does by itself.

## What is collected

Only what training needs, entered or produced by playing:

| Data | Examples | Why |
| --- | --- | --- |
| Who | an employee ID and a display name (from the company's sign-in, the LMS, the employee ID sign-in, or typed on first use) | to keep each trainee's progress apart and to name the record |
| Progress | stars and scores per module, attempts, assessment results and dates, quiz answers' results, certificate status | the academy, the trainer's view, the LMS |
| Workdays | each finished 3D workday: date, score, stars, lessons, the list of what was done right or wrong with where in the town a driving mistake happened (game coordinates and speed), time taken | the debrief, the drive review map, the before-and-after report |
| Settings | language, larger text, colour-blind setting, key remapping, graphics level, narration | to play the way the trainee needs |

Not collected: no real-world location, camera, microphone, contacts, device identifiers, advertising or analytics
identifiers. No trainee data is sent to any third party; the game makes no requests to the internet
(`docs/IT-NOTES.md`). The one exception is an xAPI learning record store the company sets up itself (below).

## Where it is kept

| Where | What | How long |
| --- | --- | --- |
| **The browser** (`localStorage`, key `otr_save_v1`), when there is no training server and no LMS | everything above for the one trainee on that PC | until the browser's site data is cleared, or "Reset their progress" in Settings → Trainer |
| **An LMS** (SCORM suspend data and score/completion fields) | the same progress, packed to fit (SCORM 1.2 holds 4096 characters: scenario and assessment records become compact tables, times to the minute; a workday in progress is shortened before any course result is), a 0–100 score, complete/passed | the LMS's own retention rules |
| **The training server** `progress/<id>.json` | one file per trainee with everything above | until a trainer erases it |
| `progress/<id>.json.<time>.bak` | the old progress of a trainee a trainer reset | `OTR_BACKUP_DAYS`, default **30 days**, then deleted automatically (0 keeps them for ever); erasing the trainee deletes them at once |
| `accounts.json` (employee ID sign-in only) | ID, name, a salted scrypt hash of the password (never the password), when it was made and last changed, the wrong-password count | until the account is removed or the trainee is erased |
| `settings.json` | the trainer's pass marks and rules (no trainee data) | until changed |
| `trainees.json` (optional, company-written) | ID → name list for display | the company's file |
| `xapi-outbox.json` (xAPI only) | statements about finished workdays waiting for the learning record store | until delivered, or until the trainee is erased |
| `audit.log` | one line each time a trainer exports or erases a trainee: the time, the action and the **ID only** (no name, no data) | kept; delete or rotate it with the company's log rules |
| In the server's memory only | sign-in sessions (a cookie `otr_sid`, no other cookies), wrong-PIN and wrong-password counters | until the server restarts or the session ends (10 hours, or 2 hours idle) |

Passwords are never stored or sent in clear: only the salted hash is kept on the server, and the browser never
stores a password. Over plain HTTP a password is readable on the network, so serve the game over HTTPS
(`docs/SIGN-IN.md`).

## Sent to a company learning record store (optional)

Off unless the server is started with `OTR_XAPI_ENDPOINT`. Then each finished workday goes as xAPI "completed"
statements (the day's score, stars, time and pass or fail, which critical mistakes it had (each as its event type, such
as `trip.damage-report`, and its English label), and one per stop with delivered or not), carrying the
trainee's employee ID and display name and nothing else. See `README.md` ("xAPI") and `server/xapi.js`. Statements
already delivered are the store's data, under the company's own rules; erasing a trainee here removes any still waiting
in the outbox but cannot recall what was delivered.

## What a trainer can do (Settings → Trainer tools, behind the PIN)

On the training server, in the trainee list, **Their data**:

- **Download data**: everything the server holds about that trainee as one JSON file (`trainee-<id>.json`): their
  progress, their account record without any password material, and the list of backups. Logged in `audit.log`.
- **Erase all data**: deletes their progress file, every backup of it, their sign-in (and so their sessions), and any
  xAPI statements still waiting. It cannot be undone. Logged in `audit.log`.
- **Reset** (as before): starts their progress again but keeps the old file as a backup for `OTR_BACKUP_DAYS`.

The same actions are available to scripts: `GET api/trainees/<id>/export` and `POST api/trainees/<id>/erase`, both
with the header `X-Trainer-Pin`.

In browser-only mode the trainee's data is in that one browser: "Reset their progress" there clears it, and clearing
the browser's site data removes it entirely. In an LMS the learner's data is in the LMS and is erased there.

## Settings that matter

| Setting | Default | What it does |
| --- | --- | --- |
| `OTR_DATA_DIR` | `server/data` | where all the server's files above live; back it up and protect it like any personal-data store |
| `OTR_BACKUP_DAYS` | 30 | how long reset trainees' old progress is kept (0: for ever) |
| `OTR_XAPI_ENDPOINT` | off | send finished workdays to a learning record store |
| `OTR_ALLOW_QUERY_USER` | on without accounts, off with | whether `?user=<id>` links can open someone's progress |

The server's data folder is never served to browsers (`test/enterprise.js` checks it).
