---
"hotcrm": patch
---

Clause-②: no
Metadata-protocol: none

**The Project Delivery app's colour is a deeper teal, so its tile carries a white icon like the other apps (#2687).**

FROM → TO for the Project Delivery app's colour (`branding.primaryColor`):

- FROM teal `#0D9488` TO a deeper teal, `#0F766E`. The home page draws a module's icon in white or in dark slate, whichever stands out more against its colour. White on the old teal measured 3.74:1 against 4.77:1 for dark slate, so the Project Delivery tile carried the only dark icon among the module tiles in the light theme. White on the new teal measures 5.47:1, and the tile now carries a white icon, like the Service, Marketing, Order to Cash and Expenses tiles.
- The colour is also the app's theme colour, so the **New** button and the other primary buttons in Project Delivery are a shade deeper. Their text stays white, as before.
- In the dark theme every module tile and primary button uses a lighter shade of its colour with dark text and icons. Project Delivery already followed that rule, so only its shade of teal changes there.

Nothing in the data changes. The app keeps its name, its briefcase icon and its navigation, and its colour is still its own: no other HotCRM app uses it.
