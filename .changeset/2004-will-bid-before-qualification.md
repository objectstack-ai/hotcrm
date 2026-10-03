---
'hotcrm': patch
---

Qualification approval (立项) leaves *Will Bid* open

While a deal waits for qualification approval, or after an approver rejects it, the rep can
now record and change *Will Bid*. Whether you intend to bid is part of what the approver
decides on: REQ-0006 step 8 has the rep fill 是否投标 as input to 立项, so holding it until
approval had the approver decide without it. Step 11's 投标 is the act of bidding, which
HotCRM does not model.

The gate still holds the two acts that commit the deal: moving its stage (which includes
closing it directly), and asking for won or lost with *Requested Status*. Both are refused
`409 RECORD_LOCKED` until the deal is approved, and the refusal sentence now names only what
was held. The gate still ships off; nothing changes for an install that has not armed it.

This narrows the qualification-approval gate that ships in this same release; its entry
above now describes the gate as it ships.
