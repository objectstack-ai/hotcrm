---
---

Re-scope the freshness warrant that opens **Security & Compliance**, in all three
locales. The callout said the page had been checked against "the installed
`@objectstack/*` packages — **17.1.0**, all 51 of them". This app has installed
17.2.0 since the 2026-09-01 platform upgrade, so the sentence that tells a reader
*what the page was measured against* was naming a version the app no longer runs —
on the one page whose entire framing is "every claim below was measured".

Deliberately **not** a renumber to 17.2.0. Nobody has re-checked the page's
security claims against the newer line, so rewriting the version would have
converted a stale warrant into a fabricated one — a page of security and
compliance assertions silently re-dated to a measurement that was never taken.
The callout now says which version the measurement was taken on, that the pin has
since moved, that the page has not been re-checked against it, and why it was not
simply re-dated. A reader keeps the one thing the sentence exists to give them:
the ability to judge how fresh the page is.

Three other `17.1.0` mentions on the same page are **provenance** — when a
platform capability arrived (`sys_audit_log`'s `read` action, `maskingRule`) —
not freshness. They stay true across any pin bump and are untouched, byte for
byte, in every locale.

"all 51 of them" is dropped rather than refreshed. The number is a hand-copied
machine figure whose only source of truth is the installed tree, which is exactly
what the documentation-discipline rule keeps out of prose — and the count is
ambiguous in a way no reader can resolve: the same tree yields 12 (declared in
`package.json`), 51 (directories actually installed) or 55 (named in
`pnpm-lock.yaml`). What the figure was *doing* — saying the sweep covered the
whole installed tree and not just the declared dependencies — is now said in
words, which cannot go stale.

Re-measuring the page's claims against 17.2.0 and re-dating it is a separate,
larger piece of work and is deliberately not attempted here.

Documentation prose only — no metadata, schema or behaviour change.
