---
"hotcrm": minor
---

Clause-②: no
Metadata-protocol: none

**Sales: Confirm Order, Complete Order and Cancel Order buttons on the order (#2716).** Before, an order moved through its lifecycle only by opening Edit and picking a new **Status**, and users looking for a Confirm button found none. Now the order's page, and the row menu of the Orders list, offer **Confirm Order** on a Draft order, **Complete Order** on a Confirmed one and **Cancel Order** on either; a Completed or Cancelled order offers none, and a person who may not edit orders (finance, for instance) sees none. Each button asks first and says what the move does: confirming locks the order's lines, and completing or cancelling is final. The buttons write the status the same way the form does, so the existing rules still judge every move: a move that is no longer allowed by the time you click (someone cancelled the order a moment ago) is refused with the usual status message and nothing changes. The buttons, their questions and their messages are in English, Chinese, Spanish and Japanese. **Status** on the order's form still works for now and is held to the same moves; it becomes read-only once the platform can keep a field for buttons only. Moving a Confirmed order back to Draft has no button and is still done through **Status**. No setup is needed.
