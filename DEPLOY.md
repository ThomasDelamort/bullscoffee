# Deploying Bull's Coffee (beta, test mode)

This puts the app online for beta testing using **test credentials only**: Clerk's dev
instance, PayMongo test keys and Resend's sandbox sender. No domain, no live keys, no
real money.

| Part     | Where                | Folder     |
| -------- | -------------------- | ---------- |
| Database | Neon (free Postgres) | n/a        |
| Backend  | Render web service   | `backend`  |
| Frontend | Vercel               | `frontend` |

> The steps follow what the code reads and what the configs say, but nobody has run this
> deploy end to end yet. If a step behaves differently on screen, trust the screen and fix
> this file.

Each service needs a URL from the one before, so **do the steps in order**.

---

## 0. Before you start

- [ ] Merge `hammer` into `main`. Render and Vercel deploy from `main`.
- [ ] Commit or discard any local edits you don't want shipped (`git status`).
- [ ] Keep `backend/.env` and `frontend/.env` open. You'll copy values out of them.
- [ ] Decide which Google account will be the **admin**. It must be an account you can
      sign in with on the live site.

Check the build works on your machine first:

```bash
cd backend  && npm ci && npm run build
cd ../frontend && npm ci && npm run lint && npm run build
```

---

## 1. Database (Neon)

1. Sign up at neon.tech and create a project. Pick a region near your Render region
   (Singapore, if your testers are in the Philippines).
2. Copy the **connection string**. It looks like
   `postgresql://user:password@ep-xxxx.ap-southeast-1.aws.neon.tech/neondb?sslmode=require`.
   This is your `DATABASE_URL`.
3. Leave the database empty. The backend creates every table on its first boot.

SSL is switched on automatically for `neon.tech` addresses. For any other host, set
`PGSSL=true`.

### Menu data

A fresh database has an empty menu. Pick one:

- **Add it by hand:** after the deploy, sign in as admin and add categories and products
  from the Manager console (`/manager`). Quickest for a small menu.
- **Copy your local data:** dumps and restores everything, including your local
  employees. Run it **after** step 2, once the backend has created the tables:

  ```bash
  pg_dump --data-only --no-owner -t categories -t products -t ingredients \
    -t product_ingredients "postgresql://USER:PASS@localhost:5432/coffeedemo" > menu.sql
  psql "<your Neon DATABASE_URL>" -f menu.sql
  ```

  Copied rows keep their ids but not the counters that hand out new ones, so reset them
  or the next product you add will fail with a duplicate key:

  ```sql
  SELECT setval(pg_get_serial_sequence('categories', 'category_id'), COALESCE(MAX(category_id), 1)) FROM categories;
  SELECT setval(pg_get_serial_sequence('products', 'product_id'), COALESCE(MAX(product_id), 1)) FROM products;
  SELECT setval(pg_get_serial_sequence('ingredients', 'ingredient_id'), COALESCE(MAX(ingredient_id), 1)) FROM ingredients;
  ```

  Product images stay valid because they point at the same S3 bucket.

Don't run `backend/dummy.sql` on a beta database. It loads fake staff, customers and orders.

---

## 2. Backend (Render)

1. Render dashboard, **New**, **Web Service**, connect the GitHub repo, branch `main`.
2. Settings:

   | Setting          | Value                                      |
   | ---------------- | ------------------------------------------ |
   | Root Directory   | `backend`                                  |
   | Runtime          | Node                                       |
   | Build Command    | `npm ci --include=dev && npm run build`    |
   | Start Command    | `npm start`                                |
   | Health Check Path | `/health-check`                           |
   | Instance type    | Free is fine for a beta (see Caveats)      |

   The build needs dev dependencies because TypeScript is one.

