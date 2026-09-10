---
'hotcrm': patch
---

A business refusal now reaches the person who caused it as the sentence its
author wrote, instead of as an internal wrapper naming the hook that threw.

### What a user reads today

Every guard in this app refuses through the shared `refuse()` helper, which
declares an HTTP `code` and `status` so the platform files a deliberate refusal
as a refusal rather than as a server fault. What it did not declare was that the
sentence is addressed to a **person**. Hook bodies run inside the sandbox, and
the sandbox rewrites the thrown message on its way out, so the only prose
channel a REST consumer had carried the rewrite with it. Measured end to end
against the pinned platform — real `refuse()`, real QuickJS, real
`resolveThrownHttpError` — on all five refusal classes:

```
before  Cannot delete product: referenced by 1 opportunity(ies) and 0 quote(s).
        Set is_active=false to retire instead.
        …reaching the consumer as:
        hook 'product_catalog' threw: Error: Cannot delete product: referenced …
```

Five classes out of five, the wrapper was the only thing on offer.

### What changes

`refuse()` takes an optional fourth argument, `userMessage`, and **defaults it to
the message the author wrote**. Every refusal in the app therefore now arrives
marked as user-facing text, and a consumer renders that text verbatim:

```
after   Cannot delete product: referenced by 1 opportunity(ies) and 0 quote(s).
        Set is_active=false to retire instead.
```

The diagnostic channel is untouched — `message` still carries the wrapper for
logs and developers, which is what it is for. Nothing about the refusal itself
moved: the same five classes land on the same `code`/`status` pairs they
declared, and not one of the 17 refusal sentences was reworded.

The default is the decision here, and it was measured rather than assumed.
Marking text user-facing is a promise about who the sentence is written for, so
defaulting it would be wrong in an app whose refusal prose is written for a
developer reading a log. This app's is not: every call site carries a business
sentence naming a remedy the reader can act on, two existing guards already hold
refusal prose to naming records the way the product names them, and one of these
sentences is pinned against the documentation page a user follows. The fourth
argument is therefore the seam for the case where the diagnostic and the
user-facing sentence must genuinely differ — no site needs that today.

**For consumers of the REST API:** refusals raised by this app's hooks now carry
a `userMessage` field alongside `message`. Nothing was removed and no existing
field changed, so a client reading `message` is unaffected.
