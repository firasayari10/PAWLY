# PAWLY — Security findings & test hardening

_Branch: `authorization` · Date: 2026-06-12 · Scope: all API routes + domain libs_

This document records the vulnerabilities found while adding thorough unit and
vulnerability tests across the app, what was fixed, and what remains as a
recommendation. Every authenticated API route and every `src/lib` domain module
is now covered by Vitest.

## Test coverage delta

| | Before | After |
|---|---|---|
| Test files | 28 | 37 |
| Tests | 197 | 254 |
| API routes with tests | 19 / 28 | 28 / 28 |

`bun run test` and `bunx tsc --noEmit` are green. The 9 previously-untested
routes now have suites, and IDOR / privilege-escalation / suspension-bypass /
price-tampering cases were added to existing suites.

## Findings

Severity: **H**igh / **M**edium / **L**ow. Status: **Fixed** (code changed +
test) / **Documented** (test pins current behaviour) / **Recommendation**.

| ID | Severity | Finding | Status |
|----|----------|---------|--------|
| A-1 | **High** | **Suspension guard bypass.** `resolveAccount` / `accountAccessError` (`src/lib/account.ts`) enforce `statut_compte = 'suspendu'` → 403, and were unit-tested, but **no route imported them**. A suspended account was only hidden from `/api/search` results; it could still call profile, offers, bookings, reviews, journal, veterinaire, dashboard, signalements and payments. | **Fixed** |
| A-2 | Medium | **Unvalidated `nb_animaux` on booking creation.** `POST /api/offers` accepted any `nb_animaux` (negative, fractional, absurd). | **Fixed** — `validateBookingInput` now requires an integer in `[1, MAX_ANIMAUX]` (`src/lib/bookings.ts`). |
| A-3 | Medium | **Silent null price.** `POST /api/offers` inserted `tarif_total: null` when the target `prestataire_id` had no `prestataire_profil`, creating an unpayable booking. | **Fixed** — returns 404 "Prestataire introuvable." when the profile is absent. |
| I-1 | — | **Price tampering (checkout).** A client-supplied `tarif_total` is ignored; the Stripe amount is recomputed from the stored `tarif_total`. Verified by test. | **Documented** (already safe) |
| I-2 | — | **Webhook forgery.** `/api/payments/webhook` rejects missing/invalid Stripe signatures (400) and is idempotent. Verified by test. | **Documented** (already safe) |
| I-3 | Low | **Sitter address exposure.** `GET /api/prestataires/[id]` returns the sitter's `adresse` + `code_postal` to any authenticated user. Likely intentional for the booking UX; no response change made. A test pins the current shape. | **Recommendation** |
| I-4 | Low | **`/api/journal/explore` does not gate a suspended caller.** It is a read-only public feed and does not resolve the caller, so the suspension guard was intentionally not added there (would add a query for no data-access gain). | **Recommendation** |

### A-1 fix detail

Each authenticated, caller-resolving route now replaces its ad-hoc
`from("utilisateur").select("id_user…").eq("clerk_id").maybeSingle()` lookup with:

```ts
const account = await resolveAccount(supabase, userId);
if (!account.ok) return NextResponse.json({ error: account.error }, { status: account.status });
const me = account.user;
```

Routes updated: `profile` (GET inline `accountAccessError`, PUT), `offers`,
`bookings`, `bookings/history`, `bookings/[id]/cancel`, `reviews`,
`veterinaire` (GET+PUT), `dashboard`, `dashboard/[id]`, `signalements`,
`journal`, `journal/[id]`, `journal/[id]/entries`, `journal/from-offer`,
`search`, `payments/checkout`, `payments/confirm`, and all `admin/**` routes
(defense-in-depth: a suspended admin is blocked before the `isAdmin` check).
Each route has a "403 when suspended" test.

## Verified-safe behaviour (regression-guarded by tests)

- **IDOR:** bookings, dashboard offers, reviews, journal, veterinaire and
  payments all scope queries to the caller's `id_user`; tests assert the
  ownership filter or the not-owned → 404/403 path.
- **Privilege escalation:** admin routes reject non-admins (403) and now also
  reject suspended admins.
- **Auth:** every route returns 401 without a Clerk session.
- **Sync IDOR:** `POST /api/profile/sync-utilisateur` rejects (403) syncing a
  different Clerk id than the authenticated one.

## Out of scope — recommendations only

- **Rate limiting** — no throttling on any endpoint (auth, search, reports).
- **Audit logging** — admin actions (suspend, delete review, resolve report)
  are not logged.
- **Public-slug enumeration** — `journal/public/[slug]` slugs are guessable;
  acceptable for a sharing feature, consider unguessable tokens if needled.
- **Pre-existing lint debt** — `bun run lint` is red independent of this work:
  React `set-state-in-effect` errors in UI components and `@typescript-eslint/no-explicit-any`
  in several routes/pages that pre-date this change. Not addressed here to avoid
  unrelated churn; tracked separately.
