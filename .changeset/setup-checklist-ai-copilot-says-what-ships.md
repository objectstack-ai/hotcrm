---
'hotcrm': patch
---

The admin setup checklist's **14. AI Copilot** section stops citing a `Setup → AI`
group that does not exist, and stops asking for two screens that do not ship.

`administration/setup` line 136 read "Confirm the AI Copilot is enabled (Setup →
AI)" in all three faces — bare parenthesised prose, which is why it survived
every pass that cleared the navigation quarantine ledger: rule 2 of
`test/docs-setup-navigation-names.test.ts` matches a **bold** `**App → …**`
citation, and rule 1 cannot ban `AI`, a real *Studio* group label. The two
adjacent items were filed as suspected-but-unmeasured, and all three are
resolved here against the installed platform (`@objectstack/* 17.3.0`).

**Setup ships no `AI` group.** Its nine are *Overview*, *Apps*, *People &
Organization*, *Access Control*, *Approvals*, *Configuration*, *Diagnostics*,
*Integrations*, *Advanced*; `AI` is a **Studio** group holding *Agents*,
*Tools* and *Skills*. Re-resolved the way the guard builds its roster —
`SETUP_APP.navigation` + `SETUP_NAV_CONTRIBUTIONS` + `SetupAppTranslations`
across the four shipped locales.

**Nothing enables the Copilot.** The `ai` settings namespace behind
*Configuration → AI & Embedder* carries no master switch: its only toggles are
*Auto-summarize conversation titles*, *Record traces* and *Log full prompts*,
and its only gestures are *Test connection*, *Test embedder* and *Reset to
environment defaults*. The one control that looks like the switch — the beta
*AI Assistant* toggle in the `feature_flags` namespace (*Configuration →
Feature Flags*) — ships **off**, and the key `ai_enabled` occurs nowhere in the
installed platform except its own manifest and its four locale labels. What
does decide whether the Copilot can answer is the **provider**, which defaults
to *Memory (echo — testing only)*: an environment that never sets one has an
assistant that replays the question. So the item became that check plus a
denial, not a redirect to a plausible screen.

**There is no per-skill enable surface in Setup.** No Setup entry names skills,
and none of the eleven settings namespaces carries a skill key. Skills are
metadata: `SkillSchema` carries `active` (default `true`), the six HotCRM
skills declare it nowhere and therefore all ship active, and the roster comes
from `allSkills` in `src/skills/index.ts` — an app change, documented under
Customization › AI Skills. The item now points at **Studio → AI → Skills** for
the roster and says the set is decided in the app.

**There are no AI sensitivity or redaction rules to configure.** The only
`redactFields` the platform defines belongs to an object's `publicSharing`
block — "field names removed from records served via a share token", which
`crm_knowledge_article` uses for share links and which has nothing to do with
the Copilot. What limits what the Copilot may read is field-level security, as
`administration/sharing-and-security` already states in its own words: FLS is
enforced in list views, reports, the API and the AI Copilot alike, and the
Copilot reads as the signed-in user. The item now sends the reader there.

Every surviving path is written in **bold**, the shape rule 2 of the guard
resolves live, rather than the parenthesised prose no rule could see. The
localized faces keep their conventions: zh-Hans uses the zh-CN language-pack
labels (**设置 → 配置 → AI 与 Embedder**, **Studio → AI → 技能**), zh-Hant
spells platform navigation in English because the console falls back to
Simplified.
