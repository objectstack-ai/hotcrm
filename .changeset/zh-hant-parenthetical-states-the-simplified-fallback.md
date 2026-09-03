---
'hotcrm': patch
---

Correct the reason seven zh-Hant pages give for labelling platform navigation in
English. The parenthetical asserted 「主控台介面顯示英文」 — *the console UI
displays English* — which is false. The console falls back to **Simplified**.

The convention itself is unchanged: English navigation labels on Traditional
pages stay exactly as they are. Only the stated reason moves, to the one
`AGENTS.md` already carries — the console falls back to Simplified, so a
Traditional page labels platform navigation in English rather than mix
Simplified glyphs into Traditional prose.

## The measurement

Not a rulebook transcription. Probed against the installed platform
(`@objectstack/console@17.2.0`) served by `objectstack start`, driving Chromium
with a Traditional browser locale and reading what the console rendered:

| `navigator.language` | `document.documentElement.lang` | Setup sidebar renders |
| --- | --- | --- |
| `zh-Hant-TW` | `zh` | 仪表盘 · 系统概览 · 软件包 · 用户 · 组织 · 权限集 · 审批中心 · 审计日志 |
| `zh-TW` | `zh` | same (Simplified) |
| `zh-HK` | `zh` | same (Simplified) |
| `en-US` | `en` | Dashboards · System Overview · Packages · Users · Organization |
| `ja-JP` | `ja` | Japanese |

A strict Simplified/Traditional character fingerprint over the rendered console
home returned **12 Simplified-only characters and 0 Traditional-only** under
`zh-Hant-TW`. The `en-US` and `ja-JP` rows are the negative control: the probe
does read the locale rather than return a constant, and the same fingerprint
does fire on traditional-form glyphs when they are present (the `ja-JP` row).

The mechanism agrees. The console ships one Chinese bundle — its built-in locale
keys are `en · zh · ja · ko · de · fr · es · pt · ru · ar`, with no `zh-Hant`
and no `zh-TW` — and it selects it by primary subtag, so every `zh-*` tag
resolves to the single Simplified `zh` bundle. There is no configuration in
which a Traditional locale lands on English by fallback; English is what an
explicitly English console shows, which is not what these pages claimed.

## Three variants, three surgeries

The seven sites are not one string. Six carry the full form and differ in
whether the full stop sits inside the parenthesis; the glossary carries a short
form with no trailing clause, which needed its reason restored rather than
merely corrected:

- three mid-sentence asides, sentence continues outside the parenthesis —
  `administration/profiles:96`, `administration/setup:14`, `guides/integrations:8`
- three standalone notes, full stop inside —
  `administration/sharing-and-security:71`, `administration/automation:32`,
  `administration/sandbox-and-releases:10`
- one short form, no `因此` clause — `reference/glossary:200`

## The repo already tabulated the refutation

Six zh-Hant pages state the Simplified fallback correctly, `revenue/approvals`
in three tables that enumerate the actual Simplified strings (待我审批 / 我发起的
/ 全部 / 我提交的 / 已完成 / 状态). Those pages are untouched: they were right,
and they are what made the contradiction provable before anything was measured.
