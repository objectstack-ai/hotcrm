---
"hotcrm": patch
---

Clause-②: no
Metadata-protocol: none

**The source token ratchet is retired (hotcrm#2468).** HotCRM no longer claims that the whole CRM fits in one AI context window, so the check that held each package's authored size under a fixed ceiling (`scripts/check-source-token-ratchet.mjs`, `pnpm hygiene:tokens`, since #1183) is removed, with its CI steps, its place in `pnpm verify`, its tests, every per-package ceiling and the README's token figures. Package size is no longer gated. Nothing changes for an installed app: no metadata, data or behaviour moves. The entry-point helper `scripts/lib/main-module.mjs` and its guard suite go too, since the ratchet was their last caller. The comment stripper the Chinese-term docs guard relies on now lives in `scripts/lib/strip-comments.mjs`, with its own tests.
