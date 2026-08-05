---
'hotcrm': patch
---

The forecasting guide's **AI** source bullet now describes the Copilot skill
that ships — a read-only analyst — instead of a record writer and a transcript
store, neither of which exists.

`content/docs/sales/forecasting.mdx`, under **How forecasts get created**, told
admins that "the Copilot skill generates a forecast from current pipeline +
recent stage moves + similar past deals. The conversation transcript is stored
alongside the record." Measured against `src/`:

- `revenue_forecasting` declares `tools: ['describe_object', 'aggregate_data',
  'query_records', 'visualize_data']` — four read/visualize tools and no write
  tool at all. Its instructions tell the model to compute the forecast *in the
  answer* ("Forecast by summing weighted value for open deals plus closed-won in
  the period"), and its header says outright that the skill declares no tool
  records.
- Nothing else writes `crm_forecast` either: the only writer in `src/` is the
  nightly `forecast_snapshot` sweep, which stamps `source: 'scheduled'`.
- There is no transcript field to store a transcript in. `notes` (text, 1000
  chars) is the object's only narrative column, and a person types it.

So an admin reading the old bullet waited for rows to appear from Copilot
conversations that will never appear, and looked for a transcript that has
nowhere to live. It also read as a second automated writer of a current-quarter
snapshot, one paragraph above the "exactly one automated writer" rule #702
established and #627 documented.

The rewritten bullet states what the skill does (composes the four read tools
over live opportunity data and answers in the conversation) and what the `ai`
value on `source` actually is today: a value nothing in HotCRM writes, reserved
for a snapshot an agent or integration of your own creates. The field table's
**Source** row carried the same claim in three words — "`ai` (Copilot-generated)"
— and now says the same thing as the bullet, so the page no longer contradicts
itself one screen apart. The picklist option itself is left in place — it is
metadata surface, and whether HotCRM should grow the capability that writes it
is a product question, not a docs fix.

Both Chinese translations carry the same correction. Documentation only — no
metadata, skill, flow or object changed.

Part of #732.
