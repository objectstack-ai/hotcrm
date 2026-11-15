---
"hotcrm": patch
---

Clause-②: no
Metadata-protocol: none

**When Update Stage moves only part of a selection, the message names the deals that did not move and says why, in the rep's language.** Each refusal shows its own sentence, already in the caller's locale (a closed deal: "Opportunity Stark Medical Pilot is closed (Closed Won); only its Description and Next Steps can still be edited."). A deal that did not move without one is named, and a deal that is gone is counted; no record id and no engine wrapper text is shown. The message says how many moved, since those keep their new stage, and offers a re-run only when a re-run could change the answer, so a closed deal gets no retry line. The action now declares `api.read` to read those names (#2511).
