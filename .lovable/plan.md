## Why Stars payments fail

1. **Server-function ID is invalid.** The dev server rejects the call with `Invalid server function ID: src_lib_telegram-stars_functions_ts--createStarsInvoice_createServerFn_handler`. TanStack's server-fn ID encoder doesn't allow hyphens inside the filename segment, so the `telegram-stars` part breaks dispatch on both preview and (once deployed) production.
2. **Published site is stale.** Grepping the live JS at `nothing-happens.lovable.app` shows no `createStarsInvoice` / `XTR` / `createInvoiceLink` symbols. The Stars feature was added after the last publish, and the Telegram Mini App opens the published URL — so even after the rename, the user must publish for the button to work inside the bot.

## Fix

1. Rename `src/lib/telegram-stars.functions.ts` → `src/lib/telegramStars.functions.ts` (no hyphen — safe characters only).
2. Update the import in `src/routes/index.tsx` from `@/lib/telegram-stars.functions` to `@/lib/telegramStars.functions`.
3. No other code changes needed — handler, validator, gateway call, webhook, and frontend modal all stay as-is.
4. After the rename, publish the project so the new code reaches `nothing-happens.lovable.app`, which is where the Telegram Mini App actually loads from.

## Verification

- In preview, open the donate panel → Stars → tap an amount → server fn returns `{ url }` (no more "Invalid server function ID" in dev-server logs).
- After publishing, `curl https://nothing-happens.lovable.app/assets/*.js | grep createInvoiceLink` should match.
- Opening the bot's Mini App → Donate → Pay with Telegram Stars → Telegram's native invoice sheet appears.
