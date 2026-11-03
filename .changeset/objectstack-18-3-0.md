---
"hotcrm": patch
---

Clause-②: no
Metadata-protocol: none

HotCRM runs on ObjectStack 18.3.0; book titles and the Customer Churn Signals panels are translated, and the admin docs follow Setup's new navigation

**ObjectStack 18.3.0.** All 23 `@objectstack/*` dependencies move from 18.2.0 to 18.3.0 together, pinned
exact, and `specVersion` and `engines.protocol` (in `objectstack.manifest.json` and in each of the four
packages) follow to `^18.3.0`.

- **Book titles and report panels in every language.** The four in-app manuals (*HotCRM User Manual*,
  *Admin Manual*, *Revenue Manual*, *Marketing Manual*) and their section headings now read in Chinese,
  Japanese and Spanish, for example *HotCRM 使用手册*, and so do the four panels of the **Customer Churn
  Signals** report (*客户成功经理标记的客户*, …). 18.3.0 made both translatable; before, they read in
  English in every language.
- **The Knowledge "Helpful" / "Not Helpful" toast keeps its tally.** 18.3.0 reads an action's outcome
  messages as `{{ }}` templates and refuses the old `${…}` spelling, so the six messages (and their
  three translations) are respelled. The toast still reads "Thanks — recorded as helpful. Helpful: 1 ·
  Not helpful: 0."
- **The lead form layouts named `split`, `drawer` and `modal` are plain forms now.** 18.3.0 retired
  those three form `type`s (where a record opens is the reader's choice now, and a list opens it in a
  side drawer by default). The three named lead forms keep their sections and fields.
- **The admin docs point at Setup's new entries.** 18.3.0 moved positions and permission sets out of
  Setup: who holds a position is **Setup → Position Holders**, a permission set is given under
  **Setup → Permission Set Assignment**, and the sets themselves are read and copied (**New similar**)
  in **Studio → All Metadata Types → Permission Set**. Email is **Setup → Mail Delivery**, and installed
  packages are **Setup → Installed Apps**. The docs site (English, Simplified and Traditional Chinese)
  and the in-app Admin Manual now say so.

What changes for people because of the platform release, not because of HotCRM:

- **A service agent can take an unassigned case by setting its owner to themselves.** 18.3.0's
  ownership rules admit a *claim*: setting the owner of an unowned record to yourself, on a record you
  can see. Agents see every open unassigned case, so they can now claim one that way as well as by
  picking it up (moving it to *In Progress*). Assigning an unowned case to somebody else, or taking a
  case another agent owns, is still refused.
- **Starting a flow on a record you cannot read is refused up front.** Escalate Case, Close Case and Add
  to Campaign now answer "not found" when the record (or the campaign) does not exist or the person
  cannot read it, before the flow runs, instead of failing at its last step. Nothing is written either
  way.
- **Charts over dates show the empty months.** A trend over a date dimension now draws a zero for a
  month (or day) that holds no record, instead of joining its neighbours.
- **Amounts have no currency symbol until an administrator sets the default currency.** 18.3.0 asks an
  administrator for it on first visit; until it is set, amounts read as plain numbers.
