---
title: Knowledge — Articles, Deflection & Feedback
description: How knowledge articles link to the cases they resolve, how deflection is measured, and how readers rate articles.
order: 2
# sources: the objects this doc documents. Build ignores unknown frontmatter keys.
sources:
  - object:crm_knowledge_article
  - object:crm_case
---

# Knowledge — Articles, Deflection & Feedback

For service agents and service managers. **Knowledge** articles are your
searchable library of solutions — for agents to reference while resolving a
case and for customers to self-serve. Keeping articles current and well-titled
is the main lever for deflection and faster resolution times.

## Which article resolved a case

A case records the article that resolved it. **Resolved by Article**, in the
case's Resolution group, is offered on the **Close Case** screen and can be set
on the record at any time. It is separate from **Originating Case** on the
article, which points the other way — the case an article was *written from*.
The two answer different questions, and a good article usually has one origin
and many resolutions.

## Deflection is measured from that link

That link is what makes deflection measurable. The Service dashboard shows a
**KB Deflection Rate** — the share of closed cases that name a resolving
article — with **Resolved by KB** and **Closed Cases** printed beside it so the
percentage can be checked, and a **Top Resolving Articles** table ranking
articles by the cases they closed. Articles nobody resolves anything with are
candidates for a rewrite; articles at the top are the ones worth keeping current.

## Reader feedback

Readers rate articles with **Helpful** / **Not Helpful** on any published
article. Each press records one **Article Feedback** row per reader, and the
article's two vote counts are recounted from those rows — so they mean *how
many people*, not how many clicks, and changing your mind moves your own verdict
instead of adding another.

After each press a message says whether your vote was recorded, changed, or was
already that verdict, with the article's current **Helpful** and **Not
Helpful** counts. The same two counts sit in the article's header, next to its
category, status and audience; the article page opens on its body.

> *Public* audience is still a statement of intent rather than a publication
> channel: no customer-facing surface serves articles today, and the guest
> permission set cannot read the object at all, by design.

---

**Related:** the case side of the link — see [Cases & SLAs](./crm_service_cases.md).
