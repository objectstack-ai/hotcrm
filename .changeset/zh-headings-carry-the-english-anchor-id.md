---
---

Docs only: a Chinese (zh-Hans / zh-Hant) heading now carries the same English explicit anchor id
as its English twin (`## 营销活动加入流程 [#campaign-enrollment-flow]`), so one anchor vocabulary
serves every locale (#1359). The same-page links on the campaigns and security-and-compliance
pages, which were reduced to plain text because they had nowhere to land, are links again; the
cross-page zh links to the campaign enrollment flow, quote generation and case escalation sections
jump to the section rather than the top of the page; and the one localized anchor
(`#字段级安全` on the zh-Hans sharing-and-security page) now uses the English id
`#field-level-security`. `test/docs-anchor-links.test.ts` resolves every one of them.

This PR releases nothing to HotCRM users, so the frontmatter above is deliberately empty (the
sanctioned "releases nothing" declaration `.github/workflows/changeset-check.yml` documents).
