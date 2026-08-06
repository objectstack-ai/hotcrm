---
'hotcrm': patch
---

Fix two dangling in-page anchors in the docs, so both links land on the section
they promise instead of the top of the page.

`service/sla-and-escalation` (all three locales) pointed the escalation-trigger
sentence at `/docs/administration/automation#case-escalation`. The automation
page has no *Case Escalation* heading — *Case Escalation Process* is a row in
the table under `## Flows (multi-step)`, which is where a reader chasing the
trigger condition actually has to go. The English page now links
`/docs/administration/automation#flows-multi-step`. The Chinese pages link the
page with no anchor (`/zh-Hans/docs/administration/automation`,
`/zh-Hant/docs/administration/automation`): the heading there is
「流程（多步骤）」/「流程（多步驟）」, whose slug is not `flows-multi-step`,
and un-anchored is the form already used for cross-locale links elsewhere in
the guides.

`guides/mobile` in Chinese pointed the roadmap link at
`/zh-Hans/docs/whats-new#roadmap` (and the `zh-Hant` twin). The heading on the
translated What's New pages is 「路线图」/「路線圖」 — the heading was
translated, the anchor was not — so `#roadmap` resolved to nothing. Both now
link `/zh-Hans/docs/whats-new` and `/zh-Hant/docs/whats-new`. The English
`guides/mobile` keeps `#roadmap`, which resolves to the `## Roadmap` heading it
has always had.
