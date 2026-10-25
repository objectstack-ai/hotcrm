---
---

No user-facing change (#2250). A member who holds no HotCRM permission set yet already opens
HotCRM on the platform's "Nothing in HotCRM is available to you yet" page on ObjectStack 18.1.0
(objectstack-ai/objectstack#25338), not on the Service Overview dashboard. This pins that landing,
and every other persona's, in `test/app-navigation-audience.test.ts`, and notes it beside the
navigation order.
