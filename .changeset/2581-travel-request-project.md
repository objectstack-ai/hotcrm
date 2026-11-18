---
"hotcrm": minor
---

Clause-②: no
Metadata-protocol: none

**Travel requests on a project go to its project manager (REQ-0011, #2581).** With Project Delivery on, a travel request gains an optional **Project** (the picker offers no Closed or Cancelled project, as on the expense). A request on a project is approved by that project's **Project Manager**, the person who also approves the project's expenses, so a trip and its expenses go to the same approver; one with no project still goes to the traveler's manager (the Finance Controllers when there is none). Exactly one of the two is asked, never both; one tier either way. A project with no Project Manager, or a trip of the Project Manager's own, goes to an administrator. Once approved, the project no longer changes, with the rest of the plan. Project staff find **My Travel Requests** in the Project Delivery app beside My Expenses, and the project page lists the project's travel requests under Related; a request adds nothing to the project's cost. With Project Delivery disabled the field leaves the request and every request goes to the traveler's manager. The project-path approval is registered by the expense module for now, as the expense's is, until the platform's lint judges cross-package flows (objectstack#34616); it moves back to Project Delivery with them (#2575).
