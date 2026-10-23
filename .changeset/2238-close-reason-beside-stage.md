---
"hotcrm": minor
---

**Closing a deal no longer fails the first save.** On the opportunity Edit and New form, **Win Reason** now appears right beside **Stage** as soon as you pick **Closed Won**, and **Loss Reason** as soon as you pick **Closed Lost**. Before, both sat on the last tab (**Win / Loss**, collapsed), so picking Closed Won and pressing Update always failed once with "Please check the highlighted fields: Win Reason" and jumped to that tab.

The rule itself is unchanged: a deal still cannot close without its reason. **Loss/Win Details** stays on the **Win / Loss** tab. On the opportunity detail page, both reasons are now listed under **Sales Process** with Stage instead of under **Classification**.
