---
"hotcrm": patch
---

Clause-②: no
Metadata-protocol: none

**The Project Delivery app's colour is a deeper teal, so its tile carries a white icon like the other apps (#2687).**

FROM → TO for the Project Delivery app's colour (`branding.primaryColor`):

- FROM teal `#0D9488` TO deeper teal `#0F766E`. White on the old teal measured a contrast of 3.74:1, so the console drew a dark icon on the Project Delivery tile, the only dark icon on the home page. White on the new teal measures 5.47:1, and the tile now draws a white icon, as the Service, Order to Cash, Expense and Marketing tiles do.
- The colour is also the app's theme colour: inside Project Delivery, the primary buttons now use white text, as in the other apps.

Nothing in the data changes. The app keeps its name, its briefcase icon and its navigation, and its colour is still its own: no other HotCRM app uses it.
