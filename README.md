# SmartApply

SmartApply is a MERN application for managing student job-application activity.

## Prerequisites

- Node.js 20.19+
- MongoDB 7+ or MongoDB Atlas

## Local setup

1. Copy `server/.env.example` to `server/.env` and replace every secret.
2. Copy `client/.env.example` to `client/.env`.
3. Run `npm install` from the repository root.
4. Run `npm run dev` and open `http://localhost:5173`.

The API runs at `http://localhost:5000`; its health endpoint is `/api/v1/health`.

## Workspaces

- `client`: React, Vite, Material UI, Router, Axios, React Hook Form/Yup, Recharts
- `server`: Express, Mongoose, JWT, validation, logging, and security middleware

See [`docs/architecture.md`](docs/architecture.md) for the Phase 1 architecture.
See [`docs/data-model.md`](docs/data-model.md) for the Phase 2 collections, relationships, and indexes.
See [`docs/api.md`](docs/api.md) for the Phase 3 REST endpoints and bootstrap instructions.
See [`docs/frontend.md`](docs/frontend.md) for the Phase 4 route map and integrated workflows.
See [`docs/testing.md`](docs/testing.md) for the Phase 5 test suites, hardening, and release checklist.

### Sign-in

All accounts sign in with their email and password. Email OTP verification is removed, including for accounts that previously enabled it. Email delivery is used for password resets only.

### Branded email sender

Security emails use the display name `SmartApply` and matching HTML/plain-text templates. Set these server environment variables to use your branded sender:

```dotenv
MAIL_FROM_NAME=SmartApply
MAIL_FROM=no-reply@smartapply.com
```

Only set that address after verifying ownership of `smartapply.com` and authorizing the sender with your SMTP provider. Configure the provider's required DNS authentication records. Existing explicit `MAIL_FROM` settings take precedence; the application does not provision a mailbox or verify domain ownership. Restart the server after changing mail settings.

### Email delivery on Render

Render free web services block outbound SMTP ports 25, 465, and 587, so Gmail SMTP can work locally and time out in deployment. Use HTTPS email delivery on the free plan, or use a paid Render instance for SMTP. See [Render's free service limits](https://render.com/docs/free).

To use the supported HTTPS delivery:

1. Create a Resend account, verify a domain you own, and create an API key with sending permission for that domain.
2. In the **backend Render service → Environment**, set:

   ```dotenv
   RESEND_API_KEY=re_your_actual_key
   MAIL_FROM=no-reply@your-verified-domain.com
   MAIL_FROM_NAME=SmartApply
   FRONTEND_RESET_URL=https://your-frontend-domain/reset-password
   ```

3. Save the settings and redeploy the backend with this code. `RESEND_API_KEY` takes precedence over SMTP settings; existing local SMTP configuration can remain unchanged.
4. Request a password reset and verify receipt. If sending fails, inspect the backend's `Email delivery failed` log and Resend dashboard. Logs include the provider and HTTP/SMTP status without exposing codes or credentials.

Use an address on your verified domain for `MAIL_FROM`; the default `no-reply@smartapply.com` only works if you own and authorize that domain. Resend's testing sender is restricted and should not be used for general password reset emails. See [Resend's email API documentation](https://resend.com/docs/api-reference/emails/send-email).

Set secrets on the backend service, never in client/Vite variables. Your local `server/.env` is ignored by Git and is not automatically uploaded to Render. Configure a Resend API key or an SMTP host to deliver password reset emails. Successful API acceptance does not guarantee inbox delivery; inspect the provider delivery events when needed.

### Custom domain hosted outside Vercel

The Vercel deployment proxies `/api` to Render. A static Hostinger deployment does not apply `vercel.json`; without a proxy, API requests can return the frontend HTML.

On Render set `CLIENT_URL=https://smart-tracker-plum.vercel.app` and `CLIENT_ADDITIONAL_ORIGINS=https://smartapply.nexusctc.com`. Set `FRONTEND_RESET_URL=https://smartapply.nexusctc.com/reset-password`, then deploy the updated backend. Additional origins are comma-separated exact HTTP(S) origins, without paths or trailing slashes.

For a Hostinger build, run from the repository root:

```sh
npm run build:hostinger
```

Upload the contents of `client/dist` to Hostinger. Keep the static SPA fallback for page routes. For Vercel, set `VITE_API_BASE_URL=/api/v1` in the Vercel build environment to preserve its same-origin proxy. Do not upload a build containing the localhost API URL.

Direct browser requests from Hostinger to Render use cross-site cookies. Production must use `NODE_ENV=production`; the existing cookies use `Secure` and `SameSite=None`. Browsers that block third-party cookies may prevent session restoration with direct cross-site requests. Connecting the custom domain to the existing Vercel project instead, or configuring a real same-origin `/api` reverse proxy on Hostinger, preserves first-party session cookies.

The Hostinger command overrides the local API URL for this build and adds a `.htaccess` SPA fallback and fresh-index cache headers. Upload hidden files too. The backend stays on Render; no server code or `.env` secrets belong in the Hostinger document root.
