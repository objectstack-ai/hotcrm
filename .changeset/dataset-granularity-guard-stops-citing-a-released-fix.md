---
---

Comment text only — this PR releases nothing to HotCRM users, so the frontmatter
above is deliberately empty (the sanctioned "releases nothing" declaration that
`.github/workflows/changeset-check.yml` documents, on par with the
`skip-changeset` label). Nothing this repo ships changed: every changed line in
the diff is inside a comment, and no assertion, fixture, import or exported
symbol was touched. `'event_metrics.start_datetime': 'week'` is byte-identical
to what it was — that entry is CORRECT, and the bucket really is declared, on
the `start_datetime` dimension of `src/datasets/event.dataset.ts`.

`test/dataset-granularity.test.ts` stated the datetime filter bound as "the
thing the app cannot trust yet" and cited the Activity dashboard's header note
as its authority. Both named upstream cards are closed and released, and PR
#1654 has just corrected that header note to say so — so the citation had come
to point at a page that contradicts the sentence citing it, which is worse than
plain staleness: a reader who checks the source finds the source "agreeing",
because it will not occur to them that the source has changed underneath.

The repo answered one question three ways in three files. It now answers it
once:

- `test/action-references.test.ts` — always correct, and untouched here:
  "objectstack#3912 and objectstack#3777 are both released as of 17.0.0 GA".
- `src/dashboards/activity.dashboard.ts` — corrected by PR #1654: both cards
  closed and released under the **17.0.0** heading of the installed
  `@objectstack/driver-sql` and `@objectstack/service-analytics` CHANGELOGs,
  with the app pinned at 17.3.0, and the no-picker decision restated as the
  product reason it actually is.
- `src/dashboards/service.dashboard.ts` — records the same two closures, which
  is why #1157 restored the Service picker.
- `test/dataset-granularity.test.ts` — this PR.

**The true half of the original point survives, because it was never the stale
half.** The week bucket really does put the trend on an AXIS rather than in a
dashboard date range; only the reason given for preferring the axis was dead.
The reason is now a product one and it stands without any platform premise: the
runtime ANDs `dateRange` into every widget query, and "is the team speeding up
or going quiet?" is read ACROSS the history, so a range would truncate the very
axis the chart exists to show — the same argument, in the same words,
`src/dashboards/activity.dashboard.ts` now makes. The comment also names where
the bucket is declared: on the DATASET dimension, not on a widget.

This is the same failure class as #1643, #1368 and #1648: a closed defect
restated as a live reason.
