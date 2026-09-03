---
---

Re-measure **Security & Compliance** against the installed 17.2.0 and retire the "has
not been re-checked" admission the page has carried since the warrant was re-scoped,
in all three locales.

That admission was the correct thing to write and not a resting place: it told a
security reviewer, accurately, that the page's claims had been verified against a
platform version this app no longer runs. Only a re-measurement retires it, and a
re-date without one would have been the fabricated warrant the admission existed to
prevent. So every claim the page's two declared sources can answer — this app's own
metadata (`src/`, `objectstack.config.ts`) and the whole installed `@objectstack/*`
tree — was re-taken on 17.2.0 rather than carried forward.

Three claims did not survive, and they are corrected rather than re-dated around:

- **The audit log ships six list views, not five.** The page named *Recent*, *Auth*,
  *Record Views*, *Config* and *All*; `sys_audit_log` also declares `writes_only`,
  labelled *Writes*, filtered to `create` / `update` / `delete`. This one was already
  wrong at 17.1.0 — an undercount in the original sweep, not version drift — which is
  exactly the class of error a page can only find by re-measuring rather than re-dating.
- **The distribution-file corpus moved, 1,186 → 1,204.** The figure scoping the
  "zero hits" login-hours sweep is the count of non-`.map` files under `dist/` in the
  51 installed packages. Reconstructing a 17.1.0 tree reproduces 1,186 exactly, which
  is what confirms the count is being taken the same way rather than a new way.
- **`dataResidency` is no longer in `@objectstack/spec/kernel`'s bundle.** On 17.2.0 the
  shape lives in `@objectstack/spec/system`, inside the exported and typed
  `TenantSecurityPolicySchema` — so the page's "not exported and has no type
  declaration" no longer describes it. The substance is unchanged and re-measured true:
  nothing outside `@objectstack/spec` reads it, so it still describes an intention
  rather than a control, and the section's conclusion stands.

Everything else re-measured unchanged, including every *(not shipped)* row — the class
where a stale page is most dangerous, because a capability that quietly started
shipping would leave the page denying something the platform now does. None had: no
settings key was added or removed between the two versions, the Setup navigation
inventory is identical, and the `sys_audit_log` action enum still declares the same
eight actions.

The three `17.1.0` mentions that record **provenance** — when `sys_audit_log`'s `read`
action and `maskingRule` arrived — are untouched, byte for byte, in every locale. They
say when a capability appeared, which stays true at any pin.

No package count is reintroduced. The `51` that scopes the login-hours sweep is a dated
claim with its own measurement, and it measured true: the tree holds 51 installed
`@objectstack/*` packages, all at 17.2.0.

Documentation prose only — no metadata, schema or behaviour change.
