import type { BillingCurrency, CheckoutPrice } from "@/lib/billing/config";

const STRIPE_LOCALE: Record<BillingCurrency, string> = {
  brl: "pt-BR",
  usd: "en",
  eur: "auto",
};

export interface CreateCheckoutInput {
  secretKey: string;
  offer: CheckoutPrice;
  userId: string;
  email: string;
  customerId?: string | null;
  successUrl: string;
  cancelUrl: string;
}

export async function createStripeCheckoutSession(
  input: CreateCheckoutInput
): Promise<{ id: string; url: string }> {
  const body = new URLSearchParams();
  body.set("mode", "subscription");
  body.set("line_items[0][price]", input.offer.priceId);
  body.set("line_items[0][quantity]", "1");
  body.set("success_url", input.successUrl);
  body.set("cancel_url", input.cancelUrl);
  body.set("client_reference_id", input.userId);
  body.set("locale", STRIPE_LOCALE[input.offer.currency]);
  body.set("metadata[userId]", input.userId);
  body.set("metadata[planTier]", input.offer.plan);
  body.set("metadata[offerId]", input.offer.id);
  body.set("metadata[priceId]", input.offer.priceId);
  body.set("metadata[currency]", input.offer.currency);
  body.set("subscription_data[metadata][userId]", input.userId);
  body.set("subscription_data[metadata][planTier]", input.offer.plan);
  body.set("subscription_data[metadata][offerId]", input.offer.id);
  body.set("subscription_data[metadata][priceId]", input.offer.priceId);
  body.set("subscription_data[metadata][currency]", input.offer.currency);
  if (input.customerId) {
    body.set("customer", input.customerId);
  } else {
    body.set("customer_email", input.email);
  }

  const res = await fetch("https://api.stripe.com/v1/checkout/sessions", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${input.secretKey}`,
      "Content-Type": "application/x-www-form-urlencoded",
    },
    body,
  });
  const json = (await res.json()) as {
    id?: string;
    url?: string;
    error?: { message?: string };
  };
  if (!res.ok || !json.id || !json.url) {
    throw new Error(json.error?.message ?? "checkout_failed");
  }
  return { id: json.id, url: json.url };
}
