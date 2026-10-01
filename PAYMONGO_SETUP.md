# Setting up PayMongo

Bull's Coffee takes GCash, Maya, GrabPay, QR Ph and card payments through PayMongo
(see the admin [Payment Gateway](frontend/src/Admin/pages/PaymentGateway.tsx) page,
currently wired to mock data). This is the procedure for turning that into a real
integration against the existing Express/Postgres backend and React/Vite frontend.

## 1. Create a PayMongo account and get test keys

1. Sign up at the PayMongo dashboard and create a business/merchant profile.
2. Leave the account in **Test mode** (toggle top-left of the dashboard) while building.
3. Go to **Developers → API Keys** and copy the **Secret key** (`sk_test_...`) and
   **Public key** (`pk_test_...`). The secret key authenticates server-to-server calls;
   the public key is only for client-side tokenization (not needed for the
   Checkout Session flow used below).
4. Live keys (`sk_live_...` / `pk_live_...`) only become available once PayMongo
   approves the business — request that early since review can take a few days.

## 2. Store the keys as backend env vars

Add to `backend/.env` (never commit this file — it's already gitignored) and to
`backend/.env.example` as blank placeholders:

```
PAYMONGO_SECRET_KEY=sk_test_xxxxxxxxxxxx
PAYMONGO_WEBHOOK_SECRET=whsk_xxxxxxxxxxxx   # from step 6
PAYMONGO_SUCCESS_URL=http://localhost:5173/checkout/success
PAYMONGO_CANCEL_URL=http://localhost:5173/checkout/cancel
```

The secret key must never reach the frontend. The admin "Secret key" field in
`PaymentGateway.tsx` is currently just local UI state — before this goes live, that
field should either be removed or changed to write into the backend `.env`/secret
store rather than being sent to or rendered from an API response.

## 3. Pick the integration method

PayMongo exposes several APIs; for a single checkout that needs to offer GCash,
Maya, GrabPay, QR Ph and cards without building separate flows for each, use the
**Checkout Session API**. You create a session server-side with the allowed
`payment_method_types`, redirect the customer to the hosted `checkout_url` PayMongo
returns, and PayMongo handles the method-specific UI. This avoids PCI scope on your
own servers and matches the "single integration" description already on the admin
page.

## 4. Add a PayMongo client helper

`backend/src/lib/paymongo.ts` — a thin wrapper, no SDK dependency needed since
PayMongo is a plain REST API authenticated with HTTP Basic Auth (secret key as the
username, empty password):

```ts
const PAYMONGO_API = "https://api.paymongo.com/v1";

const authHeader = () =>
  `Basic ${Buffer.from(`${process.env["PAYMONGO_SECRET_KEY"]}:`).toString("base64")}`;

export async function paymongoRequest<T>(
  path: string,
  body: unknown,
): Promise<T> {
  const res = await fetch(`${PAYMONGO_API}${path}`, {
    method: "POST",
    headers: {
      Authorization: authHeader(),
      "Content-Type": "application/json",
    },
    body: JSON.stringify({ data: { attributes: body } }),
  });
  if (!res.ok) {
    const text = await res.text();
    throw new Error(`PayMongo ${path} failed: ${res.status} ${text}`);
  }
  return res.json() as Promise<T>;
}
```

## 5. Create the checkout-session endpoint

Add a provider following the existing `order.provider.ts` pattern —
`backend/src/providers/payment.provider.ts`:

```ts
import { paymongoRequest } from "../lib/paymongo.ts";
import { getOrderById } from "./order.provider.ts";

export async function createCheckoutSession(order_id: number) {
  const order = await getOrderById(order_id);
  if (!order) throw new Error("Order not found");

  const result: any = await paymongoRequest("/checkout_sessions", {
    send_email_receipt: false,
    show_description: true,
    line_items: order.items.map((item) => ({
      name: item.product_name,
      amount: Math.round(item.selling_price * 100), // centavos
      currency: "PHP",
      quantity: item.quantity,
    })),
    payment_method_types: ["gcash", "paymaya", "grab_pay", "qrph", "card"],
    success_url: process.env["PAYMONGO_SUCCESS_URL"],
    cancel_url: process.env["PAYMONGO_CANCEL_URL"],
    metadata: { order_id: String(order_id) },
  });

  return {
    checkout_url: result.data.attributes.checkout_url,
    session_id: result.data.id,
  };
}
```

Then a controller/route pair mirroring `order.controller.ts` /
`order.route.ts`, e.g. `POST /api/payments/checkout-session` with
`{ order_id }` in the body, returning `{ checkout_url }` for the frontend to
redirect to.

Mount it in [server.ts](backend/src/server.ts) alongside the other routers:

```ts
import paymentRoutes from "./routes/payment.route.ts";
...
app.use("/api", paymentRoutes);
```

## 6. Set up the webhook

PayMongo confirms payment asynchronously — the customer may close the tab before
returning, so the order must only flip to `completed` once PayMongo's webhook
confirms it, not on the success-url redirect alone.

1. In the dashboard, go to **Developers → Webhooks → Add endpoint**.
2. URL: `https://<your-domain>/api/payments/webhook` (use an `ngrok`/`cloudflared`
   tunnel for local testing, since PayMongo can't reach `localhost`).
3. Subscribe to `checkout_session.payment.paid` (and optionally
   `checkout_session.payment.failed`).
4. Copy the **Webhook signing secret** into `PAYMONGO_WEBHOOK_SECRET`.

### Signature verification needs the raw body

Express's `app.use(express.json())` in [server.ts](backend/src/server.ts) parses and
discards the raw bytes, but PayMongo signs the exact raw payload. Register the
webhook route with `express.raw()` **before** the global JSON parser, or exclude
the webhook path from it:

```ts
app.post(
  "/api/payments/webhook",
  express.raw({ type: "application/json" }),
  webhookHandler,
);
app.use(express.json());
```

Verify the `Paymongo-Signature` header (format `t=...,te=...,li=...` — use `te` in
test mode, `li` in live mode) with HMAC-SHA256 over `${timestamp}.${rawBody}` using
`PAYMONGO_WEBHOOK_SECRET`, reject on mismatch, then look up `metadata.order_id` from
the event payload and:

- insert a row into `payments` (`order_id`, `amount_paid`, `payment_method`), reusing
  the existing `PaymentMethod` union (`"card"` or `"e_wallet"` depending on the
  PayMongo payment method returned),
- transition the order from `pending` to `completed` the same way
  `completeOrder` in [order.provider.ts](backend/src/providers/order.provider.ts)
  does.

Respond `200` quickly (PayMongo retries on non-2xx) and do the verification/order
update before returning.

## 7. Wire up the frontend

- **POS / kiosk checkout** (`frontend/src/POS`, `frontend/src/kiosk`): when the
  customer picks GCash/Maya/GrabPay/QR Ph/card instead of cash, call
  `POST /api/payments/checkout-session` with the created `order_id`, then
  `window.location.href = checkout_url`. On `PAYMONGO_SUCCESS_URL`, poll
  `GET /api/orders/:id` (already exists) until `order_status` is `completed`, since
  the webhook — not the redirect — is the source of truth.
- **Admin Payment Gateway page** (`frontend/src/Admin/pages/PaymentGateway.tsx`):
  replace the `PAYMONGO_SETTINGS` mock with a real `GET`/`PUT` against a small admin
  settings endpoint for the non-secret fields (mode, enabled methods, timeout,
  refund window). Leave the actual API keys out of that payload — they live in
  `backend/.env` only, so "Public key" / "Secret key" fields should either be dropped
  or turned into a one-time write-only "update secret" action, never a value the API
  reads back.
- **"Test connection" button**: point it at a lightweight backend endpoint that calls
  `GET https://api.paymongo.com/v1/checkout_sessions` (or any authenticated GET) with
  the configured key and reports success/failure, rather than the current stub toast.

## 8. Test in sandbox

- Use PayMongo's [test card numbers](https://developers.paymongo.com/docs/testing)
  (e.g. `4343434343434345` for a successful Visa charge) and the dashboard's test
  GCash/Maya flows, which auto-complete without a real wallet.
- Trigger a real webhook delivery by completing one of those test payments — check
  the dashboard's **Webhooks → Logs** tab if the order doesn't flip to `completed`.
- Confirm a failed/cancelled payment leaves the order `pending` (or sends it to
  whatever "payment timeout" behavior the admin page's cancellation setting implies).

## 9. Go live

1. Complete PayMongo's business verification.
2. Switch `PAYMONGO_SECRET_KEY` to the `sk_live_...` key in production env vars.
3. Add a second webhook endpoint in the dashboard for the production URL (test and
   live webhooks are configured separately) and set
   `PAYMONGO_WEBHOOK_SECRET` to the live one in production.
4. Update `PAYMONGO_SUCCESS_URL` / `PAYMONGO_CANCEL_URL` to the production frontend
   domain.
5. Flip the admin page's mode toggle from Sandbox to Live only after a real
   small-value test transaction succeeds end-to-end.
