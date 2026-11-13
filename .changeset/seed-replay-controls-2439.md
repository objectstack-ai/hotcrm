---
---

Tests only, nothing ships: the restart tests that prove the seed replay ran now use a seed row the database never had, instead of one a person deleted, so they hold on 18.3.0 and on 18.4.0, where a deleted sample record stays deleted (#2439).
