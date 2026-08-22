---
'hotcrm': patch
---

Docs: restate the Integrations guide against what the app actually exposes.

The page listed ten connector families as **Built-in** — Slack, Teams, DocuSign,
Stripe, Twilio, Aircall / RingCentral / Five9, Intercom / Zendesk Chat, Gmail /
Outlook, Snowflake / BigQuery / Redshift, Zapier / Make / n8n — each with a
`Setup → Integrations → X` path to configure it at. Measured against the source:
`src/` carries no connector metadata of any kind, no platform package ships a
connector for any of those vendors, and there is no `Setup → Integrations` menu,
so every one of those paths sent the reader looking for a screen that does not
exist. The table is kept as design intent, marked *(not shipped yet)*, pointed at
the roadmap (whose own line already reads "More connectors"), and given a third
column naming the closest thing that does ship for each row.

The rest of the page was measured the same way:

- **Webhooks** are the one real capability here, and the page was wrong in the
  other direction: `@objectstack/plugin-webhooks` genuinely ships an outbound
  webhook service, but HotCRM never enables it — `webhooks` is absent from
  `requires` in `objectstack.config.ts` and is not one of the always-loaded
  capabilities, and the app declares no webhook. Now stated as a deployment
  decision rather than a menu path, with the retry / payload / delivery-log
  specifics handed back to the platform's own docs.
- **GraphQL** is removed: it is not in the product plan and the platform dropped
  the `/graphql` route from its service table. The invented `POST /api/v1/leads`
  example is gone too — objects are `crm_lead` and the route shape follows the
  runtime version.
- **Event bus** (Kafka / EventBridge / Pub-Sub), the **secrets store**
  (Vault / AWS Secrets Manager / GCP Secret Manager, 90-day OAuth rotation) and
  the native **`*.connector.ts` plugin** shape have no counterpart in the
  platform's capability list; each is marked *(not shipped yet)* with the real
  adjacent mechanism named (record-change flows, `secret` fields encrypted into
  `sys_secret` fail-closed, hooks / flows / action bodies).
- A **What ships today** section was added: the HTTP data API, CSV / XLSX export
  from the account / contact / lead / opportunity list views, spreadsheet import,
  outbound Send Email, and the `notify` node's in-app notification.

The Guides index rows for **Email & calendar** and **Integrations** were restated
to match their corrected pages — the email row still advertised "Connect Gmail /
Outlook, two-way sync, email tracking", which the page itself now marks as not
shipped.

zh-Hans and zh-Hant pages updated with the same content.
