---
"hotcrm": patch
---

Clause-②: no
Metadata-protocol: none

**A marketplace listing's release notes now cover every version since the last published one (#2501).** A version whose changelog section opens "First published release since X.Y.Z: …" now lists that section and every earlier section down to X.Y.Z, so a 6.2.0 installer reading the 6.4.0 listing also reads the 6.3.0 and 6.2.1 entries that section points to. Before, the listing carried 6.4.0's section alone. The notes stay within 8,000 characters. When they would run longer, whole entries are dropped from the end, never cut partway. The listing then says it is truncated, names each dropped entry by its headline and points to CHANGELOG.md. A section that mentions a "published release since" in any other form now stops the publish instead of sending one section.
