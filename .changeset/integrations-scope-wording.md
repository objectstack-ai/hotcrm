---
'hotcrm': patch
---

Docs: narrow two absolute claims on the Integrations guide from "this menu does
not exist" to "nothing this app enables mounts anything under it".

`content/docs/guides/integrations.mdx` (all three locales) stated that there is
**no `Setup → Integrations` menu**. Measured against the platform packages, the
group is real: `SETUP_APP` in `@objectstack/platform-objects` declares nine
navigation groups — *Overview*, *Apps*, *People & Organization*, *Access
Control*, *Approvals*, *Configuration*, *Diagnostics*, **Integrations** and
*Advanced* — and three packages contribute entries into `group_integrations`
(`@objectstack/plugin-webhooks` → *Webhooks* + *HTTP Deliveries*,
`@objectstack/service-datasource` → *Datasources*, `@objectstack/mcp` →
*Connect an Agent*). What is true is the narrower statement the page was
reaching for: none of the ten vendor connectors it tables mounts anything
under that group.

The webhooks section made the same claim one level down — "no
`Setup → Integrations → Webhooks` screen to find one under" — while the note
directly beneath it tells the reader to add `webhooks` to `requires`. A reader
who follows that advice gets exactly the screen the page said did not exist.
It now reads as a not-enabled-here state: with `@objectstack/plugin-webhooks`
unloaded its two Setup entries do not appear, and enabling the capability makes
the plugin mount them itself.

Nothing about the connector line-up changes: `src/` still carries no connector
metadata, no platform package ships a connector for any of those ten vendors,
and every `Setup → Integrations → X` path they used to print still points at a
screen that does not exist. Only the menu-existence clause moved — *not shipped*
(the connectors), *not enabled here* (webhooks) and *exists but empty of
connectors* (the group) are now three distinct statements instead of one blanket
"does not exist". See `/docs/guides/integrations`.
