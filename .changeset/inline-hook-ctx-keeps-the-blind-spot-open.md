---
---

Test infrastructure only — this PR releases nothing to HotCRM users, so the
frontmatter above is deliberately empty (the sanctioned "releases nothing"
declaration that `.github/workflows/changeset-check.yml` documents, on par with
the `skip-changeset` label). No `src/` metadata changed: no object, field, view,
label, flow or hook handler behaviour is different.

What changed is what the tests hand a hook. #1295 gave the shared harness's
`makeCtx` the engine's real flat-record wrapper, which closed the plain-object
blind spot for every call site that went through it. The sites that built a ctx
by hand kept it. Those are now routed through the shared helper too, and a gate
in `test/hook-input-shape.test.ts` reports the next one instead of absorbing it.
