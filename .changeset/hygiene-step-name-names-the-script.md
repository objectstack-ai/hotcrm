---
---

Rename the source-hygiene CI step from
`Source hygiene (console.log / TODO / file size)` to
`Source hygiene (scripts/check-source-hygiene.mjs)` in both workflows that run
it (`ci.yml`, `code-quality.yml`). No workflow structure, job name, trigger or
command changes; the step runs exactly what it ran before.

The old name enumerated the three checks the script had when it was written.
It has run five since: the control-byte scan arrived with #686, widened in
#818 and again in #1235, and #1094 added the copyright-header position check.
So the label was short by two, and short in the way that costs time — the step
name is the first thing a reader sees in a red job list, and someone whose
build failed on a misplaced copyright header was reading a step that claimed
to be about `console.log`.

The fix drops the enumeration rather than correcting it. A hand-maintained
copy of the script's check list, kept in two YAML files with no gate tying the
copies to the original, is a fact that drifts every time a `check(...)` is
added — which is now the fourth recorded sighting of this exact drift. A
correct enumeration today would be the same defect one increment along. The
step name now asserts only where the step's behaviour is defined, and that one
fact is held true by the line directly beneath it: if the script is ever moved,
`run: node scripts/check-source-hygiene.mjs` fails loudly and the name is
corrected in the same edit.

Nothing is lost, and this was measured rather than assumed. On a failing run
the script already names every check it ran and marks each one, so the reader
gets strictly more than the step name ever carried — which check failed, not
merely which checks exist:

```
Source hygiene - 311 files under src, test, e2e, scripts; the control-byte
scan adds 592 under content, .changeset, docs, .github, .claude and 16 root
file(s)

  x no console.log in src/ - 1 violation(s)
  x no TODO/FIXME markers - 1 violation(s)
  v no raw control bytes in first-party files
  v no source file over 100KB
  x copyright header at the top of every .ts file - 1 violation(s)

x source hygiene failed: no console.log in src/, no TODO/FIXME markers,
  copyright header at the top of every .ts file
```

A step `name:` is static YAML, evaluated before the step runs, so deriving the
enumeration from the script at run time is not available at this level. The
script's own stdout is that derivation, and it is already in place.

Refs #1139.
