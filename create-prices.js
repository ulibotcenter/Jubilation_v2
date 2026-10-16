#!/usr/bin/env node
/**
 * Creates or reuses the 18 launch-promo Stripe Prices for /planos.
 *
 *   node create-prices.js
 *
 * Reads STRIPE_SECRET_KEY from ./.env.local (KEY=VALUE). Does not write
 * .env.local or print the secret. Never archives, deactivates, or deletes
 * Products or Prices. Stripe is not a package.json dependency — this file
 * uses Node's built-in fetch against the Stripe REST API.
 *
 * This script was not executed against Stripe in the pull request.
 */

"use strict";

const fs = require("fs");
const path = require("path");

const ENV_PATH = path.join(__dirname, ".env.local");
const STRIPE_API = "https://api.stripe.com/v1";
const PLAN_META = "jubilation_plan";
const ENV_META = "jubilation_env";

const PRODUCTS = [
  {
    key: "basico",
    name: "Básico",
    description: "Jubilation Básico — manual engine, 1 saved plan, three blocks, up to 5 holdings.",
  },
  {
    key: "completo",
    name: "Completo",
    description: "Jubilation Completo — unlimited holdings, connectors, scenarios, formatted PDF.",
  },
  {
    key: "completo_conjuge",
    name: "Completo+Cônjuge",
    description:
      "Jubilation Completo+Cônjuge — Completo plus couple modeling. Does not include spouse B3.",
  },
];

/** Exactly the 18 catalog promo cells. Amounts are cents. */
const PRICES = [
  { env: "STRIPE_PRICE_BASICO_MONTHLY", plan: "basico", interval: "month", currency: "brl", unitAmount: 2990 },
  { env: "STRIPE_PRICE_BASICO_YEARLY", plan: "basico", interval: "year", currency: "brl", unitAmount: 39900 },
  { env: "STRIPE_PRICE_BASICO_MONTHLY_USD", plan: "basico", interval: "month", currency: "usd", unitAmount: 599 },
  { env: "STRIPE_PRICE_BASICO_YEARLY_USD", plan: "basico", interval: "year", currency: "usd", unitAmount: 7900 },
  { env: "STRIPE_PRICE_BASICO_MONTHLY_EUR", plan: "basico", interval: "month", currency: "eur", unitAmount: 599 },
  { env: "STRIPE_PRICE_BASICO_YEARLY_EUR", plan: "basico", interval: "year", currency: "eur", unitAmount: 7900 },
  { env: "STRIPE_PRICE_COMPLETO_MONTHLY", plan: "completo", interval: "month", currency: "brl", unitAmount: 4990 },
  { env: "STRIPE_PRICE_COMPLETO_YEARLY", plan: "completo", interval: "year", currency: "brl", unitAmount: 59900 },
  { env: "STRIPE_PRICE_COMPLETO_MONTHLY_USD", plan: "completo", interval: "month", currency: "usd", unitAmount: 999 },
  { env: "STRIPE_PRICE_COMPLETO_YEARLY_USD", plan: "completo", interval: "year", currency: "usd", unitAmount: 11900 },
  { env: "STRIPE_PRICE_COMPLETO_MONTHLY_EUR", plan: "completo", interval: "month", currency: "eur", unitAmount: 999 },
  { env: "STRIPE_PRICE_COMPLETO_YEARLY_EUR", plan: "completo", interval: "year", currency: "eur", unitAmount: 11900 },
  { env: "STRIPE_PRICE_COMPLETO_CONJUGE_MONTHLY", plan: "completo_conjuge", interval: "month", currency: "brl", unitAmount: 5990 },
  { env: "STRIPE_PRICE_COMPLETO_CONJUGE_YEARLY", plan: "completo_conjuge", interval: "year", currency: "brl", unitAmount: 69900 },
  { env: "STRIPE_PRICE_COMPLETO_CONJUGE_MONTHLY_USD", plan: "completo_conjuge", interval: "month", currency: "usd", unitAmount: 1199 },
  { env: "STRIPE_PRICE_COMPLETO_CONJUGE_YEARLY_USD", plan: "completo_conjuge", interval: "year", currency: "usd", unitAmount: 13900 },
  { env: "STRIPE_PRICE_COMPLETO_CONJUGE_MONTHLY_EUR", plan: "completo_conjuge", interval: "month", currency: "eur", unitAmount: 1199 },
  { env: "STRIPE_PRICE_COMPLETO_CONJUGE_YEARLY_EUR", plan: "completo_conjuge", interval: "year", currency: "eur", unitAmount: 13900 },
];

