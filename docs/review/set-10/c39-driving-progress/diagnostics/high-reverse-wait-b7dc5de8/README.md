# Incomplete High larger-text native drive

This run completed 132 assertions, three actual hazard responses and three reverse bays; it stopped while reversing into the fourth bay. It is rejected as native acceptance. The saved state still had reverse speed -1.9 m/s and no recorded violation or page error. Puppeteer emitted its generic Waiting failed wrapper; the old test saved only the wrapper stack and omitted its cause. This report alone does not establish whether the transport or the parking predicate caused it.

The corrected test will record nested causes and the actual target/frame state. A bounded parking wait uses the unchanged live game clock plus a wall limit, and the protocol wait is longer than those declared limits. Gameplay, scores, parking rules and resource budgets are unchanged. A successful rerun is still required.
