---
---

No behaviour change, releases nothing a CRM user would notice. For maintainers: `src/revenue` is back under its token-ratchet ceilings without moving either one (business semantics ~16,051 → ~15,641 of 16,000; authored total ~19,161 → ~18,752 of 19,000). The space comes from removing duplicated code and one unused value in the revenue hooks and the Generate Quote flow: every refusal, stored value and branch the flow takes is the same as before. One wording fix rides along: the contract activation hook's description no longer mentions a renewal task, because the Contract Renewal Reminder flow creates that task, not this hook (#2037).
