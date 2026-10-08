# Sign in with an employee ID and password

For a company whose training PCs have no sign-in the game can use (no LMS, no proxy or Windows sign-in in front of
the server), the training server can sign trainees in itself: an employee ID and a password, typed on the game's own
sign-in screen. Trainers create the accounts and give out temporary passwords.

LMS (SCORM) and company sign-in (the `X-Remote-User` header) work exactly as before, with or without accounts. A
server started without accounts behaves exactly as it did.

## Turning it on

```
OTR_ACCOUNTS=1 OTR_TRAINER_PIN=4821 node server/server.js
```

Accounts are on when `OTR_ACCOUNTS=1` is set (in the environment or `server/config.json`), or when the accounts file
`<data folder>/accounts.json` exists (`server/data/accounts.json` by default). `OTR_ACCOUNTS=0` turns them off even
if the file exists. The trainer tools (and so account creation) need `OTR_TRAINER_PIN` as well.

With accounts on:

- Anyone who opens the game without a sign-in header sees the sign-in screen first. The game boots once they are
  signed in.
- `?user=` launch links are **off**, because they would skip the password. Set `OTR_ALLOW_QUERY_USER=1` to allow
  them anyway.
- A company sign-in header, if one is present, still wins.

| Setting | Default | What it does |
| --- | --- | --- |
| `OTR_ACCOUNTS` | on if `accounts.json` exists | `1` on, `0` off |
| `OTR_SESSION_HOURS` | 10 | A sign-in ends this long after it started, however busy |
| `OTR_SESSION_IDLE_MINUTES` | 120 | ... or after this long unused |
| `OTR_LOCK_AFTER` | 5 | Wrong passwords in a row that lock an employee ID |
| `OTR_LOCK_MINUTES` | 15 | How long it stays locked (a trainer's New password unlocks it at once) |
| `OTR_COOKIE_SECURE` | auto | The cookie's `Secure` flag: on over HTTPS (or `X-Forwarded-Proto: https`), `1` always, `0` never |

Serve it over HTTPS (behind the company's web server or load balancer) whenever it is reachable beyond a single
trusted network: over plain HTTP the password crosses the network readable.

## For trainers

In the game: **Settings → Trainer**, then the PIN.

- **New account** (top of the trainee list): the trainee's employee ID, then their name. The game shows a temporary
  password once; give it to the trainee. It is not stored and cannot be shown again.
- **Manage → New password**: a new temporary password for a trainee who forgot theirs or is locked out. Their old
  password stops working and they are signed out everywhere.

The first time a trainee signs in with a temporary password, they must choose their own (at least 8 characters, not
the temporary one) before the game starts.

The same through the API, with the trainer PIN:

```
# list accounts (no passwords or hashes in the answer)
curl -H "X-Trainer-Pin: 4821" http://localhost:8080/api/accounts

# create one: answers { "id", "name", "tempPassword" }
curl -H "X-Trainer-Pin: 4821" -H "Content-Type: application/json" \
     -d '{"id":"E1234","name":"Jane Doe"}' http://localhost:8080/api/accounts

# a new temporary password (also unlocks the account and signs it out everywhere)
curl -X POST -H "X-Trainer-Pin: 4821" http://localhost:8080/api/accounts/e1234/reset

# remove the sign-in (the trainee's progress is kept)
curl -X DELETE -H "X-Trainer-Pin: 4821" http://localhost:8080/api/accounts/e1234
```

Employee IDs are 1 to 64 letters, digits and `. _ @ -`, starting with a letter or digit. Case does not matter
(`E1234` and `e1234` are the same account), and progress is filed under the lower-case ID.

## For trainees

Sign in with your employee ID and password. Forgot your password? A trainer can give you a new one. On a shared PC,
use **Settings → Sign out** when you finish (closing the browser usually ends the sign-in too, but a browser that
restores its last session may keep it).

## How it is kept safe

- **Passwords** are stored only as scrypt hashes (Node's built-in `crypto.scrypt`, N=16384, r=8, p=1) with a random
  16-byte salt per password, in `accounts.json` (readable by the server's user only). They are compared in constant
  time. Nothing logs a password.
- **In the browser** nothing about the sign-in is stored: no password, temporary password, token or hash in
  `localStorage` or `sessionStorage`. The server sets one cookie, `otr_sid`: a random 256-bit session id,
  `HttpOnly` (page scripts cannot read it), `SameSite=Strict`, `Path=/`, `Secure` over HTTPS, and with no expiry date,
  so it ends when the browser closes.
- **Sessions** are kept in the server's memory. They end after `OTR_SESSION_HOURS`, after
  `OTR_SESSION_IDLE_MINUTES` unused, on sign-out, when the password is changed or reset, and when the server restarts
  (everyone signs in again). A session from a temporary password can only choose a new password, and lasts 15
  minutes. A new password gives a new session id.
- **Wrong passwords**: 5 in a row lock that employee ID for 15 minutes; 10 from one address in a minute make that
  address wait a minute. Behind a proxy every trainee may share one address, so the address limit is kept small and
  short. The lock counts are in memory, so a restart clears them.
- **Bursts of sign-ins**: each try counts against its address and its employee ID the moment it arrives, before
  the password is checked (a successful sign-in gives its count back). So 200 tries sent at once from one address
  get at most 10 password checks, and tries sent at once at one ID get at most 5 before it locks.
- **Password checks are rationed**: each one deliberately costs about 50 ms of CPU and 16 MB of memory, so the server
  runs at most 4 at a time with up to 16 more waiting their turn. This one ration covers every password check and
  hash: sign-in, a trainee changing their password, and a trainer's New account and New password. Any request beyond
  that is answered at once, without hashing, with "The training server is busy. Try again in a moment." (HTTP 503);
  a sign-in turned away is not counted against its address. A flood from many addresses, or a trainer creating many
  accounts at once, therefore cannot tie up the server's CPU or its worker threads; the game, progress saves and
  sessions already signed in carry on. (These are `maxHashing` and `maxQueue` in `server/auth.js`.)
- **Password changes, one at a time**: each account changes its password one request at a time. Another change that
  arrives while one is being checked (from the same session or another session of that account) is answered at once,
  without hashing, with "Your password is already being changed. Try again in a moment." (HTTP 409). Before the new
  password is saved the server checks again that the session is still the same live one and the password has not
  changed or been reset meanwhile, so only one of a burst of changes can succeed; it then ends every other session as
  usual. A wrong current password counts towards the same 5-in-a-row lock as a wrong sign-in, so a stolen session
  cannot be used to guess the current password either.
- **No hints about who has an account**: an ID that does not exist gets the same message, the same lock and a
  password check of the same cost as one that does.
- **Cross-site requests**: sign-in and password changes take only a JSON body, which a form on another site cannot
  send, and the `SameSite=Strict` cookie is never sent from another site.
- **Which files are served**: only the game's own (an allow-list: `index.html`, `first-person.html`,
  `imsmanifest.xml` and the `assets`, `css`, `data`, `lib` and `src` folders). The data folder (progress and
  accounts), `server/`, `docs/`, `test/` and `.git` are never served, wherever `OTR_DATA_DIR` puts the data folder.
  These checks ignore case (Windows and macOS disks do too, so `/SERVER/DATA/accounts.json` is refused like the
  lower-case path), and refuse any path with a backslash, `%` left after decoding (double encoding), `~` (Windows
  short names like `SERVER~1`), a trailing dot or space, `:` (alternate streams such as `accounts.json::$DATA`), a
  leading dot or a Windows device name. The file actually opened is checked again after links and short names are
  resolved.

The code is `server/auth.js` (the logic), `server/server.js` (its API), `src/core/signin.js` (the screen) and
`src/core/identity.js`. Tests: `node test/auth.js` (Node only) and `node test/signin.js` (a browser).
