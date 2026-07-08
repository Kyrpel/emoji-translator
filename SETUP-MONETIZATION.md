# 💰 Going Live: EMOJIFY Pro ($4.90 one-time unlock)

The code is done. This checklist is everything **you** need to do (all dashboards, ~1 hour of clicking plus waiting for approvals) to start selling.

## How it works (30-second version)

- Free users: the classic 4 local modes, plus **5 free AI translations** as a taste.
- Pro ($4.90 once): unlimited AI translations, 5 personality modes (Roast 🔥, Gen Z 💅, Flirty 😏, Passive-Aggressive 🙂, Story 📖), watermark-free share cards, unlimited saved history.
- No accounts: buyers get a **license key** by email, paste it in the app once, done.
- Enforcement is **server-side**: the AI endpoint (`/api/translate`) only serves valid license keys (checked against Lemon Squeezy) — the paywall can't be bypassed by editing browser storage. Your OpenAI key lives only on the server.

## Step 1 — ⚠️ Rotate your API keys (do this first)

Your old keys were `VITE_`-prefixed, which means any previous build shipped them **inside the public JavaScript**. Treat them as leaked:

1. Go to https://platform.openai.com/api-keys → delete the old key → create a new one.
2. Same for your ZAI key at z.ai (or just delete it — the app no longer uses it).
3. While you're there: **Settings → Limits → set a hard monthly spend cap** (e.g. $10). This is your safety net against abuse. Real cost is ~$0.02 per 1,000 translations.

## Step 2 — Lemon Squeezy store (start early — approval takes days)

1. Sign up at lemonsqueezy.com → create a store (this triggers identity verification — the longest wait in this whole list; the store works in **test mode** meanwhile).
2. Products → New product: **"EMOJIFY Pro"**, price **$4.90**, one-time purchase (single payment, not subscription).
3. In the product's variant settings, enable **License Keys**, set **activation limit: 3** (lets a buyer use phone + laptop; blocks mass key-sharing).
4. Copy three things:
   - The **Buy link** (Share → copy link, looks like `https://yourstore.lemonsqueezy.com/buy/xxxx-...`)
   - Your **Store ID** (Settings → Stores, it's a number)
   - The **Product ID** (in the product page URL, also a number)

Alternative if LS signup stalls: Polar.sh has the same model (license keys + checkout); only `functions/api/_shared.js` and `functions/api/license/activate.js` would need their two fetch calls swapped.

## Step 3 — Deploy to Cloudflare Pages (free, commercial use allowed)

1. Push this repo to GitHub (already set up: `Kyrpel/emoji-translator`).
2. dash.cloudflare.com → Workers & Pages → Create → Pages → connect the GitHub repo.
   - Build command: `npm run build`  · Output directory: `dist`
   - The `functions/` folder is picked up automatically as your API.
3. Pages project → Settings → Environment variables (Production):
   - `OPENAI_API_KEY` = your **new** OpenAI key
   - `LEMONSQUEEZY_STORE_ID` = your store ID
   - `LEMONSQUEEZY_PRODUCT_ID` = your product ID
   - `VITE_LEMON_CHECKOUT_URL` = your Buy link (this one is public — it's just the checkout page)
4. Redeploy after setting the variables. Optional: add a custom domain (e.g. emojify.app) — shares look far better with a real domain.

### Local development

```bash
npm install
npx wrangler pages dev -- npm run dev     # app + /api functions together
```

Put dev secrets in a `.dev.vars` file (gitignored): same four variable names as above.

## Step 4 — Test the purchase (while store is in test mode)

1. Open the deployed site → type something → hit **✨ AI Translate** 5 times → paywall appears. ✅
2. Click **Go Pro** → checkout overlay → pay with test card `4242 4242 4242 4242` (any future date/CVC).
3. Check your email for the license key → paste it in the Pro modal → Activate → PRO badge appears, personality modes unlock. ✅
4. In the LS dashboard, refund the test order → within a day the app should drop back to free (or immediately after clearing the site's localStorage). ✅
5. Flip the store to **live mode** once LS approves you, buy once with a real card, refund yourself. Done — you're selling.

## Step 5 — The part that actually makes money

Checkout mechanics don't create revenue; **distribution does**. The app now has two built-in growth loops — use them:

- Every free share/card carries a link back to your site.
- **Roast mode screenshots are your ad creative.** Post daily translations of trending phrases on TikTok/X/Reddit; put the link in bio.
- Launch on Product Hunt once the domain is live.
- A "first 100 buyers: $2.90" launch price is just a second product in LS with its own Buy link — zero code changes (swap `VITE_LEMON_CHECKOUT_URL`).

Unit economics per sale: $4.90 − LS fees (~$0.75) ≈ **$4.15 net**, VAT/invoices handled by Lemon Squeezy. AI cost per Pro user: pennies per month. Hosting: $0.
