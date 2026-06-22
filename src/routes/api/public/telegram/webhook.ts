import { createFileRoute } from "@tanstack/react-router";
import { createHash, timingSafeEqual } from "crypto";

const GATEWAY_URL = "https://connector-gateway.lovable.dev/telegram";

function deriveWebhookSecret(telegramApiKey: string): string {
  return createHash("sha256")
    .update(`telegram-webhook:${telegramApiKey}`)
    .digest("base64url");
}

function safeEqual(a: string, b: string): boolean {
  const left = Buffer.from(a);
  const right = Buffer.from(b);
  return left.length === right.length && timingSafeEqual(left, right);
}

async function tg(method: string, body: unknown) {
  const LOVABLE_API_KEY = process.env.LOVABLE_API_KEY!;
  const TELEGRAM_API_KEY = process.env.TELEGRAM_API_KEY!;
  return fetch(`${GATEWAY_URL}/${method}`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${LOVABLE_API_KEY}`,
      "X-Connection-Api-Key": TELEGRAM_API_KEY,
      "Content-Type": "application/json",
    },
    body: JSON.stringify(body),
  });
}

export const Route = createFileRoute("/api/public/telegram/webhook")({
  server: {
    handlers: {
      POST: async ({ request }) => {
        const TELEGRAM_API_KEY = process.env.TELEGRAM_API_KEY;
        if (!TELEGRAM_API_KEY) {
          return new Response("not configured", { status: 500 });
        }

        const expected = deriveWebhookSecret(TELEGRAM_API_KEY);
        const actual = request.headers.get("X-Telegram-Bot-Api-Secret-Token") ?? "";
        if (!safeEqual(actual, expected)) {
          return new Response("Unauthorized", { status: 401 });
        }

        const update = await request.json();

        try {
          if (update.pre_checkout_query) {
            await tg("answerPreCheckoutQuery", {
              pre_checkout_query_id: update.pre_checkout_query.id,
              ok: true,
            });
          } else if (update.message?.successful_payment) {
            const chatId = update.message.chat?.id;
            const stars = update.message.successful_payment.total_amount;
            if (chatId) {
              await tg("sendMessage", {
                chat_id: chatId,
                text: `Thank you for your ${stars} ⭐ donation! Nothing happens — but it means a lot.`,
              });
            }
          }
        } catch {
          // swallow — always 200 so Telegram doesn't retry forever
        }

        return Response.json({ ok: true });
      },
    },
  },
});
