---
'hotcrm': patch
---

Upgrade every `@objectstack/*` dependency from `17.0.0-rc.5` to `17.0.0-rc.6`,
and carry the app's metadata and pinned upstream expectations across with it.

`objectstack.config.ts` (`engines.protocol`) and `objectstack.manifest.json`
(`specVersion` + `engines.protocol`) move with the pin, per the #728 rule that
config, manifest and build must not diverge.

Six upstream behavior changes reached this app and are handled here rather
than left to fail:

- **`filter-empty-node` is a new author-time error.** An empty filter node
  (`{}`) reduces to TRUE and matches every row, so it is indistinguishable from
  an absent key — and `forecast_snapshot`'s "find every user" query declared
  one. The key is deleted, which is what the rule prescribes and what the node
  already meant.
- **`$regex` is retired** (never declared by the Filter Protocol; it compiled
  to a substring `LIKE` on SQL and a real `RegExp` in memory). No app metadata
  used it — only the premise block in
  `test/account-name-normalized-match.test.ts`, which now measures the
  retirement and pins the same conclusion through `$icontains`, the declared
  replacement: still a substring match, so still no way to express
  normalize-then-exact. The stored normalized column remains the answer.
- **The restrict-delete message speaks in display labels** ("… 1 Event Attendee
  record(s) through “Event” …") instead of API names. The behavior is
  unchanged — the delete is still refused — so the two assertions follow the
  wording while still pinning that the message names the blocking object and
  field.
- **`ctx.permissions` now enumerates the platform baseline set
  `member_default`** alongside the app-declared profile. It is the set every
  member already carried, so the reach assertions are untouched; the
  negative control now pins the absence of `admin_full_access` directly
  instead of an exact one-element list.
- **The approvals plugin relabelled the `my_pending` view in zh-CN**, 我的待办
  → 待我审批. The docs that quote it follow, and the #973 guard that retired
  待我审批 as "a sidebar label, not a view" is released: the string now occurs
  exactly once in the shipped bundle, as that view's label.

- **The `ReportInput` type export is retired**, and the bare name `Report` now
  carries the authoring shape it used to name (ADR-0122: `X` is the input type,
  `XParsed` the post-parse one). The five `src/reports/*.report.ts` annotations
  follow; the underlying type — `z.input<typeof ReportSchema>` — is unchanged.
  Worth knowing on any other app making this jump: on rc.5 the name `Report`
  meant the OPPOSITE (`z.infer`), so an annotation that already said `Report`
  changed meaning silently, and only the removed `ReportInput` announced
  itself. `Action`, `Dashboard` and `Page` swapped the same way. Nothing but
  `tsc --noEmit` catches this class of change — `objectstack build` does not
  typecheck app sources.

Docs that state the installed platform version (`docs/STATUS.md`,
`content/docs/whats-new.mdx` and its zh-Hans / zh-Hant twins) move to rc.6.
