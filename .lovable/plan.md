
## Yes — here's how Telegram Stars will work

Telegram Stars (`XTR`) is the in-app currency for Telegram Mini Apps. Payment flow:

1. The Mini App asks our backend to create an invoice link for N Stars.
2. The backend calls Telegram's `createInvoiceLink` with `currency: "XTR"` using the bot token.
3. The Mini App opens the invoice with `Telegram.WebApp.openInvoice(link)`.
4. Telegram sends a `pre_checkout_query` to our webhook → we must answer `ok: true` within 10s.
5. On success, Telegram sends `successful_payment` → we acknowledge. The Stars land in the bot's balance.

Stars must be paid through your bot's own invoice — they can't be sent to an arbitrary wallet.

## What I'll build

### 1. Connect Telegram
Link the Lovable **Telegram** connector with your bot token. This exposes `TELEGRAM_API_KEY` + `LOVABLE_API_KEY` so the server can call Telegram's Bot API through the gateway (auto token handling, no secrets in the client).

### 2. Server function: create Stars invoice
`src/lib/telegram-stars.functions.ts` — `createStarsInvoice({ amount })`:
- Validates amount (1–2500 Stars, Telegram's per-invoice cap)
- Calls `POST /telegram/createInvoiceLink` via the gateway with:
  ```
  title: "Support Nothing Happens"
  description: "Thank you for supporting the project."
  payload: "donation:<uuid>"
  currency: "XTR"
  prices: [{ label: "Donation", amount: <stars> }]
  ```
- Returns `{ url }`

### 3. Public webhook route
`src/routes/api/public/telegram/webhook.ts`:
- Verifies `X-Telegram-Bot-Api-Secret-Token` (HMAC-derived from `TELEGRAM_API_KEY`, timing-safe compare)
- On `pre_checkout_query` → call `answerPreCheckoutQuery` with `ok: true`
- On `message.successful_payment` → optionally send a thank-you `sendMessage`
- Returns `200 ok`

### 4. Register the webhook
After deploy, I'll run `setWebhook` against `https://project--7486ff46-bb1c-4ddf-a863-d3ce3d9bacdd-dev.lovable.app/api/public/telegram/webhook` with `allowed_updates: ["pre_checkout_query", "message"]`.

### 5. Frontend changes in `src/routes/index.tsx`
Replace the placeholder `payWithStars()`:
- Replace the single "Pay with Telegram Stars" button with a Stars amount picker modal showing presets **10 ⭐ / 50 ⭐ / 100 ⭐ / 500 ⭐** plus a "Custom amount" input (1–2500).
- On pick: call `createStarsInvoice({ amount })` → `Telegram.WebApp.openInvoice(url, (status) => …)`.
- Handle `status`: `paid` → show a thank-you toast + haptic success; `cancelled`/`failed` → silent close; `pending` → "Processing…".
- If not running inside Telegram (`window.Telegram?.WebApp` missing), show "Open in Telegram to pay with Stars".

## Technical notes (for reference)

- Stars-only invoices skip provider tokens entirely — no Stripe / payment provider needed.
- Telegram delivers to your bot's Stars balance; you withdraw via the Telegram bot owner flow. Lovable Payments (Paddle/Stripe) is not involved.
- All Telegram API calls go through `https://connector-gateway.lovable.dev/telegram/...` with `Authorization: Bearer $LOVABLE_API_KEY` and `X-Connection-Api-Key: $TELEGRAM_API_KEY`. The bot token never touches the client.
- Webhook secret is derived as `sha256("telegram-webhook:" + TELEGRAM_API_KEY)` (base64url) so setup and verification stay in sync without an extra secret.
- The crypto donate flow stays unchanged.

## Files touched

- new: `src/lib/telegram-stars.functions.ts`
- new: `src/routes/api/public/telegram/webhook.ts`
- edit: `src/routes/index.tsx` (Stars amount modal + real invoice flow)
- runtime: link Telegram connector, then `setWebhook` from the sandbox
