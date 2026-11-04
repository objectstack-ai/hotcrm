---
"hotcrm": patch
---

**A campaign member who responded and then unsubscribes still counts as a response.** Before, moving a member from *Responded* or *Converted* to *Unsubscribed* cleared **Has Responded** and **Response Date**, and the campaign's **Number of Responses** counted members by status, so every unsubscribe lowered the campaign's **Response Rate %**. Now the member keeps **Has Responded** and the original **Response Date** when they unsubscribe, and **Number of Responses** counts members who ever responded (**Has Responded**), so the response rate is "ever responded". Resetting a member to *Sent* still clears both. The demo data now includes one member who responded and later unsubscribed. The Marketing Manual and the Campaigns and Campaign Members docs say so in English and Chinese.
