---
---

Tests only, nothing ships: the `send_email` pin in `test/script-bodies.test.ts` now reads the `sys_email` insert the engine answered with the id the action returned, not the first insert recorded while it ran. The test boot's email service is now constructed the way `objectstack serve` constructs it, so notification emails in the test suite are no longer refused and retried (#2175).
