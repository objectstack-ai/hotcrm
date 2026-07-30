---
'hotcrm': patch
---

Remove legacy string `rowActions` entries that duplicated `list_item` auto-injection.

Actions declaring `locations: ['list_item']` (`convert_lead`, `schedule_followup`, `generate_quote`, `escalate_case`) auto-inject their row-menu entries. Naming them again as `rowActions` strings went through objectui's legacy path, which dispatches the string as an action *type* — producing a second, dead menu item (zero network requests plus a green success toast on click). The lead, opportunity, and case list views now keep only the built-in `edit`/`delete` affordances in `rowActions`, and a metadata guard test fails CI if a `rowActions` string ever shadows a `list_item` action again.
