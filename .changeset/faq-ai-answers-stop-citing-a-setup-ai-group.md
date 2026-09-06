---
'hotcrm': patch
---

The FAQ's AI Copilot answers stop citing a `Setup → AI` group that does not
exist.

`reference/faq` told a reader with a stale Copilot answer to "re-index at
*Setup → AI → Knowledge Bases → Refresh*", and a reader with slow AI responses
to "check the AI dashboard (*Setup → AI → Health*)". Setup ships no `AI` group,
so neither path has a first segment, let alone a screen at the end of it.
Re-resolved against the installed platform (`@objectstack/* 17.3.0`) the way
`test/docs-setup-navigation-names.test.ts` builds its roster — `SETUP_APP.navigation`
plus `SETUP_NAV_CONTRIBUTIONS` plus `SetupAppTranslations`, 215 Setup labels
across the four shipped locales:

- Setup's nine groups are *Overview*, *Apps*, *People & Organization*, *Access
  Control*, *Approvals*, *Configuration*, *Diagnostics*, *Integrations*,
  *Advanced*. No *AI* among them.
- `AI` **is** a group — in **Studio**, holding *Agents* / *Tools* / *Skills*.
  This is #1113's second pass again: a real label cited under the wrong app.
- *Knowledge Bases*, *Refresh* and *Health* resolve to nothing in either app,
  in any of the four locales. Setup has no dashboard of any kind.

Both answers were open questions rather than mechanical corrections, because
neither surface they promised had been measured. Both now are:

- **Nothing re-indexes.** The Copilot queries published `crm_knowledge_article`
  records directly, so a saved edit is live immediately. HotCRM declares no
  knowledge source (the platform's own vector store is configured at **Setup →
  Configuration → Knowledge**, and nothing in this app consumes it), and
  `ai-copilot/knowledge-bases` already says in its own words that there is "no
  nightly re-index and no manual re-index button". The answer is now a denial
  that ends somewhere useful: correct the article at **Service → Knowledge**.
- **`Configuration → AI & Embedder` is provider configuration, not health.**
  Its settings namespace is `ai` — "LLM provider, model, credentials, and
  embedder configuration" — carrying provider selection, API keys, models,
  generation defaults, conversation titles and two observability toggles. Its
  only gestures are the *Test connection*, *Test embedder* and *Reset to
  environment defaults* buttons: a point-in-time probe, not a monitor. Nothing
  on it reports latency or throughput. The answer now denies the dashboard,
  names that page for what it is, and drops "knowledge-base re-indexing in
  progress" from the list of causes, since nothing re-indexes.

All three locales, lines 107 and 120 only. The two replacement paths are
written **bold**, which moves both claims from a shape no guard parses into the
one #853's rule 2 and #1117's rule 3 resolve live — the italics are why these
two lines survived every pass that cleared the quarantine ledger. Per #1368 the
zh-Hant face names navigation in English; the zh-Hans face names it in the
zh-CN labels the console shows (**设置 → 配置 → AI 与 Embedder**, **服务 →
知识库**).
