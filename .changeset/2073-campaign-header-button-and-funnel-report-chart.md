---
"hotcrm": patch
---

**Add to Campaign is no longer a button in a lead list's header.** On **My Leads**, **🔥 Hot Leads**, **High Priority**, **Suspected Duplicates**, **Lead Pipeline**, **Lead Calendar** and **Lead Cards**, the header carried an **Add to Campaign** button (加入营销活动 in Simplified Chinese) for marketing users and administrators. The button works on one lead at a time but was drawn with nothing selected: it opened the whole Campaign dialog, let you pick or even create a campaign, and only then refused in English ("This action runs on a single record — select a row first."), adding nobody. A campaign created from that dialog stayed behind.

Add to Campaign is now offered where a lead is already chosen: in every lead row's ⋮ menu, for that one lead, and on **All Leads**, where you tick the rows and run it from the selection toolbar for all of them at once. Who is offered it is unchanged: marketing users and administrators, not sales reps or sales managers. Contacts were not affected: their header never showed the button.

**The Opportunity Funnel by Owner → Stage report now charts amount by stage as a horizontal bar chart instead of a funnel.** The amounts do not shrink from one stage to the next (on the demo data, Negotiation and Closed Won hold the most money), so the funnel pinched and then flared, and the Negotiation label was hidden. Now each stage is one bar, top to bottom in sales order from Prospecting to Closed Won, and every stage name is shown in full. The report's name, its table and its numbers have not changed.
