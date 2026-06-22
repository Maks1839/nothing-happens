import { createServerFn } from "@tanstack/react-start";

const GATEWAY_URL = "https://connector-gateway.lovable.dev/telegram";

export const createStarsInvoice = createServerFn({ method: "POST" })
  .inputValidator((input: { amount: number }) => {
    const amount = Math.floor(Number(input?.amount));
    if (!Number.isFinite(amount) || amount < 1 || amount > 2500) {
      throw new Error("Amount must be between 1 and 2500 Stars");
    }
    return { amount };
  })
  .handler(async ({ data }) => {
    const LOVABLE_API_KEY = process.env.LOVABLE_API_KEY;
    const TELEGRAM_API_KEY = process.env.TELEGRAM_API_KEY;
    if (!LOVABLE_API_KEY) throw new Error("LOVABLE_API_KEY is not configured");
    if (!TELEGRAM_API_KEY) throw new Error("TELEGRAM_API_KEY is not configured");

    const payload = `donation:${crypto.randomUUID()}`;

    const res = await fetch(`${GATEWAY_URL}/createInvoiceLink`, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${LOVABLE_API_KEY}`,
        "X-Connection-Api-Key": TELEGRAM_API_KEY,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        title: "Support Nothing Happens",
        description: "Thank you for supporting the project.",
        payload,
        currency: "XTR",
        prices: [{ label: "Donation", amount: data.amount }],
      }),
    });

    const body = await res.json();
    if (!res.ok || !body?.ok) {
      throw new Error(
        `Telegram createInvoiceLink failed [${res.status}]: ${JSON.stringify(body)}`,
      );
    }

    return { url: body.result as string, payload };
  });
