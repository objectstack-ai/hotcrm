---
'hotcrm': minor
---

Remove the **App Launcher** and **Utility Bar** pages (`app_launcher_page`, `utility_bar_page`).

Neither page could be reached from the app: no sidebar entry, button or other page pointed at
either, so each opened only at a typed address. Once opened, neither did what its name said.
The App Launcher was a search box and a "Your apps" strip holding one app, a copy of the app
switcher the console already has. The Utility Bar did not float: it laid out inline in the main
column as a heading, an empty **Quick Notes** card, a search box and a notifications block that
drew nothing. The console has no slot for a utility bar to dock into.

HotCRM is also the reference app people read to learn how to build one, and these two pages
taught that a page of type `app` makes a launcher and a page of type `utility` makes a floating
bar. Neither is true on the current platform, so both pages are retired together with their
labels in the four language packs.

**What this means for you.** The two pages are no longer in the app, and reading either one
(`GET /api/v1/meta/page/app_launcher_page` or `.../utility_bar_page`) now answers 404. A
bookmark to either address stops working. Every other page, **Sales Home** and the record
pages included, is unchanged. To switch apps, use the console's own app switcher.
