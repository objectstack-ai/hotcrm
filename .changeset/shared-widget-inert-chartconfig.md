---
'hotcrm': patch
---

Remove the inert `chartConfig` palette from the shared pipeline-funnel widget.
#539 consolidated the funnel into `shared-widgets.ts` and its hardcoded five-hex
palette travelled with it, so all three dashboards that call the factory carried
config that never applied — verified in the browser on 16.1.0, where every
rendered fill is `hsl(var(--chart-1..5))` and none of the declared hex colors
reaches the DOM. `colorVariant` is kept: it has not been shown to be inert.
Refs #500.