3. **Environment variables.** Add these under **Environment**:

   | Variable                  | Value                                                                         |
   | ------------------------- | ----------------------------------------------------------------------------- |
   | `NODE_VERSION`            | `24`                                                                          |
   | `NODE_ENV`                | `production`                                                                  |
   | `DATABASE_URL`            | the Neon connection string from step 1                                        |
   | `CLERK_PUBLISHABLE_KEY`   | `pk_test_...` from your `.env`                                                |
   | `CLERK_SECRET_KEY`        | `sk_test_...` from your `.env`                                                |
   | `AWS_REGION`              | from your `.env`                                                              |
   | `AWS_ACCESS_KEY_ID`       | from your `.env`                                                              |
   | `AWS_SECRET_ACCESS_KEY`   | from your `.env`                                                              |
   | `AWS_S3_BUCKET`           | from your `.env`                                                              |
   | `PAYMONGO_SECRET_KEY`     | `sk_test_...` from your `.env`                                                |
   | `PAYMONGO_WEBHOOK_SECRET` | a placeholder for now (`whsk_placeholder`). The real one comes in step 5      |
   | `PAYMONGO_SUCCESS_URL`    | placeholder for now: `https://example.com/checkout/success` (fixed in step 4) |
   | `PAYMONGO_CANCEL_URL`     | placeholder for now: `https://example.com/checkout/cancel` (fixed in step 4)  |
   | `APP_URL`                 | placeholder for now: `https://example.com` (fixed in step 4)                  |
   | `ADMIN_EMAIL`             | the Google account that will be admin                                         |
   | `RESEND_API_KEY`          | `re_...` from your `.env` (or leave it out to send no emails)                 |
   | `NOTIFY_FROM`             | `onboarding@resend.dev`                                                       |

   Don't set `PORT`. Render sets it.

4. Click **Create Web Service** and watch the logs. A healthy first boot prints
   `Database schema initialized successfully.`, then
   `No active admin (ADMIN_EMAIL): invited ... as admin`, then
   `Server running on port ...`.

5. Open `https://<your-service>.onrender.com/health-check`. It should answer with a
   JSON "Server health check positive". **Write down this URL.** It's your backend URL.

   If the service fails to start, the log says why. The usual causes are a wrong
   `DATABASE_URL` or a missing variable.

---

## 3. Frontend (Vercel)

1. Vercel, **Add New**, **Project**, import the repo.
2. Settings:

   | Setting          | Value      |
   | ---------------- | ---------- |
   | Root Directory   | `frontend` |
   | Framework Preset | Vite       |

   Build and output settings can stay at their defaults. `vercel.json` already sends
   every route (like `/admin`) to the app.

