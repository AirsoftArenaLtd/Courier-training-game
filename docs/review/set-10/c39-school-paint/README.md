# School painted-bay gate: proposed correction

The school finish gate currently delegates to the general driving checkpoint. That checkpoint permits lateral parking beyond the painted side, 0.2 m of end tolerance and a reversed van. Three added regressions fail against the current school source; all ten school cases pass with `school-paint.patch` applied only in the isolated VM.

This patch adds the same whole-body paint and traffic-direction checks used by the junction course. It keeps the existing stopped/brake, curb, map and obstacle checks. An invalid finish remains incomplete with zero result and retains the two observed school checks.

**Not applied to runtime yet:** the junction native/resource validator has its entire input tree frozen. `before.js` uses those original files; `after.js` substitutes only `fpschoollesson.proposed.js`. The proposed source and exact patch are retained for integration once that validator ends. This is component evidence, not a native school acceptance or graphics claim. The existing school browser fixture must also be checked after integration.
