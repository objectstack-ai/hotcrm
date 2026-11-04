---
'hotcrm': minor
---

**New cases and leads route through platform queues, and agents take a waiting case with the Claim button (#2395, #2283).** HotCRM now uses the ownership queues ObjectStack 18.3.0 provides, in place of its own stand-ins.

- **Routing.** A case that arrives with no owner goes to the Service Agent with the fewest open cases, and a lead to the Sales Rep with the fewest unconverted leads, as before. The routing is now two declared queues, **Support Intake** (`case_intake`) and **Lead Intake** (`lead_intake`), and two assignment rules, in place of the app's `case_auto_assign` and `lead_auto_assign` hooks. One small difference: when two people carry the same load, the platform picks between them by user id.
- **Claim.** When nobody holds the position, a new case or lead waits in its queue with no owner. Every member sees it (cases in **Unassigned — triage**), opens it and clicks **Claim** (认领). The claimant becomes the owner and nothing else changes; the status stays where it was. If two people claim at once, one wins and the other is refused. The **Claim Case** screen action is gone, and so is the old gesture where moving an unowned case to *In Progress* made you its owner: a status change no longer claims.
- **Who sees waiting cases.** Queue membership now gives agents sight of a waiting case, so the *Unassigned Cases — Triage* sharing rule is removed. Administrators can add a person to a queue without a position under **Setup → Access Control → Queue Members** (queue `case_intake` or `lead_intake`).
- **Escalation is unchanged.** An escalated case still goes to the least-loaded Service Manager.

**Upgrading:** open cases and leads that nobody owns were created before the queues existed, so they name no queue, and agents cannot see them until they do. Run the backfill once as an administrator. It only reports until you pass `--apply`, and it writes the queue and nothing else:

```bash
pnpm exec tsx scripts/backfill-intake-queue.ts --url https://<your-org> --email <admin> --password <pw> --apply
```
