/*
 * Who is training, and where their progress lives. Resolved once, before the game boots (main.js waits for it).
 *
 *   OTR.identity.resolve() -> Promise<{ mode, id, name, locked }>
 *
 * Three ways a company can run the academy, tried in this order:
 *   'scorm'  - launched from a learning-management system: the learner comes from the LMS (SCORM 1.2 or 2004) and
 *              progress is kept in the LMS's suspend data. Nothing else to set up.
 *   'server' - served by server/server.js (or anything implementing its small API): the server says who is signed in
 *              (from the header a company proxy or Windows sign-in sets, or the ?user= on the launch link) and keeps
 *              each trainee's progress in its own file. A trainee on any company PC gets their own progress back.
 *   'local'  - opened from disk or a plain web server: progress stays in this browser, as before. A ?user= on the
 *              link still keeps trainees apart on a shared PC.
 * In 'scorm' and 'server' modes the trainee's name comes from the sign-in (locked: no name entry, no "new profile").
 */
window.OTR = window.OTR || {};

OTR.identity = {
  mode: 'local',
  id: null,
  name: null,
  locked: false,
  scorm: null,

  resolve() {
    const q = new URLSearchParams(window.location.search);
    // a test run (?scenario=) or the art lab never signs anyone in: throwaway progress, as before
    if (q.get('scenario') || q.get('lab')) return Promise.resolve(this);
    const api = OTR.scormApi.find();
    if (api) {
      this.scorm = api;
      if (api.init()) {
        this.mode = 'scorm';
        this.id = api.get(api.v2004 ? 'cmi.learner_id' : 'cmi.core.student_id') || null;
        this.name = OTR.identity.tidyName(api.get(api.v2004 ? 'cmi.learner_name' : 'cmi.core.student_name') || '');
        this.locked = true;
        return Promise.resolve(this);
      }
    }
    const user = q.get('user');
    if (window.location.protocol === 'file:') return Promise.resolve(this.localUser(user, q.get('name')));
    return this.fetchJSON('api/whoami' + (user ? '?user=' + encodeURIComponent(user) : ''), 2500)
      .then(who => {
        if (who && who.id) {
          this.mode = 'server';
          this.id = String(who.id);
          this.name = who.name && who.name !== who.id ? who.name : OTR.identity.nameFromId(this.id);
          this.locked = true;
          this.trainerPinSet = !!who.trainerPinSet;
          return this;
        }
        return this.localUser(user, q.get('name'));
      })
      .catch(() => this.localUser(user, q.get('name')));
  },

  /** A sign-in with no display name: "jane.doe" or "jane_doe" reads as "Jane Doe"; "jdoe" stays as it is. */
  nameFromId(id) {
    const parts = String(id).replace(/@.*$/, '').split(/[._-]+/).filter(Boolean);
    return parts.length > 1 ? parts.map(p => p[0].toUpperCase() + p.slice(1)).join(' ') : String(id);
  },

  localUser(user, name) {
    if (user) { this.id = user; this.name = name || user; this.locked = !!name; }
    return this;
  },

  /** LMS names often come as "Last, First". */
  tidyName(n) {
    const m = /^\s*([^,]+),\s*(.+)$/.exec(n);
    return (m ? m[2] + ' ' + m[1] : n).trim();
  },

  fetchJSON(url, timeout, opts) {
    const ctl = window.AbortController ? new AbortController() : null;
    const t = ctl ? setTimeout(() => ctl.abort(), timeout || 4000) : null;
    return fetch(url, Object.assign({ cache: 'no-store', credentials: 'same-origin', signal: ctl && ctl.signal }, opts || {}))
      .then(r => { if (t) clearTimeout(t); if (!r.ok) throw new Error('HTTP ' + r.status); return r.json(); });
  }
};

/* Minimal SCORM runtime: finds the LMS's API object up the window chain (or in the opener) and wraps 1.2 and 2004. */
OTR.scormApi = {
  find() {
    const look = (w) => {
      for (let i = 0; w && i < 12; i++) {
        try {
          if (w.API_1484_11) return { raw: w.API_1484_11, v2004: true };
          if (w.API) return { raw: w.API, v2004: false };
        } catch (e) { return null; }          // a cross-origin parent: no LMS reachable from here
        if (w.parent === w) break;
        w = w.parent;
      }
      return null;
    };
    let f = look(window);
    if (!f && window.opener) f = look(window.opener);
    return f ? this.wrap(f.raw, f.v2004) : null;
  },

  wrap(raw, v2004) {
    const call = (a, b, ...args) => { try { return v2004 ? raw[a](...args) : raw[b](...args); } catch (e) { return ''; } };
    const api = {
      v2004,
      ok: false,
      init() { this.ok = String(call('Initialize', 'LMSInitialize', '')) === 'true'; return this.ok; },
      get(k) { return this.ok ? String(call('GetValue', 'LMSGetValue', k) || '') : ''; },
      set(k, v) { return this.ok && String(call('SetValue', 'LMSSetValue', k, String(v))) === 'true'; },
      commit() { return this.ok && String(call('Commit', 'LMSCommit', '')) === 'true'; },
      finish() { if (!this.ok) return; this.commit(); call('Terminate', 'LMSFinish', ''); this.ok = false; },
      /** Progress as the LMS sees it: complete once every module is passed, and a 0-100 score. */
      report(o) {
        if (!this.ok) return;
        const score = Math.round(Math.max(0, Math.min(100, o.score || 0)));
        if (v2004) {
          this.set('cmi.score.min', 0); this.set('cmi.score.max', 100); this.set('cmi.score.raw', score);
          this.set('cmi.score.scaled', (score / 100).toFixed(2));
          this.set('cmi.completion_status', o.complete ? 'completed' : 'incomplete');
          if (o.complete) this.set('cmi.success_status', o.passed ? 'passed' : 'failed');
        } else {
          this.set('cmi.core.score.min', 0); this.set('cmi.core.score.max', 100); this.set('cmi.core.score.raw', score);
          this.set('cmi.core.lesson_status', o.complete ? (o.passed ? 'passed' : 'failed') : 'incomplete');
        }
      }
    };
    return api;
  }
};
