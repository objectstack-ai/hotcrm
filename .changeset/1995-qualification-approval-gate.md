---
'hotcrm': minor
---

An opportunity can now require **qualification approval (立项)** before it is committed:
until the deal is approved, its stage cannot move, and it can be neither closed won/lost
nor asked to be. Everything else stays open, *Will Bid* included, so a new deal can still
be worked, and its bid intent recorded for the approver, while it waits. **The gate ships
off** (REQ-0006 step 11:
「销售立项需走审批流程；新增商机可跟进，立项通过后方可更新阶段、投标、赢丢单操作。」).

**How it works, once armed.** The rep ticks *Request Qualification Approval* in the deal's
**Qualification** section, and one request appears in the approval inbox HotCRM already
mounts, routed to the `sales_manager` position. Approved, the deal is qualified for good.
Rejected, the box is unticked and the deal stays held; ticking it again asks again. The
verdict lands on a new read-only field, *Qualification Approval*, and a refused move is
answered `409 RECORD_LOCKED` with a sentence naming what was held and the way forward.
Unlike the status-change gate, the deal is **not** locked while the request waits — that
is the customer's own 「新增商机可跟进」.

**Off by default, bit for bit.** The switch is the field default on *Qualification
Approval*, shipped as *Not Required*: no deal is ever born pending, the new flow
(*Opportunity Qualification Approval*) opens nothing, and moving the stage and closing
behave exactly as before. An install arms the gate by changing that one default
to *Pending*; deals that already exist keep *Not Required*.

**With the status-change gate armed too, qualification comes first.** A deal that is not
yet qualified cannot raise a won/lost request either; once it is qualified, the
status-change gate behaves exactly as it does alone. Each gate keeps its own verdict
field, and the amount-based *Large Deal Approval* is unchanged.