function fail(message) {
  console.error(message);
  process.exit(1);
}

function parseEnvFile(filePath) {
  const text = fs.readFileSync(filePath, "utf8");
  const env = {};
  for (const raw of text.split(/\r?\n/)) {
    const line = raw.trim();
    if (!line || line.startsWith("#")) continue;
    const eq = line.indexOf("=");
    if (eq <= 0) continue;
    const key = line.slice(0, eq).trim();
    let value = line.slice(eq + 1).trim();
    if (
      (value.startsWith('"') && value.endsWith('"')) ||
      (value.startsWith("'") && value.endsWith("'"))
    ) {
      value = value.slice(1, -1);
    }
    env[key] = value;
  }
  return env;
}

function isPlaceholderSecret(value) {
  const v = (value ?? "").trim();
  if (!v) return true;
  if (!/^sk_(test|live)_/i.test(v)) return true;
  if (/^sk_(test|live)_$/i.test(v)) return true;
  if (v.length < 20) return true;
  return /placeholder|changeme|your[_-]?key|example|xxx+|paste.?here|sk_test_billing/i.test(
    v
  );
}

function loadSecret() {
  if (!fs.existsSync(ENV_PATH)) {
    fail(
      "Missing .env.local in the project root. Add STRIPE_SECRET_KEY=sk_test_… (or sk_live_…) and run: node create-prices.js"
    );
  }
  const env = parseEnvFile(ENV_PATH);
  const secret = env.STRIPE_SECRET_KEY ?? "";
  if (isPlaceholderSecret(secret)) {
    fail(
      "STRIPE_SECRET_KEY is missing or still a placeholder in .env.local. Paste a real sk_test_ or sk_live_ key, then run: node create-prices.js"
    );
  }
  return secret;
}

function encode(fields) {
  const body = new URLSearchParams();
  for (const [key, value] of Object.entries(fields)) {
    if (value == null) continue;
    body.set(key, String(value));
  }
  return body;
}

async function stripe(secret, method, pathname, { fields, idempotencyKey } = {}) {
  const url = pathname.startsWith("http") ? pathname : `${STRIPE_API}${pathname}`;
  const headers = {
    Authorization: `Bearer ${secret}`,
  };
  const init = { method, headers };
  if (fields) {
    headers["Content-Type"] = "application/x-www-form-urlencoded";
    init.body = encode(fields);
  }
  if (idempotencyKey) {
    headers["Idempotency-Key"] = idempotencyKey;
  }

  let lastErr = "stripe_request_failed";
  for (let attempt = 0; attempt < 4; attempt += 1) {
    const res = await fetch(url, init);
    const json = await res.json();
    if (res.status === 429 || res.status >= 500) {
      lastErr = json.error?.message || `HTTP ${res.status}`;
      await new Promise((r) => setTimeout(r, 400 * 2 ** attempt));
      continue;
    }
    if (!res.ok) {
      fail(`Stripe ${method} ${pathname} failed: ${json.error?.message || `HTTP ${res.status}`}`);
    }
    return json;
  }
  fail(`Stripe ${method} ${pathname} failed: ${lastErr}`);
}

async function listAll(secret, pathname, extra = {}) {
  const items = [];
  let startingAfter = null;
  for (let page = 0; page < 20; page += 1) {
    const params = new URLSearchParams({ limit: "100", ...extra });
    if (startingAfter) params.set("starting_after", startingAfter);
    const json = await stripe(secret, "GET", `${pathname}?${params.toString()}`);
    const data = Array.isArray(json.data) ? json.data : [];
    items.push(...data);
    if (!json.has_more || data.length === 0) break;
    startingAfter = data[data.length - 1].id;
  }
  return items;
}

