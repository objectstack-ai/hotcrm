---
"hotcrm": patch
---

Clause-②: no
Metadata-protocol: none

**Escalate Case and Close Case open their screen directly again, with no confirm modal in front of it, in every language (#2532).** #2257 (#2240) took `confirmText` off both actions because the screen that asks for the escalation reason or the resolution is the confirmation, but the four Service locale packs (en, zh-CN, ja-JP, es-ES) kept a `confirmText` for each, and the served action metadata carried it, so the console still asked "Continue?" first. The pack entries are removed, and a new guard in `test/i18n-references.test.ts` fails when any locale pack supplies a `confirmText` for an action that declares none.
