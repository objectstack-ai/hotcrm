---
'hotcrm': patch
---

The **Customer Service** dashboard's case table is personal again: **Open Cases
by Priority** → **My Open Cases by Priority**, showing only the open cases the
signed-in user owns. It had been team-wide since the analytics query path could
not resolve `{current_user_id}`; the pinned platform (17.4.0) now does, and two
different reps measured on one dashboard each saw only their own cases.

The widget ignores the dashboard's **Agent** filter. Picking another agent used
to leave "my" cases empty; it now keeps showing your own cases, while every
other widget still follows the pick.

`{current_user_id}` scopes what the widget shows — it is not an access boundary;
row-level security still decides which cases a user can reach.