function productMatches(product, key) {
  return product?.metadata?.[PLAN_META] === key;
}

function priceMatchesCell(price, cell) {
  const interval = price.recurring?.interval;
  const intervalCount = price.recurring?.interval_count ?? 1;
  return (
    price.currency === cell.currency &&
    price.unit_amount === cell.unitAmount &&
    interval === cell.interval &&
    intervalCount === 1
  );
}

function pickReusablePrice(prices, cell) {
  const matches = prices.filter((price) => priceMatchesCell(price, cell));
  if (matches.length === 0) return null;
  const byEnv = matches.filter((p) => p.metadata?.[ENV_META] === cell.env);
  const pool = byEnv.length > 0 ? byEnv : matches;
  return pool.find((p) => p.active !== false) ?? pool[0];
}

async function findOrCreateProduct(secret, spec, cache) {
  const existing = cache.find((product) => productMatches(product, spec.key));
  if (existing) {
    console.error(`[reused] product ${spec.name} ${existing.id}${existing.active === false ? " (inactive)" : ""}`);
    return existing;
  }
  const created = await stripe(secret, "POST", "/products", {
    idempotencyKey: `jubilation-product-${spec.key}-v1`,
    fields: {
      name: spec.name,
      description: spec.description,
      [`metadata[${PLAN_META}]`]: spec.key,
    },
  });
  console.error(`[created] product ${spec.name} ${created.id}`);
  cache.push(created);
  return created;
}

async function findOrCreatePrice(secret, product, cell) {
  const listed = [
    ...(await listAll(secret, "/prices", { product: product.id, limit: "100" })),
    ...(await listAll(secret, "/prices", {
      product: product.id,
      limit: "100",
      active: "false",
    })),
  ];
  const seen = new Set();
  const prices = listed.filter((p) => {
    if (!p?.id || seen.has(p.id)) return false;
    seen.add(p.id);
    return true;
  });

  const reused = pickReusablePrice(prices, cell);
  if (reused) {
    const tag = reused.active === false ? " (inactive)" : "";
    console.error(`[reused] ${cell.env} ${reused.id}${tag}`);
    return reused;
  }

  const created = await stripe(secret, "POST", "/prices", {
    idempotencyKey: `jubilation-price-${cell.env}-v1`,
    fields: {
      product: product.id,
      currency: cell.currency,
      unit_amount: String(cell.unitAmount),
      "recurring[interval]": cell.interval,
      nickname: cell.env,
      [`metadata[${PLAN_META}]`]: cell.plan,
      [`metadata[${ENV_META}]`]: cell.env,
    },
  });
  console.error(`[created] ${cell.env} ${created.id}`);
  return created;
}

async function main() {
  if (PRICES.length !== 18) {
    fail(`Internal catalog must have 18 prices, found ${PRICES.length}.`);
  }
  const secret = loadSecret();
  const allProducts = [
    ...(await listAll(secret, "/products")),
    ...(await listAll(secret, "/products", { active: "false" })),
  ];
  const productCache = [];
  const seenProd = new Set();
  for (const product of allProducts) {
    if (!product?.id || seenProd.has(product.id)) continue;
    seenProd.add(product.id);
    productCache.push(product);
  }

  const productsByPlan = {};
  for (const spec of PRODUCTS) {
    productsByPlan[spec.key] = await findOrCreateProduct(secret, spec, productCache);
  }

  const envLines = [];
  for (const cell of PRICES) {
    const product = productsByPlan[cell.plan];
    const price = await findOrCreatePrice(secret, product, cell);
    envLines.push(`${cell.env}=${price.id}`);
  }

  console.error("");
  console.error("----- paste into .env.local / Vercel (do not commit secrets) -----");
  console.log(envLines.join("\n"));
  console.error("----- end -----");
}

main().catch((err) => {
  fail(err instanceof Error ? err.message : String(err));
});
