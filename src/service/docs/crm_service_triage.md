---
title: Case Triage — How the Assistant Weighs a Case
description: What the assistant reads when it triages a case, the order it weighs things in, and the point where a person takes over.
order: 3
# sources: the skill and the object this doc documents. The buttons it names
# are pinned to the skill by test/docs-ai-skills.test.ts; build ignores
# unknown frontmatter keys.
sources:
  - skill:case_triage
  - object:crm_case
---

# Case Triage — How the Assistant Weighs a Case

For service agents and service managers whose deployment runs the platform's
assistant. The assistant is the platform's, available on ObjectOS Cloud and
Enterprise; a self-hosted open-source install has none, and there you triage
every case yourself, by the same rules as below.

Triage answers one question: how urgent is this case, and why? The assistant
proposes the answer. A person decides it.

## When it starts

When you are on a case, the triage skill is ready on its own: ask the assistant
to triage, prioritise or classify the case. You can also ask from anywhere and
name the case.

## What it reads

It reads the case afresh every time, never from memory of an earlier answer:
first the shape of a case (so a field your administrator added is used straight
away), then the case itself. It reads as you, so it sees exactly the fields and
records you can see.

## How it weighs a case

It weighs four things, in this order of importance:

1. **Who the customer is.** The account's **Customer Tier** and the value of
   their contracts.
2. **Whether they are blocked.** A customer who cannot work and has no
   workaround outranks one who is inconvenienced.
3. **The clock.** How long the case has been open against its **SLA Due Date**.
4. **The tone.** The sentiment of the customer's latest message.

The answer is one **Priority** (Low, Medium, High or Critical) and the **one**
reason that drove it, citing the case number and the field values it used. One
reason, not a list: that is the sentence you can check, and the one you can
paste.

## Where a person takes over

The assistant cannot change the case. It holds no tool that writes, so every
step that follows is yours:

- **Setting the priority.** Edit **Priority** yourself. Setting it to
  **Critical** escalates the case at once, without waiting for the SLA clock:
  see [Cases](./crm_service_cases.md).
- **Escalating.** When it judges the case critical, it says so, points you to
  **Escalate Case** on the case, and offers a reason you can paste. Escalation
  asks a person for that reason on purpose.
- **Closing.** When the case is resolved in substance, it points you to
  **Close Case** and offers a resolution summary you can paste.
- **Replying to the customer.** It hands the reply to the email-drafting skill,
  which writes a draft. Nothing is sent until you send it.

When you disagree with its priority, yours stands: nothing it says is recorded
on the case.

---

**Related:** every skill the assistant uses in HotCRM — see
[Using the Assistant](./crm_ai_skills.md).
