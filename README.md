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

### Email two-step verification

Staff accounts default to email verification on every login (including existing staff accounts without an explicit preference). After password validation, a six-digit code is sent to the registered email address. Codes expire after 10 minutes, allow five attempts, and can only be used once. Sign in again to request a replacement code; this invalidates the previous code.

Every login requires an email code when two-step verification is enabled, including previously remembered browsers. Existing signed-in sessions can still refresh without another code. Security settings allow each user to enable or disable verification after confirming their current password. Saving this setting or changing/resetting the password clears pending codes.

When `RESEND_API_KEY` is set, email delivery uses the Resend HTTPS API. Otherwise, email delivery uses the existing `SMTP_HOST`, `SMTP_PORT`, `SMTP_SECURE`, `SMTP_USER`, `SMTP_PASSWORD`, and `MAIL_FROM` server configuration. If delivery fails, sign-in remains blocked and the user is asked to try again; codes are never returned by the API or logged. Production requires HTTPS for the secure cookies. Verify delivery with your SMTP provider before rolling this out to staff.

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
4. Sign in again to request a new OTP, verify receipt, then test password reset. If sending fails, inspect the backend's `Email delivery failed` log and Resend dashboard. Logs include the provider and HTTP/SMTP status without exposing codes or credentials.

Use an address on your verified domain for `MAIL_FROM`; the default `no-reply@smartapply.com` only works if you own and authorize that domain. Resend's testing sender is restricted and should not be used for general user sign-ins. See [Resend's email API documentation](https://resend.com/docs/api-reference/emails/send-email).

Set secrets on the backend service, never in client/Vite variables. Your local `server/.env` is ignored by Git and is not automatically uploaded to Render. Production startup requires either a Resend API key or an SMTP host. Successful API acceptance does not guarantee inbox delivery; inspect the provider delivery events when needed.

### Admin control of two-step verification

In **Users → Add user / Edit user**, administrators can enable or disable **Require email OTP at sign-in** for an individual account. The Users table shows the saved status. New staff accounts default to enabled. Changes apply to the next sign-in and clear pending OTP challenges. Users can also change their own setting in **Security** after confirming their current password; this is an editable account preference, not an enforced organization policy. Email delivery must be configured for accounts with verification enabled.
