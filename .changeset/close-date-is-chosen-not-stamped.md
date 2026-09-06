---
'hotcrm': patch
---

Ask for the opportunity's **Close Date** on the lead-conversion screen instead
of stamping it 90 days out where nobody could see it.

Converting a qualified lead created the opportunity with
`close_date` = `TODAY() + 90`, written inside the flow's *Create Opportunity*
node. `close_date` is what files an opportunity into a forecast **period**, so
every conversion silently pushed a deal a quarter out and moved the forecast
with it — and a number nobody was shown is a number nobody can correct. The
conversion screen now carries a **Close Date** field, prefilled to the same 90
days out and editable before the rep submits, so the date the forecast believes
is the date somebody approved.

The default is authored **once**. The +90 lives on the screen field's
`defaultValue` as `{TODAY() + 90}`, which the server interpolates before the
descriptor goes on the wire, and *Create Opportunity* reads the collected value
back. Writing it a second time on the flow variable would not work even as
duplication: a variable's declared default is bound raw, never interpolated, so
the braces would land in the date column. This is the same single-authority
rule the **Create Opportunity?** checkbox already follows.

The field is **required**, matching the column it fills
(`crm_opportunity.close_date` is `required` + `notNull`). That keeps an
incomplete conversion refused at the screen, before anything is written: a rep
who clears the prefilled date, or a caller that resumes the screen by hand
without the key, gets `Screen field "closeDate" is required` and an unchanged
database. Without it the same submission is refused three nodes later, by which
point the account and the contact already exist and the lead is left
half-converted. The field is hidden — and its `required` correspondingly
inert — when *Create Opportunity?* is unticked, so converting a lead without an
opportunity is unchanged.

**A loud failure replaces a silent one.** Nothing that used to succeed now
fails through the console: the runner seeds its value state from every field
carrying a default and submits that bag whole. What changes is that a
conversion which cannot say when the deal closes now stops and says so, instead
of quietly answering "a quarter from today" on the rep's behalf.
