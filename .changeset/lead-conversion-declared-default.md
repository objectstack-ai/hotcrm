---
'hotcrm': patch
---

Lead Conversion now declares its "Create Opportunity?" default once, instead of
twice.

The conversion flow used to seed that checkbox with a hidden **Default
Conversion Options** step that ran before the conversion screen and assigned
`createOpportunity = false`. It was there because the platform could not express
"this flow variable starts as `false`" — a flow variable declaration had no
`defaultValue`, so declaring a variable bound nothing at runtime, and an
unanswered checkbox aborted the run outright (the lead was never marked
converted). ObjectStack 17.0.0 supports declared defaults, so the step is gone
and the default lives on the variable itself.

Three things improve for anyone editing this flow:

- **The default has one authority.** It used to be written twice — on the screen
  field and on the hidden step — with nothing keeping them in step, so editing
  one silently disagreed with the other. The screen field now derives its
  prefill from the variable, so there is a single place to change it.
- **A caller-supplied value is respected.** The hidden step was unconditional and
  overwrote any `createOpportunity` passed in when the flow was invoked. A
  declared default defers to a supplied value and only fills in the blank.
- **One less step in the diagram.** The flow shows the conversion screen first,
  which is what actually happens.

No behaviour change for the ordinary path: a user who leaves the box alone still
converts the lead without an opportunity, and a user who ticks it still gets one.
Refs #1155, #651, #643.
