---
'hotcrm': patch
---

Re-anchor the Acme contract on the deal it was actually signed off, and stop
seeding an accepted quote on an open deal.

`src/data/revenue.seed.ts` shipped an `activated` contract, signed
`daysAgo(32)` for `150000`, linked to `Acme Platform Upgrade` — a deal that is
still `stage: 'proposal'`, 60% probability, closing `daysFromNow(30)` (#1661).
Nothing in this app can produce that pairing, and the proof is mechanical
rather than narrative: `quote_on_accepted` in `src/objects/quote.hook.ts`
close-wins an opportunity the moment its quote is accepted, and `closed_won` is
a **terminal** stage in `opportunity_stage_progression` (`closed_won: []`). A
signed contract therefore cannot reach an open deal from either direction — the
deal cannot still be open when the paper was signed, and it cannot have been
reopened afterwards.

The link and the amount had come from **two different deals**, which is why
fixing only the link would not have closed it. Computed from the line items,
which this seed treats as the one source of truth for deal value:
`Acme Platform Upgrade` totals exactly `150000` — the contract's own
`contract_value` — while `Acme Annual Renewal 2025`, the `closed_won` deal
whose description says it was "signed two weeks ahead of the renewal date",
totals `220000`. `220000` is also the ARR the account description reports for
the signed renewal, and no contract in the app carried it.

So the contract now derives every contested field from the renewal:
`crm_opportunity` is `Acme Annual Renewal 2025`; `contract_value` is `220000`;
`signed_date` is that deal's `close_date` (`daysAgo(15)`, the day
`quote_on_accepted` would stamp); `start_date` is signature + 14 days, which is
what "two weeks ahead of the renewal date" means; and `end_date` keeps the
365-day span every other contract row uses for a 12-month term. It stays the
one `activated` contract in the seed, which three scheduled flows
(`contract_renewal`, `contract_expiration`, `billing_handoff`) filter on.

The same contradiction had a **third leg** the card did not name: the
`Acme Platform Upgrade Quote` was seeded `accepted` on that same open deal. It
is now `expired` — the value `quote_expiration` computes for a presented quote
past its `expiration_date`, and the state the deal's own next step assumes,
since the revised Enterprise proposal still has to go out.

Moving it off `accepted` would have left
`test/quote-contact-required-when.test.ts`'s anti-vacuity pin with no accepted
quote to check, so the renewal gains the accepted quote it should always have
had: `Acme Annual Renewal 2025 Quote`, carrying that deal's line items, no
discount (the multi-year option was declined this round) and Acme's 8.5% San
Francisco tax rate — the rate the other Acme quote bills at, where every
non-Acme quote bills 8%. That also completes the chain a reader traces to learn
the model: deal won → quote accepted → contract drafted, completed and
activated.

`Acme Platform Upgrade` itself is untouched — its `stage`, `probability` and
`close_date` are the record PR #1657's account description derives from.