3. **Environment variables:**

   | Variable                     | Value                                              |
   | ---------------------------- | -------------------------------------------------- |
   | `VITE_API_URL`               | your Render URL, with no trailing slash            |
   | `VITE_CLERK_PUBLISHABLE_KEY` | `pk_test_...` (same as the backend's)              |

   Vercel bakes these in **at build time**. If you change one later, redeploy.
   Without `VITE_API_URL` the site calls `localhost:3000` and every page fails.

4. Deploy. **Write down the Vercel URL**, e.g. `https://bullscoffee.vercel.app`.

---

## 4. Point the backend at the frontend

Back in Render, update these three variables with your Vercel URL, then let it redeploy:

```
APP_URL=https://<your-app>.vercel.app
PAYMONGO_SUCCESS_URL=https://<your-app>.vercel.app/checkout/success
PAYMONGO_CANCEL_URL=https://<your-app>.vercel.app/checkout/cancel
```

`APP_URL` is where staff invitations from the Users page send people.

---

## 5. PayMongo webhook

Without this, online payments never flip to "paid".

1. PayMongo dashboard, switch to **Test mode**, **Developers**, **Webhooks**, create one.
2. URL: `https://<your-service>.onrender.com/api/payments/webhook`
3. Event: `checkout_session.payment.paid`
4. Copy the **signing secret** (`whsk_...`) it shows.
5. In Render, set `PAYMONGO_WEBHOOK_SECRET` to it and save.

The admin **Payment Gateway** page shows whether the key, URLs and webhook are all set.

---

## 6. Clerk (dev instance)

1. Clerk dashboard, your **development** instance.
2. Add your Vercel URL to the allowed origins if it asks for one. Dev instances are
   usually permissive, but check **Domains**.
3. Optional: turn on **user lockout** in the dashboard if you want the Users page's
   Lock button to work.

The dev instance shows a "Development mode" banner. That's expected.

---

## 7. First sign-in and smoke test

Do these in order on the live site:

1. Open the Vercel URL. The storefront should load with your menu.
2. Go to `/sign-up` and **sign up with the `ADMIN_EMAIL` address** (Google works). The
   email must be verified, which Google sign-in does for you.
3. Open `/admin`. The first sign-in claims the admin invite and fills in your name. You
   should see the dashboard.
4. Open **System Health**, then **Run diagnostics**. Database should be operational.
   Email shows "not configured" if you left Resend out. That's fine.
5. **Settings**: check that the support email and store name look right.
6. **Kiosk:** open `/kiosk`, place an order, and see it in the Manager console's order
   queue (`/manager`).
7. **Online payment:** place an order at the register (`/pos`), pay by GCash or card with a
   [PayMongo test method](https://developers.paymongo.com/docs/testing), and confirm the
   order flips to paid within a few seconds.
8. **Email (optional):** on **Notifications**, send a test template to the email on your
   Resend account. With `onboarding@resend.dev`, no other address will receive anything.
9. **Backups:** on **Backups**, press **Back up now** and check that it lands in S3.

---

## Caveats

- **Render's free tier sleeps** after about 15 minutes without traffic. The first request
  after that takes around 50 seconds. Open the site yourself before a demo. The
  scheduler (backups, health checks) only runs while the service is awake.
- **Resend sandbox sender:** `onboarding@resend.dev` only delivers to your Resend
  account's own email. To email real customers you need a verified domain.
- **Clerk dev keys** are for testing. Strangers can sign up, but you shouldn't put real
  customer data on this setup.
- **Free Neon** pauses when idle and wakes on the next query, which adds a second or two.
  Render's own free Postgres is deleted after 30 days, which is why this guide uses Neon.
- **Rate limits are in memory** and reset when Render restarts the service.
- The Manager console's **Feedback** page has no backend yet.

---

## Troubleshooting

| Symptom                                           | Likely cause and fix                                                                  |
| ------------------------------------------------- | ------------------------------------------------------------------------------------- |
| Every page shows a network error                  | `VITE_API_URL` is missing or wrong. Fix it in Vercel and **redeploy**.                |
| Render deploy fails at build with `tsc: not found` | The build command must be `npm ci --include=dev && npm run build`.                   |
| Render boots, then exits on the database          | `DATABASE_URL` wrong, or a non-Neon host that needs `PGSSL=true`.                     |
| `/admin` says you don't have access               | You signed up with a different email than `ADMIN_EMAIL`, or it isn't verified.        |
| Nobody can open `/admin` at all                   | Set `ADMIN_EMAIL` in Render and restart. It only acts while no active admin exists.   |
| Sign-in loops or fails on the live site           | Clerk keys differ between Render and Vercel, or the Vercel URL isn't allowed in Clerk. |
| Online payment stays "pending"                    | The webhook URL or `PAYMONGO_WEBHOOK_SECRET` is wrong. Check PayMongo's webhook log.  |
| Payment option is missing at checkout             | The Payment Gateway admin page lists which of the key, URLs and webhook is missing.   |
| Images won't upload                               | S3 variables missing. Check `AWS_S3_BUCKET`, `AWS_REGION` and the keys.               |
| Invite emails or order emails never arrive        | `RESEND_API_KEY` missing, or the recipient isn't your Resend account's email.         |

---

## Environment variable reference

Backend (Render): see [backend/.env.example](backend/.env.example) for the full list with
comments. Frontend (Vercel): only `VITE_API_URL` and `VITE_CLERK_PUBLISHABLE_KEY`.

For the PayMongo account setup itself, see [PAYMONGO_SETUP.md](PAYMONGO_SETUP.md).
