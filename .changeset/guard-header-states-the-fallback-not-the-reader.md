---
---

Comment prose only — this PR releases nothing to HotCRM users, so the
frontmatter above is deliberately empty (the sanctioned "releases nothing"
declaration that `.github/workflows/changeset-check.yml` documents, on par with
the `skip-changeset` label). No `src/` metadata changed, and nothing executable
in the guard this edits.

`test/docs-setup-navigation-names.test.ts` stated two different reasons for the
same convention, 260 lines apart, and the wrong one came first. The #1113
history section in the file header explained why the thirteen zh-Hant strings
described a surface that exists in no configuration with *"so a zh-Hant reader
sees the English UI"* — the causal claim #1368 struck as measured false. The
`KNOWN_UNRESOLVED_CRM` comment further down already states the measured reason
and bans that form outright, so the file contradicted itself in the section a
reader goes to for background.

The console falls back to Simplified. Measured by booting a real console and
reading the Setup sidebar across five locales: `zh-Hant-TW`, `zh-TW` and `zh-HK`
all render `htmlLang=zh` with Simplified strings (仪表盘 / 系统概览 / 软件包 /
用户), because the console ships one Chinese bundle and selects on the primary
subtag. A Traditional reader is not shown English; they are shown Simplified.

The header now carries the wording `AGENTS.md` sanctions in its Chinese-doc
rules: the console falls back to Simplified, so a Traditional page labels
platform navigation in English rather than ship mixed Simplified/Traditional
script. The convention itself — zh-Hant pages spell platform navigation in
English — is unchanged and was always correct; only the reason offered for it
was wrong, which is why the English clause now carries the *"rather than ship
mixed Simplified/Traditional script"* half that actually justifies it.

One cross-reference is added, and no more. The bullet closes by pointing at
`KNOWN_UNRESOLVED_CRM`, which states the reason in full and carries the ban, so
the next reader of the history section lands on the authoritative statement
instead of re-deriving the struck one. The header is otherwise not reorganised:
the two statements are made to agree and linked, not merged into one.

No rule, ledger or roster moved. `CITATION`, `CRM_CITATION`, `APP_WORDS`,
`RETIRED_UI_NAMES`, `KNOWN_UNRESOLVED` and `KNOWN_UNRESOLVED_CRM` are
byte-identical, and the suite's 18 tests pass unchanged. Worth recording that
nothing in CI could have caught this: the file is exempt from its own rule 1 as
`SELF`, which is what lets it spell a retired name at all, and no check anywhere
reads a comment. The drift was found by the PR that fixed the ledger comment
sitting 260 lines below it.
