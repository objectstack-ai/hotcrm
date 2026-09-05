---
'hotcrm': patch
---

Say how many names the case-views section used to list, so the English page and
its two Chinese faces state the same fact. Under *Standard list views* on the
cases page the same paragraph opened three different ways: English asserted
"Six names this section used to list are not views at all", while both Chinese
faces asserted a list of seven of which six are phantom.

The two Chinese faces were right. Both sentences entered in one commit, and that
same commit removed the list they point back at — the section's previous
*Standard list views* body, which listed exactly **seven** names: *My Open
Cases*, *Critical Cases*, *Cases Due Today*, *Breached SLA*, *Recently Closed*,
*By Account* and *Service Board*. Six of those seven are the six the bullets
still name as phantom. The seventh, **My Open Cases**, is a real view
(`src/views/case.view.ts`) and survives in the views table directly above the
paragraph. So the Chinese sentence was complete and the English one was terser,
stating the six and dropping the denominator; neither stated anything false.

Parity is reached by raising the English rather than trimming the Chinese, so
only the English line changed. Deleting the "seven" would have removed a
verified fact to tidy an arithmetic — the mirror image of the other tempting
non-fix, adding a seventh phantom bullet to reach seven, which would have
invented a false claim on a page whose whole purpose is naming what does not
exist.

The number is durable in a way roster counts are not: it describes what an
earlier revision of this page listed, not what the app ships, so it cannot go
stale as views are added or removed.
