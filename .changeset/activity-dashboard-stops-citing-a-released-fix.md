---
---

Comment text only — this PR releases nothing to HotCRM users, so the frontmatter
above is deliberately empty (the sanctioned "releases nothing" declaration that
`.github/workflows/changeset-check.yml` documents, on par with the
`skip-changeset` label). No object, dataset, widget, layout, filter or exported
symbol changed: every changed line in the diff is inside a comment, and the
dashboard the app builds is byte-identical.

`src/dashboards/activity.dashboard.ts`'s "No `dateRange`, deliberately" block
stated objectstack#3777 — a bare `YYYY-MM-DD` upper bound dropping everything
created after midnight — as "a separate, still-open defect", and made "until
both are settled and browser-verified" the standing reason the Sales Activity
dashboard has no date picker. Both named cards are closed and released, and the
app runs on a line that carries them:

- objectstack#3912 (the epoch-ms coercion) and objectstack#3777 (the bare-day
  upper bound) both appear under the **17.0.0** heading of the installed
  `@objectstack/driver-sql` CHANGELOG; #3777 is under the 17.0.0 heading of
  `@objectstack/service-analytics` too, and #3912 is referenced there under the
  same heading.
- `package.json` pins the `@objectstack/*` line at **17.3.0**, and both
  installed packages self-report `17.3.0`. Nothing between 17.0.0 and 17.3.0
  reverts either fix.
- Executed rather than inferred, on the very field this dashboard would window:
  against a real SQLite database, a bare `$lte: '2026-05-06'` on
  `crm_event.start_datetime` returns the 23:30 row (the #3777 symptom is gone)
  and a `$gte` floor excludes older rows instead of matching every one (the
  #3912 symptom is gone). `test/dashboard-date-range-window.test.ts` makes the
  same measurement part of CI and is green.

The same directory already contradicted the claim: `service.dashboard.ts`
records both closures correctly, which is why #1157 restored the Service
picker. A reader of `src/dashboards/` therefore got two different answers about
the same two upstream cards depending on which file they opened, and the stale
one was written as an instruction.

**This does not add a date picker to Sales Activity, and the reason it has none
survives the correction — restated so it stands without the dead premise.** It
is now a product reason rather than a platform one: the runtime ANDs
`dateRange` into every widget query, and both questions a picker would answer
are already answered here by widgets a range would narrow rather than serve.
The trend is on an AXIS (`activity_by_week` groups on the
`event_metrics.start_datetime` dimension, which declares
`dateGranularity: 'week'`), and recency is SELF-SCOPED (the three quiet-account
tiles each carry their own `$lt` `{30_days_ago}` / `{60_days_ago}` /
`{90_days_ago}` window on `crm_account.last_activity_date`). Both were verified
against the widget and dataset declarations, not against the comment under
correction. Whether the dashboard should gain a picker is a product judgement
left open on its merits; the comment now says what that work would be — a
`dateRange` plus explicit `filterBindings` opt-outs — instead of implying a
platform restriction waiting to lift.

The widget-level comment on `activity_by_week` pointed at the header note "on
why a datetime filter bound cannot be trusted yet" and is corrected with it.

One same-class instance is deliberately **not** fixed here, because it is
outside this card's file scope and is reported instead:
`test/dataset-granularity.test.ts` still calls the datetime filter bound "the
thing the app cannot trust yet" and cites this header note for it, while
`test/action-references.test.ts` already records both cards as "released as of
17.0.0 GA".
