---
'hotcrm': patch
---

Localize every automation notification. The 15 `notify` nodes across 13 flows
stop carrying inline English `title`/`message` and now reference a
`sys_email_template` bundle by name, with a row per notification in each of the
four locales this app ships — so a zh-CN owner reads a stalled-deal nudge in
Chinese and a ja-JP owner reads the same nudge in Japanese, from one
notification.

The delivery path resolves `(template name, locale)` per recipient AFTER
fan-out, off that recipient's own `sys_user.locale`, falling back to the
deployment default — `@objectstack/service-messaging` 17.4.0, which is the pin
this repo already installs. No dependency moved.

Every user-facing string is the text the node already sent, with the flow's
`{var.path}` interpolations re-expressed as the `{{key}}` placeholders the
renderer resolves against each node's `templateData`. This was a conversion, not
a rewrite: no notification says anything new.

⚠️ The English rows are tagged `en-US`, not `en`. `EmailService` looks a row up
by exact `(name, locale)` and retries exactly once against the literal `en-US`;
there is no language-subtag folding on that path, so `en-US` is the only tag
that also catches a recipient whose column says `en-US` and one on a fifth
locale nobody translated for. Tagging them `en` would dead-letter both —
`TEMPLATE_NOT_FOUND` classifies permanent and is never retried.
