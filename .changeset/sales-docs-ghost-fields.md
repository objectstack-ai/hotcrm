---
'hotcrm': patch
---

Sales docs: describe the contact opt-out flags, the lead score and the Chinese
`presented` quote status as they actually ship.

Three sections of the sales pages (and their zh-Hans / zh-Hant siblings)
described a product surface that does not exist, so a reader following them went
looking for fields and behaviour they could never find:

- **Contacts** advertised a fax field and a *Fax Opt-out* flag. `crm_contact`
  has neither `fax` nor `fax_opt_out`; both rows are removed rather than
  answered with new fields, since whether HotCRM should carry a fax number is a
  product decision and not something a docs page gets to settle. The two flags
  that do exist are now split by how far they are actually enforced:
  `email_opt_out` hides the **Send Email** action and suppresses the welcome
  email, while `do_not_call` is a marker that nothing in the product reads — the
  page had claimed it blocks logging a *Call* task. The "admin-only, reps can
  only request a change" sentence is gone too: no profile declares field-level
  permissions on either flag, so every rep who can edit the contact can clear
  them.

- **Leads** described a 0-100 score plus `budget` and `timeline` fields. There
  is one quality field, `rating` — labelled *Lead Score*, a 1-5 star rating —
  and the scoring section is rewritten against `computeRating` in
  `lead.hook.ts`: the real weights (email domain, phone, senior title, industry,
  headcount, revenue), rounding to whole stars, and the two limits the old text
  hid — it runs on **create only** and never overwrites a rating the caller
  supplied. The SLA table now matches `lead-assignment.flow.ts`: four stars or
  better is due **tomorrow** (`TODAY() + 1`) with an inbox **and** email alert,
  everything else in three days with an inbox alert. Nothing extra happens at
  five stars, and no lead ever scores 0.

- **Quotes (zh)** translated the `presented` status as 「已呈现」/「已呈現」
  while the shipped `zh-CN` locale pack calls it 「已提交」, so a Chinese reader
  could not match the word in the docs to the word on screen. The pages follow
  the locale pack, on the status table and in every sentence that names the
  status.
