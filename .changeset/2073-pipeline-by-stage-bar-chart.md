---
"hotcrm": patch
---

**The Pipeline by Stage tile is now a horizontal bar chart instead of a funnel.** The tile is on **Executive Overview**, **Sales Performance** and **CRM Overview** (in Simplified Chinese it reads 阶段管道分布). It shows the value of open opportunities at each sales stage. A funnel draws each stage as wide as its value, so it reads as a funnel only when the value shrinks from one stage to the next, and open pipeline value usually does not. On the demo data the late stages hold the most money, so the funnel pinched in the middle and then flared out at the bottom.

Now each stage is one bar, its length the stage's open value. The stages run top to bottom in sales order: Prospecting, Qualification, Needs Analysis, Proposal, Negotiation. Closed deals are still left out, and the tile still follows the dashboard's date and filter pickers. The title, the description and the numbers behind the tile have not changed.
