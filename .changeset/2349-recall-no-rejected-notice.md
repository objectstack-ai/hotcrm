---
"hotcrm": patch
---

**Recalling an approval request no longer tells you it was rejected (#2349).** When a rep recalled their own pending request (the Recall button on the request, or `POST /api/v1/approvals/requests/{id}/recall`), HotCRM sent them the flow's rejection notice, for example "Deal rejected: NAME — Your opportunity NAME was not approved", in the inbox and, for a deal, by email. Nobody had rejected anything. The platform resumes a recalled request down the approval's reject path, and three approval flows sent their notice there without looking at why.

Large Deal Approval (at both the Sales Manager and the Sales Director step), Account Approval and Lead Conversion Approval now end quietly on a recall. A rejection by an approver still sends the notice exactly as before. Qualification Approval and Stage Change Approval never sent a notice on reject and are unchanged.
