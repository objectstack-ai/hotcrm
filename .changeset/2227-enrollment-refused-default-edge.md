---
'hotcrm': patch
---

Enroll Members (`campaign_enrollment`): the "Anyone Refused?" decision now routes a clean run through a default edge instead of a second, complementary condition, so Studio's Problems panel no longer warns that the decision has no default branch. Runs end exactly as before: a run that refused nobody completes with the success message, and a run with any refusal ends refused with the enrolled and refused counts. Also corrects an authoring comment in the contract-activated billing hand-off flow that described how decisions routed before the 18.0.0 engine.
