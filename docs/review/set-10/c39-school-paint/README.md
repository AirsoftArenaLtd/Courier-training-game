# School painted-bay gate: proposed correction

The school finish gate currently delegates to the general driving checkpoint. That checkpoint permits lateral parking beyond the painted side, 0.2 m of end tolerance and a reversed van. Three added regressions fail against the current school source; all ten school cases pass with `school-paint.patch` applied only in the isolated VM.

This patch adds the same whole-body paint and traffic-direction checks used by the junction course. It keeps the existing stopped/brake, curb, map and obstacle checks. An invalid finish remains incomplete with zero result and retains the two observed school checks.

**Now applied after the frozen validator ended:** the school-only predicate and three regressions are integrated in the work branch. All ten school cases and fourteen unchanged junction cases pass. The earlier draft was kept separate while the validator froze its input tree. `before.js` uses those original files; `after.js` substitutes only `fpschoollesson.proposed.js`. The proposed source and exact patch retain the reviewed before/after change. This is component evidence, not a native school acceptance or graphics claim. The existing school browser fixture must also be checked after integration.
