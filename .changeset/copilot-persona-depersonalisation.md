---
'hotcrm': patch
---

Stop naming a retired persona in the product docs, and pin the version the
release page prints.

`#512` removed the two app-authored agents and ADR-0063 §2 made the surface
skills-only; `#589` / PR `#611` rewrote `content/docs/ai-copilot/*` to match. The
rest of the tree did not follow: 29 product pages across all three locales still
called the assistant "the Sales Copilot" / "the Service Copilot" in running
prose — 65 occurrences. None of them declared a `sales_copilot` agent, so every
gate stayed green: `os validate` and `pnpm lint` walk authored metadata and never
open a paragraph.

Per the maintainer's ruling on `#612`, those pages now say **AI assistant**
(zh-Hans / zh-Hant: **AI 助手**), with each sentence's functional meaning left
alone — only the name changes. The wording follows the architecture the pages
have to describe: AI capability is implemented by agents in
`objectstack-ai/cloud`, and HotCRM contributes domain skills that attach to the
platform assistant (`ask`), so no page implies an app-owned agent any more. Two
zh index pages were also carrying a `## Sales Copilot` / `## Service Copilot`
heading whose English counterpart had already become *Sales AI skills* /
*Service AI skills*; they now match. `content/docs/whats-new.mdx` was the mirror
case — both translations already said "向助手询问" and the English page alone was
still personifying.

Twelve pages keep the names on purpose and are exempt by name, each with its
reason recorded: the nine `ai-copilot/*` retirement callouts PR `#611` wrote, and
the three `whats-new` v1.0 release records, which describe what that release
actually shipped.

`test/docs-drift.test.ts` now enforces both halves so a third cleanup round is
not needed:

- **Persona rule** — no page under `content/docs/**` may write either name.
  The scan normalises soft wraps and blockquote continuation markers before
  matching, because two of the live occurrences were split across lines
  (`the Sales\n> Copilot`, `ask the Sales\nCopilot`) and a line-oriented grep —
  how the original inventory was taken — reads neither. Whitespace between two
  CJK characters is stripped as well, since `ai-copilot/index.zh-Hant.mdx` wraps
  「服務 Copilot」 between 服 and 務. Three vacuity guards keep it honest: the walk
  must find a real tree, every exemption must still cover a live occurrence, and
  a probe test asserts the detector reads all six spellings in every wrap shape —
  without that last one, a detector that had stopped matching would report a
  clean tree and read exactly like success.
- **Version rule** — `docs/RELEASE_STRATEGY.md` had printed `1.0.5` since v1
  while the manifest declared `2.2.2`, a whole major behind on the one page a
  releaser trusts for the current version. It now reads `2.2.2`, and the value
  is extracted from `objectstack.config.ts` `manifest.version` and asserted
  against `docs/RELEASE_STRATEGY.md`, `docs/STATUS.md`, `docs/ARCHITECTURE.md`
  and `README.md`, plus a `package.json` parity check — the alignment
  `RELEASE_STRATEGY.md`'s own *Version Sources* section already asks for.

Docs, prose and tests only: no metadata, no `src/` behaviour, no dependency
changed. Fixes `#612`.
