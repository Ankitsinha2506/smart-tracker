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

Email delivery uses the existing `SMTP_HOST`, `SMTP_PORT`, `SMTP_SECURE`, `SMTP_USER`, `SMTP_PASSWORD`, and `MAIL_FROM` server configuration. If delivery fails, sign-in remains blocked and the user is asked to try again; codes are never returned by the API or logged. Production requires HTTPS for the secure cookies. Verify delivery with your SMTP provider before rolling this out to staff.

### Branded email sender

Security emails use the display name `SmartApply` and matching HTML/plain-text templates. Set these server environment variables to use your branded sender:

```dotenv
MAIL_FROM_NAME=SmartApply
MAIL_FROM=no-reply@smartapply.com
```

Only set that address after verifying ownership of `smartapply.com` and authorizing the sender with your SMTP provider. Configure the provider's required DNS authentication records. Existing explicit `MAIL_FROM` settings take precedence; the application does not provision a mailbox or verify domain ownership. Restart the server after changing mail settings.
