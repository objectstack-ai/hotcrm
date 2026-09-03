---
'hotcrm': patch
---

Security & Compliance: `lockout_threshold: 0` disables the **password-stage**
lockout, not every brute-force limit. The page said `0` "disables lockout
entirely" and, in Tips, "no account lockout at all" — measured against the
installed 17.2.0, two-factor verification keeps a built-in limit of 10 attempts
per 15 minutes that no setting reaches. The correction states which control
exists and which does not: that limit guards the second factor only, and
two-factor is off by default here, so a stock password-only sign-in still has no
account lockout. All three locales.
