---
'hotcrm': patch
---

Docs guard: the Setup-navigation test no longer asserts that the platform ships no Traditional-Chinese (zh-Hant) console locale. ObjectStack 18.4.0 adds one, and HotCRM's zh-Hant doc convention rests on HotCRM's own fact instead — the app ships no zh-Hant pack, so its navigation falls back to Simplified. The app-switcher roster check now counts locales rather than distinct labels, since two locales can share one spelling. No change to the app or its docs.
