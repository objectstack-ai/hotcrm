---
'hotcrm': minor
---

HotCRM now runs on **ObjectStack 17.2.0**. All twelve `@objectstack/*` packages
move together — they ship from one release and a mixed line produces interface
mismatches that only surface at runtime — and the declared protocol range moves
with them, from `^17.1.0` to `^17.2.0`, in `objectstack.config.ts`,
`objectstack.manifest.json` and the docs that state it.

Nothing an author writes in `src/` changes shape, and no stored record or
metadata document is rewritten. What the platform does underneath changes in
four places worth knowing about:

**SLA and win-rate numbers are right on every driver now.** A measure that
averages a **boolean** column — `SLA Violation Rate` on the case dataset is this
app's one — answered `null` on the in-memory driver while every SQL deployment
answered the real percentage (objectstack#11065). Deployments on SQL, which is
every production one, see no change; an install running the memory driver stops
seeing a blank tile where a rate belongs.

**A dashboard filter that names a related object's field is now refused instead
of quietly answering the wrong number.** On deployments served by the memory or
MongoDB drivers, an analytics filter reaching across objects — inside an `$or`,
or on a dataset's own definition-level `filter` — used to return rows with the
cross-object branch silently dropped, so a widget showed a narrower figure as if
it were the answer (objectstack#10759, #10861). It now answers `400` and names
the field. No dataset in this app writes such a filter, so no shipped widget
changes; a customer who has authored one will see the refusal instead of a
plausible wrong number.

**A record update addressed by id is now stricter about its own predicate.** An
update or delete whose `where` carries keys beyond `id`, or whose `where.id`
names a different row than the payload's `id`, is refused (`UPDATE_ID_MISMATCH`)
rather than silently binding one of the two (objectstack#11009, #11142). Every
hook and action in this app already writes `{ where: { id } }` against a payload
carrying the same id, so nothing here changes; a customer's own extension that
took the looser shape will now hear about it.

**Sharing rules are materialised per organization on walled deployments.** A
multi-organization install could previously not list, inspect or administer
positions, permission sets or sharing rules at all — the catalogue read as empty
while the tables held rows (objectstack#10103). Single-organization deployments,
which is what this app ships as, seed exactly as before: measured on a real boot
of this app, all ten declared rules are seeded with no organization stamp, the
same rows as on 17.1.0.
