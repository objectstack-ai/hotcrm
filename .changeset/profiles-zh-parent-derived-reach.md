---
'hotcrm': patch
---

Brings the two Chinese `profiles` pages to the reach the platform actually
computes, and puts a guard on the sentence that says so. Prose and tests only —
every profile grant, OWD, sharing model and sharing rule is byte-identical, and
the English page is untouched: it is the baseline the two translations were
measured against.

PR #699 rewrote the Sales Representative block on
`content/docs/administration/profiles.mdx` after
`test/parent-derived-reach.test.ts` measured what the ADR-0055 derivation does on
17.0.0-rc.2. `profiles.zh-Hans.mdx` and `profiles.zh-Hant.mdx` did not follow, so
for six weeks they told their readers the opposite of what the English page told
theirs — not merely stale wording, but a promise the platform does not keep:

- **Contacts** read "跟随客户 / 跟隨客戶" — the rep sees contacts under the accounts
  they can see. Measured, a rep who can read exactly one account reads **both**
  accounts' contacts. Now: every contact in the org, because Contact is
  Controlled by Parent and that derivation resolves org-wide rather than per
  account, with the same cross-reference the English bullet carries into
  *Controlled by Parent, in practice* on the sharing page.
- **Opportunity and quote line items** read "对自己的交易和报价拥有完整权限 /
  對自己的交易和報價擁有完整權限" — control scoped to the rep's own deals. Measured, a
  rep who can read **no** quote at all still reads every quote's lines. Now:
  every deal's and every quote's lines, not only the rep's own.

Both pages now use the vocabulary the corrected sharing pages settled on
(“由父级控制”/「由父層控制」, 派生/衍生), so a reader moving between the two admin pages
meets one set of terms.

Nothing was red while this drifted: every rule in `test/sharing-coverage.test.ts`
read `sharing-and-security`, the OWD and related-list rules parse tables this page
does not have, and `docs-drift.test.ts` compares callout counts, which #699 did
not change. That file now also pins the profiles claim in all three locales, on
the parsing infrastructure PR #811 left behind — a bullet-list reader beside the
existing table reader, an authored-per-locale claim ledger, and the same
anti-vacuum discipline. What it pins is co-movement: the truth stays measured by
`test/parent-derived-reach.test.ts`, which goes red the day the platform narrows
the derivation (objectstack-ai/objectstack#5386) — the signal to rewrite all six
pages and re-take the OWD decision (#549). The three objects the block describes
are checked against the compiled stack, so the claim cannot outlive the
derivation it describes.

Refs #807, #791, #699.
