---
---

Docs prose and one ledger line — this PR releases nothing to HotCRM users, so
the frontmatter above is deliberately empty (the sanctioned "releases nothing"
declaration that `.github/workflows/changeset-check.yml` documents, on par with
the `skip-changeset` label). No `src/` metadata changed: no object, field, view,
label, page, dashboard or hook. Same shape as the sibling that removed this
page's other citation.

`content/docs/guides/email-and-calendar.mdx` named an app that does not exist.
Under `## Connecting your inbox (not shipped yet)` it wrote the intended flow as
**Settings → Email & Calendar → Connect Gmail / Connect Outlook**. There is no
Settings app: measured against the shipped app shells, the switcher carries
`Setup` / `系统设置` / `セットアップ` / `Configuración` and `Studio`, and
`Settings` is an app label in no shipped locale. This was the second and last
such citation on the page; #1730 removed the first (`Settings → Email
Templates`, the email-templates sketch) in the same way.

The path form is gone, not the honesty. Route ② — point the citation at the real
page — has no referent here at all: there is no Email & Calendar settings page
anywhere in the product to redirect to, which is stronger than the templates
case, where a real Studio page existed but did the wrong thing. So the sentence
takes route ①, the wording both locale twins already used for this same section:
a plain noun phrase with an indefinite article, `an **Email & Calendar settings
page**`, mirroring the `an **Email Templates settings page**` this page now
carries six lines above. The paragraph below is untouched and still denies the
whole surface: "None of it exists in the app: there is no Gmail or Outlook
connector, no such settings page, and no OAuth flow to authorise."

⭐ The `KNOWN_UNRESOLVED_APP_WORDS` `Settings` entry goes with it, because this
citation was the entire remaining reason it existed. The dead-entry check keys
on `opened.has(entry.word)`, where `opened` is the set of first segments of
every bold arrow run across the 201 `.mdx` files under `content/docs`, by exact
string equality — not an occurrence count and not a line count. Re-measured on
this branch rather than inherited from the card: exactly **one** run opened with
`Settings`, this one. Removing it drops that to zero, and an entry the docs no
longer open a path with must be deleted rather than left as decoration — the
ledger's own rule, in the direction it was written to catch.

That coupling is demonstrated rather than assumed, and on this change rather
than by ablation. The guard suite is 24 passed at the branch point; the prose
edit alone turns exactly one assertion red — `holds no quarantined app word the
docs no longer open a path with`, with `expected [ 'Settings' ] to deeply equal
[]`, the other 23 still green — and deleting the entry returns it to 24 passed.

The `设置` entry stays and is untouched, its 20 bold runs still live, still
quarantined, still resolved leaf-by-leaf against Setup. Whether `设置` is
acceptable prose for an app labelled `系统设置` remains the docs-register
question #1403 declined to answer in passing, and it is not answered here
either.
