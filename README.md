# MGM — Minara Get My Money (`mgm.fund`)

A public claim book for capital rugged on **Arc**: anyone who lost money on a token
can file a case with the contract address, the amount, **mandatory screenshot
evidence** and a **wallet signature** proving the loss is theirs. Claims are
published, backed by other holders, and settled in the open.

Visual language follows minara.fun — jade on near-black, Instrument Sans display,
Geist UI, Geist Mono for every number and address.

## Stack

| Layer     | Choice                                                    |
| --------- | --------------------------------------------------------- |
| Framework | Next.js 16 (App Router, Turbopack), TypeScript             |
| Styling   | Hand-rolled design tokens in `app/globals.css` — no Tailwind |
| Storage   | SQLite via `better-sqlite3` → `data/mgm.db` (WAL)          |
| Uploads   | Local disk → `public/uploads`, validated by magic bytes     |
| Wallets   | EIP-6963 discovery (MetaMask, Rabby), `personal_sign`, verified server-side with `viem` |

## Run it

```bash
npm install
npm run seed      # optional: 12 demo claims with generated proof images
npm run dev       # http://localhost:3000
```

Production:

```bash
npm run build && npm start
```

### Environment

Copy `.env.example` to `.env.local`:

| Variable               | Purpose                                                        |
| ---------------------- | -------------------------------------------------------------- |
| `MGM_ADMIN_KEY`          | Unlocks `/admin`. Unset ⇒ moderation is fully disabled.        |
| `MGM_SALT`               | Salt for visitor fingerprints (vote dedupe + rate limiting).   |
| `NEXT_PUBLIC_SITE_URL`   | Absolute URL used in OG metadata.                              |
| `NEXT_PUBLIC_ARC_EXPLORER` | Optional — Arc explorer base URL; set it and every claim links its contract. |
| `MGM_DATA_DIR`           | Optional — move the SQLite file off the project directory.     |

## Pages

| Route             | What it does                                                             |
| ----------------- | ------------------------------------------------------------------------ |
| `/`               | Hero + live stats, largest open claims, full board with sort/search/filter, grid ⇄ list |
| `/submit`         | The claim form — connect wallet, live card preview, checklist, screenshots required, claim signed before it is sent |
| `/case/[id]`      | Full case: story, proof gallery, progress timeline, backing, contract data |
| `/how-it-works`   | Evidence rules and what each status means                                 |
| `/admin`          | Key-gated moderation: change status, add a reviewer note, delete a claim  |

## API

| Method | Route                       | Notes                                                     |
| ------ | --------------------------- | ---------------------------------------------------------- |
| `POST` | `/api/wallet/nonce`         | Issues the single-use challenge the wallet signs (10 min TTL) |
| `POST` | `/api/cases`                | multipart. Validates every field, sniffs image magic bytes, verifies the signature, burns the nonce; 5 claims/hour per visitor, 3 per wallet |
| `POST` | `/api/cases/:id/support`    | One vote per visitor fingerprint                            |
| `GET`  | `/api/admin/cases`          | Requires `x-msr-admin`                                      |
| `PATCH`/`DELETE` | `/api/admin/cases/:id` | Status + reviewer note, or delete claim and its files   |

## Claim lifecycle

`Awaiting review → Under review → Verified → Refunded`, with `Rejected` as the
dead end. A claim reaching **100 backers** is what pushes it into review
(`SUPPORT_THRESHOLD` in `lib/types.ts`).

## Rules baked into the code

- **No proof, no claim.** The form and the API both reject a submission without at
  least one screenshot; uploads are verified by magic bytes, not by the mime type
  the browser reports.
- **No signature, no claim.** The claimant signs a message binding the wallet, the
  contract, the amount and the proof count. The server rebuilds that exact message,
  verifies it with `viem`, and burns the nonce — so a signature cannot be replayed,
  reused for a different amount, or produced by anyone but the wallet owner. Someone
  else's PnL screenshot gets a stranger nowhere: the refund address *is* the signer.
- The stored `signed_nonce` **and `signed_site`** let any case page re-verify the
  signature later — every claim page re-checks it server-side on load and shows the
  result. Because the domain is stored per claim, renaming the site or moving domains
  never invalidates signatures collected under the old one.
- Arc only: contract addresses are `0x` + 40 hex.
- One backing vote per visitor fingerprint; 5 claims/hour per visitor, 3 per wallet.

## Wallet support

Wallets are discovered through **EIP-6963**, so every injected wallet announces
itself with its own name and icon — no hardcoded provider sniffing, no
`window.ethereum` collisions when several extensions are installed. MetaMask and
Rabby are promoted explicitly: if one is missing, the connect sheet shows its
brand icon (`public/wallets/`) with an install link instead of a dead button.

## Deploying

Everything writes to disk (`data/`, `public/uploads/`), so run it on a host with a
persistent filesystem — a VPS, Fly.io, Railway, a container with a volume. On a
read-only/serverless filesystem (e.g. Vercel) swap `lib/db.ts` for a hosted
database and `lib/uploads.ts` for object storage; both are isolated behind those
two modules for exactly that reason.
