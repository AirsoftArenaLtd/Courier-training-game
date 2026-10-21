# Notes for the company's IT team

What the game needs from a company network, in plain words. Checked by `node test/offline.js`.

## Short version

- The game makes **no requests to the internet**. Every script, picture, sound and data file is served by the training
  server (or, in an LMS, from inside the SCORM package). A test blocks every outside address and plays from the
  title screen into the 3D workday.
- The only address a training PC has to reach is **the training server**. No other website, CDN, font service or
  analytics address needs to be allowed.
- No browser plug-in, download or installer. A current Chrome, Edge or Firefox with **WebGL** (hardware graphics
  acceleration on) is needed for the 3D workday.

## The training server

| | |
| --- | --- |
| Program | `node server/server.js` (Node 18 or newer; no packages to install) |
| Port | `OTR_PORT`, default **8080**, plain HTTP |
| Listens on | `OTR_HOST`, default `0.0.0.0` (all addresses) |
| Files it writes | one folder, `OTR_DATA_DIR` (default `server/data`): one JSON file per trainee, the trainer settings, and `accounts.json` when employee ID sign-in is on |
| Needs the internet | No. It makes no outgoing connections, except to the company's learning record store if xAPI is switched on (`OTR_XAPI_ENDPOINT`; off by default). |

Put it behind the company's web server or load balancer for HTTPS (passwords cross the network when employee ID
sign-in is on; see `docs/SIGN-IN.md`). Over HTTPS the sign-in cookie is marked `Secure` automatically; behind a proxy
that ends HTTPS, send `X-Forwarded-Proto: https`.

### What a training PC (the browser) calls

- `GET /` and the game's own files (`/index.html`, `/src/...`, `/data/...`, `/lib/...`, `/assets/...`, `/css/...`).
- `GET/POST /api/...` on the same address and port, for the sign-in, the trainee's saved progress and the trainer
  tools. Nothing else. (`docs/SIGN-IN.md` and the header of `server/server.js` list the calls.)
- Everything uses the same origin: no cross-site requests, so no CORS settings are needed.

### Firewall rules

| From | To | Port | Why |
| --- | --- | --- | --- |
| Training PCs | the training server | 8080 (or the HTTPS port of the proxy in front) | the game and the trainee's saved progress |
| The proxy or load balancer | the training server | 8080 | when a proxy sits in front |
| The training server | the company's learning record store (only if xAPI is on) | the store's HTTPS port | finished workdays sent as xAPI statements |
| Anything else | the internet | none | the server and the game never go out otherwise |

### Sign-in options (pick what the company already has)

1. **Company sign-in in front of the server** (IIS/Windows authentication, an SSO proxy): the proxy sets
   `X-Remote-User` (and optionally `X-Remote-Name`); the game uses it. Set `OTR_ALLOW_QUERY_USER=0` so nobody can
   open someone else's progress through the link.
2. **An LMS** (SCORM 2004 or 1.2): build the package with `node test/tools/package-scorm.js` (SCORM 2004, the
   default) or `node test/tools/package-scorm.js --1.2` for an LMS that only takes SCORM 1.2. It holds only what the
   game loads (about 11.5 MB and 209 files with the milestone 8 town models and traffic, 20 October 2026; the manifest
   at the top); progress is kept in the LMS. Use 2004 whenever the LMS offers it: it keeps 64,000 characters of saved
   progress. SCORM 1.2 holds 4,096, so the game packs the progress to fit, and on the heaviest later days a day left
   half-way may come back without its drive-map pins (the score is kept). No training server is needed, and no outside
   address either.
3. **Employee ID and password** on the game's own sign-in screen (`OTR_ACCOUNTS=1`, trainers create accounts).

## What can stop the 3D workday from starting

- **WebGL off or blocked.** Group policy or a remote-desktop session without a graphics card can turn it off. Test:
  open `chrome://gpu` (Edge: `edge://gpu`) and look for "WebGL: Hardware accelerated".
- **A very old graphics driver.** Integrated Intel graphics from the last several years is the target. In the game,
  Settings → Graphics → Low makes the 3D lighter.
- **A web filter that blocks script files.** The game is plain JavaScript files (`/src`, `/lib`, `/data`) from the training server; allow them from its address. `lib/three.min.js` (the 3D library, loaded when the 3D view first opens) is one of them.
- **Browser storage cleared on every sign-out** (some shared-PC set-ups). With the training server or an LMS the
  progress is kept off the PC, so this does not matter; in browser-only mode it would.

## Checks the team can run

- `node test/offline.js` (needs the test tools: `cd test && npm install`, plus any Chrome or Chromium) fails if any
  request leaves the training server, including the 3D models, which load from `assets/3d/` in the game folder.
- `node test/package.js` checks the LMS package: only run-time files, every file a page loads, the size budget.
- `node test/scorm-launch.js` (needs Chrome or Chromium; `--2004` for the SCORM 2004 package) launches the package as an
  LMS does, in a frame with that version's SCORM API: the game must find the LMS and read the learner, the 3D workday must load every model at Low and High
  from the zip, and nothing may be missing from it or come from outside it.
- **3D model files:** free CC0 models and textures in `assets/3d/` (each pack with its licence; `docs/ASSETS.md`), at
  most 40 MB in all and 15 MB for the Low graphics setting. They are served like the rest of the game; nothing is
  downloaded from the internet. `node test/assets.js` checks the licences and sizes.
- `node test/auth.js`, `node test/signin.js` and `node test/enterprise.js` cover sign-in, the training server and the
  LMS packaging.
