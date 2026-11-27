---
"hotcrm": minor
---

Clause-②: no
Metadata-protocol: none

**Sales: a confirmed order's amount is locked with its lines, and on an order with lines the Subtotal is the sum of the lines (#2826).** The order is the one source of its amount: the order contract, the payment plan and a framework contract's quota all read its **Total Price**.

FROM → TO:

- **Confirmed, Completed or Cancelled order.** FROM **Subtotal**, **Discount %**, **Tax** and **Shipping & Handling** editable at any status, so a confirmed order's total could change without its lines changing. TO a change to any of the four is refused: on a Confirmed order with "Order … is Confirmed, so its amount can no longer be changed. Send it back to Draft first.", on a Completed or Cancelled one with the message that its amount can no longer be changed. To change a confirmed order's amount, set its **Status** back to **Draft** and save, make the change, and click **Confirm Order** again; the total, the order contract and the payment plan then follow the same rules as today. A difference on a completed or cancelled order goes on a new order.
- **Order with lines.** FROM a **Subtotal** that could be typed by hand and then disagreed with the lines until the next line change. TO a save that changes it to anything other than the sum of the lines is refused with a message saying to change the lines instead. An order with no lines still takes a typed **Subtotal**.

Imports, seed data and the system's own updates (the lines' roll-up) are not held by either rule. While an order is back in Draft it does not count towards a framework contract's Order Amount, as before. The messages are in English, Chinese, Japanese and Spanish; the **Subtotal** field's help text says so, and **Confirm Order** now asks "Its lines and its amount are then locked". The form still shows the four fields as editable: the platform's conditional read-only (`readonlyWhen`) would also discard the system's own updates, so the rule is enforced when you save. No setup is needed.
