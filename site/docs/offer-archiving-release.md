# Offer availability release dependency

Companion to [BILLING PR #45](https://github.com/captjreacher/BILLING/pull/45).
Plan-backed cards must resolve the exact plan. A missing, withdrawn or archived
plan cannot inherit a sibling's name, price, availability or purchase form.
The snapshot reader also rejects an explicitly archived plan even if an old
response says it is sellable. Missing `isArchived` remains compatible with the
pre-migration Billing API.

The get-started page uses the same eligibility predicate as purchase links.
Intake construction now requires matching commercial plan identity and current
sellability. Intake requests do not charge a card or create an agreement;
Billing remains authoritative for activation and existing customer billing.
No billing records or agreement execution paths change here. No MaxAI migration
is required.

## Checks and readiness gates

- `npm ci`, then `npm test` in `site/`.
- `npm run build:catalogue-fixture` for each `MAXAI_FIXTURE_OFFER_STATE` value:
  `active`, `withdrawn`, `archived`, `omitted`. These local fixtures verify
  products/pricing links, direct get-started forms, a sellable sibling and
  absence of server secrets from the generated site.
- Confirm the companion PR's site-check matrix and BILLING #45's build, Docker
  and release-smoke checks pass on their final commits; review migration 004's
  compatibility notes in BILLING's `docs/offer-archiving-release.md`.
- Obtain code/release review before marking either draft ready. Passing checks
  alone does not authorize a merge, migration or deployment.

## Approved rollout sequence (future release only)

1. Merge this MaxAI fix to `main` after approval. Explicitly run
   `Deploy MaxAI Static Site` on `main` to rebuild from the existing required
   Billing catalogue. A merge alone does not invoke this workflow. Verify the
   deployed revision and public products/pricing/get-started pages; do not
   mutate production offers for verification.
2. After that consumer release is verified, apply BILLING migration 004 once
   through its existing migration process, after migrations 001–003.
3. Release the reviewed BILLING #45 API revision through
   `npm run deploy:admin-api:guarded` from the authorized release host, with
   required secret bindings verified before traffic moves. Coordinate this
   before the BILLING main merge because that merge can build the Cockpit.
4. Merge BILLING #45 to `main` after the API is verified; allow the main-only
   static Cockpit release. Verify archive/filter/restore and continued agreed
   billing with disposable staging fixtures.
5. After future approved catalogue changes, confirm the existing Billing
   repository-dispatch refresh succeeds. MaxAI pages are build-time snapshots:
   a failed refresh can leave stale pages, so the Billing API's activation
   checks remain the authority for new sales. Confirm the refreshed public
   pages before considering a catalogue change publicly reflected.

The new site-check workflow contains no deployment or production secrets.
Existing static production deployment runs only on repository dispatch or an
explicit workflow dispatch; the WordPress push workflow targets `main` and
WordPress paths. Feature pushes do not invoke either production workflow.
Read-only Cloudflare verification on 2026-10-11 found the `maxai` Worker's
Builds section showing Git repository / Connect, with no Git build connection.
No Cloudflare setting was changed.

## Rollback

Keep this exact-plan fix when rolling back BILLING; it works with the old API.
Prefer application rollback while retaining the additive archive column.
Dropping it loses archive visibility, although archived offers remain withdrawn.
Never re-enable sales as part of rollback.
