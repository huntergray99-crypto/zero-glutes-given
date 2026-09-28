# Operations & open items

Everything here is a task for a **human with account access** — none of it can
be done from the codebase alone. Grouped by whether it costs money.

---

## Free — do these next

### 1. Temp admin access (blocks admin-panel verification)

The admin panel is gated on a doc existing at `admins/{your-uid}` in Firestore.
There is no self-serve way in — that's the point.

To grant yourself access: Firebase console → Firestore → `admins` collection →
add a document whose **ID is your Firebase uid**, any fields (they're ignored).
Get your uid from the browser console on the live site:

```js
(await import('/src/lib/firebase.js')).auth.currentUser.uid
```

Remove the doc when done. Signed-in state is cached, so sign out and back in
(or hard-reload) after adding it.

### 2. Firestore composite indexes

Firestore will email you a one-click "create index" link the first time a
compound query runs in production. Click it when it arrives; nothing to
pre-build. Indexes live in `firestore.indexes.json` once created — run
`npx firebase firestore:indexes > firestore.indexes.json` to pull them down so
they're in version control.

### 3. Discord alerts for new reports (skip the admin panel for triage)

A closure, safety correction, or new-spot suggestion now pings a Discord
channel the moment it's filed, so you don't have to remember to open the
report queue. Setup: Discord → server settings → Integrations → Webhooks →
New Webhook → Copy URL → paste into `.env` as `VITE_DISCORD_WEBHOOK_URL` →
redeploy. Leave it unset and reports still save fine, you just won't get
pinged.

⚠️ **Trade-off, accepted on purpose:** the webhook URL ships in the client
bundle (see `src/lib/alerts.js`). Anyone could extract it and post junk into
that one private channel — low stakes, and regenerating the URL takes ten
seconds in Discord's settings. The hardened version (a Cloud Function
triggered on the Firestore write, so the URL never reaches the browser) is a
drop-in upgrade once this app is on Blaze — see below.

### 4. Security rules are deployed from the repo now

Not the console. After editing `firestore.rules`:

```bash
npm run rules:deploy
```

Never paste rules into the console again — the console copy will be silently
overwritten by the next deploy.

---

## Costs money — deferred until you decide

### Stripe (free to set up, only costs per-transaction)

The code is wired and waiting on one env var. What you have to do in the
Stripe dashboard yourself:

1. Create the account (identity verification, bank account).
2. Product: "Zero Glutes Premium", recurring price.
3. Payment links → New link → select that price.
4. Set the success URL to `https://zeroglutesgiven.culebramaps.com/?upgraded=1`
   — the `?upgraded=1` is what triggers the "payment received" toast.
5. Put the link in `.env` as `VITE_STRIPE_PAYMENT_LINK=` and redeploy.

**Activation is manual until a webhook exists.** After someone pays, you grant
premium by hand: admin panel → Comp premium → paste their uid → Grant. Stripe
shows you the uid as `client_reference_id` on the payment. Fine at low volume,
does not scale past maybe a dozen customers a week.

⚠️ **App store risk, unresolved.** Apple guideline 3.1.1 requires native IAP to
unlock in-app functionality. The iOS build is a Capacitor wrapper around this
same site, so a Stripe checkout inside it is a plausible rejection. Options:
hide the upgrade button in the iOS wrapper, or implement StoreKit IAP for iOS
and keep Stripe for web. Decide before submitting to Apple, not after.

### Firebase Blaze plan (pay-as-you-go, generous free tier)

Required for Cloud Functions and Storage. Unlocks, in rough value order:

- **Stripe webhook** → automatic premium activation, removes the manual grant
  step above. This is the one that actually matters for selling the app.
- **Aggregated community ratings** — real averages computed server-side
  instead of the client reading every review.
- **Auto-hide on corroboration** — a spot reported closed by N trusted users
  gets flagged without an admin present.
- **Firebase Storage** → user-uploaded photos shared between users. Today
  photos are local-only per device.
- **Hardened report alerts** → move the Discord ping (item 3 above) into a
  Cloud Function triggered on the `reports` write, so the webhook URL never
  ships to the browser. Not urgent — the client-side version works today.

Blaze has a free tier that this app's volume would sit inside for a long time;
the plan change is mostly about attaching a card, not about immediate cost.

### impact.com affiliate program

DoorDash and Uber Eats both run consumer affiliate programs through
impact.com. Apply, get approved, then paste the tracking links into
`VITE_AFFIL_DOORDASH` / `VITE_AFFIL_UBEREATS` (format documented in
`.env.example`). Until then the delivery links work fine, they just earn
nothing. Zero code changes needed — the plumbing is already there.

---

## Known gaps, low priority

- `index.html` meta tags (title, description, og:*) are still Seattle-specific.
  Everything else reads from `src/data/cities.js`, but these are static HTML
  and need build-time templating. Worth doing when a second market is real,
  not before.
- `slugify()` drops accented characters — "Café Organique" becomes
  `caf-organique`. Cosmetic; ids are never shown to users.
